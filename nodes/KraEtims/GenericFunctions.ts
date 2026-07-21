import type { IExecuteFunctions, IHttpRequestMethods, IDataObject } from 'n8n-workflow';

const AUTH_BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke',
	production: 'https://api.kra.go.ke',
};

const API_BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke/etims-oscu/api/v1',
	production: 'https://api.kra.go.ke/etims-oscu/api/v1',
};

async function getAccessToken(
	this: IExecuteFunctions,
	environment: string,
	consumerKey: string,
	consumerSecret: string,
): Promise<string> {
	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${AUTH_BASE_URLS[environment]}/v1/token/generate`,
		qs: { grant_type: 'client_credentials' },
		auth: {
			username: consumerKey,
			password: consumerSecret,
		},
		json: true,
	})) as { access_token: string; expires_in: string };

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

	// KRA's client_credentials token is fetched fresh above and attached manually; httpRequestWithAuthentication's
	// preAuthentication caching does not reliably send this Authorization header (401s across all routes).
	// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
	const response = await this.helpers.httpRequest({
		method,
		url: `${API_BASE_URLS[environment]}${endpoint}`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			tin: credentials.tin as string,
			bhfId: credentials.bhfId as string,
			cmcKey: credentials.cmcKey as string,
			apigee_app_id: credentials.apigeeAppId as string,
		},
		body,
		json: true,
	});

	return response as IDataObject;
}

/** Resolves a header/body value: use the node parameter if the user set one, otherwise fall back to the credential default. */
export function withCredentialDefault(paramValue: string, credentialValue: unknown): string {
	return paramValue !== '' ? paramValue : ((credentialValue as string) ?? '');
}
