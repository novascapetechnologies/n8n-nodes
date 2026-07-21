import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

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

	// The node fetches the access token itself (see GenericFunctions.ts) rather than relying on
	// credential-level preAuthentication, so the test below only validates the consumer key/secret
	// against the token endpoint (the same call the node makes before every API request).
	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "production" ? "https://api.kra.go.ke" : "https://sbx.kra.go.ke"}}',
			url: '/v1/token/generate',
			method: 'GET',
			qs: { grant_type: 'client_credentials' },
			auth: {
				username: '={{$credentials.consumerKey}}',
				password: '={{$credentials.consumerSecret}}',
			},
		},
	};
}
