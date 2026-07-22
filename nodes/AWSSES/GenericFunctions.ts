import { createHash, createHmac } from 'crypto';

import type { IExecuteFunctions, IDataObject, ICredentialDataDecryptedObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const SERVICE = 'ses';
const API_VERSION = '2010-12-01';

// ---------------------------------------------------------------------------------------------
// Minimal dependency-free XML parser (SES responses are simple, attribute-free, well-formed XML)
// ---------------------------------------------------------------------------------------------

function decodeXmlEntities(value: string): string {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

interface XmlFrame {
	name: string;
	children: Record<string, unknown[]>;
	text: string;
}

function addChild(frame: XmlFrame, name: string, value: unknown): void {
	if (!frame.children[name]) frame.children[name] = [];
	frame.children[name].push(value);
}

function finalizeFrame(frame: XmlFrame): unknown {
	if (Object.keys(frame.children).length === 0) return decodeXmlEntities(frame.text);
	const out: IDataObject = {};
	for (const [key, values] of Object.entries(frame.children)) {
		out[key] = (values.length === 1 ? values[0] : values) as IDataObject;
	}
	return out;
}

/** Parses AWS SES's XML responses into plain objects. Repeated sibling tags (e.g. `<member>`
 * list entries) collapse into arrays; everything else becomes a nested object/string. */
export function parseSesXml(xml: string): IDataObject {
	const cleaned = xml.replace(/<\?xml[^?]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
	const tagRegex = /<([^\s/>]+)([^>]*)\/>|<([^\s/>]+)([^>]*)>|<\/([^\s>]+)>/g;

	const root: XmlFrame = { name: '#root', children: {}, text: '' };
	const stack: XmlFrame[] = [root];
	let match: RegExpExecArray | null;
	let lastIndex = 0;

	while ((match = tagRegex.exec(cleaned)) !== null) {
		const between = cleaned.slice(lastIndex, match.index).trim();
		if (between) stack[stack.length - 1].text += between;
		lastIndex = tagRegex.lastIndex;

		const [, selfClosingName, , openName, , closeName] = match;
		if (selfClosingName) {
			addChild(stack[stack.length - 1], selfClosingName, '');
		} else if (openName) {
			stack.push({ name: openName, children: {}, text: '' });
		} else if (closeName) {
			const finished = stack.pop();
			if (finished) {
				addChild(stack[stack.length - 1], closeName, finalizeFrame(finished));
			}
		}
	}

	return finalizeFrame(root) as IDataObject;
}

// ---------------------------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------------------------

/** Pulls the real failure reason out of an HTTP error so the generic "request failed" message
 * doesn't hide what AWS actually rejected (SES errors arrive as an XML body). */
function describeError(error: unknown): string {
	const err = error as {
		message?: string;
		description?: string;
		httpCode?: string | null;
		statusCode?: number;
		response?: { status?: number; data?: unknown; body?: unknown };
		cause?: { response?: { status?: number; data?: unknown; body?: unknown } };
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode ?? err.cause?.response?.status;
	const data = err.response?.data ?? err.response?.body ?? err.cause?.response?.data;
	const dataStr = typeof data === 'string' ? data : data ? JSON.stringify(data) : undefined;
	return [status ? `HTTP ${status}` : undefined, err.description, dataStr, err.message]
		.filter(Boolean)
		.join(' - ');
}

/** Extracts Code/Message out of an SES ErrorResponse XML body, when present. */
function describeAwsError(body: unknown): string | undefined {
	if (typeof body !== 'string' || !body.includes('<Error')) return undefined;
	try {
		const parsed = parseSesXml(body) as { ErrorResponse?: { Error?: { Code?: string; Message?: string } } };
		const err = parsed.ErrorResponse?.Error;
		if (!err) return undefined;
		return [err.Code, err.Message].filter(Boolean).join(': ');
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------------------------
// SigV4 signing
// ---------------------------------------------------------------------------------------------

function hmac(key: Buffer | string, value: string): Buffer {
	return createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256Hex(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
	const kDate = hmac(`AWS4${secretKey}`, dateStamp);
	const kRegion = hmac(kDate, region);
	const kService = hmac(kRegion, service);
	return hmac(kService, 'aws4_request');
}

/** Recursively flattens a JS value into AWS Query API wire format: nested objects become
 * dotted keys (`Destination.ToAddresses`) and arrays become `Key.member.1`, `Key.member.2`, ...
 * `undefined`/`null`/`''` values are dropped so optional parameters can be passed through freely. */
function flattenAwsParams(value: unknown, prefix: string, out: Record<string, string>): void {
	if (value === undefined || value === null || value === '') return;

	if (Array.isArray(value)) {
		value.forEach((item, index) => flattenAwsParams(item, `${prefix}.member.${index + 1}`, out));
		return;
	}

	if (typeof value === 'object') {
		for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
			flattenAwsParams(nested, prefix ? `${prefix}.${key}` : key, out);
		}
		return;
	}

	out[prefix] = String(value);
}

export function buildAwsQueryParams(params: IDataObject): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		flattenAwsParams(value, key, out);
	}
	return out;
}

function toFormUrlEncoded(params: Record<string, string>): string {
	return Object.keys(params)
		.sort()
		.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
		.join('&');
}

export interface SignedSesRequest {
	url: string;
	method: 'GET' | 'POST';
	headers: Record<string, string>;
	body: string;
}

function endpointFromCredentials(credentials: ICredentialDataDecryptedObject): { endpoint: string; host: string; region: string } {
	const region = credentials.region as string;
	const endpoint = ((credentials.customEndpoint as string) || `https://email.${region}.amazonaws.com`).replace(
		/\/+$/,
		'',
	);
	return { endpoint, host: new URL(endpoint).host, region };
}

/** Signs an arbitrary SES request (Query API v1 form-encoded POST, or REST v2 JSON GET/POST)
 * with AWS SigV4. SES has no OAuth/token exchange to delegate to n8n's generic credential
 * auth, so the request is built and signed by hand for both API generations. */
function signAwsSesRequest(
	credentials: ICredentialDataDecryptedObject,
	method: 'GET' | 'POST',
	path: string,
	body: string,
	contentType?: string,
): SignedSesRequest {
	const { endpoint, host, region } = endpointFromCredentials(credentials);
	const accessKeyId = credentials.accessKeyId as string;
	const secretAccessKey = credentials.secretAccessKey as string;
	const sessionToken = (credentials.sessionToken as string) || '';

	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);

	const headerEntries: Array<[string, string]> = [
		['host', host],
		['x-amz-date', amzDate],
	];
	if (contentType) headerEntries.push(['content-type', contentType]);
	if (sessionToken) headerEntries.push(['x-amz-security-token', sessionToken]);
	headerEntries.sort(([a], [b]) => a.localeCompare(b));

	const canonicalHeaders = headerEntries.map(([k, v]) => `${k}:${v}\n`).join('');
	const signedHeaders = headerEntries.map(([k]) => k).join(';');
	const payloadHash = sha256Hex(body);

	const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
	const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
	const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

	const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, SERVICE);
	const signature = hmac(signingKey, stringToSign).toString('hex');

	const authorization =
		`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
		`SignedHeaders=${signedHeaders}, Signature=${signature}`;

	const headers: Record<string, string> = {
		Host: host,
		'X-Amz-Date': amzDate,
		Authorization: authorization,
	};
	if (contentType) headers['Content-Type'] = contentType;
	if (sessionToken) headers['X-Amz-Security-Token'] = sessionToken;

	return { url: `${endpoint}${path}`, method, headers, body };
}

/** Builds a fully SigV4-signed AWS SES Query API (v1, XML) request. */
export function buildSignedSesRequest(
	credentials: ICredentialDataDecryptedObject,
	action: string,
	params: IDataObject,
): SignedSesRequest {
	const body = toFormUrlEncoded(buildAwsQueryParams({ Action: action, Version: API_VERSION, ...params }));
	return signAwsSesRequest(credentials, 'POST', '/', body, 'application/x-www-form-urlencoded');
}

/** Builds a fully SigV4-signed AWS SESv2 REST (JSON) request. Only used for the handful of v2-only
 * operations, currently `GetAccount`, which is the only reliable way to tell whether an account is
 * still in the sandbox (`ProductionAccessEnabled: false`) or has production access. */
export function buildSignedSesV2Request(
	credentials: ICredentialDataDecryptedObject,
	method: 'GET' | 'POST',
	path: string,
	body: IDataObject | undefined = undefined,
): SignedSesRequest {
	const bodyString = body ? JSON.stringify(body) : '';
	return signAwsSesRequest(credentials, method, path, bodyString, body ? 'application/json' : undefined);
}

/** Unwraps SES's `<ActionResponse><ActionResult>...</ActionResult><ResponseMetadata>...
 * </ResponseMetadata></ActionResponse>` envelope so the node output surfaces the actual
 * result plus the request ID. */
function unwrapSesResponse(xml: string): IDataObject {
	if (!xml) return {};
	const parsed = parseSesXml(xml);
	const responseKey = Object.keys(parsed)[0];
	const envelope = (parsed[responseKey] ?? {}) as IDataObject;
	const resultKey = Object.keys(envelope).find((key) => key.endsWith('Result'));
	const result = resultKey ? (envelope[resultKey] as IDataObject) : {};
	const responseMetadata = envelope.ResponseMetadata as IDataObject | undefined;
	return { ...result, ...(responseMetadata ? { ResponseMetadata: responseMetadata } : {}) };
}

/** Signs and sends one AWS SES Query API action, parsing the XML response into a plain object. */
export async function awsSesApiRequest(
	this: IExecuteFunctions,
	action: string,
	params: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('awsSesApi');
	const signed = buildSignedSesRequest(credentials, action, params);

	let responseXml: string;
	try {
		// AWS SigV4 signing is done by hand in buildSignedSesRequest; there is no n8n
		// credential-type auth for it.
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		responseXml = (await this.helpers.httpRequest({
			method: signed.method,
			url: signed.url,
			headers: signed.headers,
			body: signed.body,
			json: false,
		})) as string;
	} catch (error) {
		const err = error as {
			response?: { data?: unknown; body?: unknown };
			cause?: { response?: { data?: unknown; body?: unknown } };
		};
		const rawBody = err.response?.data ?? err.response?.body ?? err.cause?.response?.data;
		const awsMessage = describeAwsError(rawBody);
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `AWS SES: ${action} failed - ${awsMessage ?? describeError(error)}`,
		});
	}

	return unwrapSesResponse(responseXml);
}

/** Signs and sends one AWS SESv2 REST (JSON) request. Used for `GetAccount`, the only reliable
 * way to distinguish a sandbox account from one with production sending access. */
export async function awsSesV2Request(
	this: IExecuteFunctions,
	method: 'GET' | 'POST',
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('awsSesApi');
	const signed = buildSignedSesV2Request(credentials, method, path, body);

	try {
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		return (await this.helpers.httpRequest({
			method: signed.method,
			url: signed.url,
			headers: signed.headers,
			body: signed.body || undefined,
			json: true,
		})) as IDataObject;
	} catch (error) {
		const err = error as { response?: { data?: unknown; body?: unknown }; cause?: { response?: { data?: unknown; body?: unknown } } };
		const rawBody = err.response?.data ?? err.response?.body ?? err.cause?.response?.data;
		const message = typeof rawBody === 'string' ? rawBody : rawBody ? JSON.stringify(rawBody) : describeError(error);
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `AWS SES: ${path} failed - ${message}`,
		});
	}
}

/** Describes whether an SES account currently has production sending access, or is still
 * restricted to the sandbox (verified recipients only, low sending quota). Returns `undefined`
 * if the caller's IAM policy doesn't allow `ses:GetAccount` rather than failing outright, since
 * this is a nice-to-have diagnostic, not a requirement for sending mail. */
export async function describeSesAccountStatus(
	this: IExecuteFunctions,
): Promise<{ productionAccessEnabled: boolean; sendingEnabled: boolean } | undefined> {
	try {
		const account = await awsSesV2Request.call(this, 'GET', '/v2/email/account');
		return {
			productionAccessEnabled: Boolean(account.ProductionAccessEnabled),
			sendingEnabled: Boolean(account.SendingEnabled),
		};
	} catch {
		return undefined;
	}
}

/** Splits a comma/newline separated list of addresses into a clean string array. */
export function splitAddresses(value: string): string[] {
	return value
		.split(/[\n,]/)
		.map((address) => address.trim())
		.filter((address) => address.length > 0);
}

/** Base64-encodes a buffer wrapped at 76 columns, as required by RFC 2045 for MIME body parts. */
function base64Wrap(buffer: Buffer): string {
	const base64 = buffer.toString('base64');
	return base64.replace(/.{76}/g, '$&\r\n');
}

function newMimeBoundary(label: string): string {
	return `----=_NOVASCAPE_${label}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface SimpleMimeMessageOptions {
	from: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	bodyText?: string;
	bodyHtml?: string;
	attachmentPropertyNames?: string[];
}

/** Builds a full RFC 5322 raw MIME message (headers + body + attachments) from friendly fields,
 * so "Send Raw Email" can be used to send attachments without requiring the caller to hand-write
 * MIME. Attachments are read from the current item's binary properties. */
export async function buildSimpleMimeMessage(
	this: IExecuteFunctions,
	itemIndex: number,
	options: SimpleMimeMessageOptions,
): Promise<string> {
	const headerLines: string[] = [
		`From: ${options.from}`,
		`To: ${options.to.join(', ')}`,
	];
	if (options.cc?.length) headerLines.push(`Cc: ${options.cc.join(', ')}`);
	if (options.bcc?.length) headerLines.push(`Bcc: ${options.bcc.join(', ')}`);
	headerLines.push(`Subject: ${options.subject}`, 'MIME-Version: 1.0');

	const hasText = Boolean(options.bodyText);
	const hasHtml = Boolean(options.bodyHtml);
	const attachmentNames = options.attachmentPropertyNames ?? [];

	let bodyPart: string;
	if (hasText && hasHtml) {
		const altBoundary = newMimeBoundary('alt');
		bodyPart = [
			`Content-Type: multipart/alternative; boundary="${altBoundary}"`,
			'',
			`--${altBoundary}`,
			'Content-Type: text/plain; charset=UTF-8',
			'Content-Transfer-Encoding: 7bit',
			'',
			options.bodyText,
			`--${altBoundary}`,
			'Content-Type: text/html; charset=UTF-8',
			'Content-Transfer-Encoding: 7bit',
			'',
			options.bodyHtml,
			`--${altBoundary}--`,
		].join('\r\n');
	} else {
		bodyPart = [
			`Content-Type: text/${hasHtml ? 'html' : 'plain'}; charset=UTF-8`,
			'Content-Transfer-Encoding: 7bit',
			'',
			options.bodyHtml ?? options.bodyText ?? '',
		].join('\r\n');
	}

	if (attachmentNames.length === 0) {
		return [...headerLines, ...bodyPart.split('\r\n')].join('\r\n');
	}

	const mixedBoundary = newMimeBoundary('mixed');
	const parts: string[] = [`--${mixedBoundary}`, bodyPart, ''];

	for (const propertyName of attachmentNames) {
		const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
		const fileName = binaryData.fileName ?? propertyName;
		parts.push(
			`--${mixedBoundary}`,
			`Content-Type: ${binaryData.mimeType || 'application/octet-stream'}; name="${fileName}"`,
			'Content-Transfer-Encoding: base64',
			`Content-Disposition: attachment; filename="${fileName}"`,
			'',
			base64Wrap(buffer),
			'',
		);
	}
	parts.push(`--${mixedBoundary}--`);

	return [
		...headerLines,
		`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
		'',
		...parts,
	].join('\r\n');
}

/** Calls a paginated SES List* action repeatedly (following NextToken) and returns every record
 * found under `itemsKey`, flattened into a single array regardless of how many pages it took. */
/** Normalizes one SES Query API list result: the parsed XML wraps repeated entries as
 * `{ member: [...] }` (or `{ member: singleEntry }` when there's exactly one), rather than
 * a bare array, so every list-type response needs this same unwrap. */
function extractListMembers(page: unknown): unknown[] {
	if (page === undefined || page === null) return [];
	if (Array.isArray(page)) return page;
	if (typeof page === 'object' && 'member' in (page as IDataObject)) {
		const member = (page as IDataObject).member;
		return Array.isArray(member) ? member : member !== undefined ? [member] : [];
	}
	return [page];
}

export async function awsSesListAll(
	this: IExecuteFunctions,
	action: string,
	params: IDataObject,
	itemsKey: string,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];
	let nextToken: string | undefined;

	do {
		const response = await awsSesApiRequest.call(this, action, { ...params, NextToken: nextToken });
		const entries = extractListMembers(response[itemsKey]);
		results.push(...entries.map((entry) => (typeof entry === 'string' ? { value: entry } : (entry as IDataObject))));
		nextToken = typeof response.NextToken === 'string' ? response.NextToken : undefined;
	} while (nextToken);

	return results;
}

/** Parses a JSON-string parameter (used for the handful of SES inputs too free-form for typed
 * fields, e.g. EventDestination, Destinations, BouncedRecipientInfoList) into an object/array. */
export function parseJsonParameter(
	this: IExecuteFunctions,
	value: string,
	fieldName: string,
	itemIndex: number,
): unknown {
	if (!value) return undefined;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeApiError(this.getNode(), { message: (error as Error).message } as JsonObject, {
			message: `AWS SES: "${fieldName}" must be valid JSON`,
			itemIndex,
		});
	}
}
