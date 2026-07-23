import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class InvoSyncApi implements ICredentialType {
	name = 'invoSyncApi';

	displayName = 'InvoSync API';

	icon: Icon = 'file:../../nodes/InvoSync/invosync-logo.svg';

	documentationUrl = 'https://invosync.co.ke';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://invosync.co.ke/api/v1',
			required: true,
			description: 'Base URL of the InvoSync API, e.g. http://localhost:3000/api/v1 in dev',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Platform-admin InvoSync API key (isk_admin_...) with the admin:tenant-data scope, generated from Admin → Settings → API Keys. Sent as "Authorization: Bearer <apiKey>".',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/customers',
			method: 'GET',
		},
	};
}
