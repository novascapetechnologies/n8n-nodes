import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { hostPinnacleApiRequest, hostPinnacleFileUploadRequest, withDefault } from './GenericFunctions';

const senderNameField = {
	displayName: 'Sender Name',
	name: 'senderName',
	type: 'string' as const,
	default: '',
	description: 'Approved sender ID. Leave empty to use the default sender name configured on the credential.',
};

const msgTypeField = {
	displayName: 'Message Type',
	name: 'msgType',
	type: 'options' as const,
	options: [
		{ name: 'Text', value: 'text' },
		{ name: 'Unicode', value: 'unicode' },
	],
	default: 'text',
};

const duplicateCheckField = {
	displayName: 'Remove Duplicates',
	name: 'duplicateCheck',
	type: 'boolean' as const,
	default: true,
	description: 'Whether to remove duplicate recipient numbers before sending',
};

const fromDateField = {
	displayName: 'From Date',
	name: 'fromDate',
	type: 'string' as const,
	default: '',
	required: true,
	placeholder: 'YYYY-MM-DD',
};

const toDateField = {
	displayName: 'To Date',
	name: 'toDate',
	type: 'string' as const,
	default: '',
	required: true,
	placeholder: 'YYYY-MM-DD',
};

const userLoginNameField = {
	displayName: 'Customer Username',
	name: 'userLoginName',
	type: 'string' as const,
	default: '',
	required: true,
	description: "Your reseller customer's username",
};

const smsAdditionalFields = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection' as const,
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'Schedule Time',
			name: 'scheduleTime',
			type: 'string' as const,
			default: '',
			placeholder: 'YYYY-MM-DD HH:MM',
			description: 'Send the message at this future date/time instead of immediately',
		},
		{
			displayName: 'Track Link (Smartlink)',
			name: 'trackLink',
			type: 'boolean' as const,
			default: false,
			description: 'Whether to shorten and track links found in the message',
		},
		{
			displayName: 'Smartlink Title',
			name: 'smartLinkTitle',
			type: 'string' as const,
			default: '',
			description: 'Title to identify the tracked link. Only used when Track Link is enabled.',
		},
	],
};

export class HostPinnacle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HostPinnacle SMS',
		name: 'hostPinnacle',
		icon: 'file:hostpinnacle-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Send SMS and manage your account with the HostPinnacle SMS API',
		defaults: {
			name: 'HostPinnacle SMS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'hostPinnacleSmsApi',
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
					{ name: 'Account', value: 'account' },
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'Group', value: 'group' },
					{ name: 'Password', value: 'password' },
					{ name: 'Reseller', value: 'reseller' },
					{ name: 'Schedule', value: 'schedule' },
					{ name: 'Sender ID', value: 'senderId' },
					{ name: 'SMS', value: 'sms' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'sms',
			},

			// ------------------------------------ SMS ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sms'] } },
				options: [
					{
						name: 'Send Quick SMS',
						value: 'sendQuick',
						description: 'Send an SMS to one or more phone numbers',
						action: 'Send a quick SMS',
					},
					{
						name: 'Send Group SMS',
						value: 'sendGroup',
						description: 'Send an SMS to every contact in a group',
						action: 'Send a group SMS',
					},
					{
						name: 'Send File Upload SMS',
						value: 'sendFileUpload',
						description: 'Send an SMS to recipients listed in an uploaded file',
						action: 'Send a file upload SMS',
					},
				],
				default: 'sendQuick',
			},
			{
				displayName: 'Mobile Number(s)',
				name: 'mobile',
				type: 'string',
				default: '',
				required: true,
				description: 'Recipient phone number(s), comma-separated for multiple recipients',
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick'] } },
			},
			{
				displayName: 'Group Name',
				name: 'group',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the group to send the message to',
				displayOptions: { show: { resource: ['sms'], operation: ['sendGroup'] } },
			},
			{
				...senderNameField,
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick', 'sendGroup', 'sendFileUpload'] } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick', 'sendGroup'] } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Only needed if the uploaded file contains phone numbers only (no per-recipient message)',
				displayOptions: { show: { resource: ['sms'], operation: ['sendFileUpload'] } },
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the recipient file to upload',
				displayOptions: { show: { resource: ['sms'], operation: ['sendFileUpload'] } },
			},
			{
				...msgTypeField,
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick', 'sendGroup', 'sendFileUpload'] } },
			},
			{
				...duplicateCheckField,
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick', 'sendGroup', 'sendFileUpload'] } },
			},
			{
				...smsAdditionalFields,
				displayOptions: { show: { resource: ['sms'], operation: ['sendQuick', 'sendGroup', 'sendFileUpload'] } },
			},

			// --------------------------------- Schedule -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['schedule'] } },
				options: [
					{
						name: 'Read',
						value: 'read',
						description: 'Look up scheduled messages within a date range',
						action: 'Read scheduled messages',
					},
					{
						name: 'Update',
						value: 'update',
						description: "Update a scheduled message's send time",
						action: 'Update a scheduled message',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a scheduled message',
						action: 'Delete a scheduled message',
					},
				],
				default: 'read',
			},
			{
				...fromDateField,
				displayOptions: { show: { resource: ['schedule'], operation: ['read'] } },
			},
			{
				...toDateField,
				displayOptions: { show: { resource: ['schedule'], operation: ['read'] } },
			},
			{
				displayName: 'Schedule Time',
				name: 'scheduleTime',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'YYYY-MM-DD HH:MM',
				displayOptions: { show: { resource: ['schedule'], operation: ['update'] } },
			},
			{
				displayName: 'Transaction UUID',
				name: 'uuid',
				type: 'string',
				default: '',
				required: true,
				description: 'Transaction ID of the scheduled message',
				displayOptions: { show: { resource: ['schedule'], operation: ['update', 'delete'] } },
			},

			// --------------------------------- Sender ID -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['senderId'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Request a new sender ID', action: 'Create a sender ID' },
					{ name: 'Read Many', value: 'read', description: 'List registered sender IDs', action: 'Read many sender i ds' },
					{ name: 'Update', value: 'update', description: 'Rename a sender ID', action: 'Update a sender ID' },
					{ name: 'Delete', value: 'delete', description: 'Delete one or more sender IDs', action: 'Delete a sender ID' },
				],
				default: 'create',
			},
			{
				displayName: 'Sender Name',
				name: 'senderName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['senderId'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Sender ID Record ID',
				name: 'senderIdRecordId',
				type: 'string',
				default: '',
				required: true,
				description: 'Internal ID of the sender name record to update',
				displayOptions: { show: { resource: ['senderId'], operation: ['update'] } },
			},
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated record IDs of the sender names to delete',
				displayOptions: { show: { resource: ['senderId'], operation: ['delete'] } },
			},

			// --------------------------------- Webhook -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Register a delivery report webhook', action: 'Create a webhook' },
					{ name: 'Read', value: 'read', description: 'Read the registered webhook', action: 'Read a webhook' },
					{ name: 'Update', value: 'update', description: 'Update the registered webhook URL', action: 'Update a webhook' },
					{ name: 'Delete', value: 'delete', description: 'Remove the registered webhook', action: 'Delete a webhook' },
				],
				default: 'create',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'Endpoint that receives real-time delivery reports',
				displayOptions: { show: { resource: ['webhook'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Webhook Rate',
				name: 'webhookRate',
				type: 'number',
				default: 10,
				description: 'Webhook transactions per second',
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
			},

			// --------------------------------- Account -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Read Status', value: 'readStatus', description: 'Look up the SMS balance and status', action: 'Read account status' },
					{ name: 'Read Profile', value: 'readProfile', description: 'Look up account profile information', action: 'Read account profile' },
					{ name: 'Update Profile', value: 'updateProfile', description: 'Update account profile information', action: 'Update account profile' },
					{ name: 'Read Credit History', value: 'readCreditHistory', description: 'Look up credit history within a date range', action: 'Read account credit history' },
				],
				default: 'readStatus',
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['account'], operation: ['updateProfile'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['account'], operation: ['updateProfile'] } },
				options: [
					{ displayName: 'Address', name: 'address', type: 'string', default: '' },
					{ displayName: 'City', name: 'city', type: 'string', default: '' },
					{ displayName: 'Region', name: 'region', type: 'string', default: '' },
					{ displayName: 'Country', name: 'country', type: 'string', default: '' },
				],
			},
			{
				...fromDateField,
				displayOptions: { show: { resource: ['account'], operation: ['readCreditHistory'] } },
			},
			{
				...toDateField,
				displayOptions: { show: { resource: ['account'], operation: ['readCreditHistory'] } },
			},

			// --------------------------------- Password ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['password'] } },
				options: [
					{ name: 'Change', value: 'change', description: 'Change your account password', action: 'Change account password' },
				],
				default: 'change',
			},
			{
				displayName: 'New Password',
				name: 'newPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['password'], operation: ['change'] } },
			},
			{
				displayName: 'Confirm Password',
				name: 'confirmPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['password'], operation: ['change'] } },
			},

			// --------------------------------- API Key -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['apiKey'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Generate an API key for your account', action: 'Create an API key' },
					{ name: 'Read', value: 'read', description: 'Look up your account API key', action: 'Read an API key' },
					{ name: 'Update', value: 'update', description: 'Regenerate your account API key', action: 'Update an API key' },
					{ name: 'Delete', value: 'delete', description: 'Delete your account API key', action: 'Delete an API key' },
				],
				default: 'create',
			},

			// ---------------------------------- Group ---------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['group'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a phonebook group', action: 'Create a group' },
					{ name: 'Read Many', value: 'read', description: 'List phonebook groups', action: 'Read many groups' },
					{ name: 'Update', value: 'update', description: 'Rename a phonebook group', action: 'Update a group' },
					{ name: 'Delete', value: 'delete', description: 'Delete one or more phonebook groups', action: 'Delete a group' },
				],
				default: 'create',
			},
			{
				displayName: 'Group Name',
				name: 'groupName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['group'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['group'], operation: ['update'] } },
			},
			{
				displayName: 'Group IDs',
				name: 'groupIds',
				type: 'string',
				default: '',
				required: true,
				description: 'Comma-separated group IDs to delete',
				displayOptions: { show: { resource: ['group'], operation: ['delete'] } },
			},

			// --------------------------------- Reseller ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['reseller'] } },
				options: [
					{ name: 'Add Credit', value: 'addCredit', description: "Add credit to a customer's account", action: 'Add reseller credit' },
					{ name: 'Create User', value: 'createUser', description: 'Create a reseller customer account', action: 'Create a reseller user' },
					{ name: 'Generate User Password', value: 'generatePassword', description: 'Generate a new password for a customer', action: 'Generate a reseller user password' },
					{ name: 'Read Credit History', value: 'readCreditHistory', description: "Look up a customer's credit history", action: 'Read reseller credit history' },
					{ name: 'Read User', value: 'readUser', description: "Look up a customer's account", action: 'Read a reseller user' },
					{ name: 'Remove Credit', value: 'removeCredit', description: "Remove credit from a customer's account", action: 'Remove reseller credit' },
					{ name: 'Reset User Password', value: 'resetPassword', description: 'Reset a customer password', action: 'Reset a reseller user password' },
					{ name: 'Update User', value: 'updateUser', description: "Update a customer's account", action: 'Update a reseller user' },
				],
				default: 'createUser',
			},
			{
				...userLoginNameField,
				displayOptions: {
					show: {
						resource: ['reseller'],
						operation: [
							'createUser',
							'readUser',
							'updateUser',
							'generatePassword',
							'resetPassword',
							'addCredit',
							'removeCredit',
							'readCreditHistory',
						],
					},
				},
			},
			{
				displayName: 'User Type',
				name: 'userType',
				type: 'options',
				options: [
					{ name: 'Reseller', value: 'reseller' },
					{ name: 'Customer', value: 'customer' },
				],
				default: 'reseller',
				displayOptions: { show: { resource: ['reseller'], operation: ['createUser', 'updateUser'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['reseller'], operation: ['createUser', 'updateUser'] } },
			},
			{
				displayName: 'Mobile Number',
				name: 'mobileNo',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['reseller'], operation: ['createUser', 'updateUser'] } },
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['reseller'], operation: ['createUser', 'updateUser'] } },
			},
			{
				displayName: 'User Status',
				name: 'userStatus',
				type: 'options',
				options: [
					{ name: 'Active', value: 'Active' },
					{ name: 'Inactive', value: 'Inactive' },
				],
				default: 'Active',
				displayOptions: { show: { resource: ['reseller'], operation: ['updateUser'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['reseller'], operation: ['createUser', 'updateUser'] } },
				options: [
					{ displayName: 'Address', name: 'address', type: 'string', default: '' },
					{ displayName: 'City', name: 'city', type: 'string', default: '' },
					{ displayName: 'Country', name: 'country', type: 'string', default: '' },
					{
						displayName: 'Enable CMS',
						name: 'enableCms',
						type: 'boolean',
						default: false,
						description: 'Whether to enable CMS access for a reseller user',
					},
					{ displayName: 'Expiry Date', name: 'expiryDate', type: 'string', default: '', placeholder: 'YYYY-MM-DD' },
					{ displayName: 'Region', name: 'region', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Credits',
				name: 'credits',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['reseller'], operation: ['addCredit', 'removeCredit'] } },
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['reseller'], operation: ['addCredit', 'removeCredit'] } },
			},
			{
				displayName: 'Product',
				name: 'product',
				type: 'string',
				default: 'SMS',
				displayOptions: { show: { resource: ['reseller'], operation: ['addCredit', 'removeCredit'] } },
			},
			{
				displayName: 'Transaction Type',
				name: 'transactionType',
				type: 'options',
				options: [
					{ name: 'Purchase', value: 'purchase' },
					{ name: 'Adjustment', value: 'adjustment' },
				],
				default: 'purchase',
				displayOptions: { show: { resource: ['reseller'], operation: ['addCredit', 'removeCredit'] } },
			},
			{
				...fromDateField,
				displayOptions: { show: { resource: ['reseller'], operation: ['readCreditHistory'] } },
			},
			{
				...toDateField,
				displayOptions: { show: { resource: ['reseller'], operation: ['readCreditHistory'] } },
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
				const credentials = await this.getCredentials('hostPinnacleSmsApi');
				let responseData: IDataObject = {};

				const senderName = () =>
					withDefault(this.getNodeParameter('senderName', i, '') as string, credentials.senderName);

				if (resource === 'sms') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const scheduleFields: IDataObject = {
						scheduleTime: additionalFields.scheduleTime,
						trackLink: additionalFields.trackLink,
						smartLinkTitle: additionalFields.smartLinkTitle,
					};

					if (operation === 'sendQuick') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/send', {
							mobile: this.getNodeParameter('mobile', i) as string,
							senderid: senderName(),
							msg: this.getNodeParameter('message', i) as string,
							sendMethod: 'quick',
							msgType: this.getNodeParameter('msgType', i) as string,
							duplicatecheck: this.getNodeParameter('duplicateCheck', i) as boolean,
							scheduleTime: scheduleFields.scheduleTime,
							trackLink: scheduleFields.trackLink,
							smartLinkTitle: scheduleFields.smartLinkTitle,
						});
					} else if (operation === 'sendGroup') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/send', {
							group: this.getNodeParameter('group', i) as string,
							senderid: senderName(),
							msg: this.getNodeParameter('message', i) as string,
							sendMethod: 'group',
							msgType: this.getNodeParameter('msgType', i) as string,
							duplicatecheck: this.getNodeParameter('duplicateCheck', i) as boolean,
							scheduleTime: scheduleFields.scheduleTime,
							trackLink: scheduleFields.trackLink,
							smartLinkTitle: scheduleFields.smartLinkTitle,
						});
					} else if (operation === 'sendFileUpload') {
						responseData = await hostPinnacleFileUploadRequest.call(
							this,
							'/send',
							{
								senderid: senderName(),
								msg: this.getNodeParameter('message', i, '') as string,
								sendMethod: 'bulkupload',
								msgType: this.getNodeParameter('msgType', i) as string,
								duplicatecheck: this.getNodeParameter('duplicateCheck', i) as boolean,
								scheduleTime: scheduleFields.scheduleTime,
								trackLink: scheduleFields.trackLink,
								smartLinkTitle: scheduleFields.smartLinkTitle,
							},
							this.getNodeParameter('binaryPropertyName', i) as string,
							i,
						);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'schedule') {
					if (operation === 'read') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/schedule/read', {
							fromdate: this.getNodeParameter('fromDate', i) as string,
							todate: this.getNodeParameter('toDate', i) as string,
						});
					} else if (operation === 'update') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/schedule/update', {
							scheduletime: this.getNodeParameter('scheduleTime', i) as string,
							uuid: this.getNodeParameter('uuid', i) as string,
						});
					} else if (operation === 'delete') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/schedule/delete', {
							uuid: this.getNodeParameter('uuid', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'senderId') {
					if (operation === 'create') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/senderid/create', {
							senderid: this.getNodeParameter('senderName', i) as string,
						});
					} else if (operation === 'read') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/senderid/read');
					} else if (operation === 'update') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/senderid/update', {
							senderid: this.getNodeParameter('senderName', i) as string,
							id: this.getNodeParameter('senderIdRecordId', i) as string,
						});
					} else if (operation === 'delete') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/senderid/delete', {
							id: this.getNodeParameter('ids', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'webhook') {
					if (operation === 'create') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/webhook/create', {
							smswebhook: this.getNodeParameter('webhookUrl', i) as string,
							smswebhookrate: this.getNodeParameter('webhookRate', i) as number,
						});
					} else if (operation === 'read') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/webhook/read');
					} else if (operation === 'update') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/webhook/update', {
							smswebhook: this.getNodeParameter('webhookUrl', i) as string,
						});
					} else if (operation === 'delete') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/webhook/delete');
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'account') {
					if (operation === 'readStatus') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/account/readstatus');
					} else if (operation === 'readProfile') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/account/readprofile');
					} else if (operation === 'updateProfile') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/account/updateprofile', {
							fullname: this.getNodeParameter('fullName', i) as string,
							...additionalFields,
						});
					} else if (operation === 'readCreditHistory') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/account/readcredithistory', {
							fromdate: this.getNodeParameter('fromDate', i) as string,
							todate: this.getNodeParameter('toDate', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'password') {
					if (operation === 'change') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/password/change', {
							newpassword: this.getNodeParameter('newPassword', i) as string,
							confirmpassword: this.getNodeParameter('confirmPassword', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'apiKey') {
					if (operation === 'create') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/apikey/create');
					} else if (operation === 'read') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/apikey/read');
					} else if (operation === 'update') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/apikey/update');
					} else if (operation === 'delete') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/apikey/delete');
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'group') {
					if (operation === 'create') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/group/create', {
							groupname: this.getNodeParameter('groupName', i) as string,
						});
					} else if (operation === 'read') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/group/read');
					} else if (operation === 'update') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/group/update', {
							groupname: this.getNodeParameter('groupName', i) as string,
							id: this.getNodeParameter('groupId', i) as string,
						});
					} else if (operation === 'delete') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/group/delete', {
							id: this.getNodeParameter('groupIds', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'reseller') {
					const userLoginName = () => this.getNodeParameter('userLoginName', i) as string;

					if (operation === 'createUser') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/createuser', {
							userloginname: userLoginName(),
							usertype: this.getNodeParameter('userType', i) as string,
							email: this.getNodeParameter('email', i) as string,
							mobileno: this.getNodeParameter('mobileNo', i) as string,
							fullname: this.getNodeParameter('fullName', i) as string,
							address: additionalFields.address,
							city: additionalFields.city,
							region: additionalFields.region,
							country: additionalFields.country,
							expirydate: additionalFields.expiryDate,
							enablecms: additionalFields.enableCms,
						});
					} else if (operation === 'readUser') {
						responseData = await hostPinnacleApiRequest.call(this, 'GET', '/reseller/readuser', {}, {
							userloginname: userLoginName(),
						});
					} else if (operation === 'updateUser') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/updateuser', {
							userloginname: userLoginName(),
							usertype: this.getNodeParameter('userType', i) as string,
							email: this.getNodeParameter('email', i) as string,
							mobileno: this.getNodeParameter('mobileNo', i) as string,
							fullname: this.getNodeParameter('fullName', i) as string,
							userstatus: this.getNodeParameter('userStatus', i) as string,
							address: additionalFields.address,
							city: additionalFields.city,
							region: additionalFields.region,
							country: additionalFields.country,
							expirydate: additionalFields.expiryDate,
							enablecms: additionalFields.enableCms,
						});
					} else if (operation === 'generatePassword') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/generateuserpassword', {
							userloginname: userLoginName(),
						});
					} else if (operation === 'resetPassword') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/resetuserpassword', {
							userloginname: userLoginName(),
						});
					} else if (operation === 'addCredit') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/addcredit', {
							userloginname: userLoginName(),
							credits: this.getNodeParameter('credits', i) as number,
							comment: this.getNodeParameter('comment', i, '') as string,
							product: this.getNodeParameter('product', i, '') as string,
							transactiontype: this.getNodeParameter('transactionType', i) as string,
						});
					} else if (operation === 'removeCredit') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/removecredit', {
							userloginname: userLoginName(),
							credits: this.getNodeParameter('credits', i) as number,
							comment: this.getNodeParameter('comment', i, '') as string,
							product: this.getNodeParameter('product', i, '') as string,
							transactiontype: this.getNodeParameter('transactionType', i) as string,
						});
					} else if (operation === 'readCreditHistory') {
						responseData = await hostPinnacleApiRequest.call(this, 'POST', '/reseller/readcredithistory', {
							userloginname: userLoginName(),
							fromdate: this.getNodeParameter('fromDate', i) as string,
							todate: this.getNodeParameter('toDate', i) as string,
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported!`,
						{ itemIndex: i },
					);
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });
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
