import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	generateOriginatorConversationId,
	getLipaNaMpesaPassword,
	getMpesaTimestamp,
	getSecurityCredential,
	mpesaApiRequest,
} from './GenericFunctions';

const resultUrlFields = [
	{
		displayName: 'Queue Timeout URL',
		name: 'queueTimeOutUrl',
		type: 'string' as const,
		default: '',
		required: true,
		description: 'Called by Safaricom if the request times out in the queue',
	},
	{
		displayName: 'Result URL',
		name: 'resultUrl',
		type: 'string' as const,
		default: '',
		required: true,
		description: 'Called by Safaricom with the final result of the transaction',
	},
];

export class MPesa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'M-Pesa',
		name: 'mPesa',
		icon: 'file:mpesa-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Send and manage payments with the Safaricom M-Pesa Daraja API',
		defaults: {
			name: 'M-Pesa',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'mPesaApi',
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
					{ name: 'Account Balance', value: 'accountBalance' },
					{ name: 'Authentication', value: 'authentication' },
					{ name: 'B2B Payment', value: 'b2b' },
					{ name: 'B2C Payment', value: 'b2c' },
					{ name: 'C2B', value: 'c2b' },
					{ name: 'Pull Transaction', value: 'pullTransactions' },
					{ name: 'Standing Order (Ratiba)', value: 'standingOrder' },
					{ name: 'STK Push (Lipa Na M-Pesa Online)', value: 'stkPush' },
					{ name: 'Transaction', value: 'transaction' },
				],
				default: 'stkPush',
			},

			// ----------------------------- Authentication -----------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['authentication'] } },
				options: [
					{
						name: 'Get Access Token',
						value: 'getToken',
						description: 'Generate an OAuth access token (mainly useful to test the credential)',
						action: 'Get an access token',
					},
				],
				default: 'getToken',
			},

			// --------------------------------- STK Push --------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['stkPush'] } },
				options: [
					{
						name: 'Initiate Payment',
						value: 'initiate',
						description: 'Prompt a customer to enter their PIN and complete an STK Push payment',
						action: 'Initiate an STK push payment',
					},
					{
						name: 'Query Status',
						value: 'query',
						description: 'Check the status of an STK Push request',
						action: 'Query STK push status',
					},
				],
				default: 'initiate',
			},
			{
				displayName: 'Business Short Code',
				name: 'businessShortCode',
				type: 'string',
				default: '',
				required: true,
				description: 'Paybill/Till number. Leave empty to use the Business Short Code set on the credential.',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate', 'query'] } },
			},
			{
				displayName: 'Transaction Type',
				name: 'transactionType',
				type: 'options',
				options: [
					{ name: 'Customer Pay Bill Online', value: 'CustomerPayBillOnline' },
					{ name: 'Customer Buy Goods Online', value: 'CustomerBuyGoodsOnline' },
				],
				default: 'CustomerPayBillOnline',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				required: true,
				placeholder: '2547XXXXXXXX',
				description: 'Customer phone number in 2547XXXXXXXX format. Used as both PartyA and PhoneNumber.',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Party B',
				name: 'partyB',
				type: 'string',
				default: '',
				description: 'Receiving Paybill/Till number. Leave empty to reuse Business Short Code.',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Account Reference',
				name: 'accountReference',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Transaction Description',
				name: 'transactionDesc',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'Called by Safaricom with the payment result',
				displayOptions: { show: { resource: ['stkPush'], operation: ['initiate'] } },
			},
			{
				displayName: 'Checkout Request ID',
				name: 'checkoutRequestId',
				type: 'string',
				default: '',
				required: true,
				description: 'CheckoutRequestID returned by the Initiate Payment operation',
				displayOptions: { show: { resource: ['stkPush'], operation: ['query'] } },
			},

			// ------------------------------------ C2B -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['c2b'] } },
				options: [
					{
						name: 'Register URLs',
						value: 'registerUrl',
						description: 'Register the Confirmation and Validation URLs for a shortcode',
						action: 'Register C2B urls',
					},
					{
						name: 'Simulate Payment',
						value: 'simulate',
						description: 'Simulate a customer payment (Sandbox only)',
						action: 'Simulate a C2B payment',
					},
				],
				default: 'registerUrl',
			},
			{
				displayName: 'Short Code',
				name: 'shortCode',
				type: 'string',
				default: '',
				required: true,
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['c2b'], operation: ['registerUrl', 'simulate'] } },
			},
			{
				displayName: 'Response Type',
				name: 'responseType',
				type: 'options',
				options: [
					{ name: 'Completed', value: 'Completed' },
					{ name: 'Cancelled', value: 'Cancelled' },
				],
				default: 'Completed',
				description: 'Default action to take when Validation URL is unreachable',
				displayOptions: { show: { resource: ['c2b'], operation: ['registerUrl'] } },
			},
			{
				displayName: 'Confirmation URL',
				name: 'confirmationUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['c2b'], operation: ['registerUrl'] } },
			},
			{
				displayName: 'Validation URL',
				name: 'validationUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['c2b'], operation: ['registerUrl'] } },
			},
			{
				displayName: 'Command ID',
				name: 'commandId',
				type: 'options',
				options: [
					{ name: 'Customer Pay Bill Online', value: 'CustomerPayBillOnline' },
					{ name: 'Customer Buy Goods Online', value: 'CustomerBuyGoodsOnline' },
				],
				default: 'CustomerPayBillOnline',
				displayOptions: { show: { resource: ['c2b'], operation: ['simulate'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['c2b'], operation: ['simulate'] } },
			},
			{
				displayName: 'Phone Number (Msisdn)',
				name: 'msisdn',
				type: 'string',
				default: '',
				required: true,
				placeholder: '2547XXXXXXXX',
				displayOptions: { show: { resource: ['c2b'], operation: ['simulate'] } },
			},
			{
				displayName: 'Bill Reference Number',
				name: 'billRefNumber',
				type: 'string',
				default: '',
				description: 'Account number for Pay Bill, or empty for Buy Goods',
				displayOptions: { show: { resource: ['c2b'], operation: ['simulate'] } },
			},

			// ------------------------------------ B2C -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['b2c'] } },
				options: [
					{
						name: 'Send Payment',
						value: 'send',
						description: 'Send money from a business shortcode to a customer',
						action: 'Send a B2C payment',
					},
					{
						name: 'Send to Pochi La Biashara/Till',
						value: 'sendToPochi',
						description: 'Send money from a business shortcode to a Pochi La Biashara number or Till',
						action: 'Send a B2C payment to pochi la biashara',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Originator Conversation ID',
				name: 'originatorConversationId',
				type: 'string',
				default: '',
				description: 'Unique request ID. Leave empty to auto-generate one.',
				displayOptions: { show: { resource: ['b2c'], operation: ['sendToPochi'] } },
			},
			{
				displayName: 'Command ID',
				name: 'commandId',
				type: 'options',
				options: [
					{ name: 'Business Payment', value: 'BusinessPayment' },
					{ name: 'Salary Payment', value: 'SalaryPayment' },
					{ name: 'Promotion Payment', value: 'PromotionPayment' },
				],
				default: 'BusinessPayment',
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				displayName: 'Party A (Sender Short Code)',
				name: 'partyA',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				displayName: 'Party B (Recipient)',
				name: 'partyB',
				type: 'string',
				default: '',
				required: true,
				placeholder: '2547XXXXXXXX',
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				displayName: 'Remarks',
				name: 'remarks',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				displayName: 'Occasion',
				name: 'occasion',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				...resultUrlFields[0],
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},
			{
				...resultUrlFields[1],
				displayOptions: { show: { resource: ['b2c'], operation: ['send', 'sendToPochi'] } },
			},

			// ------------------------------------ B2B -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['b2b'] } },
				options: [
					{
						name: 'Send Payment',
						value: 'send',
						description: 'Send money from one business shortcode to another',
						action: 'Send a B2B payment',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Command ID',
				name: 'commandId',
				type: 'string',
				default: 'BusinessPayBill',
				required: true,
				placeholder: 'BusinessPayBill',
				description: 'E.g. BusinessPayBill, BusinessBuyGoods, MerchantToMerchantTransfer - see the Daraja B2B API docs for the full list.',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Sender Identifier Type',
				name: 'senderIdentifierType',
				type: 'options',
				options: [
					{ name: 'MSISDN', value: '1' },
					{ name: 'Till Number', value: '2' },
					{ name: 'Shortcode', value: '4' },
				],
				default: '4',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Receiver Identifier Type',
				name: 'receiverIdentifierType',
				type: 'options',
				options: [
					{ name: 'MSISDN', value: '1' },
					{ name: 'Till Number', value: '2' },
					{ name: 'Shortcode', value: '4' },
				],
				default: '4',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Party A (Sender Short Code)',
				name: 'partyA',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Party B (Recipient Short Code)',
				name: 'partyB',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Account Reference',
				name: 'accountReference',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				displayName: 'Remarks',
				name: 'remarks',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				...resultUrlFields[0],
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},
			{
				...resultUrlFields[1],
				displayOptions: { show: { resource: ['b2b'], operation: ['send'] } },
			},

			// ------------------------------- Account Balance ----------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['accountBalance'] } },
				options: [
					{
						name: 'Query',
						value: 'query',
						description: "Check a shortcode's account balance",
						action: 'Query an account balance',
					},
				],
				default: 'query',
			},
			{
				displayName: 'Party A (Short Code)',
				name: 'partyA',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['accountBalance'], operation: ['query'] } },
			},
			{
				displayName: 'Identifier Type',
				name: 'identifierType',
				type: 'options',
				options: [
					{ name: 'MSISDN', value: '1' },
					{ name: 'Till Number', value: '2' },
					{ name: 'Shortcode', value: '4' },
				],
				default: '4',
				displayOptions: { show: { resource: ['accountBalance'], operation: ['query'] } },
			},
			{
				displayName: 'Remarks',
				name: 'remarks',
				type: 'string',
				default: 'Account Balance Query',
				displayOptions: { show: { resource: ['accountBalance'], operation: ['query'] } },
			},
			{
				...resultUrlFields[0],
				displayOptions: { show: { resource: ['accountBalance'], operation: ['query'] } },
			},
			{
				...resultUrlFields[1],
				displayOptions: { show: { resource: ['accountBalance'], operation: ['query'] } },
			},

			// --------------------------------- Transaction -------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['transaction'] } },
				options: [
					{
						name: 'Reverse',
						value: 'reverse',
						description: 'Reverse a completed M-Pesa transaction',
						action: 'Reverse a transaction',
					},
					{
						name: 'Query Status',
						value: 'queryStatus',
						description: 'Check the status of an M-Pesa transaction',
						action: 'Query transaction status',
					},
				],
				default: 'queryStatus',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
				required: true,
				description: 'M-Pesa receipt number (e.g. OEI2AK4Q16) of the transaction',
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse', 'queryStatus'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse'] } },
			},
			{
				displayName: 'Receiver Party (Short Code)',
				name: 'receiverParty',
				type: 'string',
				default: '',
				required: true,
				description: 'Organization that received the transaction, to reverse it from',
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse'] } },
			},
			{
				displayName: 'Receiver Identifier Type',
				name: 'receiverIdentifierType',
				type: 'options',
				options: [
					{ name: 'MSISDN', value: '1' },
					{ name: 'Till Number', value: '2' },
					{ name: 'Shortcode', value: '4' },
				],
				default: '4',
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse'] } },
			},
			{
				displayName: 'Party A (Short Code)',
				name: 'partyA',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['transaction'], operation: ['queryStatus'] } },
			},
			{
				displayName: 'Identifier Type',
				name: 'identifierType',
				type: 'options',
				options: [
					{ name: 'MSISDN', value: '1' },
					{ name: 'Till Number', value: '2' },
					{ name: 'Shortcode', value: '4' },
				],
				default: '4',
				displayOptions: { show: { resource: ['transaction'], operation: ['queryStatus'] } },
			},
			{
				displayName: 'Remarks',
				name: 'remarks',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse', 'queryStatus'] } },
			},
			{
				displayName: 'Occasion',
				name: 'occasion',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse', 'queryStatus'] } },
			},
			{
				...resultUrlFields[0],
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse', 'queryStatus'] } },
			},
			{
				...resultUrlFields[1],
				displayOptions: { show: { resource: ['transaction'], operation: ['reverse', 'queryStatus'] } },
			},

			// ------------------------------- Standing Order -----------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['standingOrder'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a recurring M-Pesa Ratiba standing order',
						action: 'Create a standing order',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Receiver Type',
				name: 'receiverType',
				type: 'options',
				options: [
					{ name: 'Pay Bill', value: 'paybill' },
					{ name: 'Buy Goods (Till)', value: 'buygoods' },
				],
				default: 'paybill',
				description: 'Sets TransactionType and ReceiverPartyIdentifierType to match the receiver',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Standing Order Name',
				name: 'standingOrderName',
				type: 'string',
				default: '',
				required: true,
				description: 'Unique name for this standing order',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Business Short Code',
				name: 'businessShortCode',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Party A (Payer Phone Number)',
				name: 'partyA',
				type: 'string',
				default: '',
				required: true,
				placeholder: '2547XXXXXXXX',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Account Reference',
				name: 'accountReference',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Transaction Description',
				name: 'transactionDesc',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Frequency',
				name: 'frequency',
				type: 'options',
				options: [
					{ name: 'One Off', value: '1' },
					{ name: 'Daily', value: '2' },
					{ name: 'Weekly', value: '3' },
					{ name: 'Monthly', value: '4' },
					{ name: 'Bi-Monthly', value: '5' },
					{ name: 'Quarterly', value: '6' },
					{ name: 'Half Year', value: '7' },
					{ name: 'Yearly', value: '8' },
				],
				default: '4',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'YYYYMMDD',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'YYYYMMDD',
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['standingOrder'], operation: ['create'] } },
			},

			// ------------------------------ Pull Transactions ---------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pullTransactions'] } },
				options: [
					{
						name: 'Query',
						value: 'query',
						description: 'Pull transactions for a shortcode within a date range',
						action: 'Query pulled transactions',
					},
				],
				default: 'query',
			},
			{
				displayName: 'Short Code',
				name: 'shortCode',
				type: 'string',
				default: '',
				description: 'Leave empty to use the Business Short Code set on the credential',
				displayOptions: { show: { resource: ['pullTransactions'], operation: ['query'] } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				displayOptions: { show: { resource: ['pullTransactions'], operation: ['query'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'YYYY-MM-DD HH:mm:ss',
				displayOptions: { show: { resource: ['pullTransactions'], operation: ['query'] } },
			},
			{
				displayName: 'Offset Value',
				name: 'offSetValue',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['pullTransactions'], operation: ['query'] } },
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
				const credentials = await this.getCredentials('mPesaApi');
				const defaultShortCode = (credentials.businessShortCode as string) || '';

				const shortCodeOrDefault = (paramName: string) => {
					const value = this.getNodeParameter(paramName, i, '') as string;
					return value || defaultShortCode;
				};

				const securityCredential = () =>
					getSecurityCredential.call(
						this,
						credentials.certificatePem as string,
						credentials.initiatorPassword as string,
					);

				let responseData: IDataObject = {};

				if (resource === 'authentication') {
					if (operation === 'getToken') {
						responseData = await mpesaApiRequest.call(this, 'GET', '/oauth/v1/generate', {}, {
							grant_type: 'client_credentials',
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Authentication operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'stkPush') {
					const businessShortCode = shortCodeOrDefault('businessShortCode');
					if (operation === 'initiate') {
						const timestamp = getMpesaTimestamp();
						const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
						const partyB = (this.getNodeParameter('partyB', i, '') as string) || businessShortCode;
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/stkpush/v1/processrequest', {
							BusinessShortCode: businessShortCode,
							Password: getLipaNaMpesaPassword(businessShortCode, credentials.passkey as string, timestamp),
							Timestamp: timestamp,
							TransactionType: this.getNodeParameter('transactionType', i) as string,
							Amount: this.getNodeParameter('amount', i) as number,
							PartyA: phoneNumber,
							PartyB: partyB,
							PhoneNumber: phoneNumber,
							CallBackURL: this.getNodeParameter('callBackUrl', i) as string,
							AccountReference: this.getNodeParameter('accountReference', i) as string,
							TransactionDesc: this.getNodeParameter('transactionDesc', i, '') as string,
						});
					} else if (operation === 'query') {
						const timestamp = getMpesaTimestamp();
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/stkpushquery/v1/query', {
							BusinessShortCode: businessShortCode,
							Password: getLipaNaMpesaPassword(businessShortCode, credentials.passkey as string, timestamp),
							Timestamp: timestamp,
							CheckoutRequestID: this.getNodeParameter('checkoutRequestId', i) as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown STK Push operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'c2b') {
					if (operation === 'registerUrl') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/c2b/v1/registerurl', {
							ShortCode: shortCodeOrDefault('shortCode'),
							ResponseType: this.getNodeParameter('responseType', i) as string,
							ConfirmationURL: this.getNodeParameter('confirmationUrl', i) as string,
							ValidationURL: this.getNodeParameter('validationUrl', i) as string,
						});
					} else if (operation === 'simulate') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/c2b/v1/simulate', {
							ShortCode: shortCodeOrDefault('shortCode'),
							CommandID: this.getNodeParameter('commandId', i) as string,
							Amount: this.getNodeParameter('amount', i) as number,
							Msisdn: this.getNodeParameter('msisdn', i) as string,
							BillRefNumber: this.getNodeParameter('billRefNumber', i, '') as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown C2B operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'b2c') {
					const body: IDataObject = {
						InitiatorName: credentials.initiatorName as string,
						SecurityCredential: securityCredential(),
						CommandID: this.getNodeParameter('commandId', i) as string,
						Amount: this.getNodeParameter('amount', i) as number,
						PartyA: shortCodeOrDefault('partyA'),
						PartyB: this.getNodeParameter('partyB', i) as string,
						Remarks: this.getNodeParameter('remarks', i, '') as string,
						QueueTimeOutURL: this.getNodeParameter('queueTimeOutUrl', i) as string,
						ResultURL: this.getNodeParameter('resultUrl', i) as string,
						Occasion: this.getNodeParameter('occasion', i, '') as string,
					};
					if (operation === 'sendToPochi') {
						body.OriginatorConversationID =
							(this.getNodeParameter('originatorConversationId', i, '') as string) ||
							generateOriginatorConversationId();
					} else if (operation !== 'send') {
						throw new NodeOperationError(this.getNode(), `Unknown B2C operation "${operation}"`, {
							itemIndex: i,
						});
					}
					responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2c/v1/paymentrequest', body);
				} else if (resource === 'b2b') {
					if (operation === 'send') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/b2b/v1/paymentrequest', {
							Initiator: credentials.initiatorName as string,
							SecurityCredential: securityCredential(),
							CommandID: this.getNodeParameter('commandId', i) as string,
							SenderIdentifierType: this.getNodeParameter('senderIdentifierType', i) as string,
							RecieverIdentifierType: this.getNodeParameter('receiverIdentifierType', i) as string,
							Amount: this.getNodeParameter('amount', i) as number,
							PartyA: shortCodeOrDefault('partyA'),
							PartyB: this.getNodeParameter('partyB', i) as string,
							AccountReference: this.getNodeParameter('accountReference', i, '') as string,
							Remarks: this.getNodeParameter('remarks', i, '') as string,
							QueueTimeOutURL: this.getNodeParameter('queueTimeOutUrl', i) as string,
							ResultURL: this.getNodeParameter('resultUrl', i) as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown B2B operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'accountBalance') {
					if (operation === 'query') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/accountbalance/v1/query', {
							Initiator: credentials.initiatorName as string,
							SecurityCredential: securityCredential(),
							CommandID: 'AccountBalance',
							PartyA: shortCodeOrDefault('partyA'),
							IdentifierType: this.getNodeParameter('identifierType', i) as string,
							Remarks: this.getNodeParameter('remarks', i, 'Account Balance Query') as string,
							QueueTimeOutURL: this.getNodeParameter('queueTimeOutUrl', i) as string,
							ResultURL: this.getNodeParameter('resultUrl', i) as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Account Balance operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'transaction') {
					if (operation === 'reverse') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/reversal/v1/request', {
							Initiator: credentials.initiatorName as string,
							SecurityCredential: securityCredential(),
							CommandID: 'TransactionReversal',
							TransactionID: this.getNodeParameter('transactionId', i) as string,
							Amount: this.getNodeParameter('amount', i) as number,
							ReceiverParty: this.getNodeParameter('receiverParty', i) as string,
							RecieverIdentifierType: this.getNodeParameter('receiverIdentifierType', i) as string,
							ResultURL: this.getNodeParameter('resultUrl', i) as string,
							QueueTimeOutURL: this.getNodeParameter('queueTimeOutUrl', i) as string,
							Remarks: this.getNodeParameter('remarks', i, '') as string,
							Occasion: this.getNodeParameter('occasion', i, '') as string,
						});
					} else if (operation === 'queryStatus') {
						// Uses the documented Transaction Status schema (Initiator/SecurityCredential/CommandID
						// based) rather than the Postman collection's body for this request, which was a
						// copy-paste of the unrelated STK Push Query request and would 400 against the real API.
						responseData = await mpesaApiRequest.call(this, 'POST', '/mpesa/transactionstatus/v1/query', {
							Initiator: credentials.initiatorName as string,
							SecurityCredential: securityCredential(),
							CommandID: 'TransactionStatusQuery',
							TransactionID: this.getNodeParameter('transactionId', i) as string,
							PartyA: shortCodeOrDefault('partyA'),
							IdentifierType: this.getNodeParameter('identifierType', i) as string,
							ResultURL: this.getNodeParameter('resultUrl', i) as string,
							QueueTimeOutURL: this.getNodeParameter('queueTimeOutUrl', i) as string,
							Remarks: this.getNodeParameter('remarks', i, '') as string,
							Occasion: this.getNodeParameter('occasion', i, '') as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Transaction operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'standingOrder') {
					if (operation === 'create') {
						const receiverType = this.getNodeParameter('receiverType', i) as string;
						responseData = await mpesaApiRequest.call(
							this,
							'POST',
							'/standingorder/v1/createStandingOrderExternal',
							{
								StandingOrderName: this.getNodeParameter('standingOrderName', i) as string,
								BusinessShortCode: shortCodeOrDefault('businessShortCode'),
								TransactionType:
									receiverType === 'buygoods'
										? 'Standing Order Customer Pay Merchant'
										: 'Standing Order Customer Pay Bill',
								Amount: this.getNodeParameter('amount', i) as number,
								PartyA: this.getNodeParameter('partyA', i) as string,
								ReceiverPartyIdentifierType: receiverType === 'buygoods' ? '2' : '4',
								CallBackURL: this.getNodeParameter('callBackUrl', i) as string,
								AccountReference: this.getNodeParameter('accountReference', i) as string,
								TransactionDesc: this.getNodeParameter('transactionDesc', i, '') as string,
								Frequency: this.getNodeParameter('frequency', i) as string,
								StartDate: this.getNodeParameter('startDate', i) as string,
								EndDate: this.getNodeParameter('endDate', i) as string,
							},
						);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Standing Order operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'pullTransactions') {
					if (operation === 'query') {
						responseData = await mpesaApiRequest.call(this, 'POST', '/pulltransactions/v1/query', {
							ShortCode: shortCodeOrDefault('shortCode'),
							StartDate: this.getNodeParameter('startDate', i) as string,
							EndDate: this.getNodeParameter('endDate', i) as string,
							OffSetValue: this.getNodeParameter('offSetValue', i, 0) as number,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Pull Transactions operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`, {
						itemIndex: i,
					});
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
