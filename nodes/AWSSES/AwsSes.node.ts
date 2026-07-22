import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	awsSesApiRequest,
	awsSesListAll,
	awsSesV2Request,
	buildSignedSesRequest,
	buildSignedSesV2Request,
	buildSimpleMimeMessage,
	parseJsonParameter,
	splitAddresses,
} from './GenericFunctions';

// ---------------------------------------------------------------------------------------------
// Shared field fragments
// ---------------------------------------------------------------------------------------------

const identityField = {
	displayName: 'Identity',
	name: 'identity',
	type: 'string' as const,
	default: '',
	required: true,
	placeholder: 'user@example.com or example.com',
	description: 'The verified email address or domain identity',
};

const identitiesField = {
	displayName: 'Identities',
	name: 'identities',
	type: 'string' as const,
	default: '',
	required: true,
	description: 'Comma-separated list of identities (email addresses and/or domains)',
};

const configurationSetNameField = {
	displayName: 'Configuration Set Name',
	name: 'configurationSetName',
	type: 'string' as const,
	default: '',
	required: true,
};

const ruleSetNameField = {
	displayName: 'Rule Set Name',
	name: 'ruleSetName',
	type: 'string' as const,
	default: '',
	required: true,
};

const ruleNameField = {
	displayName: 'Rule Name',
	name: 'ruleName',
	type: 'string' as const,
	default: '',
	required: true,
};

const templateNameField = {
	displayName: 'Template Name',
	name: 'templateName',
	type: 'string' as const,
	default: '',
	required: true,
};

const maxItemsField = {
	displayName: 'Max Items',
	name: 'maxItems',
	type: 'number' as const,
	default: 0,
	description: 'Maximum number of items to return. Leave at 0 to use the API default.',
};

const nextTokenField = {
	displayName: 'Next Token',
	name: 'nextToken',
	type: 'string' as const,
	default: '',
	description: 'Pagination token returned from a previous call. Ignored when "Return All" is enabled.',
};

const returnAllField = {
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean' as const,
	default: false,
	description: 'Whether to follow pagination automatically and return every record, one item per record, instead of a single page',
};

function show(resource: string, operation: string[]) {
	return { show: { resource: [resource], operation } };
}

// ---------------------------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------------------------

export class AwsSes implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SES (Novascape)',
		name: 'awsSes',
		icon: 'file:aws-ses.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Send email and manage identities, templates and receipt rules with Amazon Simple Email Service',
		defaults: {
			name: 'AWS SES (Novascape)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'awsSesApi',
				required: true,
				testedBy: 'awsSesApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Configuration Set', value: 'configurationSet' },
					{ name: 'Custom Verification Template', value: 'customVerificationTemplate' },
					{ name: 'Email', value: 'email' },
					{ name: 'Identity', value: 'identity' },
					{ name: 'Receipt Filter', value: 'receiptFilter' },
					{ name: 'Receipt Rule', value: 'receiptRule' },
					{ name: 'Receipt Rule Set', value: 'receiptRuleSet' },
					{ name: 'Template', value: 'template' },
				],
				default: 'email',
			},

			// ============================================================= EMAIL =============================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['email'] } },
				options: [
					{ name: 'Send Bounce', value: 'sendBounce', description: 'Generate and send a bounce message to the sender of a message', action: 'Send a bounce' },
					{ name: 'Send Bulk Templated Email', value: 'sendBulkTemplatedEmail', description: 'Send a templated email to multiple destinations, each with its own replacement data', action: 'Send a bulk templated email' },
					{ name: 'Send Custom Verification Email', value: 'sendCustomVerificationEmail', description: 'Send a custom verification email to an address', action: 'Send a custom verification email' },
					{ name: 'Send Email', value: 'sendEmail', description: 'Compose and send an email', action: 'Send an email' },
					{ name: 'Send Raw Email', value: 'sendRawEmail', description: 'Send an email whose message body you compose yourself, e.g. to include attachments', action: 'Send a raw email' },
					{ name: 'Send Templated Email', value: 'sendTemplatedEmail', description: 'Send an email using an existing template', action: 'Send a templated email' },
				],
				default: 'sendEmail',
			},

			// -- Send Email --
			{ displayName: 'From', name: 'source', type: 'string', default: '', required: true, description: 'The verified sender address', displayOptions: show('email', ['sendEmail', 'sendRawEmail', 'sendTemplatedEmail', 'sendBulkTemplatedEmail']) },
			{ displayName: 'To', name: 'toAddresses', type: 'string', default: '', required: true, description: 'Comma-separated recipient addresses', displayOptions: show('email', ['sendEmail', 'sendTemplatedEmail']) },
			{ displayName: 'CC', name: 'ccAddresses', type: 'string', default: '', description: 'Comma-separated CC addresses', displayOptions: show('email', ['sendEmail', 'sendTemplatedEmail']) },
			{ displayName: 'BCC', name: 'bccAddresses', type: 'string', default: '', description: 'Comma-separated BCC addresses', displayOptions: show('email', ['sendEmail', 'sendTemplatedEmail']) },
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '', required: true, displayOptions: show('email', ['sendEmail']) },
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'HTML', value: 'html' },
					{ name: 'Both', value: 'both' },
				],
				default: 'text',
				displayOptions: show('email', ['sendEmail']),
			},
			{ displayName: 'Body (Text)', name: 'bodyText', type: 'string', typeOptions: { rows: 4 }, default: '', displayOptions: { show: { resource: ['email'], operation: ['sendEmail'], bodyContentType: ['text', 'both'] } } },
			{ displayName: 'Body (HTML)', name: 'bodyHtml', type: 'string', typeOptions: { rows: 4 }, default: '', displayOptions: { show: { resource: ['email'], operation: ['sendEmail'], bodyContentType: ['html', 'both'] } } },
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show('email', ['sendEmail']),
				options: [
					{ displayName: 'Configuration Set Name', name: 'configurationSetName', type: 'string', default: '' },
					{ displayName: 'Reply-To Addresses', name: 'replyToAddresses', type: 'string', default: '', description: 'Comma-separated reply-to addresses' },
					{ displayName: 'Return Path', name: 'returnPath', type: 'string', default: '' },
				],
			},

			// -- Send Raw Email --
			{
				displayName: 'Compose Mode',
				name: 'rawComposeMode',
				type: 'options',
				options: [
					{ name: 'Simple (with Attachments)', value: 'simple', description: 'Compose from To/Subject/Body fields and attach binary properties from this item' },
					{ name: 'Raw MIME', value: 'raw', description: 'Paste a complete, hand-written MIME message' },
				],
				default: 'simple',
				displayOptions: show('email', ['sendRawEmail']),
			},
			{
				displayName: 'Raw Message (MIME)',
				name: 'rawMessage',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				description: 'The full MIME message, including headers, exactly as it should be sent (not base64-encoded — the node encodes it for you)',
				displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['raw'] } },
			},
			{ displayName: 'To', name: 'rawToAddresses', type: 'string', default: '', required: true, description: 'Comma-separated recipient addresses', displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{ displayName: 'CC', name: 'rawCcAddresses', type: 'string', default: '', description: 'Comma-separated CC addresses', displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{ displayName: 'BCC', name: 'rawBccAddresses', type: 'string', default: '', description: 'Comma-separated BCC addresses', displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{ displayName: 'Subject', name: 'rawSubject', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{ displayName: 'Body (Text)', name: 'rawBodyText', type: 'string', typeOptions: { rows: 4 }, default: '', displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{ displayName: 'Body (HTML)', name: 'rawBodyHtml', type: 'string', typeOptions: { rows: 4 }, default: '', displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } } },
			{
				displayName: 'Attachment Binary Properties',
				name: 'attachmentPropertyNames',
				type: 'string',
				default: '',
				placeholder: 'data,data2',
				description: 'Comma-separated names of binary properties on this item to attach, e.g. from a previous "Read Binary File" or HTTP Request node',
				displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['simple'] } },
			},
			{
				displayName: 'Destinations',
				name: 'rawDestinations',
				type: 'string',
				default: '',
				description: 'Comma-separated recipient addresses. Only needed if the recipients are not already specified in the raw message headers.',
				displayOptions: { show: { resource: ['email'], operation: ['sendRawEmail'], rawComposeMode: ['raw'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show('email', ['sendRawEmail']),
				options: [
					{ displayName: 'Configuration Set Name', name: 'configurationSetName', type: 'string', default: '' },
				],
			},

			// -- Send Templated Email / Bulk --
			{ ...templateNameField, displayOptions: show('email', ['sendTemplatedEmail', 'sendBulkTemplatedEmail']) },
			{
				displayName: 'Template Data',
				name: 'templateData',
				type: 'json',
				default: '{}',
				description: 'JSON object of replacement values for the template variables',
				displayOptions: show('email', ['sendTemplatedEmail']),
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show('email', ['sendTemplatedEmail']),
				options: [
					{ displayName: 'Configuration Set Name', name: 'configurationSetName', type: 'string', default: '' },
					{ displayName: 'Reply-To Addresses', name: 'replyToAddresses', type: 'string', default: '', description: 'Comma-separated reply-to addresses' },
					{ displayName: 'Return Path', name: 'returnPath', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Destinations (JSON)',
				name: 'bulkDestinations',
				type: 'json',
				default: '[\n  {\n    "Destination": { "ToAddresses": ["user@example.com"] },\n    "ReplacementTemplateData": "{}"\n  }\n]',
				required: true,
				description: 'Array of up to 50 destinations, each with its own recipients and replacement template data',
				displayOptions: show('email', ['sendBulkTemplatedEmail']),
			},
			{
				displayName: 'Default Template Data',
				name: 'defaultTemplateData',
				type: 'json',
				default: '{}',
				description: 'Fallback replacement values used when a destination does not supply its own',
				displayOptions: show('email', ['sendBulkTemplatedEmail']),
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show('email', ['sendBulkTemplatedEmail']),
				options: [
					{ displayName: 'Configuration Set Name', name: 'configurationSetName', type: 'string', default: '' },
				],
			},

			// -- Send Custom Verification Email --
			{ displayName: 'Email Address', name: 'emailAddress', type: 'string', default: '', required: true, displayOptions: show('email', ['sendCustomVerificationEmail']) },
			{ ...templateNameField, displayOptions: show('email', ['sendCustomVerificationEmail']) },
			{ displayName: 'Configuration Set Name', name: 'configurationSetName', type: 'string', default: '', displayOptions: show('email', ['sendCustomVerificationEmail']) },

			// -- Send Bounce --
			{ displayName: 'Original Message ID', name: 'originalMessageId', type: 'string', default: '', required: true, description: 'The message ID of the message to bounce', displayOptions: show('email', ['sendBounce']) },
			{ displayName: 'Bounce Sender', name: 'bounceSender', type: 'string', default: '', required: true, description: 'Verified From address for the bounce message', displayOptions: show('email', ['sendBounce']) },
			{
				displayName: 'Bounced Recipient Info List (JSON)',
				name: 'bouncedRecipientInfoList',
				type: 'json',
				default: '[\n  {\n    "Recipient": "user@example.com",\n    "BounceType": "ContentRejected"\n  }\n]',
				required: true,
				description: 'Array of BouncedRecipientInfo objects, one per bounced recipient',
				displayOptions: show('email', ['sendBounce']),
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show('email', ['sendBounce']),
				options: [
					{ displayName: 'Explanation', name: 'explanation', type: 'string', default: '' },
					{ displayName: 'Message DSN (JSON)', name: 'messageDsn', type: 'json', default: '{}' },
				],
			},

			// ============================================================ IDENTITY ===========================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['identity'] } },
				options: [
					{ name: 'Delete', value: 'delete', description: 'Delete an identity (email address or domain)', action: 'Delete an identity' },
					{ name: 'Delete Policy', value: 'deletePolicy', description: 'Delete a sending authorization policy for an identity', action: 'Delete an identity policy' },
					{ name: 'Get DKIM Attributes', value: 'getDkimAttributes', description: 'Get the DKIM signing status/tokens for identities', action: 'Get identity DKIM attributes' },
					{ name: 'Get Mail-From Domain Attributes', value: 'getMailFromDomainAttributes', description: 'Get custom MAIL FROM domain attributes for identities', action: 'Get identity mail from domain attributes' },
					{ name: 'Get Notification Attributes', value: 'getNotificationAttributes', description: 'Get the notification (SNS) attributes for identities', action: 'Get identity notification attributes' },
					{ name: 'Get Policies', value: 'getPolicies', description: 'Get the contents of named sending authorization policies', action: 'Get identity policies' },
					{ name: 'Get Verification Attributes', value: 'getVerificationAttributes', description: 'Get the verification status/token for identities', action: 'Get identity verification attributes' },
					{ name: 'List', value: 'list', description: 'List identities (email addresses and/or domains)', action: 'List identities' },
					{ name: 'List Policies', value: 'listPolicies', description: 'List the sending authorization policy names for an identity', action: 'List identity policies' },
					{ name: 'Put Policy', value: 'putPolicy', description: 'Add or update a sending authorization policy for an identity', action: 'Put an identity policy' },
					{ name: 'Set DKIM Enabled', value: 'setDkimEnabled', description: 'Enable or disable Easy DKIM signing for an identity', action: 'Set identity DKIM enabled' },
					{ name: 'Set Feedback Forwarding Enabled', value: 'setFeedbackForwardingEnabled', description: 'Enable or disable forwarding of bounce/complaint notifications by email', action: 'Set identity feedback forwarding enabled' },
					{ name: 'Set Headers In Notifications Enabled', value: 'setHeadersInNotificationsEnabled', description: 'Enable or disable inclusion of original headers in SNS notifications', action: 'Set identity headers in notifications enabled' },
					{ name: 'Set Mail-From Domain', value: 'setMailFromDomain', description: 'Set or clear the custom MAIL FROM domain for an identity', action: 'Set identity mail from domain' },
					{ name: 'Set Notification Topic', value: 'setNotificationTopic', description: 'Set the SNS topic for bounce/complaint/delivery notifications', action: 'Set identity notification topic' },
					{ name: 'Verify Domain DKIM', value: 'verifyDomainDkim', description: 'Generate DKIM tokens for a domain so DKIM signing can be enabled', action: 'Verify domain DKIM' },
					{ name: 'Verify Domain Identity', value: 'verifyDomainIdentity', description: 'Start domain verification and get the TXT record token', action: 'Verify a domain identity' },
					{ name: 'Verify Email Identity', value: 'verifyEmailIdentity', description: 'Send a verification email to an address', action: 'Verify an email identity' },
				],
				default: 'verifyEmailIdentity',
			},
			{ displayName: 'Email Address', name: 'emailAddress', type: 'string', default: '', required: true, displayOptions: show('identity', ['verifyEmailIdentity']) },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', displayOptions: show('identity', ['verifyDomainIdentity', 'verifyDomainDkim']) },
			{ ...identityField, displayOptions: show('identity', ['delete', 'setDkimEnabled', 'setFeedbackForwardingEnabled', 'setHeadersInNotificationsEnabled', 'setMailFromDomain', 'setNotificationTopic', 'getPolicies', 'listPolicies', 'deletePolicy', 'putPolicy']) },
			{ ...identitiesField, displayOptions: show('identity', ['getVerificationAttributes', 'getDkimAttributes', 'getMailFromDomainAttributes', 'getNotificationAttributes']) },
			{
				displayName: 'Identity Type',
				name: 'identityType',
				type: 'options',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Email Address', value: 'EmailAddress' },
					{ name: 'Domain', value: 'Domain' },
				],
				default: '',
				displayOptions: show('identity', ['list']),
			},
			{ ...returnAllField, displayOptions: show('identity', ['list']) },
			{ ...maxItemsField, displayOptions: show('identity', ['list']) },
			{ ...nextTokenField, displayOptions: show('identity', ['list']) },
			{
				displayName: 'DKIM Enabled',
				name: 'dkimEnabled',
				type: 'boolean',
				default: true,
				displayOptions: show('identity', ['setDkimEnabled']),
			},
			{
				displayName: 'Forwarding Enabled',
				name: 'forwardingEnabled',
				type: 'boolean',
				default: true,
				displayOptions: show('identity', ['setFeedbackForwardingEnabled']),
			},
			{
				displayName: 'Notification Type',
				name: 'notificationType',
				type: 'options',
				options: [
					{ name: 'Bounce', value: 'Bounce' },
					{ name: 'Complaint', value: 'Complaint' },
					{ name: 'Delivery', value: 'Delivery' },
				],
				default: 'Bounce',
				displayOptions: show('identity', ['setHeadersInNotificationsEnabled', 'setNotificationTopic']),
			},
			{
				displayName: 'Enabled',
				name: 'headersEnabled',
				type: 'boolean',
				default: true,
				displayOptions: show('identity', ['setHeadersInNotificationsEnabled']),
			},
			{
				displayName: 'SNS Topic ARN',
				name: 'snsTopic',
				type: 'string',
				default: '',
				description: 'Leave empty to disable notifications of this type via SNS',
				displayOptions: show('identity', ['setNotificationTopic']),
			},
			{
				displayName: 'Mail-From Domain',
				name: 'mailFromDomain',
				type: 'string',
				default: '',
				description: 'Leave empty to revert to the default amazonses.com MAIL FROM domain',
				placeholder: 'mail.example.com',
				displayOptions: show('identity', ['setMailFromDomain']),
			},
			{
				displayName: 'Behavior On MX Failure',
				name: 'behaviorOnMxFailure',
				type: 'options',
				options: [
					{ name: 'Use Default Value', value: 'UseDefaultValue' },
					{ name: 'Reject Message', value: 'RejectMessage' },
				],
				default: 'UseDefaultValue',
				displayOptions: show('identity', ['setMailFromDomain']),
			},
			{
				displayName: 'Policy Names',
				name: 'policyNames',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated policy names to retrieve',
				displayOptions: show('identity', ['getPolicies']),
			},
			{ displayName: 'Policy Name', name: 'policyName', type: 'string', default: '', required: true, displayOptions: show('identity', ['deletePolicy', 'putPolicy']) },
			{
				displayName: 'Policy (JSON)',
				name: 'policy',
				type: 'json',
				default: '{}',
				required: true,
				description: 'The IAM sending authorization policy document',
				displayOptions: show('identity', ['putPolicy']),
			},

			// ========================================================== TEMPLATE =============================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an email template', action: 'Create a template' },
					{ name: 'Delete', value: 'delete', description: 'Delete an email template', action: 'Delete a template' },
					{ name: 'Get', value: 'get', description: 'Get the contents of an email template', action: 'Get a template' },
					{ name: 'List', value: 'list', description: 'List email templates', action: 'List many templates' },
					{ name: 'Test Render', value: 'testRender', description: 'Render a template with sample data without sending it', action: 'Test render a template' },
					{ name: 'Update', value: 'update', description: 'Update an email template', action: 'Update a template' },
				],
				default: 'create',
			},
			{ ...templateNameField, displayOptions: show('template', ['create', 'update', 'delete', 'get', 'testRender']) },
			{ displayName: 'Subject Part', name: 'subjectPart', type: 'string', default: '', required: true, description: 'Subject line of the email, supports {{variables}}', displayOptions: show('template', ['create', 'update']) },
			{ displayName: 'Text Part', name: 'textPart', type: 'string', typeOptions: { rows: 4 }, default: '', description: 'Plain-text body of the email, supports {{variables}}', displayOptions: show('template', ['create', 'update']) },
			{ displayName: 'HTML Part', name: 'htmlPart', type: 'string', typeOptions: { rows: 4 }, default: '', description: 'HTML body of the email, supports {{variables}}', displayOptions: show('template', ['create', 'update']) },
			{ ...returnAllField, displayOptions: show('template', ['list']) },
			{ ...maxItemsField, displayOptions: show('template', ['list']) },
			{ ...nextTokenField, displayOptions: show('template', ['list']) },
			{
				displayName: 'Template Data',
				name: 'templateData',
				type: 'json',
				default: '{}',
				description: 'JSON object of replacement values to render the template with',
				displayOptions: show('template', ['testRender']),
			},

			// ================================================ CUSTOM VERIFICATION TEMPLATE ===================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['customVerificationTemplate'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a custom verification email template', action: 'Create a custom verification template' },
					{ name: 'Delete', value: 'delete', description: 'Delete a custom verification email template', action: 'Delete a custom verification template' },
					{ name: 'Get', value: 'get', description: 'Get a custom verification email template', action: 'Get a custom verification template' },
					{ name: 'List', value: 'list', description: 'List custom verification email templates', action: 'List many custom verification templates' },
					{ name: 'Update', value: 'update', description: 'Update a custom verification email template', action: 'Update a custom verification template' },
				],
				default: 'create',
			},
			{ ...templateNameField, displayOptions: show('customVerificationTemplate', ['create', 'update', 'delete', 'get']) },
			{ displayName: 'From Email Address', name: 'fromEmailAddress', type: 'string', default: '', required: true, displayOptions: show('customVerificationTemplate', ['create', 'update']) },
			{ displayName: 'Template Subject', name: 'templateSubject', type: 'string', default: '', required: true, displayOptions: show('customVerificationTemplate', ['create', 'update']) },
			{ displayName: 'Template Content (HTML)', name: 'templateContent', type: 'string', typeOptions: { rows: 6 }, default: '', required: true, displayOptions: show('customVerificationTemplate', ['create', 'update']) },
			{ displayName: 'Success Redirection URL', name: 'successRedirectionURL', type: 'string', default: '', required: true, displayOptions: show('customVerificationTemplate', ['create', 'update']) },
			{ displayName: 'Failure Redirection URL', name: 'failureRedirectionURL', type: 'string', default: '', required: true, displayOptions: show('customVerificationTemplate', ['create', 'update']) },
			{ ...returnAllField, displayOptions: show('customVerificationTemplate', ['list']) },
			{ ...maxItemsField, displayName: 'Max Results', name: 'maxResults', displayOptions: show('customVerificationTemplate', ['list']) },
			{ ...nextTokenField, displayOptions: show('customVerificationTemplate', ['list']) },

			// ======================================================= CONFIGURATION SET =======================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['configurationSet'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a configuration set', action: 'Create a configuration set' },
					{ name: 'Create Event Destination', value: 'createEventDestination', description: 'Add an event destination (SNS/CloudWatch/Kinesis Firehose) to a configuration set', action: 'Create a configuration set event destination' },
					{ name: 'Create Tracking Options', value: 'createTrackingOptions', description: 'Set a custom open/click tracking domain for a configuration set', action: 'Create configuration set tracking options' },
					{ name: 'Delete', value: 'delete', description: 'Delete a configuration set', action: 'Delete a configuration set' },
					{ name: 'Delete Event Destination', value: 'deleteEventDestination', description: 'Remove an event destination from a configuration set', action: 'Delete a configuration set event destination' },
					{ name: 'Delete Tracking Options', value: 'deleteTrackingOptions', description: 'Remove the custom tracking domain from a configuration set', action: 'Delete configuration set tracking options' },
					{ name: 'Describe', value: 'describe', description: 'Get the details of a configuration set', action: 'Describe a configuration set' },
					{ name: 'List', value: 'list', description: 'List configuration sets', action: 'List many configuration sets' },
					{ name: 'Put Delivery Options', value: 'putDeliveryOptions', description: 'Set whether TLS is required for a configuration set', action: 'Put configuration set delivery options' },
					{ name: 'Update Event Destination', value: 'updateEventDestination', description: 'Update an existing event destination', action: 'Update a configuration set event destination' },
					{ name: 'Update Reputation Metrics Enabled', value: 'updateReputationMetricsEnabled', description: 'Enable or disable reputation metric publishing to CloudWatch', action: 'Update configuration set reputation metrics enabled' },
					{ name: 'Update Sending Enabled', value: 'updateSendingEnabled', description: 'Enable or disable email sending for a configuration set', action: 'Update configuration set sending enabled' },
					{ name: 'Update Tracking Options', value: 'updateTrackingOptions', description: 'Update the custom tracking domain for a configuration set', action: 'Update configuration set tracking options' },
				],
				default: 'create',
			},
			{
				...configurationSetNameField,
				displayOptions: show('configurationSet', [
					'create', 'delete', 'describe', 'putDeliveryOptions', 'createEventDestination', 'deleteEventDestination',
					'updateEventDestination', 'updateReputationMetricsEnabled', 'updateSendingEnabled', 'createTrackingOptions',
					'deleteTrackingOptions', 'updateTrackingOptions',
				]),
			},
			{
				displayName: 'Configuration Set Attribute Names',
				name: 'configurationSetAttributeNames',
				type: 'multiOptions',
				options: [
					{ name: 'Delivery Options', value: 'deliveryOptions' },
					{ name: 'Event Destinations', value: 'eventDestinations' },
					{ name: 'Reputation Options', value: 'reputationOptions' },
					{ name: 'Sending Options', value: 'sendingOptions' },
					{ name: 'Tracking Options', value: 'trackingOptions' },
				],
				default: [],
				displayOptions: show('configurationSet', ['describe']),
			},
			{ ...returnAllField, displayOptions: show('configurationSet', ['list']) },
			{ ...maxItemsField, displayOptions: show('configurationSet', ['list']) },
			{ ...nextTokenField, displayOptions: show('configurationSet', ['list']) },
			{
				displayName: 'Require TLS',
				name: 'requireTls',
				type: 'boolean',
				default: false,
				displayOptions: show('configurationSet', ['putDeliveryOptions']),
			},
			{
				displayName: 'Event Destination (JSON)',
				name: 'eventDestination',
				type: 'json',
				default: '{\n  "Name": "my-destination",\n  "Enabled": true,\n  "MatchingEventTypes": ["send", "bounce", "complaint"],\n  "CloudWatchDestination": {\n    "DimensionConfigurations": []\n  }\n}',
				required: true,
				description: 'The EventDestination object, as documented in the SES API reference',
				displayOptions: show('configurationSet', ['createEventDestination', 'updateEventDestination']),
			},
			{
				displayName: 'Event Destination Name',
				name: 'eventDestinationName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: show('configurationSet', ['deleteEventDestination']),
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				displayOptions: show('configurationSet', ['updateReputationMetricsEnabled', 'updateSendingEnabled']),
			},
			{
				displayName: 'Custom Redirect Domain',
				name: 'customRedirectDomain',
				type: 'string',
				default: '',
				required: true,
				description: 'Domain used to redirect email recipients for open/click tracking',
				displayOptions: show('configurationSet', ['createTrackingOptions', 'updateTrackingOptions']),
			},

			// =========================================================== RECEIPT RULE SET ====================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['receiptRuleSet'] } },
				options: [
					{ name: 'Clone', value: 'clone', description: 'Create a receipt rule set by cloning an existing one', action: 'Clone a receipt rule set' },
					{ name: 'Create', value: 'create', description: 'Create an empty receipt rule set', action: 'Create a receipt rule set' },
					{ name: 'Delete', value: 'delete', description: 'Delete a receipt rule set', action: 'Delete a receipt rule set' },
					{ name: 'Describe', value: 'describe', description: 'Get the details of a receipt rule set', action: 'Describe a receipt rule set' },
					{ name: 'Describe Active', value: 'describeActive', description: 'Get the currently active receipt rule set', action: 'Describe the active receipt rule set' },
					{ name: 'List', value: 'list', description: 'List the receipt rule sets on the account', action: 'List many receipt rule sets' },
					{ name: 'Reorder', value: 'reorder', description: 'Reorder the receipt rules within a rule set', action: 'Reorder a receipt rule set' },
					{ name: 'Set Active', value: 'setActive', description: 'Set the receipt rule set to use for incoming mail', action: 'Set the active receipt rule set' },
				],
				default: 'create',
			},
			{ ...ruleSetNameField, displayOptions: show('receiptRuleSet', ['create', 'delete', 'describe', 'reorder']) },
			{ displayName: 'New Rule Set Name', name: 'newRuleSetName', type: 'string', default: '', required: true, displayOptions: show('receiptRuleSet', ['clone']) },
			{ displayName: 'Original Rule Set Name', name: 'originalRuleSetName', type: 'string', default: '', required: true, displayOptions: show('receiptRuleSet', ['clone']) },
			{
				displayName: 'Rule Set Name',
				name: 'activeRuleSetName',
				type: 'string',
				default: '',
				description: 'Leave empty to disable all email receiving',
				displayOptions: show('receiptRuleSet', ['setActive']),
			},
			{ ...returnAllField, displayOptions: show('receiptRuleSet', ['list']) },
			{ ...nextTokenField, displayOptions: show('receiptRuleSet', ['list']) },
			{
				displayName: 'Rule Names',
				name: 'ruleNames',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated rule names, in the order they should be applied',
				displayOptions: show('receiptRuleSet', ['reorder']),
			},

			// ============================================================= RECEIPT RULE =======================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['receiptRule'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a receipt rule', action: 'Create a receipt rule' },
					{ name: 'Delete', value: 'delete', description: 'Delete a receipt rule', action: 'Delete a receipt rule' },
					{ name: 'Describe', value: 'describe', description: 'Get the details of a receipt rule', action: 'Describe a receipt rule' },
					{ name: 'Set Position', value: 'setPosition', description: "Move a receipt rule to a new position in its rule set", action: 'Set a receipt rule position' },
					{ name: 'Update', value: 'update', description: 'Replace the contents of a receipt rule', action: 'Update a receipt rule' },
				],
				default: 'create',
			},
			{ ...ruleSetNameField, displayOptions: show('receiptRule', ['create', 'delete', 'describe', 'update', 'setPosition']) },
			{ ...ruleNameField, displayOptions: show('receiptRule', ['delete', 'describe', 'setPosition']) },
			{
				displayName: 'Rule (JSON)',
				name: 'rule',
				type: 'json',
				default: '{\n  "Name": "my-rule",\n  "Enabled": true,\n  "TlsPolicy": "Optional",\n  "Recipients": [],\n  "Actions": [\n    { "S3Action": { "BucketName": "my-bucket" } }\n  ],\n  "ScanEnabled": true\n}',
				required: true,
				description: 'The ReceiptRule object, as documented in the SES API reference',
				displayOptions: show('receiptRule', ['create', 'update']),
			},
			{
				displayName: 'Insert After Rule',
				name: 'after',
				type: 'string',
				default: '',
				description: 'Name of an existing rule to insert this rule after. Leave empty to insert it at the beginning of the rule set.',
				displayOptions: show('receiptRule', ['create', 'setPosition']),
			},

			// ============================================================ RECEIPT FILTER ======================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['receiptFilter'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an IP address filter for incoming mail', action: 'Create a receipt filter' },
					{ name: 'Delete', value: 'delete', description: 'Delete an IP address filter', action: 'Delete a receipt filter' },
					{ name: 'List', value: 'list', description: 'List IP address filters', action: 'List many receipt filters' },
				],
				default: 'create',
			},
			{ displayName: 'Filter Name', name: 'filterName', type: 'string', default: '', required: true, displayOptions: show('receiptFilter', ['create', 'delete']) },
			{ displayName: 'CIDR', name: 'cidr', type: 'string', default: '', required: true, placeholder: '10.0.0.1/24', description: 'The IP address or CIDR range to filter on', displayOptions: show('receiptFilter', ['create']) },
			{
				displayName: 'Policy',
				name: 'policy',
				type: 'options',
				options: [
					{ name: 'Allow', value: 'Allow' },
					{ name: 'Block', value: 'Block' },
				],
				default: 'Block',
				displayOptions: show('receiptFilter', ['create']),
			},

			// ================================================================ ACCOUNT ========================================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Get Account Details', value: 'getAccountDetails', description: 'Check whether the account is in the SES sandbox or has production sending access', action: 'Get account details' },
					{ name: 'Get Send Quota', value: 'getSendQuota', description: 'Get your sending limits and current usage', action: 'Get the send quota' },
					{ name: 'Get Send Statistics', value: 'getSendStatistics', description: 'Get your sending activity for the last two weeks', action: 'Get send statistics' },
					{ name: 'Get Sending Enabled', value: 'getSendingEnabled', description: 'Check whether email sending is enabled for the account', action: 'Get account sending enabled' },
					{ name: 'Update Sending Enabled', value: 'updateSendingEnabled', description: 'Enable or disable email sending for the account', action: 'Update account sending enabled' },
				],
				default: 'getSendQuota',
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				displayOptions: show('account', ['updateSendingEnabled']),
			},
		],
	};

	methods = {
		credentialTest: {
			async awsSesApiCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const signed = buildSignedSesRequest(credential.data ?? {}, 'GetSendQuota', {});
				try {
					// ICredentialTestFunctions only exposes the legacy `request` helper (no httpRequest);
					// the request is already SigV4-signed by hand above.
					// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
					await this.helpers.request({
						method: signed.method,
						url: signed.url,
						headers: signed.headers,
						body: signed.body,
					});
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
					};
				}

				// GetAccount (SESv2) is the only reliable way to tell a sandbox account (verified
				// recipients only, ~200 msgs/24h) apart from one with production access. Its failure
				// (e.g. the IAM user lacks ses:GetAccount) shouldn't fail the credential test itself.
				let environmentNote = '';
				try {
					const v2Signed = buildSignedSesV2Request(credential.data ?? {}, 'GET', '/v2/email/account');
					// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
					const raw = await this.helpers.request({
						method: v2Signed.method,
						url: v2Signed.url,
						headers: v2Signed.headers,
						json: true,
					});
					const account = typeof raw === 'string' ? (JSON.parse(raw) as IDataObject) : (raw as IDataObject);
					environmentNote = account.ProductionAccessEnabled
						? ' Account has production sending access.'
						: ' Account is in the SES sandbox (can only send to/from verified identities).';
				} catch {
					// Not fatal — see comment above.
				}

				return { status: 'OK', message: `Connection successful!${environmentNote}` };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject = {};
				let multipleResults: IDataObject[] | undefined;

				const p = <T>(name: string, fallback?: T) => this.getNodeParameter(name, i, fallback) as T;
				const json = (name: string) => parseJsonParameter.call(this, p<string>(name, '{}'), name, i) as IDataObject;

				if (resource === 'email') {
					if (operation === 'sendEmail') {
						const additionalFields = p<IDataObject>('additionalFields', {});
						const bodyContentType = p<string>('bodyContentType');
						const message: IDataObject = { Subject: { Data: p<string>('subject') } };
						const body: IDataObject = {};
						if (bodyContentType === 'text' || bodyContentType === 'both') body.Text = { Data: p<string>('bodyText', '') };
						if (bodyContentType === 'html' || bodyContentType === 'both') body.Html = { Data: p<string>('bodyHtml', '') };
						message.Body = body;

						responseData = await awsSesApiRequest.call(this, 'SendEmail', {
							Source: p<string>('source'),
							Destination: {
								ToAddresses: splitAddresses(p<string>('toAddresses')),
								CcAddresses: splitAddresses(p<string>('ccAddresses', '')),
								BccAddresses: splitAddresses(p<string>('bccAddresses', '')),
							},
							Message: message,
							ReplyToAddresses: splitAddresses((additionalFields.replyToAddresses as string) ?? ''),
							ReturnPath: additionalFields.returnPath,
							ConfigurationSetName: additionalFields.configurationSetName,
						});
					} else if (operation === 'sendRawEmail') {
						const additionalFields = p<IDataObject>('additionalFields', {});
						const composeMode = p<string>('rawComposeMode', 'simple');

						let rawMime: string;
						let destinations: string[];
						if (composeMode === 'raw') {
							rawMime = p<string>('rawMessage');
							destinations = splitAddresses(p<string>('rawDestinations', ''));
						} else {
							rawMime = await buildSimpleMimeMessage.call(this, i, {
								from: p<string>('source'),
								to: splitAddresses(p<string>('rawToAddresses')),
								cc: splitAddresses(p<string>('rawCcAddresses', '')),
								bcc: splitAddresses(p<string>('rawBccAddresses', '')),
								subject: p<string>('rawSubject'),
								bodyText: p<string>('rawBodyText', ''),
								bodyHtml: p<string>('rawBodyHtml', ''),
								attachmentPropertyNames: splitAddresses(p<string>('attachmentPropertyNames', '')),
							});
							destinations = [];
						}

						responseData = await awsSesApiRequest.call(this, 'SendRawEmail', {
							Source: p<string>('source'),
							Destinations: destinations.length ? destinations : undefined,
							RawMessage: { Data: Buffer.from(rawMime, 'utf8').toString('base64') },
							ConfigurationSetName: additionalFields.configurationSetName,
						});
					} else if (operation === 'sendTemplatedEmail') {
						const additionalFields = p<IDataObject>('additionalFields', {});
						responseData = await awsSesApiRequest.call(this, 'SendTemplatedEmail', {
							Source: p<string>('source'),
							Destination: {
								ToAddresses: splitAddresses(p<string>('toAddresses')),
								CcAddresses: splitAddresses(p<string>('ccAddresses', '')),
								BccAddresses: splitAddresses(p<string>('bccAddresses', '')),
							},
							Template: p<string>('templateName'),
							TemplateData: p<string>('templateData', '{}'),
							ReplyToAddresses: splitAddresses((additionalFields.replyToAddresses as string) ?? ''),
							ReturnPath: additionalFields.returnPath,
							ConfigurationSetName: additionalFields.configurationSetName,
						});
					} else if (operation === 'sendBulkTemplatedEmail') {
						const additionalFields = p<IDataObject>('additionalFields', {});
						responseData = await awsSesApiRequest.call(this, 'SendBulkTemplatedEmail', {
							Source: p<string>('source'),
							Template: p<string>('templateName'),
							DefaultTemplateData: p<string>('defaultTemplateData', '{}'),
							Destinations: json('bulkDestinations'),
							ConfigurationSetName: additionalFields.configurationSetName,
						});
					} else if (operation === 'sendCustomVerificationEmail') {
						responseData = await awsSesApiRequest.call(this, 'SendCustomVerificationEmail', {
							EmailAddress: p<string>('emailAddress'),
							TemplateName: p<string>('templateName'),
							ConfigurationSetName: p<string>('configurationSetName', ''),
						});
					} else if (operation === 'sendBounce') {
						const additionalFields = p<IDataObject>('additionalFields', {});
						responseData = await awsSesApiRequest.call(this, 'SendBounce', {
							OriginalMessageId: p<string>('originalMessageId'),
							BounceSender: p<string>('bounceSender'),
							BouncedRecipientInfoList: json('bouncedRecipientInfoList'),
							Explanation: additionalFields.explanation,
							MessageDsn: additionalFields.messageDsn ? JSON.parse(additionalFields.messageDsn as string) : undefined,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'identity') {
					if (operation === 'verifyEmailIdentity') {
						responseData = await awsSesApiRequest.call(this, 'VerifyEmailIdentity', { EmailAddress: p<string>('emailAddress') });
					} else if (operation === 'verifyDomainIdentity') {
						responseData = await awsSesApiRequest.call(this, 'VerifyDomainIdentity', { Domain: p<string>('domain') });
					} else if (operation === 'verifyDomainDkim') {
						responseData = await awsSesApiRequest.call(this, 'VerifyDomainDkim', { Domain: p<string>('domain') });
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteIdentity', { Identity: p<string>('identity') });
					} else if (operation === 'list') {
						const identityType = p<string>('identityType', '') || undefined;
						if (p<boolean>('returnAll', false)) {
							multipleResults = await awsSesListAll.call(this, 'ListIdentities', { IdentityType: identityType }, 'Identities');
						} else {
							responseData = await awsSesApiRequest.call(this, 'ListIdentities', {
								IdentityType: identityType,
								MaxItems: p<number>('maxItems', 0) || undefined,
								NextToken: p<string>('nextToken', ''),
							});
						}
					} else if (operation === 'getVerificationAttributes') {
						responseData = await awsSesApiRequest.call(this, 'GetIdentityVerificationAttributes', { Identities: splitAddresses(p<string>('identities')) });
					} else if (operation === 'getDkimAttributes') {
						responseData = await awsSesApiRequest.call(this, 'GetIdentityDkimAttributes', { Identities: splitAddresses(p<string>('identities')) });
					} else if (operation === 'getMailFromDomainAttributes') {
						responseData = await awsSesApiRequest.call(this, 'GetIdentityMailFromDomainAttributes', { Identities: splitAddresses(p<string>('identities')) });
					} else if (operation === 'getNotificationAttributes') {
						responseData = await awsSesApiRequest.call(this, 'GetIdentityNotificationAttributes', { Identities: splitAddresses(p<string>('identities')) });
					} else if (operation === 'setDkimEnabled') {
						responseData = await awsSesApiRequest.call(this, 'SetIdentityDkimEnabled', { Identity: p<string>('identity'), DkimEnabled: p<boolean>('dkimEnabled') });
					} else if (operation === 'setFeedbackForwardingEnabled') {
						responseData = await awsSesApiRequest.call(this, 'SetIdentityFeedbackForwardingEnabled', { Identity: p<string>('identity'), ForwardingEnabled: p<boolean>('forwardingEnabled') });
					} else if (operation === 'setHeadersInNotificationsEnabled') {
						responseData = await awsSesApiRequest.call(this, 'SetIdentityHeadersInNotificationsEnabled', {
							Identity: p<string>('identity'),
							NotificationType: p<string>('notificationType'),
							Enabled: p<boolean>('headersEnabled'),
						});
					} else if (operation === 'setMailFromDomain') {
						responseData = await awsSesApiRequest.call(this, 'SetIdentityMailFromDomain', {
							Identity: p<string>('identity'),
							MailFromDomain: p<string>('mailFromDomain', ''),
							BehaviorOnMXFailure: p<string>('behaviorOnMxFailure'),
						});
					} else if (operation === 'setNotificationTopic') {
						responseData = await awsSesApiRequest.call(this, 'SetIdentityNotificationTopic', {
							Identity: p<string>('identity'),
							NotificationType: p<string>('notificationType'),
							SnsTopic: p<string>('snsTopic', ''),
						});
					} else if (operation === 'getPolicies') {
						responseData = await awsSesApiRequest.call(this, 'GetIdentityPolicies', { Identity: p<string>('identity'), PolicyNames: splitAddresses(p<string>('policyNames')) });
					} else if (operation === 'listPolicies') {
						responseData = await awsSesApiRequest.call(this, 'ListIdentityPolicies', { Identity: p<string>('identity') });
					} else if (operation === 'deletePolicy') {
						responseData = await awsSesApiRequest.call(this, 'DeleteIdentityPolicy', { Identity: p<string>('identity'), PolicyName: p<string>('policyName') });
					} else if (operation === 'putPolicy') {
						responseData = await awsSesApiRequest.call(this, 'PutIdentityPolicy', { Identity: p<string>('identity'), PolicyName: p<string>('policyName'), Policy: p<string>('policy') });
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'template') {
					if (operation === 'create' || operation === 'update') {
						const action = operation === 'create' ? 'CreateTemplate' : 'UpdateTemplate';
						responseData = await awsSesApiRequest.call(this, action, {
							Template: {
								TemplateName: p<string>('templateName'),
								SubjectPart: p<string>('subjectPart'),
								TextPart: p<string>('textPart', ''),
								HtmlPart: p<string>('htmlPart', ''),
							},
						});
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteTemplate', { TemplateName: p<string>('templateName') });
					} else if (operation === 'get') {
						responseData = await awsSesApiRequest.call(this, 'GetTemplate', { TemplateName: p<string>('templateName') });
					} else if (operation === 'list') {
						if (p<boolean>('returnAll', false)) {
							multipleResults = await awsSesListAll.call(this, 'ListTemplates', {}, 'TemplatesMetadata');
						} else {
							responseData = await awsSesApiRequest.call(this, 'ListTemplates', {
								MaxItems: p<number>('maxItems', 0) || undefined,
								NextToken: p<string>('nextToken', ''),
							});
						}
					} else if (operation === 'testRender') {
						responseData = await awsSesApiRequest.call(this, 'TestRenderTemplate', {
							TemplateName: p<string>('templateName'),
							TemplateData: p<string>('templateData', '{}'),
						});
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'customVerificationTemplate') {
					if (operation === 'create' || operation === 'update') {
						const action = operation === 'create' ? 'CreateCustomVerificationEmailTemplate' : 'UpdateCustomVerificationEmailTemplate';
						responseData = await awsSesApiRequest.call(this, action, {
							TemplateName: p<string>('templateName'),
							FromEmailAddress: p<string>('fromEmailAddress'),
							TemplateSubject: p<string>('templateSubject'),
							TemplateContent: p<string>('templateContent'),
							SuccessRedirectionURL: p<string>('successRedirectionURL'),
							FailureRedirectionURL: p<string>('failureRedirectionURL'),
						});
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteCustomVerificationEmailTemplate', { TemplateName: p<string>('templateName') });
					} else if (operation === 'get') {
						responseData = await awsSesApiRequest.call(this, 'GetCustomVerificationEmailTemplate', { TemplateName: p<string>('templateName') });
					} else if (operation === 'list') {
						if (p<boolean>('returnAll', false)) {
							multipleResults = await awsSesListAll.call(this, 'ListCustomVerificationEmailTemplates', {}, 'CustomVerificationEmailTemplates');
						} else {
							responseData = await awsSesApiRequest.call(this, 'ListCustomVerificationEmailTemplates', {
								MaxResults: p<number>('maxResults', 0) || undefined,
								NextToken: p<string>('nextToken', ''),
							});
						}
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'configurationSet') {
					if (operation === 'create') {
						responseData = await awsSesApiRequest.call(this, 'CreateConfigurationSet', { ConfigurationSet: { Name: p<string>('configurationSetName') } });
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteConfigurationSet', { ConfigurationSetName: p<string>('configurationSetName') });
					} else if (operation === 'describe') {
						responseData = await awsSesApiRequest.call(this, 'DescribeConfigurationSet', {
							ConfigurationSetName: p<string>('configurationSetName'),
							ConfigurationSetAttributeNames: p<string[]>('configurationSetAttributeNames', []),
						});
					} else if (operation === 'list') {
						if (p<boolean>('returnAll', false)) {
							multipleResults = await awsSesListAll.call(this, 'ListConfigurationSets', {}, 'ConfigurationSets');
						} else {
							responseData = await awsSesApiRequest.call(this, 'ListConfigurationSets', {
								MaxItems: p<number>('maxItems', 0) || undefined,
								NextToken: p<string>('nextToken', ''),
							});
						}
					} else if (operation === 'putDeliveryOptions') {
						responseData = await awsSesApiRequest.call(this, 'PutConfigurationSetDeliveryOptions', {
							ConfigurationSetName: p<string>('configurationSetName'),
							DeliveryOptions: { TlsPolicy: p<boolean>('requireTls') ? 'Require' : 'Optional' },
						});
					} else if (operation === 'createEventDestination' || operation === 'updateEventDestination') {
						const action = operation === 'createEventDestination' ? 'CreateConfigurationSetEventDestination' : 'UpdateConfigurationSetEventDestination';
						responseData = await awsSesApiRequest.call(this, action, {
							ConfigurationSetName: p<string>('configurationSetName'),
							EventDestination: json('eventDestination'),
						});
					} else if (operation === 'deleteEventDestination') {
						responseData = await awsSesApiRequest.call(this, 'DeleteConfigurationSetEventDestination', {
							ConfigurationSetName: p<string>('configurationSetName'),
							EventDestinationName: p<string>('eventDestinationName'),
						});
					} else if (operation === 'updateReputationMetricsEnabled') {
						responseData = await awsSesApiRequest.call(this, 'UpdateConfigurationSetReputationMetricsEnabled', {
							ConfigurationSetName: p<string>('configurationSetName'),
							Enabled: p<boolean>('enabled'),
						});
					} else if (operation === 'updateSendingEnabled') {
						responseData = await awsSesApiRequest.call(this, 'UpdateConfigurationSetSendingEnabled', {
							ConfigurationSetName: p<string>('configurationSetName'),
							Enabled: p<boolean>('enabled'),
						});
					} else if (operation === 'createTrackingOptions' || operation === 'updateTrackingOptions') {
						const action = operation === 'createTrackingOptions' ? 'CreateConfigurationSetTrackingOptions' : 'UpdateConfigurationSetTrackingOptions';
						responseData = await awsSesApiRequest.call(this, action, {
							ConfigurationSetName: p<string>('configurationSetName'),
							TrackingOptions: { CustomRedirectDomain: p<string>('customRedirectDomain') },
						});
					} else if (operation === 'deleteTrackingOptions') {
						responseData = await awsSesApiRequest.call(this, 'DeleteConfigurationSetTrackingOptions', { ConfigurationSetName: p<string>('configurationSetName') });
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'receiptRuleSet') {
					if (operation === 'clone') {
						responseData = await awsSesApiRequest.call(this, 'CloneReceiptRuleSet', {
							RuleSetName: p<string>('newRuleSetName'),
							OriginalRuleSetName: p<string>('originalRuleSetName'),
						});
					} else if (operation === 'create') {
						responseData = await awsSesApiRequest.call(this, 'CreateReceiptRuleSet', { RuleSetName: p<string>('ruleSetName') });
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteReceiptRuleSet', { RuleSetName: p<string>('ruleSetName') });
					} else if (operation === 'describe') {
						responseData = await awsSesApiRequest.call(this, 'DescribeReceiptRuleSet', { RuleSetName: p<string>('ruleSetName') });
					} else if (operation === 'describeActive') {
						responseData = await awsSesApiRequest.call(this, 'DescribeActiveReceiptRuleSet', {});
					} else if (operation === 'list') {
						if (p<boolean>('returnAll', false)) {
							multipleResults = await awsSesListAll.call(this, 'ListReceiptRuleSets', {}, 'RuleSets');
						} else {
							responseData = await awsSesApiRequest.call(this, 'ListReceiptRuleSets', { NextToken: p<string>('nextToken', '') });
						}
					} else if (operation === 'reorder') {
						responseData = await awsSesApiRequest.call(this, 'ReorderReceiptRuleSet', {
							RuleSetName: p<string>('ruleSetName'),
							RuleNames: splitAddresses(p<string>('ruleNames')),
						});
					} else if (operation === 'setActive') {
						responseData = await awsSesApiRequest.call(this, 'SetActiveReceiptRuleSet', { RuleSetName: p<string>('activeRuleSetName', '') });
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'receiptRule') {
					if (operation === 'create') {
						responseData = await awsSesApiRequest.call(this, 'CreateReceiptRule', {
							RuleSetName: p<string>('ruleSetName'),
							After: p<string>('after', ''),
							Rule: json('rule'),
						});
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteReceiptRule', { RuleSetName: p<string>('ruleSetName'), RuleName: p<string>('ruleName') });
					} else if (operation === 'describe') {
						responseData = await awsSesApiRequest.call(this, 'DescribeReceiptRule', { RuleSetName: p<string>('ruleSetName'), RuleName: p<string>('ruleName') });
					} else if (operation === 'update') {
						responseData = await awsSesApiRequest.call(this, 'UpdateReceiptRule', {
							RuleSetName: p<string>('ruleSetName'),
							Rule: json('rule'),
						});
					} else if (operation === 'setPosition') {
						responseData = await awsSesApiRequest.call(this, 'SetReceiptRulePosition', {
							RuleSetName: p<string>('ruleSetName'),
							RuleName: p<string>('ruleName'),
							After: p<string>('after', ''),
						});
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'receiptFilter') {
					if (operation === 'create') {
						responseData = await awsSesApiRequest.call(this, 'CreateReceiptFilter', {
							Filter: {
								Name: p<string>('filterName'),
								IpFilter: { Cidr: p<string>('cidr'), Policy: p<string>('policy') },
							},
						});
					} else if (operation === 'delete') {
						responseData = await awsSesApiRequest.call(this, 'DeleteReceiptFilter', { FilterName: p<string>('filterName') });
					} else if (operation === 'list') {
						responseData = await awsSesApiRequest.call(this, 'ListReceiptFilters', {});
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else if (resource === 'account') {
					if (operation === 'getAccountDetails') {
						responseData = await awsSesV2Request.call(this, 'GET', '/v2/email/account');
					} else if (operation === 'getSendQuota') {
						responseData = await awsSesApiRequest.call(this, 'GetSendQuota', {});
					} else if (operation === 'getSendStatistics') {
						responseData = await awsSesApiRequest.call(this, 'GetSendStatistics', {});
					} else if (operation === 'getSendingEnabled') {
						responseData = await awsSesApiRequest.call(this, 'GetAccountSendingEnabled', {});
					} else if (operation === 'updateSendingEnabled') {
						responseData = await awsSesApiRequest.call(this, 'UpdateAccountSendingEnabled', { Enabled: p<boolean>('enabled') });
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"!`, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`, { itemIndex: i });
				}

				if (multipleResults) {
					for (const result of multipleResults) {
						returnData.push({ json: result, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: responseData, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
