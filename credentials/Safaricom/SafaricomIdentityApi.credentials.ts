import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class SafaricomIdentityApi implements ICredentialType {
	name = 'safaricomIdentityApi';

	displayName = 'Safaricom Identity Verification API';

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
			description:
				'Access token issued out-of-band for the IMSI/SWAP CheckATI and Org Info Query APIs. Leave empty if your app is not configured to require one.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"}}',
			url: '/imsi/v1/checkATI',
			method: 'POST',
			headers: {
				Authorization: '=Bearer {{$credentials.bearerToken}}',
			},
			body: {
				customerNumber: '',
			},
		},
	};
}
