import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class AwsSesApi implements ICredentialType {
	name = 'awsSesApi';

	displayName = 'AWS SES API (Novascape)';

	icon: Icon = 'file:../../nodes/AWSSES/aws-ses.svg';

	documentationUrl = 'https://docs.aws.amazon.com/ses/latest/APIReference-V1/Welcome.html';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Only needed when using temporary credentials (e.g. from an STS AssumeRole call)',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'us-east-1',
			required: true,
			placeholder: 'us-east-1',
			description: 'AWS region the SES identities/templates live in, e.g. us-east-1, eu-west-1',
		},
		{
			displayName: 'Custom Endpoint',
			name: 'customEndpoint',
			type: 'string',
			default: '',
			placeholder: 'https://email.us-east-1.amazonaws.com',
			description: 'Override the SES endpoint. Leave empty to use the standard email.{region}.amazonaws.com endpoint.',
		},
	];

	// No `test` block: every SES Query API request must be SigV4-signed with a live timestamp,
	// which n8n's static credential-test request format cannot produce. Use the node's
	// "Get Send Quota" operation to verify a credential instead.
}
