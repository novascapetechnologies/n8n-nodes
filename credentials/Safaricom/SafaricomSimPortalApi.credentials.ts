import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class SafaricomSimPortalApi implements ICredentialType {
	name = 'safaricomSimPortalApi';

	displayName = 'Safaricom SIM Portal API';

	icon: Icon = 'file:../../nodes/Safaricom/safaricom-logo.svg';

	documentationUrl = 'https://developer.safaricom.co.ke/Documentation';

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
			description:
				'Sandbox calls https://sandbox.safaricom.co.ke, Production calls https://api.safaricom.co.ke',
		},
		{
			displayName: 'Bearer Token',
			name: 'bearerToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Access token issued out-of-band for the SIM Portal / IoT messaging APIs',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Sent as the x-api-key header on every request',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Portal username, sent as the username body field on every request',
		},
		{
			displayName: 'VPN Group',
			name: 'vpnGroup',
			type: 'string',
			default: '',
			required: true,
			description: 'Default vpnGroup sent on every request unless a request overrides it',
		},
		{
			displayName: 'Source System',
			name: 'sourceSystem',
			type: 'string',
			default: 'web-portal',
			description: 'Sent as the x-source-system header',
		},
		{
			displayName: 'App',
			name: 'app',
			type: 'string',
			default: 'web-portal',
			description: 'Sent as the X-App header',
		},
		{
			displayName: 'Default MSISDN',
			name: 'defaultMsisdn',
			type: 'string',
			default: '',
			description: 'Sent as the X-MSISDN header on every request',
		},
		{
			displayName: 'Identity',
			name: 'identity',
			type: 'string',
			default: '',
			description: 'Optional. Sent as the X-Identity header on requests that require it (e.g. Suspend/Unsuspend Subscriber).',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"}}',
			url: '/simportal/v1/getallmessages',
			method: 'POST',
			headers: {
				Authorization: '=Bearer {{$credentials.bearerToken}}',
				'x-api-key': '={{$credentials.apiKey}}',
			},
			body: {
				vpnGroup: '={{$credentials.vpnGroup}}',
			},
			qs: { pageNo: 1, pageSize: 1 },
		},
	};
}
