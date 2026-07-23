import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * Credential for the Groq API (https://api.groq.com/openai/v1).
 *
 * Named `groqNovascapeApi` (not `groqApi`) because n8n's built-in "Groq Chat
 * Model" node (@n8n/n8n-nodes-langchain) already registers a credential type
 * named `groqApi`. Credential type names are global across all installed
 * packages (unlike node names, which are namespaced per-package), so reusing
 * that name silently broke this custom node in production once the core
 * package shipped its own Groq credential - only one of the two `groqApi`
 * registrations could win.
 */
export class GroqApi implements ICredentialType {
	name = 'groqNovascapeApi';

	displayName = 'Groq (Novascape) API';

	icon: Icon = 'file:../../nodes/Groq/groq-logo.svg';

	documentationUrl = 'https://docs.groq.com/docs/api-reference';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.groq.com/openai/v1',
			required: true,
			description: 'Groq API origin, no trailing slash',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your GROQ_API_KEY from the Groq developer portal',
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/models',
			method: 'GET',
		},
	};
}
