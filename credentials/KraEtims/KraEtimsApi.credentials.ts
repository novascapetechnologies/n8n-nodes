import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

const BASE_URLS: Record<string, { auth: string; api: string }> = {
	sandbox: {
		auth: 'https://sbx.kra.go.ke',
		api: 'https://sbx.kra.go.ke/etims-oscu/api/v1',
	},
	production: {
		auth: 'https://api.kra.go.ke',
		api: 'https://api.kra.go.ke/etims-oscu/api/v1',
	},
};

export class KraEtimsApi implements ICredentialType {
	name = 'kraEtimsApi';

	displayName = 'KRA eTIMS API';

	icon: Icon = 'file:../../nodes/KraEtims/kra-logo.svg';

	documentationUrl = 'https://developer.go.ke/apis/KRA-ETIMS-SBX';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{ name: 'Sandbox', value: 'sandbox' },
				{ name: 'Production', value: 'production' },
			],
			default: 'sandbox',
			description: 'eTIMS/Apigee environment to send requests to',
		},
		{
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Apigee app consumer key, used to generate the access token via client_credentials',
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Apigee App ID',
			name: 'apigeeAppId',
			type: 'string',
			default: '',
			description: 'Sent as the apigee_app_id header on every request',
		},
		{
			displayName: 'KRA PIN (TIN)',
			name: 'tin',
			type: 'string',
			default: '',
			required: true,
			description: 'Taxpayer PIN, sent as the tin header/body field on every request',
		},
		{
			displayName: 'Branch ID',
			name: 'bhfId',
			type: 'string',
			default: '00',
			required: true,
			description: 'eTIMS branch office ID, sent as the bhfId header/body field',
		},
		{
			displayName: 'Device Serial Number',
			name: 'dvcSrlNo',
			type: 'string',
			default: '',
			description: 'Only required for the OSCU Device Initialization request',
		},
		{
			displayName: 'CMC Key',
			name: 'cmcKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Returned by OSCU Device Initialization. Required as the cmcKey header on every other request, so run Device > Initialize once and paste the returned cmcKey here.',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	) {
		const environment = (credentials.environment as string) === 'production' ? 'production' : 'sandbox';
		const response = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${BASE_URLS[environment].auth}/v1/token/generate`,
			qs: { grant_type: 'client_credentials' },
			auth: {
				username: credentials.consumerKey as string,
				password: credentials.consumerSecret as string,
			},
			json: true,
		})) as { access_token: string; expires_in: string };

		return { accessToken: response.access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				tin: '={{$credentials.tin}}',
				bhfId: '={{$credentials.bhfId}}',
				cmcKey: '={{$credentials.cmcKey}}',
				apigee_app_id: '={{$credentials.apigeeAppId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "production" ? "https://api.kra.go.ke/etims-oscu/api/v1" : "https://sbx.kra.go.ke/etims-oscu/api/v1"}}',
			url: '/selectCodeList',
			method: 'POST',
			body: {
				tin: '={{$credentials.tin}}',
				bhfId: '={{$credentials.bhfId}}',
				lastReqDt: '19000101000000',
			},
		},
	};
}

export { BASE_URLS };
