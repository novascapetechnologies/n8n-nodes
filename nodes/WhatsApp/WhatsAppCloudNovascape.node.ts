import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { parseJsonParameter, whatsAppApiBinaryRequest, whatsAppApiFormRequest, whatsAppApiRequest } from './GenericFunctions';

const replyContextField: INodeProperties = {
	displayName: 'Reply To Message ID',
	name: 'replyToMessageId',
	type: 'string',
	default: '',
	description: 'The wamid of the message being replied to, sets the "context.message_id" field',
};

const mediaSourceFields: INodeProperties[] = [
	{
		displayName: 'Media Source',
		name: 'mediaSource',
		type: 'options',
		options: [
			{ name: 'Media ID', value: 'id' },
			{ name: 'Media Link (URL)', value: 'link' },
		],
		default: 'id',
	},
	{
		displayName: 'Media ID or Link',
		name: 'mediaValue',
		type: 'string',
		default: '',
		required: true,
		description: 'Previously uploaded media object ID, or a publicly reachable HTTPS link to the file',
	},
];

export class WhatsAppCloudNovascape implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Cloud API (Novascape)',
		name: 'whatsAppCloudNovascape',
		icon: 'file:WhatsApp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Comprehensive integration with the Meta WhatsApp Cloud API - messages, templates, flows, media and account management',
		defaults: {
			name: 'WhatsApp Cloud API (Novascape)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'whatsAppCloudNovascapeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Authentication', value: 'authentication' },
					{ name: 'Block User', value: 'blockUsers' },
					{ name: 'Business', value: 'business' },
					{ name: 'Business Compliance', value: 'businessCompliance' },
					{ name: 'Business Profile', value: 'businessProfile' },
					{ name: 'Commerce Setting', value: 'commerceSettings' },
					{ name: 'Flow', value: 'flow' },
					{ name: 'Media', value: 'media' },
					{ name: 'Message', value: 'message' },
					{ name: 'Phone Number', value: 'phoneNumber' },
					{ name: 'QR Code', value: 'qrCode' },
					{ name: 'Template', value: 'template' },
					{ name: 'WABA', value: 'waba' },
					{ name: 'Webhook Subscription', value: 'webhook' },
				],
				default: 'message',
			},

			// ------------------------------- Authentication -------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['authentication'] } },
				options: [
					{
						name: 'Debug Access Token',
						value: 'debugToken',
						description: 'Inspect the configured access token (mainly useful to test the credential)',
						action: 'Debug the access token',
					},
				],
				default: 'debugToken',
			},

			// ----------------------------------- Message -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{ name: 'Mark as Read', value: 'markAsRead', description: 'Mark an inbound message as read', action: 'Mark a message as read' },
					{ name: 'Send Catalog Message', value: 'sendCatalog', description: 'Send the business catalog', action: 'Send a catalog message' },
					{ name: 'Send Contact', value: 'sendContact', description: 'Send one or more contact cards', action: 'Send a contact message' },
					{ name: 'Send Document', value: 'sendDocument', description: 'Send a document by media ID or link', action: 'Send a document message' },
					{ name: 'Send Flow', value: 'sendFlow', description: 'Send a WhatsApp Flow', action: 'Send a flow message' },
					{ name: 'Send Image', value: 'sendImage', description: 'Send an image by media ID or link', action: 'Send an image message' },
					{ name: 'Send Interactive Buttons', value: 'sendButtons', description: 'Send up to 3 quick-reply buttons', action: 'Send an interactive buttons message' },
					{ name: 'Send Interactive List', value: 'sendList', description: 'Send an interactive list message', action: 'Send an interactive list message' },
					{ name: 'Send Location', value: 'sendLocation', description: 'Send a location pin', action: 'Send a location message' },
					{ name: 'Send Multi-Product Message', value: 'sendMultiProduct', description: 'Send multiple catalog products grouped into sections', action: 'Send a multi product message' },
					{ name: 'Send Order Details', value: 'sendOrderDetails', description: 'Send an interactive order_details message', action: 'Send an order details message' },
					{ name: 'Send Order Status', value: 'sendOrderStatus', description: 'Send an interactive order_status message', action: 'Send an order status message' },
					{ name: 'Send Reaction', value: 'sendReaction', description: 'React to a message with an emoji', action: 'Send a reaction message' },
					{ name: 'Send Single Product Message', value: 'sendSingleProduct', description: 'Send a single catalog product', action: 'Send a single product message' },
					{ name: 'Send Sticker', value: 'sendSticker', description: 'Send a sticker by media ID or link', action: 'Send a sticker message' },
					{ name: 'Send Template', value: 'sendTemplate', description: 'Send a pre-approved message template', action: 'Send a template message' },
					{ name: 'Send Text', value: 'sendText', description: 'Send a free-form text message', action: 'Send a text message' },
					{ name: 'Send Typing Indicator', value: 'sendTypingIndicator', description: 'Show a typing indicator and mark the message as read', action: 'Send a typing indicator' },
					{ name: 'Send Video', value: 'sendVideo', description: 'Send a video by media ID or link', action: 'Send a video message' },
				],
				default: 'sendText',
			},
			{
				displayName: 'To (Recipient Phone Number)',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				description: 'Recipient WhatsApp ID / phone number in international format, no leading +',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: [
							'sendText', 'sendReaction', 'sendImage', 'sendAudio', 'sendDocument', 'sendSticker', 'sendVideo',
							'sendContact', 'sendLocation', 'sendTemplate', 'sendList', 'sendButtons', 'sendSingleProduct',
							'sendMultiProduct', 'sendCatalog', 'sendOrderDetails', 'sendOrderStatus', 'sendFlow',
						],
					},
				},
			},
			// Send Text
			{
				displayName: 'Body',
				name: 'textBody',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendText'] } },
			},
			{
				displayName: 'Preview URL',
				name: 'previewUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to render a link preview for URLs found in the body',
				displayOptions: { show: { resource: ['message'], operation: ['sendText'] } },
			},
			// Send Reaction
			{
				displayName: 'Message ID to React To',
				name: 'reactionMessageId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendReaction'] } },
			},
			{
				displayName: 'Emoji',
				name: 'emoji',
				type: 'string',
				default: '',
				required: true,
				description: 'A single emoji, or an empty string to remove a previous reaction',
				displayOptions: { show: { resource: ['message'], operation: ['sendReaction'] } },
			},
			// Media messages (image/audio/document/sticker/video)
			...mediaSourceFields.map((field) => ({
				...field,
				displayOptions: {
					show: { resource: ['message'], operation: ['sendImage', 'sendAudio', 'sendDocument', 'sendSticker', 'sendVideo'] },
				},
			})),
			{
				displayName: 'Caption',
				name: 'mediaCaption',
				type: 'string',
				default: '',
				description: 'Caption shown with the media (not supported for audio or sticker)',
				displayOptions: { show: { resource: ['message'], operation: ['sendImage', 'sendDocument', 'sendVideo'] } },
			},
			{
				displayName: 'Filename',
				name: 'mediaFilename',
				type: 'string',
				default: '',
				description: 'Filename shown to the recipient',
				displayOptions: { show: { resource: ['message'], operation: ['sendDocument'] } },
			},
			// Send Contact
			{
				displayName: 'Contacts (JSON)',
				name: 'contactsJson',
				type: 'json',
				typeOptions: { rows: 6 },
				default: '[\n  {\n    "name": { "formatted_name": "John Doe", "first_name": "John" },\n    "phones": [ { "phone": "+15551234567", "type": "CELL" } ]\n  }\n]',
				description: 'Array of Contact objects, matching the Graph API "contacts" message field',
				displayOptions: { show: { resource: ['message'], operation: ['sendContact'] } },
			},
			// Send Location
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendLocation'] } },
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendLocation'] } },
			},
			{
				displayName: 'Name',
				name: 'locationName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['sendLocation'] } },
			},
			{
				displayName: 'Address',
				name: 'locationAddress',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['sendLocation'] } },
			},
			// Send Template
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				type: 'string',
				default: 'en_US',
				required: true,
				description: 'Template language and locale code, e.g. en_US',
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
			},
			{
				displayName: 'Components (JSON)',
				name: 'componentsJson',
				type: 'json',
				typeOptions: { rows: 6 },
				default: '[]',
				description: 'Array of template Component objects (header/body/button parameters), matching the Graph API "template.components" field',
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
			},
			// Interactive List
			{
				displayName: 'Header Text',
				name: 'interactiveHeaderText',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['sendList', 'sendButtons', 'sendMultiProduct'] } },
			},
			{
				displayName: 'Body Text',
				name: 'interactiveBodyText',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendList', 'sendButtons', 'sendSingleProduct', 'sendMultiProduct', 'sendCatalog'] } },
			},
			{
				displayName: 'Footer Text',
				name: 'interactiveFooterText',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['sendList', 'sendButtons', 'sendSingleProduct', 'sendMultiProduct', 'sendCatalog'] } },
			},
			{
				displayName: 'Button Text',
				name: 'listButtonText',
				type: 'string',
				default: '',
				required: true,
				description: 'Text shown on the button that opens the list',
				displayOptions: { show: { resource: ['message'], operation: ['sendList'] } },
			},
			{
				displayName: 'Sections (JSON)',
				name: 'sectionsJson',
				type: 'json',
				typeOptions: { rows: 6 },
				default: '[]',
				description: 'Array of Section objects, matching the Graph API "interactive.action.sections" field',
				displayOptions: { show: { resource: ['message'], operation: ['sendList', 'sendMultiProduct'] } },
			},
			{
				displayName: 'Buttons (JSON)',
				name: 'buttonsJson',
				type: 'json',
				typeOptions: { rows: 4 },
				default: '[\n  { "type": "reply", "reply": { "id": "button-1", "title": "Yes" } },\n  { "type": "reply", "reply": { "id": "button-2", "title": "No" } }\n]',
				description: 'Array of up to 3 reply Button objects, matching the Graph API "interactive.action.buttons" field',
				displayOptions: { show: { resource: ['message'], operation: ['sendButtons'] } },
			},
			// Products / catalog
			{
				displayName: 'Catalog ID',
				name: 'catalogId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendSingleProduct', 'sendMultiProduct'] } },
			},
			{
				displayName: 'Product Retailer ID',
				name: 'productRetailerId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendSingleProduct'] } },
			},
			{
				displayName: 'Thumbnail Product Retailer ID',
				name: 'thumbnailProductRetailerId',
				type: 'string',
				default: '',
				description: 'Product used as the catalog thumbnail',
				displayOptions: { show: { resource: ['message'], operation: ['sendCatalog'] } },
			},
			// Order details / status / flow - complex, JSON-driven
			{
				displayName: 'Order Details (JSON)',
				name: 'orderDetailsJson',
				type: 'json',
				typeOptions: { rows: 10 },
				default: '{\n  "header": { "type": "image", "image": { "link": "https://example.com/image.jpg" } },\n  "body": { "text": "Thanks for your order" },\n  "action": {\n    "reference_id": "order-123",\n    "payment_type": "p2m-lite:stripe",\n    "currency": "USD",\n    "total_amount": { "value": 1000, "offset": 100 },\n    "order": { "status": "pending", "items": [], "subtotal": { "value": 1000, "offset": 100 } }\n  }\n}',
				description: 'Matches the Graph API "interactive.order_details" object',
				displayOptions: { show: { resource: ['message'], operation: ['sendOrderDetails'] } },
			},
			{
				displayName: 'Order Status Body Text',
				name: 'orderStatusBodyText',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendOrderStatus'] } },
			},
			{
				displayName: 'Order Status Action (JSON)',
				name: 'orderStatusActionJson',
				type: 'json',
				typeOptions: { rows: 6 },
				default: '{\n  "name": "review_order",\n  "parameters": {\n    "reference_id": "order-123",\n    "order": { "status": "processing" }\n  }\n}',
				description: 'Matches the Graph API "interactive.action" object for an order_status message',
				displayOptions: { show: { resource: ['message'], operation: ['sendOrderStatus'] } },
			},
			{
				displayName: 'Flow Message Version',
				name: 'flowMessageVersion',
				type: 'string',
				default: '3',
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Flow Token',
				name: 'flowToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Identify Flow By',
				name: 'flowIdentifierType',
				type: 'options',
				options: [
					{ name: 'Flow ID', value: 'id' },
					{ name: 'Flow Name', value: 'name' },
				],
				default: 'id',
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Flow ID or Name',
				name: 'flowIdentifierValue',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Flow CTA (Button Text)',
				name: 'flowCta',
				type: 'string',
				default: 'Continue',
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Use Draft Flow',
				name: 'flowDraft',
				type: 'boolean',
				default: false,
				description: 'Whether to use the flow\'s draft version rather than its published version',
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			{
				displayName: 'Flow Action Payload (JSON)',
				name: 'flowActionPayloadJson',
				type: 'json',
				typeOptions: { rows: 4 },
				default: '{\n  "screen": "WELCOME_SCREEN",\n  "data": {}\n}',
				description: 'Matches the Graph API "interactive.action.parameters" object for a flow message',
				displayOptions: { show: { resource: ['message'], operation: ['sendFlow'] } },
			},
			// Mark as read / typing indicator
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				required: true,
				description: 'The wamid of the inbound message',
				displayOptions: { show: { resource: ['message'], operation: ['markAsRead', 'sendTypingIndicator'] } },
			},
			replyContextField,

			// ----------------------------------- Template -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a new message template', action: 'Create a template' },
					{ name: 'Delete by ID', value: 'deleteById', description: 'Delete one template by HSM ID and name', action: 'Delete a template by ID' },
					{ name: 'Delete by Name', value: 'deleteByName', description: 'Delete all templates matching a name', action: 'Delete a template by name' },
					{ name: 'Edit', value: 'edit', description: 'Edit an existing template', action: 'Edit a template' },
					{ name: 'Get by ID', value: 'getById', description: 'Get one template by its ID', action: 'Get a template by ID' },
					{ name: 'Get by Name', value: 'getByName', description: 'Get one template by its name', action: 'Get a template by name' },
					{ name: 'Get Many', value: 'getMany', description: 'List all templates on the WABA', action: 'Get many templates' },
					{ name: 'Get Namespace', value: 'getNamespace', description: 'Get the WABA message template namespace', action: 'Get the template namespace' },
				],
				default: 'getMany',
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['template'], operation: ['getByName', 'getMany', 'getNamespace', 'create', 'deleteByName', 'deleteById'] } },
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['template'], operation: ['getById', 'edit'] } },
			},
			{
				displayName: 'Template Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['template'], operation: ['getByName', 'create', 'deleteByName', 'deleteById'] } },
			},
			{
				displayName: 'HSM ID',
				name: 'hsmId',
				type: 'string',
				default: '',
				required: true,
				description: 'Template ID used together with Name to delete one specific template variant',
				displayOptions: { show: { resource: ['template'], operation: ['deleteById'] } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Authentication', value: 'AUTHENTICATION' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utility', value: 'UTILITY' },
				],
				default: 'UTILITY',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				type: 'string',
				default: 'en_US',
				required: true,
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Components (JSON)',
				name: 'componentsJson',
				type: 'json',
				typeOptions: { rows: 8 },
				default: '[\n  { "type": "BODY", "text": "Hello {{1}}!" }\n]',
				description: 'Array of template Component objects, matching the Graph API "components" field',
				displayOptions: { show: { resource: ['template'], operation: ['create', 'edit'] } },
			},
			{
				displayName: 'Category',
				name: 'editCategory',
				type: 'string',
				default: '',
				description: 'Leave blank to keep the existing category',
				displayOptions: { show: { resource: ['template'], operation: ['edit'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['template'], operation: ['getById', 'getByName', 'getMany'] } },
			},

			// ------------------------------------- Flow -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['flow'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a new Flow', action: 'Create a flow' },
					{ name: 'Delete', value: 'delete', description: 'Delete a Flow', action: 'Delete a flow' },
					{ name: 'Deprecate', value: 'deprecate', description: 'Deprecate a published Flow', action: 'Deprecate a flow' },
					{ name: 'Get', value: 'get', description: 'Get a Flow by ID', action: 'Get a flow' },
					{ name: 'Get Encryption Public Key', value: 'getEncryptionKey', description: 'Get the endpoint encryption public key', action: 'Get the flow encryption public key' },
					{ name: 'Get Endpoint Metrics', value: 'getMetrics', description: 'Get Flow endpoint health metrics', action: 'Get flow endpoint metrics' },
					{ name: 'Get Many', value: 'getMany', description: 'List all Flows on the WABA', action: 'Get many flows' },
					{ name: 'Get Preview URL', value: 'getPreviewUrl', description: 'Get the Flow preview URL', action: 'Get the flow preview URL' },
					{ name: 'List Assets', value: 'listAssets', description: 'List a Flow\'s assets (get its JSON download URL)', action: 'List flow assets' },
					{ name: 'Migrate', value: 'migrate', description: 'Migrate Flows from another WABA', action: 'Migrate flows' },
					{ name: 'Publish', value: 'publish', description: 'Publish a Flow', action: 'Publish a flow' },
					{ name: 'Set Encryption Public Key', value: 'setEncryptionKey', description: 'Set the endpoint encryption public key', action: 'Set the flow encryption public key' },
					{ name: 'Update Metadata', value: 'updateMetadata', description: 'Update a Flow\'s name, categories or endpoint URI', action: 'Update flow metadata' },
					{ name: 'Upload JSON', value: 'uploadJson', description: 'Upload a Flow\'s JSON definition asset', action: 'Upload flow JSON' },
				],
				default: 'getMany',
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['flow'], operation: ['create', 'migrate', 'getMany'] } },
			},
			{
				displayName: 'Flow ID',
				name: 'flowId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['flow'],
						operation: ['get', 'getPreviewUrl', 'uploadJson', 'publish', 'updateMetadata', 'listAssets', 'deprecate', 'delete', 'getMetrics'],
					},
				},
			},
			{
				displayName: 'Flow Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['flow'], operation: ['create'] } },
			},
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				options: [
					{ name: 'Appointment Booking', value: 'APPOINTMENT_BOOKING' },
					{ name: 'Contact Us', value: 'CONTACT_US' },
					{ name: 'Customer Support', value: 'CUSTOMER_SUPPORT' },
					{ name: 'Lead Generation', value: 'LEAD_GENERATION' },
					{ name: 'Other', value: 'OTHER' },
					{ name: 'Sign In', value: 'SIGN_IN' },
					{ name: 'Sign Up', value: 'SIGN_UP' },
					{ name: 'Survey', value: 'SURVEY' },
				],
				default: ['OTHER'],
				required: true,
				displayOptions: { show: { resource: ['flow'], operation: ['create'] } },
			},
			{
				displayName: 'Clone Flow ID',
				name: 'cloneFlowId',
				type: 'string',
				default: '',
				description: 'Creates a copy of the existing Flow specified',
				displayOptions: { show: { resource: ['flow'], operation: ['create'] } },
			},
			{
				displayName: 'Endpoint URI',
				name: 'endpointUri',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['flow'], operation: ['create', 'updateMetadata'] } },
			},
			{
				displayName: 'Source WABA ID',
				name: 'sourceWabaId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['flow'], operation: ['migrate'] } },
			},
			{
				displayName: 'Source Flow Names (JSON Array)',
				name: 'sourceFlowNamesJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['flow'], operation: ['migrate'] } },
			},
			{
				displayName: 'Source Flow IDs (JSON Array)',
				name: 'sourceFlowIdsJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['flow'], operation: ['migrate'] } },
			},
			{
				displayName: 'Flow JSON',
				name: 'flowJson',
				type: 'json',
				typeOptions: { rows: 10 },
				default: '{\n  "version": "3.0",\n  "screens": []\n}',
				required: true,
				description: 'The Flow JSON definition, uploaded as the Flow\'s JSON asset',
				displayOptions: { show: { resource: ['flow'], operation: ['uploadJson'] } },
			},
			{
				displayName: 'New Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['flow'], operation: ['updateMetadata'] } },
			},
			{
				displayName: 'Application ID',
				name: 'applicationId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['flow'], operation: ['updateMetadata'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['flow'], operation: ['get', 'getMany'] } },
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['flow'], operation: ['setEncryptionKey', 'getEncryptionKey'] } },
			},
			{
				displayName: 'Business Public Key',
				name: 'businessPublicKey',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				required: true,
				description: 'PEM-encoded RSA public key used to encrypt Flow data exchange payloads',
				displayOptions: { show: { resource: ['flow'], operation: ['setEncryptionKey'] } },
			},
			{
				displayName: 'Metric Name',
				name: 'metricName',
				type: 'options',
				options: [
					{ name: 'Endpoint Availability', value: 'ENDPOINT_AVAILABILITY' },
					{ name: 'Endpoint Request Count', value: 'ENDPOINT_REQUEST_COUNT' },
					{ name: 'Endpoint Request Error Rate', value: 'ENDPOINT_REQUEST_ERROR_RATE' },
					{ name: 'Endpoint Request Errors', value: 'ENDPOINT_REQUEST_ERROR' },
					{ name: 'Endpoint Request Latency (Seconds)', value: 'ENDPOINT_REQUEST_LATENCY_SECONDS_CEIL' },
				],
				default: 'ENDPOINT_REQUEST_COUNT',
				displayOptions: { show: { resource: ['flow'], operation: ['getMetrics'] } },
			},
			{
				displayName: 'Granularity',
				name: 'granularity',
				type: 'options',
				options: [
					{ name: 'Day', value: 'DAY' },
					{ name: 'Lifetime', value: 'LIFETIME' },
				],
				default: 'DAY',
				displayOptions: { show: { resource: ['flow'], operation: ['getMetrics'] } },
			},
			{
				displayName: 'Since (YYYY-MM-DD)',
				name: 'since',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['flow'], operation: ['getMetrics'] } },
			},
			{
				displayName: 'Until (YYYY-MM-DD)',
				name: 'until',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['flow'], operation: ['getMetrics'] } },
			},

			// ------------------------------------- Media -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['media'] } },
				options: [
					{ name: 'Create Upload Session', value: 'createUploadSession', description: 'Start a Resumable Upload session', action: 'Create an upload session' },
					{ name: 'Delete', value: 'delete', description: 'Delete media by ID', action: 'Delete media' },
					{ name: 'Download', value: 'download', description: 'Download media bytes from its URL', action: 'Download media' },
					{ name: 'Get URL', value: 'getUrl', description: 'Get the temporary download URL for a media ID', action: 'Get a media URL' },
					{ name: 'Query Upload Status', value: 'queryUploadStatus', description: 'Check the status of a Resumable Upload session', action: 'Query an upload session status' },
					{ name: 'Upload', value: 'upload', description: 'Upload media (image, sticker, audio, video, document)', action: 'Upload media' },
					{ name: 'Upload File Data', value: 'uploadFileData', description: 'Upload file bytes to a Resumable Upload session', action: 'Upload file data' },
				],
				default: 'upload',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['media'], operation: ['upload'] } },
			},
			{
				displayName: 'Media Type',
				name: 'mediaType',
				type: 'options',
				options: [
					{ name: 'Audio', value: 'audio' },
					{ name: 'Document', value: 'document' },
					{ name: 'Image', value: 'image' },
					{ name: 'Sticker', value: 'sticker' },
					{ name: 'Video', value: 'video' },
				],
				default: 'image',
				displayOptions: { show: { resource: ['media'], operation: ['upload'] } },
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the input binary field containing the file to upload',
				displayOptions: { show: { resource: ['media'], operation: ['upload', 'uploadFileData'] } },
			},
			{
				displayName: 'Media ID',
				name: 'mediaId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['getUrl', 'delete'] } },
			},
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'The temporary download URL returned by Get URL',
				displayOptions: { show: { resource: ['media'], operation: ['download'] } },
			},
			{
				displayName: 'Output Binary Field',
				name: 'outputBinaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['download'] } },
			},
			{
				displayName: 'File Length (Bytes)',
				name: 'fileLength',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['createUploadSession'] } },
			},
			{
				displayName: 'File Type (MIME)',
				name: 'fileType',
				type: 'string',
				default: 'image/jpeg',
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['createUploadSession'] } },
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['createUploadSession'] } },
			},
			{
				displayName: 'Upload ID',
				name: 'uploadId',
				type: 'string',
				default: '',
				required: true,
				description: 'The "upload:..." session ID returned by Create Upload Session',
				displayOptions: { show: { resource: ['media'], operation: ['uploadFileData', 'queryUploadStatus'] } },
			},
			{
				displayName: 'File Offset',
				name: 'fileOffset',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['media'], operation: ['uploadFileData'] } },
			},

			// --------------------------------- Phone Number ---------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['phoneNumber'] } },
				options: [
					{ name: 'Deregister', value: 'deregister', description: 'Deregister a phone number', action: 'Deregister a phone number' },
					{ name: 'Get', value: 'get', description: 'Get a phone number by ID', action: 'Get a phone number' },
					{ name: 'Get Display Name Status', value: 'getDisplayNameStatus', description: 'Get the display name approval status', action: 'Get a display name status' },
					{ name: 'Get Many', value: 'getMany', description: 'List phone numbers on the WABA', action: 'Get many phone numbers' },
					{ name: 'Migrate (On-Prem)', value: 'migrate', description: 'Migrate a phone number from the On-Premises API', action: 'Migrate a phone number' },
					{ name: 'Register', value: 'register', description: 'Register a phone number for Cloud API use', action: 'Register a phone number' },
					{ name: 'Request Verification Code', value: 'requestCode', description: 'Request an SMS/voice verification code', action: 'Request a verification code' },
					{ name: 'Set Two-Step Verification PIN', value: 'setTwoStepPin', description: 'Set the 6-digit two-step verification PIN', action: 'Set a two step verification pin' },
					{ name: 'Verify Code', value: 'verifyCode', description: 'Verify a phone number with the received code', action: 'Verify a code' },
				],
				default: 'getMany',
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['getMany'] } },
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: {
					show: {
						resource: ['phoneNumber'],
						operation: ['get', 'getDisplayNameStatus', 'register', 'deregister', 'migrate', 'requestCode', 'verifyCode', 'setTwoStepPin'],
					},
				},
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['get', 'getMany'] } },
			},
			{
				displayName: 'PIN',
				name: 'pin',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				description: 'The 6-digit two-step verification PIN for this phone number',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['register', 'migrate', 'setTwoStepPin'] } },
			},
			{
				displayName: 'Code Method',
				name: 'codeMethod',
				type: 'options',
				options: [
					{ name: 'SMS', value: 'SMS' },
					{ name: 'Voice', value: 'VOICE' },
				],
				default: 'SMS',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['requestCode'] } },
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: 'en_US',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['requestCode'] } },
			},
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				required: true,
				description: 'The verification code received via SMS or voice call',
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['verifyCode'] } },
			},

			// ------------------------------------- WABA -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['waba'] } },
				options: [
					{ name: 'Get', value: 'get', description: 'Get a WhatsApp Business Account', action: 'Get a waba' },
					{ name: 'Get Owned WABAs', value: 'getOwned', description: 'List WABAs owned by a Business', action: 'Get owned wabas' },
					{ name: 'Get Shared WABAs', value: 'getShared', description: 'List WABAs shared with a Business', action: 'Get shared wabas' },
				],
				default: 'get',
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['waba'], operation: ['get'] } },
			},
			{
				displayName: 'Business ID',
				name: 'businessId',
				type: 'string',
				default: '',
				description: 'Overrides the Business ID set on the credential',
				displayOptions: { show: { resource: ['waba'], operation: ['getOwned', 'getShared'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['waba'], operation: ['get'] } },
			},

			// -------------------------------- Webhook Subscription --------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{ name: 'Get Many', value: 'getMany', description: 'List apps subscribed to a WABA', action: 'Get many webhook subscriptions' },
					{ name: 'Override Callback URL', value: 'overrideCallbackUrl', description: 'Set a per-WABA webhook callback override', action: 'Override the callback URL' },
					{ name: 'Subscribe', value: 'subscribe', description: 'Subscribe the app to a WABA\'s webhooks', action: 'Subscribe to a waba' },
					{ name: 'Unsubscribe', value: 'unsubscribe', description: 'Unsubscribe the app from a WABA\'s webhooks', action: 'Unsubscribe from a waba' },
				],
				default: 'subscribe',
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['webhook'] } },
			},
			{
				displayName: 'Callback URI',
				name: 'callbackUri',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['webhook'], operation: ['overrideCallbackUrl'] } },
			},
			{
				displayName: 'Verify Token',
				name: 'verifyToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['webhook'], operation: ['overrideCallbackUrl'] } },
			},

			// ------------------------------- Business Profile -------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['businessProfile'] } },
				options: [
					{ name: 'Get', value: 'get', description: 'Get the WhatsApp business profile', action: 'Get a business profile' },
					{ name: 'Update', value: 'update', description: 'Update the WhatsApp business profile', action: 'Update a business profile' },
				],
				default: 'get',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['businessProfile'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['get'] } },
			},
			{
				displayName: 'About',
				name: 'about',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Description',
				name: 'businessDescription',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Vertical (Industry)',
				name: 'vertical',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Websites (JSON Array)',
				name: 'websitesJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},
			{
				displayName: 'Profile Picture Handle',
				name: 'profilePictureHandle',
				type: 'string',
				default: '',
				description: 'Resumable Upload handle ID for the new profile picture',
				displayOptions: { show: { resource: ['businessProfile'], operation: ['update'] } },
			},

			// -------------------------------- Commerce Settings --------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['commerceSettings'] } },
				options: [
					{ name: 'Get', value: 'get', description: 'Get commerce settings', action: 'Get commerce settings' },
					{ name: 'Update', value: 'update', description: 'Set or update commerce settings', action: 'Update commerce settings' },
				],
				default: 'get',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['commerceSettings'] } },
			},
			{
				displayName: 'Cart Enabled',
				name: 'isCartEnabled',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['commerceSettings'], operation: ['update'] } },
			},
			{
				displayName: 'Catalog Visible',
				name: 'isCatalogVisible',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['commerceSettings'], operation: ['update'] } },
			},

			// ------------------------------------ QR Code ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['qrCode'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a message QR code', action: 'Create a qr code' },
					{ name: 'Delete', value: 'delete', description: 'Delete a message QR code', action: 'Delete a qr code' },
					{ name: 'Get', value: 'get', description: 'Get one message QR code', action: 'Get a qr code' },
					{ name: 'Get Many', value: 'getMany', description: 'List all message QR codes', action: 'Get many qr codes' },
					{ name: 'Update', value: 'update', description: 'Update a message QR code\'s prefilled message', action: 'Update a qr code' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['qrCode'] } },
			},
			{
				displayName: 'Code ID',
				name: 'codeId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['qrCode'], operation: ['get', 'delete'] } },
			},
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['qrCode'], operation: ['update'] } },
			},
			{
				displayName: 'Prefilled Message',
				name: 'prefilledMessage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['qrCode'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Generate QR Image',
				name: 'generateQrImage',
				type: 'options',
				options: [
					{ name: 'PNG', value: 'PNG' },
					{ name: 'SVG', value: 'SVG' },
				],
				default: 'PNG',
				displayOptions: { show: { resource: ['qrCode'], operation: ['create'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return, leave blank for the default fields',
				displayOptions: { show: { resource: ['qrCode'], operation: ['get', 'getMany'] } },
			},

			// ------------------------------------ Business ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['business'] } },
				options: [
					{ name: 'Get Analytics', value: 'getAnalytics', description: 'Get WABA-level messaging analytics', action: 'Get analytics' },
					{ name: 'Get Conversation Analytics', value: 'getConversationAnalytics', description: 'Get WABA-level conversation analytics', action: 'Get conversation analytics' },
					{ name: 'Get Credit Lines', value: 'getCreditLines', description: 'Get extended credit lines for a Business', action: 'Get credit lines' },
					{ name: 'Get Portfolio', value: 'getPortfolio', description: 'Get a Business Portfolio', action: 'Get a business portfolio' },
				],
				default: 'getPortfolio',
			},
			{
				displayName: 'Business ID',
				name: 'businessId',
				type: 'string',
				default: '',
				description: 'Overrides the Business ID set on the credential',
				displayOptions: { show: { resource: ['business'], operation: ['getPortfolio', 'getCreditLines'] } },
			},
			{
				displayName: 'WABA ID',
				name: 'wabaId',
				type: 'string',
				default: '',
				description: 'Overrides the WABA ID set on the credential',
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics', 'getConversationAnalytics'] } },
			},
			{
				displayName: 'Start (Unix Timestamp)',
				name: 'start',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics', 'getConversationAnalytics'] } },
			},
			{
				displayName: 'End (Unix Timestamp)',
				name: 'end',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics', 'getConversationAnalytics'] } },
			},
			{
				displayName: 'Granularity',
				name: 'analyticsGranularity',
				type: 'options',
				options: [
					{ name: 'Day', value: 'DAY' },
					{ name: 'Half Hour', value: 'HALF_HOUR' },
					{ name: 'Monthly', value: 'MONTHLY' },
				],
				default: 'DAY',
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics', 'getConversationAnalytics'] } },
			},
			{
				displayName: 'Phone Numbers (JSON Array)',
				name: 'phoneNumbersJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics'] } },
			},
			{
				displayName: 'Country Codes (JSON Array)',
				name: 'countryCodesJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['business'], operation: ['getAnalytics'] } },
			},
			{
				displayName: 'Conversation Directions (JSON Array)',
				name: 'conversationDirectionsJson',
				type: 'json',
				default: '[]',
				displayOptions: { show: { resource: ['business'], operation: ['getConversationAnalytics'] } },
			},
			{
				displayName: 'Dimensions (JSON Array)',
				name: 'dimensionsJson',
				type: 'json',
				default: '["conversation_type", "conversation_direction"]',
				displayOptions: { show: { resource: ['business'], operation: ['getConversationAnalytics'] } },
			},

			// ---------------------------------- Block Users ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['blockUsers'] } },
				options: [
					{ name: 'Block', value: 'block', description: 'Block one or more users', action: 'Block users' },
					{ name: 'Get Many', value: 'getMany', description: 'List blocked users', action: 'Get many blocked users' },
					{ name: 'Unblock', value: 'unblock', description: 'Unblock one or more users', action: 'Unblock users' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['blockUsers'] } },
			},
			{
				displayName: 'User Phone Numbers',
				name: 'userPhoneNumbers',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated list of WhatsApp phone numbers to block/unblock',
				displayOptions: { show: { resource: ['blockUsers'], operation: ['block', 'unblock'] } },
			},

			// ------------------------------- Business Compliance -------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['businessCompliance'] } },
				options: [
					{ name: 'Add (India)', value: 'add', description: 'Add India-based business compliance info', action: 'Add business compliance info' },
					{ name: 'Get (India)', value: 'get', description: 'Get India-based business compliance info', action: 'Get business compliance info' },
				],
				default: 'get',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				description: 'Overrides the Phone Number ID set on the credential',
				displayOptions: { show: { resource: ['businessCompliance'] } },
			},
			{
				displayName: 'Compliance Info (JSON)',
				name: 'complianceInfoJson',
				type: 'json',
				typeOptions: { rows: 6 },
				default: '{}',
				description: 'Matches the Graph API "business_compliance_info" request body',
				displayOptions: { show: { resource: ['businessCompliance'], operation: ['add'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('whatsAppCloudNovascapeApi');

				const overrideOrDefault = (paramName: string, credentialField: string) => {
					const value = this.getNodeParameter(paramName, i, '') as string;
					return value || ((credentials[credentialField] as string) || '');
				};
				const wabaId = () => overrideOrDefault('wabaId', 'businessAccountId');
				const phoneNumberId = () => overrideOrDefault('phoneNumberId', 'phoneNumberId');
				const businessId = () => overrideOrDefault('businessId', 'businessId');

				const withReplyContext = (body: IDataObject): IDataObject => {
					const replyToMessageId = this.getNodeParameter('replyToMessageId', i, '') as string;
					return replyToMessageId ? { ...body, context: { message_id: replyToMessageId } } : body;
				};

				let responseData: IDataObject = {};

				if (resource === 'authentication') {
					if (operation === 'debugToken') {
						responseData = await whatsAppApiRequest.call(this, 'GET', '/debug_token', undefined, {
							input_token: credentials.accessToken as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Authentication operation "${operation}"`, { itemIndex: i });
					}
				} else if (resource === 'message') {
					responseData = await executeMessage.call(this, i, operation, phoneNumberId(), withReplyContext);
				} else if (resource === 'template') {
					responseData = await executeTemplate.call(this, i, operation, wabaId());
				} else if (resource === 'flow') {
					responseData = await executeFlow.call(this, i, operation, wabaId());
				} else if (resource === 'media') {
					responseData = await executeMedia.call(this, i, operation, phoneNumberId());
				} else if (resource === 'phoneNumber') {
					responseData = await executePhoneNumber.call(this, i, operation, wabaId(), phoneNumberId());
				} else if (resource === 'waba') {
					responseData = await executeWaba.call(this, i, operation, wabaId(), businessId());
				} else if (resource === 'webhook') {
					responseData = await executeWebhook.call(this, i, operation, wabaId());
				} else if (resource === 'businessProfile') {
					responseData = await executeBusinessProfile.call(this, i, operation, phoneNumberId());
				} else if (resource === 'commerceSettings') {
					responseData = await executeCommerceSettings.call(this, i, operation, phoneNumberId());
				} else if (resource === 'qrCode') {
					responseData = await executeQrCode.call(this, i, operation, phoneNumberId());
				} else if (resource === 'business') {
					responseData = await executeBusiness.call(this, i, operation, wabaId(), businessId());
				} else if (resource === 'blockUsers') {
					responseData = await executeBlockUsers.call(this, i, operation, phoneNumberId());
				} else if (resource === 'businessCompliance') {
					responseData = await executeBusinessCompliance.call(this, i, operation, phoneNumberId());
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, { itemIndex: i });
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

async function executeMessage(
	this: IExecuteFunctions,
	i: number,
	operation: string,
	phoneNumberId: string,
	withReplyContext: (body: IDataObject) => IDataObject,
): Promise<IDataObject> {
	const to = this.getNodeParameter('to', i, '') as string;
	const base: IDataObject = { messaging_product: 'whatsapp', recipient_type: 'individual', to };

	const mediaObject = () => {
		const source = this.getNodeParameter('mediaSource', i) as string;
		const value = this.getNodeParameter('mediaValue', i) as string;
		const caption = this.getNodeParameter('mediaCaption', i, '') as string;
		const filename = this.getNodeParameter('mediaFilename', i, '') as string;
		const obj: IDataObject = { [source]: value };
		if (caption) obj.caption = caption;
		if (filename) obj.filename = filename;
		return obj;
	};

	let body: IDataObject;

	switch (operation) {
		case 'sendText':
			body = withReplyContext({
				...base,
				type: 'text',
				text: {
					body: this.getNodeParameter('textBody', i) as string,
					preview_url: this.getNodeParameter('previewUrl', i, false) as boolean,
				},
			});
			break;
		case 'sendReaction':
			body = {
				...base,
				type: 'reaction',
				reaction: {
					message_id: this.getNodeParameter('reactionMessageId', i) as string,
					emoji: this.getNodeParameter('emoji', i, '') as string,
				},
			};
			break;
		case 'sendImage':
			body = withReplyContext({ ...base, type: 'image', image: mediaObject() });
			break;
		case 'sendAudio':
			body = withReplyContext({ ...base, type: 'audio', audio: mediaObject() });
			break;
		case 'sendDocument':
			body = withReplyContext({ ...base, type: 'document', document: mediaObject() });
			break;
		case 'sendSticker':
			body = withReplyContext({ ...base, type: 'sticker', sticker: mediaObject() });
			break;
		case 'sendVideo':
			body = withReplyContext({ ...base, type: 'video', video: mediaObject() });
			break;
		case 'sendContact':
			body = withReplyContext({
				...base,
				type: 'contacts',
				contacts: parseJsonParameter.call(this, this.getNodeParameter('contactsJson', i), i, 'Contacts (JSON)'),
			});
			break;
		case 'sendLocation':
			body = withReplyContext({
				...base,
				type: 'location',
				location: {
					latitude: this.getNodeParameter('latitude', i) as string,
					longitude: this.getNodeParameter('longitude', i) as string,
					name: this.getNodeParameter('locationName', i, '') as string,
					address: this.getNodeParameter('locationAddress', i, '') as string,
				},
			});
			break;
		case 'sendTemplate':
			body = withReplyContext({
				...base,
				type: 'template',
				template: {
					name: this.getNodeParameter('templateName', i) as string,
					language: { code: this.getNodeParameter('languageCode', i) as string },
					components: parseJsonParameter.call(this, this.getNodeParameter('componentsJson', i), i, 'Components (JSON)'),
				},
			});
			break;
		case 'sendList':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'list',
					...optionalHeaderBodyFooter.call(this, i),
					action: {
						button: this.getNodeParameter('listButtonText', i) as string,
						sections: parseJsonParameter.call(this, this.getNodeParameter('sectionsJson', i), i, 'Sections (JSON)'),
					},
				},
			});
			break;
		case 'sendButtons':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'button',
					...optionalHeaderBodyFooter.call(this, i),
					action: {
						buttons: parseJsonParameter.call(this, this.getNodeParameter('buttonsJson', i), i, 'Buttons (JSON)'),
					},
				},
			});
			break;
		case 'sendSingleProduct':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'product',
					body: { text: this.getNodeParameter('interactiveBodyText', i) as string },
					footer: optionalFooter.call(this, i),
					action: {
						catalog_id: this.getNodeParameter('catalogId', i) as string,
						product_retailer_id: this.getNodeParameter('productRetailerId', i) as string,
					},
				},
			});
			break;
		case 'sendMultiProduct':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'product_list',
					...optionalHeaderBodyFooter.call(this, i),
					action: {
						catalog_id: this.getNodeParameter('catalogId', i) as string,
						sections: parseJsonParameter.call(this, this.getNodeParameter('sectionsJson', i), i, 'Sections (JSON)'),
					},
				},
			});
			break;
		case 'sendCatalog': {
			const thumbnail = this.getNodeParameter('thumbnailProductRetailerId', i, '') as string;
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'catalog_message',
					body: { text: this.getNodeParameter('interactiveBodyText', i) as string },
					footer: optionalFooter.call(this, i),
					action: {
						name: 'catalog_message',
						...(thumbnail ? { parameters: { thumbnail_product_retailer_id: thumbnail } } : {}),
					},
				},
			});
			break;
		}
		case 'sendOrderDetails':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'order_details',
					order_details: parseJsonParameter.call(this, this.getNodeParameter('orderDetailsJson', i), i, 'Order Details (JSON)'),
				},
			});
			break;
		case 'sendOrderStatus':
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'order_status',
					body: { text: this.getNodeParameter('orderStatusBodyText', i) as string },
					action: parseJsonParameter.call(this, this.getNodeParameter('orderStatusActionJson', i), i, 'Order Status Action (JSON)'),
				},
			});
			break;
		case 'sendFlow': {
			const identifierType = this.getNodeParameter('flowIdentifierType', i) as string;
			const identifierValue = this.getNodeParameter('flowIdentifierValue', i) as string;
			body = withReplyContext({
				...base,
				type: 'interactive',
				interactive: {
					type: 'flow',
					...optionalHeaderBodyFooter.call(this, i),
					action: {
						name: 'flow',
						parameters: {
							flow_message_version: this.getNodeParameter('flowMessageVersion', i, '3') as string,
							flow_token: this.getNodeParameter('flowToken', i) as string,
							[identifierType === 'id' ? 'flow_id' : 'flow_name']: identifierValue,
							flow_cta: this.getNodeParameter('flowCta', i, 'Continue') as string,
							mode: (this.getNodeParameter('flowDraft', i, false) as boolean) ? 'draft' : 'published',
							flow_action: 'navigate',
							flow_action_payload: parseJsonParameter.call(
								this,
								this.getNodeParameter('flowActionPayloadJson', i),
								i,
								'Flow Action Payload (JSON)',
							),
						},
					},
				},
			});
			break;
		}
		case 'markAsRead':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/messages`, {
				messaging_product: 'whatsapp',
				status: 'read',
				message_id: this.getNodeParameter('messageId', i) as string,
			});
		case 'sendTypingIndicator':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/messages`, {
				messaging_product: 'whatsapp',
				status: 'read',
				message_id: this.getNodeParameter('messageId', i) as string,
				typing_indicator: { type: 'text' },
			});
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Message operation "${operation}"`, { itemIndex: i });
	}

	return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/messages`, body);
}

function optionalHeaderBodyFooter(this: IExecuteFunctions, i: number): IDataObject {
	const headerText = this.getNodeParameter('interactiveHeaderText', i, '') as string;
	const bodyText = this.getNodeParameter('interactiveBodyText', i, '') as string;
	const footerText = this.getNodeParameter('interactiveFooterText', i, '') as string;
	const result: IDataObject = { body: { text: bodyText } };
	if (headerText) result.header = { type: 'text', text: headerText };
	if (footerText) result.footer = { text: footerText };
	return result;
}

function optionalFooter(this: IExecuteFunctions, i: number): IDataObject | undefined {
	const footerText = this.getNodeParameter('interactiveFooterText', i, '') as string;
	return footerText ? { text: footerText } : undefined;
}

function fieldsQs(this: IExecuteFunctions, i: number): IDataObject {
	const fields = this.getNodeParameter('fields', i, '') as string;
	return fields ? { fields } : {};
}

async function executeTemplate(this: IExecuteFunctions, i: number, operation: string, wabaId: string): Promise<IDataObject> {
	switch (operation) {
		case 'getById':
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('templateId', i) as string}`, undefined, fieldsQs.call(this, i));
		case 'getByName':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}/message_templates`, undefined, {
				name: this.getNodeParameter('name', i) as string,
				...fieldsQs.call(this, i),
			});
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}/message_templates`, undefined, fieldsQs.call(this, i));
		case 'getNamespace':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}`, undefined, { fields: 'message_template_namespace' });
		case 'create':
			return whatsAppApiRequest.call(this, 'POST', `/${wabaId}/message_templates`, {
				name: this.getNodeParameter('name', i) as string,
				category: this.getNodeParameter('category', i) as string,
				language: this.getNodeParameter('languageCode', i) as string,
				components: parseJsonParameter.call(this, this.getNodeParameter('componentsJson', i), i, 'Components (JSON)'),
			});
		case 'edit': {
			const editCategory = this.getNodeParameter('editCategory', i, '') as string;
			const body: IDataObject = {
				components: parseJsonParameter.call(this, this.getNodeParameter('componentsJson', i), i, 'Components (JSON)'),
			};
			if (editCategory) body.category = editCategory;
			return whatsAppApiRequest.call(this, 'POST', `/${this.getNodeParameter('templateId', i) as string}`, body);
		}
		case 'deleteByName':
			return whatsAppApiRequest.call(this, 'DELETE', `/${wabaId}/message_templates`, undefined, {
				name: this.getNodeParameter('name', i) as string,
			});
		case 'deleteById':
			return whatsAppApiRequest.call(this, 'DELETE', `/${wabaId}/message_templates`, undefined, {
				name: this.getNodeParameter('name', i) as string,
				hsm_id: this.getNodeParameter('hsmId', i) as string,
			});
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Template operation "${operation}"`, { itemIndex: i });
	}
}

async function executeFlow(this: IExecuteFunctions, i: number, operation: string, wabaId: string): Promise<IDataObject> {
	switch (operation) {
		case 'create':
			return whatsAppApiFormRequest.call(this, `/${wabaId}/flows`, {
				name: this.getNodeParameter('name', i) as string,
				categories: JSON.stringify(this.getNodeParameter('categories', i) as string[]),
				...(this.getNodeParameter('cloneFlowId', i, '') ? { clone_flow_id: this.getNodeParameter('cloneFlowId', i) as string } : {}),
				...(this.getNodeParameter('endpointUri', i, '') ? { endpoint_uri: this.getNodeParameter('endpointUri', i) as string } : {}),
			});
		case 'migrate':
			return whatsAppApiRequest.call(this, 'POST', `/${wabaId}/migrate_flows`, {
				source_waba_id: this.getNodeParameter('sourceWabaId', i) as string,
				source_flow_names: parseJsonParameter.call(this, this.getNodeParameter('sourceFlowNamesJson', i), i, 'Source Flow Names (JSON Array)'),
				source_flow_ids: parseJsonParameter.call(this, this.getNodeParameter('sourceFlowIdsJson', i), i, 'Source Flow IDs (JSON Array)'),
			});
		case 'get':
			return whatsAppApiRequest.call(
				this,
				'GET',
				`/${this.getNodeParameter('flowId', i) as string}`,
				undefined,
				{ fields: (this.getNodeParameter('fields', i, '') as string) || 'id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,health_status,whatsapp_business_account,application' },
			);
		case 'getPreviewUrl':
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('flowId', i) as string}`, undefined, {
				fields: 'preview.invalidate(false)',
			});
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}/flows`, undefined, fieldsQs.call(this, i));
		case 'uploadJson':
			return whatsAppApiFormRequest.call(
				this,
				`/${this.getNodeParameter('flowId', i) as string}/assets`,
				{ name: 'flow.json', asset_type: 'FLOW_JSON' },
				{
					buffer: Buffer.from(JSON.stringify(parseJsonParameter.call(this, this.getNodeParameter('flowJson', i), i, 'Flow JSON'))),
					filename: 'flow.json',
					contentType: 'application/json',
				},
			);
		case 'publish':
			return whatsAppApiRequest.call(this, 'POST', `/${this.getNodeParameter('flowId', i) as string}/publish`, {});
		case 'updateMetadata': {
			const body: IDataObject = {};
			const name = this.getNodeParameter('name', i, '') as string;
			const endpointUri = this.getNodeParameter('endpointUri', i, '') as string;
			const applicationId = this.getNodeParameter('applicationId', i, '') as string;
			const categories = this.getNodeParameter('categories', i, []) as string[];
			if (name) body.name = name;
			if (endpointUri) body.endpoint_uri = endpointUri;
			if (applicationId) body.application_id = applicationId;
			if (categories?.length) body.categories = categories;
			return whatsAppApiRequest.call(this, 'POST', `/${this.getNodeParameter('flowId', i) as string}`, body);
		}
		case 'listAssets':
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('flowId', i) as string}/assets`);
		case 'deprecate':
			return whatsAppApiRequest.call(this, 'POST', `/${this.getNodeParameter('flowId', i) as string}/deprecate`, {});
		case 'delete':
			return whatsAppApiRequest.call(this, 'DELETE', `/${this.getNodeParameter('flowId', i) as string}`);
		case 'setEncryptionKey': {
			const phoneNumberId = this.getNodeParameter('phoneNumberId', i, '') as string;
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/whatsapp_business_encryption`, {
				business_public_key: this.getNodeParameter('businessPublicKey', i) as string,
			});
		}
		case 'getEncryptionKey': {
			const phoneNumberId = this.getNodeParameter('phoneNumberId', i, '') as string;
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/whatsapp_business_encryption`);
		}
		case 'getMetrics': {
			const metricName = this.getNodeParameter('metricName', i) as string;
			const granularity = this.getNodeParameter('granularity', i) as string;
			const since = this.getNodeParameter('since', i) as string;
			const until = this.getNodeParameter('until', i) as string;
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('flowId', i) as string}`, undefined, {
				fields: `metric.name(${metricName}).granularity(${granularity}).since(${since}).until(${until})`,
			});
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Flow operation "${operation}"`, { itemIndex: i });
	}
}

async function executeMedia(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	switch (operation) {
		case 'upload': {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			return whatsAppApiFormRequest.call(
				this,
				`/${phoneNumberId}/media`,
				{ messaging_product: 'whatsapp' },
				{ buffer, filename: binaryData.fileName ?? 'file', contentType: binaryData.mimeType },
			);
		}
		case 'getUrl':
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('mediaId', i) as string}`);
		case 'delete':
			return whatsAppApiRequest.call(this, 'DELETE', `/${this.getNodeParameter('mediaId', i) as string}`);
		case 'download': {
			const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
			const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i) as string;
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppCloudNovascapeApi', {
				method: 'GET',
				url: mediaUrl,
				encoding: 'arraybuffer',
				returnFullResponse: true,
			});
			const binaryData = await this.helpers.prepareBinaryData(
				Buffer.from(response.body as Buffer),
				undefined,
				(response.headers as IDataObject)['content-type'] as string,
			);
			return { [outputBinaryPropertyName]: binaryData } as unknown as IDataObject;
		}
		case 'createUploadSession': {
			const fileLength = this.getNodeParameter('fileLength', i) as number;
			const fileType = this.getNodeParameter('fileType', i) as string;
			const fileName = this.getNodeParameter('fileName', i) as string;
			const credentials = await this.getCredentials('whatsAppCloudNovascapeApi');
			return whatsAppApiRequest.call(this, 'POST', `/${credentials.appId as string}/uploads`, undefined, {
				file_length: fileLength,
				file_type: fileType,
				file_name: fileName,
			});
		}
		case 'uploadFileData': {
			const uploadId = this.getNodeParameter('uploadId', i) as string;
			const fileOffset = this.getNodeParameter('fileOffset', i, 0) as number;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			return whatsAppApiBinaryRequest.call(this, `/${uploadId}`, buffer, {
				'Content-Type': binaryData.mimeType,
				file_offset: String(fileOffset),
			});
		}
		case 'queryUploadStatus':
			return whatsAppApiRequest.call(this, 'GET', `/${this.getNodeParameter('uploadId', i) as string}`);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Media operation "${operation}"`, { itemIndex: i });
	}
}

async function executePhoneNumber(
	this: IExecuteFunctions,
	i: number,
	operation: string,
	wabaId: string,
	phoneNumberId: string,
): Promise<IDataObject> {
	switch (operation) {
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}`, undefined, fieldsQs.call(this, i));
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}/phone_numbers`, undefined, fieldsQs.call(this, i));
		case 'getDisplayNameStatus':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}`, undefined, { fields: 'name_status' });
		case 'register':
		case 'migrate':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/register`, {
				messaging_product: 'whatsapp',
				pin: this.getNodeParameter('pin', i) as string,
			});
		case 'deregister':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/deregister`, {});
		case 'requestCode':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/request_code`, {
				code_method: this.getNodeParameter('codeMethod', i) as string,
				locale: this.getNodeParameter('locale', i, 'en_US') as string,
			});
		case 'verifyCode':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/verify_code`, {
				code: this.getNodeParameter('code', i) as string,
			});
		case 'setTwoStepPin':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}`, {
				pin: this.getNodeParameter('pin', i) as string,
			});
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Phone Number operation "${operation}"`, { itemIndex: i });
	}
}

async function executeWaba(
	this: IExecuteFunctions,
	i: number,
	operation: string,
	wabaId: string,
	businessId: string,
): Promise<IDataObject> {
	switch (operation) {
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}`, undefined, fieldsQs.call(this, i));
		case 'getOwned':
			return whatsAppApiRequest.call(this, 'GET', `/${businessId}/owned_whatsapp_business_accounts`);
		case 'getShared':
			return whatsAppApiRequest.call(this, 'GET', `/${businessId}/client_whatsapp_business_accounts`);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown WABA operation "${operation}"`, { itemIndex: i });
	}
}

async function executeWebhook(this: IExecuteFunctions, i: number, operation: string, wabaId: string): Promise<IDataObject> {
	switch (operation) {
		case 'subscribe':
			return whatsAppApiRequest.call(this, 'POST', `/${wabaId}/subscribed_apps`, {});
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}/subscribed_apps`);
		case 'unsubscribe':
			return whatsAppApiRequest.call(this, 'DELETE', `/${wabaId}/subscribed_apps`);
		case 'overrideCallbackUrl':
			return whatsAppApiRequest.call(this, 'POST', `/${wabaId}/subscribed_apps`, {
				override_callback_uri: this.getNodeParameter('callbackUri', i) as string,
				verify_token: this.getNodeParameter('verifyToken', i) as string,
			});
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Webhook Subscription operation "${operation}"`, { itemIndex: i });
	}
}

async function executeBusinessProfile(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	switch (operation) {
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/whatsapp_business_profile`, undefined, fieldsQs.call(this, i));
		case 'update': {
			const body: IDataObject = { messaging_product: 'whatsapp' };
			const about = this.getNodeParameter('about', i, '') as string;
			const address = this.getNodeParameter('address', i, '') as string;
			const description = this.getNodeParameter('businessDescription', i, '') as string;
			const email = this.getNodeParameter('email', i, '') as string;
			const vertical = this.getNodeParameter('vertical', i, '') as string;
			const profilePictureHandle = this.getNodeParameter('profilePictureHandle', i, '') as string;
			const websites = parseJsonParameter.call(this, this.getNodeParameter('websitesJson', i, '[]'), i, 'Websites (JSON Array)');
			if (about) body.about = about;
			if (address) body.address = address;
			if (description) body.description = description;
			if (email) body.email = email;
			if (vertical) body.vertical = vertical;
			if (profilePictureHandle) body.profile_picture_handle = profilePictureHandle;
			if (Array.isArray(websites) && websites.length) body.websites = websites;
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/whatsapp_business_profile`, body);
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Business Profile operation "${operation}"`, { itemIndex: i });
	}
}

async function executeCommerceSettings(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	switch (operation) {
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/whatsapp_commerce_settings`);
		case 'update':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/whatsapp_commerce_settings`, undefined, {
				is_cart_enabled: this.getNodeParameter('isCartEnabled', i) as boolean,
				is_catalog_visible: this.getNodeParameter('isCatalogVisible', i) as boolean,
			});
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Commerce Settings operation "${operation}"`, { itemIndex: i });
	}
}

async function executeQrCode(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	switch (operation) {
		case 'create':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/message_qrdls`, {
				prefilled_message: this.getNodeParameter('prefilledMessage', i) as string,
				generate_qr_image: this.getNodeParameter('generateQrImage', i) as string,
			});
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/message_qrdls`, undefined, fieldsQs.call(this, i));
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/message_qrdls/${this.getNodeParameter('codeId', i) as string}`, undefined, fieldsQs.call(this, i));
		case 'update':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/message_qrdls`, {
				code: this.getNodeParameter('code', i) as string,
				prefilled_message: this.getNodeParameter('prefilledMessage', i) as string,
			});
		case 'delete':
			return whatsAppApiRequest.call(this, 'DELETE', `/${phoneNumberId}/message_qrdls/${this.getNodeParameter('codeId', i) as string}`);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown QR Code operation "${operation}"`, { itemIndex: i });
	}
}

async function executeBusiness(
	this: IExecuteFunctions,
	i: number,
	operation: string,
	wabaId: string,
	businessId: string,
): Promise<IDataObject> {
	switch (operation) {
		case 'getPortfolio':
			return whatsAppApiRequest.call(this, 'GET', `/${businessId}`, undefined, { fields: 'id,name,timezone_id' });
		case 'getCreditLines':
			return whatsAppApiRequest.call(this, 'GET', `/${businessId}/extendedcredits`);
		case 'getAnalytics': {
			const start = this.getNodeParameter('start', i) as string;
			const end = this.getNodeParameter('end', i) as string;
			const granularity = this.getNodeParameter('analyticsGranularity', i) as string;
			const phoneNumbers = parseJsonParameter.call(this, this.getNodeParameter('phoneNumbersJson', i, '[]'), i, 'Phone Numbers (JSON Array)');
			const countryCodes = parseJsonParameter.call(this, this.getNodeParameter('countryCodesJson', i, '[]'), i, 'Country Codes (JSON Array)');
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}`, undefined, {
				fields: `analytics.start(${start}).end(${end}).granularity(${granularity}).phone_numbers(${JSON.stringify(phoneNumbers)}).country_codes(${JSON.stringify(countryCodes)})`,
			});
		}
		case 'getConversationAnalytics': {
			const start = this.getNodeParameter('start', i) as string;
			const end = this.getNodeParameter('end', i) as string;
			const granularity = this.getNodeParameter('analyticsGranularity', i) as string;
			const directions = parseJsonParameter.call(this, this.getNodeParameter('conversationDirectionsJson', i, '[]'), i, 'Conversation Directions (JSON Array)');
			const dimensions = parseJsonParameter.call(this, this.getNodeParameter('dimensionsJson', i, '[]'), i, 'Dimensions (JSON Array)');
			return whatsAppApiRequest.call(this, 'GET', `/${wabaId}`, undefined, {
				fields: `conversation_analytics.start(${start}).end(${end}).granularity(${granularity}).conversation_directions(${JSON.stringify(directions)}).dimensions(${JSON.stringify(dimensions)})`,
			});
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Business operation "${operation}"`, { itemIndex: i });
	}
}

async function executeBlockUsers(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	const usersBody = () => ({
		messaging_product: 'whatsapp',
		block_users: (this.getNodeParameter('userPhoneNumbers', i) as string)
			.split(',')
			.map((user) => user.trim())
			.filter(Boolean)
			.map((user) => ({ user })),
	});

	switch (operation) {
		case 'getMany':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/block_users`);
		case 'block':
			return whatsAppApiRequest.call(this, 'POST', `/${phoneNumberId}/block_users`, usersBody());
		case 'unblock':
			return whatsAppApiRequest.call(this, 'DELETE', `/${phoneNumberId}/block_users`, usersBody());
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Block Users operation "${operation}"`, { itemIndex: i });
	}
}

async function executeBusinessCompliance(this: IExecuteFunctions, i: number, operation: string, phoneNumberId: string): Promise<IDataObject> {
	switch (operation) {
		case 'get':
			return whatsAppApiRequest.call(this, 'GET', `/${phoneNumberId}/business_compliance_info`);
		case 'add':
			return whatsAppApiRequest.call(
				this,
				'POST',
				`/${phoneNumberId}/business_compliance_info`,
				parseJsonParameter.call(this, this.getNodeParameter('complianceInfoJson', i), i, 'Compliance Info (JSON)'),
			);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown Business Compliance operation "${operation}"`, { itemIndex: i });
	}
}
