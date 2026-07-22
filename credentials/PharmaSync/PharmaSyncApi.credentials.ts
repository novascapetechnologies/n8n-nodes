import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Credential for the PharmaSync bridge API (/api/v1/n8n/*).
 *
 * This is the *service token* path — n8n is a trusted first-party service, not
 * a third-party OAuth client, so it presents a shared token rather than going
 * through the client-credentials flow that /api/v1/{tenantSlug}/* uses.
 *
 * Base URL by environment:
 *   development  http://host.docker.internal:3000   (n8n in Docker → host)
 *   production   https://pharmasync.co.ke
 *
 * Note the Docker caveat: `localhost` inside the n8n container is the container
 * itself, not the Next.js dev server on your machine.
 */
export class PharmaSyncApi implements ICredentialType {
	name = 'pharmaSyncApi';

	displayName = 'PharmaSync API';

	icon: Icon = 'file:../../nodes/PharmaSync/pharmasync.svg';

	documentationUrl = 'https://pharmasync.co.ke/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://host.docker.internal:3000',
			required: true,
			description:
				'PharmaSync origin, no trailing slash. Use host.docker.internal:3000 when n8n runs in Docker against a local dev server.',
		},
		{
			displayName: 'Service Token',
			name: 'serviceToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Value of N8N_SERVICE_TOKEN from the PharmaSync environment',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-pharmasync-service-token': '={{$credentials.serviceToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/n8n/tenants',
			method: 'GET',
			qs: { limit: 1 },
			headers: {
				'x-pharmasync-service-token': '={{$credentials.serviceToken}}',
			},
		},
	};
}
