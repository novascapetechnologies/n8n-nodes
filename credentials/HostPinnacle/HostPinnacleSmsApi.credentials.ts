import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class HostPinnacleSmsApi implements ICredentialType {
	name = 'hostPinnacleSmsApi';

	displayName = 'HostPinnacle SMS API';

	icon: Icon = 'file:../../nodes/HostPinnacle/hostpinnacle-logo.svg';

	documentationUrl = 'https://smsportal.hostpinnacle.co.ke';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://smsportal.hostpinnacle.co.ke/api/v1',
			required: true,
			description: 'Base URL of the HostPinnacle SMS API',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your HostPinnacle account username, sent as userid on every request',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Default Sender Name',
			name: 'senderName',
			type: 'string',
			default: '',
			description: 'Sender name used when a request does not set its own Sender Name',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Optional. Only needed if API Key authentication is enabled on your account; sent as the apikey header',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/account/readstatus',
			method: 'GET',
			qs: {
				userid: '={{$credentials.userId}}',
				password: '={{$credentials.password}}',
				output: 'json',
			},
		},
	};
}
