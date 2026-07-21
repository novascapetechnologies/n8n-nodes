import type { IExecuteFunctions, IHttpRequestMethods, IDataObject } from 'n8n-workflow';

const API_BASE_URLS: Record<string, string> = {
	sandbox: 'https://sbx.kra.go.ke/etims-oscu/api/v1',
	production: 'https://api.kra.go.ke/etims-oscu/api/v1',
};

export async function kraApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('kraEtimsApi');
	const environment = credentials.environment === 'production' ? 'production' : 'sandbox';

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'kraEtimsApi', {
		method,
		url: `${API_BASE_URLS[environment]}${endpoint}`,
		body,
		json: true,
	});

	return response as IDataObject;
}

/** Resolves a header/body value: use the node parameter if the user set one, otherwise fall back to the credential default. */
export function withCredentialDefault(paramValue: string, credentialValue: unknown): string {
	return paramValue !== '' ? paramValue : ((credentialValue as string) ?? '');
}
