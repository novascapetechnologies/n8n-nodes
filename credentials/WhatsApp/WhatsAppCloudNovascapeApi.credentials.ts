import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * Credential for the Meta WhatsApp Cloud API (https://graph.facebook.com).
 *
 * Named `whatsAppCloudNovascapeApi` (not `whatsAppApi`) to avoid colliding with n8n's
 * built-in "WhatsApp Business Cloud" node, which already registers a credential type of
 * its own. Credential type names are global across all installed packages (unlike node
 * names, which are namespaced per-package), so reusing a name already taken by a core
 * package can silently break one of the two registrations.
 */
export class WhatsAppCloudNovascapeApi implements ICredentialType {
	name = 'whatsAppCloudNovascapeApi';

	displayName = 'WhatsApp Cloud (Novascape) API';

	icon: Icon = 'file:../../nodes/WhatsApp/WhatsApp.svg';

	documentationUrl = 'https://developers.facebook.com/docs/whatsapp/cloud-api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			default: 'v21.0',
			required: true,
			description: 'Graph API version, e.g. v21.0',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'System User or temporary User access token with whatsapp_business_messaging/management scopes',
		},
		{
			displayName: 'WhatsApp Business Account ID (WABA ID)',
			name: 'businessAccountId',
			type: 'string',
			default: '',
			description: 'Default WABA ID used for template, flow, phone number and webhook operations unless a request overrides it',
		},
		{
			displayName: 'Phone Number ID',
			name: 'phoneNumberId',
			type: 'string',
			default: '',
			description: 'Default sending phone number ID used for message, media and profile operations unless a request overrides it',
		},
		{
			displayName: 'Business ID',
			name: 'businessId',
			type: 'string',
			default: '',
			description: 'Meta Business Manager ID, used for Business Portfolio, Billing and owned/shared WABA lookups',
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			description: 'Meta App ID, used as the endpoint for the Resumable Upload API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://graph.facebook.com/{{$credentials.apiVersion}}',
			url: '=/debug_token?input_token={{$credentials.accessToken}}',
			method: 'GET',
		},
	};
}
