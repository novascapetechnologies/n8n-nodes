import { randomUUID } from 'crypto';
import type { IExecuteFunctions, IHttpRequestMethods, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const BASE_URLS: Record<string, string> = {
	sandbox: 'https://sandbox.safaricom.co.ke',
	production: 'https://api.safaricom.co.ke',
};

function getBaseUrl(environment: unknown): string {
	return BASE_URLS[environment === 'production' ? 'production' : 'sandbox'];
}

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

/** Shared by the SIM Portal / IoT messaging endpoints, which authenticate with a static bearer
 * token issued out-of-band (there is no client_credentials token exchange for these APIs). */
export async function simPortalApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('safaricomSimPortalApi');
	const baseUrl = getBaseUrl(credentials.environment);

	try {
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		const response = await this.helpers.httpRequest({
			method,
			url: `${baseUrl}${endpoint}`,
			headers: {
				Authorization: `Bearer ${credentials.bearerToken as string}`,
				'x-correlation-conversationid': randomUUID(),
				'x-source-system': (credentials.sourceSystem as string) || 'web-portal',
				'x-api-key': credentials.apiKey as string,
				'Accept-Language': 'EN',
				'X-MSISDN': (credentials.defaultMsisdn as string) || '',
				'X-App': (credentials.app as string) || 'web-portal',
				'X-MessageID': randomUUID(),
				...((credentials.identity as string) ? { 'X-Identity': credentials.identity as string } : {}),
			},
			body,
			qs,
			json: true,
		});

		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Safaricom SIM Portal: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** Shared by the IMSI/SWAP CheckATI and Org Info Query endpoints. */
export async function identityApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('safaricomIdentityApi');
	const baseUrl = getBaseUrl(credentials.environment);
	const bearerToken = (credentials.bearerToken as string) || '';

	try {
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		const response = await this.helpers.httpRequest({
			method,
			url: `${baseUrl}${endpoint}`,
			headers: {
				'Content-Type': 'application/json',
				...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
			},
			body,
			json: true,
		});

		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Safaricom Identity Verification: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}
