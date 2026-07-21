import type { IExecuteFunctions, IHttpRequestMethods, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const AUTH_BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke',
	production: 'https://api.kra.go.ke',
};

const API_BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke/etims-oscu/api/v1',
	production: 'https://api.kra.go.ke/etims-oscu/api/v1',
};

/** Pulls the real failure reason out of an HTTP/NodeApiError-shaped error so the generic
 * "Authorization failed" 401 message doesn't hide what KRA actually rejected. */
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

async function getAccessToken(
	this: IExecuteFunctions,
	environment: string,
	consumerKey: string,
	consumerSecret: string,
): Promise<string> {
	if (!consumerKey || !consumerSecret) {
		throw new NodeOperationError(
			this.getNode(),
			'KRA eTIMS: Consumer Key/Consumer Secret are missing on the credential.',
		);
	}

	let response: { access_token: string; expires_in: string };
	try {
		response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${AUTH_BASE_URLS[environment]}/v1/token/generate`,
			qs: { grant_type: 'client_credentials' },
			auth: {
				username: consumerKey,
				password: consumerSecret,
			},
			json: true,
		})) as { access_token: string; expires_in: string };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `KRA eTIMS: failed to generate an access token from ${AUTH_BASE_URLS[environment]}/v1/token/generate - ${describeError(error)}`,
		});
	}

	if (!response?.access_token) {
		throw new NodeOperationError(
			this.getNode(),
			`KRA eTIMS: token endpoint responded without an access_token - ${JSON.stringify(response)}`,
		);
	}

	return response.access_token;
}

export async function kraApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('kraEtimsApi');
	const environment = credentials.environment === 'production' ? 'production' : 'sandbox';

	const accessToken = await getAccessToken.call(
		this,
		environment,
		credentials.consumerKey as string,
		credentials.consumerSecret as string,
	);

	// Every eTIMS endpoint expects tin/bhfId/cmcKey/apigee_app_id as headers; auto-fill tin/bhfId into
	// the body too from the credential unless the caller already set a more specific value (e.g. a
	// per-item override), since some endpoints expect them in both places.
	const tin = (body.tin as string) || (credentials.tin as string) || '';
	const bhfId = (body.bhfId as string) || (credentials.bhfId as string) || '';

	try {
		// KRA's client_credentials token is fetched fresh above and attached manually; httpRequestWithAuthentication's
		// preAuthentication caching does not reliably send this Authorization header (401s across all routes).
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		const response = await this.helpers.httpRequest({
			method,
			url: `${API_BASE_URLS[environment]}${endpoint}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				tin,
				bhfId,
				cmcKey: (credentials.cmcKey as string) || '',
				apigee_app_id: (credentials.apigeeAppId as string) || '',
			},
			body: {
				tin,
				bhfId,
				...body,
			},
			json: true,
		});

		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `KRA eTIMS: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** Resolves a header/body value: use the node parameter if the user set one, otherwise fall back to the credential default. */
export function withCredentialDefault(paramValue: string, credentialValue: unknown): string {
	return paramValue !== '' ? paramValue : ((credentialValue as string) ?? '');
}
