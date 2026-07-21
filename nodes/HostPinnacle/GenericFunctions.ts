import type { IExecuteFunctions, IHttpRequestMethods, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// FormData/Blob are Node (undici) globals at runtime, but this project's tsconfig has no DOM lib,
// so they're declared ambiently here purely for typing — no code is emitted for these declarations.
declare const FormData: new () => { append(name: string, value: unknown, fileName?: string): void };
declare const Blob: new (parts: unknown[], options?: { type?: string }) => unknown;

/** Pulls the real failure reason out of an HTTP/NodeApiError-shaped error so the generic
 * error message doesn't hide what HostPinnacle actually rejected. */
function describeError(error: unknown): string {
	const err = error as {
		message?: string;
		description?: string;
		httpCode?: string | null;
		context?: { data?: unknown };
		response?: { status?: number; data?: unknown; body?: unknown };
		statusCode?: number;
		cause?: { response?: { status?: number; data?: unknown; body?: unknown } };
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode ?? err.cause?.response?.status;
	const data = err.context?.data ?? err.response?.data ?? err.response?.body ?? err.cause?.response?.data;
	const dataStr = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
	return [status ? `HTTP ${status}` : undefined, err.description, dataStr, err.message]
		.filter(Boolean)
		.join(' - ');
}

function toStringMap(data: IDataObject): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null || value === '') continue;
		result[key] = typeof value === 'string' ? value : String(value);
	}
	return result;
}

function toFormUrlEncoded(data: Record<string, string>): string {
	return Object.entries(data)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		.join('&');
}

/** Every HostPinnacle endpoint authenticates with userid/password sent alongside the
 * other parameters (as a query string on GET, as form fields on POST). */
async function getAuthParams(this: IExecuteFunctions): Promise<IDataObject> {
	const credentials = await this.getCredentials('hostPinnacleSmsApi');
	return {
		userid: credentials.userId as string,
		password: credentials.password as string,
	};
}

async function getApiKeyHeader(this: IExecuteFunctions): Promise<IDataObject> {
	const credentials = await this.getCredentials('hostPinnacleSmsApi');
	return credentials.apiKey ? { apikey: credentials.apiKey as string } : {};
}

export async function hostPinnacleApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('hostPinnacleSmsApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
	const auth = await getAuthParams.call(this);
	const headers = await getApiKeyHeader.call(this);

	try {
		if (method === 'GET') {
			// HostPinnacle authenticates with userid/password as plain request parameters (no token
			// exchange), so httpRequestWithAuthentication's credential-type auth wiring doesn't apply here.
			// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
			return (await this.helpers.httpRequest({
				method,
				url: `${baseUrl}${endpoint}`,
				qs: { ...auth, output: 'json', ...qs },
				headers,
				json: true,
			})) as IDataObject;
		}

		const formParams = toStringMap({ ...auth, output: 'json', ...body });
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		return (await this.helpers.httpRequest({
			method,
			url: `${baseUrl}${endpoint}`,
			headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
			body: toFormUrlEncoded(formParams),
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `HostPinnacle SMS: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** File-upload SMS sends need a real multipart body (the file is binary), so this builds a
 * native FormData instead of the URL-encoded body used by every other endpoint. */
export async function hostPinnacleFileUploadRequest(
	this: IExecuteFunctions,
	endpoint: string,
	body: IDataObject,
	binaryPropertyName: string,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('hostPinnacleSmsApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
	const auth = await getAuthParams.call(this);
	const headers = await getApiKeyHeader.call(this);

	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	const form = new FormData();
	for (const [key, value] of Object.entries(toStringMap({ ...auth, output: 'json', ...body }))) {
		form.append(key, value);
	}
	form.append('file', new Blob([buffer], { type: binaryData.mimeType }), binaryData.fileName ?? 'upload.csv');

	try {
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		return (await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}${endpoint}`,
			headers,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			body: form as any,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `HostPinnacle SMS: file upload to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** Resolves a parameter: use the node value if the user set one, otherwise fall back to the credential default. */
export function withDefault(paramValue: string, credentialValue: unknown): string {
	return paramValue !== '' ? paramValue : ((credentialValue as string) ?? '');
}
