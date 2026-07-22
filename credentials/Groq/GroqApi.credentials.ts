import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * Credential for the Groq API (https://api.groq.com/openai/v1).
 *
 * Groq's API is OpenAI-compatible and authenticates with a single bearer
 * token, so both the action node (GenericFunctions.ts) and the Groq Chat
 * Model connector (used as an AI Agent's language model) share this
 * credential.
 */
export class GroqApi implements ICredentialType {
	name = 'groqApi';

	displayName = 'Groq API';

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
