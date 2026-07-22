import { publicEncrypt, constants as cryptoConstants, randomUUID } from 'crypto';
import type { IExecuteFunctions, IHttpRequestMethods, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const BASE_URLS: Record<string, string> = {
	sandbox: 'https://sandbox.safaricom.co.ke',
	production: 'https://api.safaricom.co.ke',
};

/** Pulls the real failure reason out of an HTTP/NodeApiError-shaped error so the generic
 * "Authorization failed" 400/401 message doesn't hide what Safaricom actually rejected. */
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

export function getMpesaBaseUrl(environment: unknown): string {
	return BASE_URLS[environment === 'production' ? 'production' : 'sandbox'];
}

/** YYYYMMDDHHmmss in local server time - must match the Timestamp used to derive Password. */
export function getMpesaTimestamp(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		now.getFullYear().toString() +
		pad(now.getMonth() + 1) +
		pad(now.getDate()) +
		pad(now.getHours()) +
		pad(now.getMinutes()) +
		pad(now.getSeconds())
	);
}

/** STK Push Password: Base64(ShortCode + Passkey + Timestamp). */
export function getLipaNaMpesaPassword(shortCode: string, passkey: string, timestamp: string): string {
	return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

/** Encrypts the Initiator Password with the environment's public certificate into SecurityCredential. */
export function getSecurityCredential(
	this: IExecuteFunctions,
	certificatePem: string,
	initiatorPassword: string,
): string {
	try {
		return publicEncrypt(
			{ key: certificatePem, padding: cryptoConstants.RSA_PKCS1_PADDING },
			Buffer.from(initiatorPassword),
		).toString('base64');
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to encrypt the Initiator Password into a SecurityCredential - check the certificate PEM on the credential (${(error as Error).message})`,
		);
	}
}

export function generateOriginatorConversationId(): string {
	return randomUUID();
}

async function getAccessToken(
	this: IExecuteFunctions,
	baseUrl: string,
	consumerKey: string,
	consumerSecret: string,
): Promise<string> {
	if (!consumerKey || !consumerSecret) {
		throw new NodeOperationError(
			this.getNode(),
			'M-Pesa: Consumer Key/Consumer Secret are missing on the credential.',
		);
	}

	let response: { access_token: string; expires_in: string };
	try {
		response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${baseUrl}/oauth/v1/generate`,
			qs: { grant_type: 'client_credentials' },
			auth: { username: consumerKey, password: consumerSecret },
			json: true,
		})) as { access_token: string; expires_in: string };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `M-Pesa: failed to generate an access token from ${baseUrl}/oauth/v1/generate - ${describeError(error)}`,
		});
	}

	if (!response?.access_token) {
		throw new NodeOperationError(
			this.getNode(),
			`M-Pesa: token endpoint responded without an access_token - ${JSON.stringify(response)}`,
		);
	}

	return response.access_token;
}

export async function mpesaApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('mPesaApi');
	const baseUrl = getMpesaBaseUrl(credentials.environment);

	const accessToken = await getAccessToken.call(
		this,
		baseUrl,
		credentials.consumerKey as string,
		credentials.consumerSecret as string,
	);

	try {
		// The Daraja OAuth token is fetched fresh above and attached manually; httpRequestWithAuthentication's
		// preAuthentication caching does not apply cleanly to Safaricom's client_credentials + Basic auth combo.
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		const response = await this.helpers.httpRequest({
			method,
			url: `${baseUrl}${endpoint}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			body,
			qs,
			json: true,
		});

		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `M-Pesa: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}
