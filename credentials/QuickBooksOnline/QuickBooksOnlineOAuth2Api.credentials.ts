import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * QuickBooks Online has used OAuth2 (authorization code grant) since 2017;
 * the "OAuth 1.0a" auth in the public Postman collection is legacy and no
 * longer accepted by the live API. `extends: ['oAuth2Api']` reuses n8n's
 * built-in OAuth2 flow (grantType, redirect URI handling, token refresh) —
 * this file only fixes the QuickBooks-specific endpoints/scope and adds the
 * Company/Realm ID every Accounting API call is scoped by.
 */
export class QuickBooksOnlineOAuth2Api implements ICredentialType {
	name = 'quickBooksOnlineOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'QuickBooks Online OAuth2 API';

	icon: Icon = 'file:../../nodes/QuickBooksOnline/quickbooks-logo.svg';

	documentationUrl = 'https://developer.intuit.com/app/developer/qbo/docs/get-started';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{ name: 'Production', value: 'production' },
				{ name: 'Sandbox', value: 'sandbox' },
			],
			default: 'production',
			description: 'Whether to call the live QuickBooks company or a Sandbox test company',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://appcenter.intuit.com/connect/oauth2',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'com.intuit.quickbooks.accounting',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Company/Realm ID',
			name: 'companyId',
			type: 'string',
			default: '',
			required: true,
			description:
				'The QuickBooks Company ID (realmId). Returned as a "realmId" query param on the OAuth redirect after granting access, and visible in the QuickBooks Online URL bar once signed in.',
		},
	];
}
