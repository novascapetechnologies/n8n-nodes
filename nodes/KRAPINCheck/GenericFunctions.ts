import type { IExecuteFunctions, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke',
	production: 'https://api.kra.go.ke',
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
			'KRA PIN Checker: Consumer Key/Consumer Secret are missing on the credential.',
		);
	}

	let response: { access_token: string; expires_in: string };
	try {
		response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${BASE_URLS[environment]}/v1/token/generate`,
			qs: { grant_type: 'client_credentials' },
			auth: {
				username: consumerKey,
				password: consumerSecret,
			},
			json: true,
		})) as { access_token: string; expires_in: string };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `KRA PIN Checker: failed to generate an access token from ${BASE_URLS[environment]}/v1/token/generate - ${describeError(error)}`,
		});
	}

	if (!response?.access_token) {
		throw new NodeOperationError(
			this.getNode(),
			`KRA PIN Checker: token endpoint responded without an access_token - ${JSON.stringify(response)}`,
		);
	}

	return response.access_token;
}

export async function checkPin(this: IExecuteFunctions, kraPin: string): Promise<IDataObject> {
	const credentials = await this.getCredentials('kraPinCheckerApi');
	const environment = credentials.environment === 'production' ? 'production' : 'sandbox';

	const accessToken = await getAccessToken.call(
		this,
		environment,
		credentials.consumerKey as string,
		credentials.consumerSecret as string,
	);

	try {
		// KRA's client_credentials token is fetched fresh above and attached manually; httpRequestWithAuthentication's
		// preAuthentication caching does not reliably send this Authorization header (401s across all routes).
		// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${BASE_URLS[environment]}/checker/v1/pinbypin`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: { KRAPIN: kraPin },
			json: true,
		});

		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `KRA PIN Checker: request to /checker/v1/pinbypin failed - ${describeError(error)}`,
		});
	}
}
