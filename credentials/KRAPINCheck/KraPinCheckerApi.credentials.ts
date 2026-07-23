import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class KraPinCheckerApi implements ICredentialType {
	name = 'kraPinCheckerApi';

	displayName = 'KRA PIN Checker API';

	icon: Icon = 'file:../../nodes/KRAPINCheck/kra-logo.svg';

	documentationUrl = 'https://developer.go.ke/apis/PIN-Checker-By-Pin-Sbx';

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
			description: 'Apigee environment to send requests to',
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
