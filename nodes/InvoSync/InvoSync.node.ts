import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	createCustomer,
	createInvoice,
	getCustomer,
	getInvoice,
	listCustomers,
	listInvoices,
	recordPayment,
	sendInvoice,
	updateCustomer,
} from './GenericFunctions';

export class InvoSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'InvoSync',
		name: 'invoSync',
		icon: 'file:invosync-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage customers and invoices via the InvoSync API',
		defaults: {
			name: 'InvoSync',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'invoSyncApi',
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
					{ name: 'Customer', value: 'customer' },
					{ name: 'Invoice', value: 'invoice' },
				],
				default: 'customer',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['customer'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a customer', action: 'Create a customer' },
					{ name: 'Get', value: 'get', description: 'Get a customer', action: 'Get a customer' },
					{ name: 'List', value: 'list', description: 'List customers', action: 'List customers' },
					{ name: 'Update', value: 'update', description: 'Update a customer', action: 'Update a customer' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['invoice'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an invoice', action: 'Create an invoice' },
					{ name: 'Get', value: 'get', description: 'Get an invoice', action: 'Get an invoice' },
					{ name: 'List', value: 'list', description: 'List invoices', action: 'List invoices' },
					{
						name: 'Record Payment',
						value: 'recordPayment',
						description: 'Record a payment against an invoice',
						action: 'Record a payment for an invoice',
					},
					{
						name: 'Send',
						value: 'send',
						description: "Email the branded invoice to the customer",
						action: 'Send an invoice',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				default: '',
				required: true,
				description:
					"The InvoSync workspace to act on, sent as X-Workspace-ID. Set this per execution (e.g. from an upstream webhook payload's workspaceId) rather than hardcoding it.",
			},
			// Customer: Get / Update
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['get', 'update'] } },
			},
			// Customer: Create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
				options: [
					{ displayName: 'Address', name: 'address', type: 'string', default: '' },
					{ displayName: 'KRA PIN', name: 'kraPin', type: 'string', default: '' },
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
				],
			},
			// Customer: Update
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['customer'], operation: ['update'] } },
				options: [
					{ displayName: 'Address', name: 'address', type: 'string', default: '' },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{ displayName: 'KRA PIN', name: 'kraPin', type: 'string', default: '' },
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
				],
			},
			// Invoice: Get / Send / Record Payment
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['invoice'], operation: ['get', 'send', 'recordPayment'] },
				},
			},
			// Invoice: Create
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Customer Name',
				name: 'customerName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
			},
			{
				displayName: 'Line Items',
				name: 'lineItems',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Line Item',
				default: {},
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				options: [
					{
						displayName: 'Item',
						name: 'item',
						values: [
							{ displayName: 'Description', name: 'description', type: 'string', default: '' },
							{ displayName: 'Quantity', name: 'quantity', type: 'number', default: 1 },
							{ displayName: 'Unit Price', name: 'unitPrice', type: 'number', default: 0 },
							{
								displayName: 'VAT Rate',
								name: 'vatRate',
								type: 'number',
								default: 0.16,
								description: 'Decimal VAT rate, e.g. 0.16 for 16%',
							},
							{
								displayName: 'VAT Type',
								name: 'vatType',
								type: 'string',
								default: 'A',
							},
						],
					},
				],
			},
			// Invoice: Record Payment
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['recordPayment'] } },
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'MPESA',
				displayOptions: { show: { resource: ['invoice'], operation: ['recordPayment'] } },
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['invoice'], operation: ['recordPayment'] } },
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
				let responseData: IDataObject = {};
				const workspaceId = this.getNodeParameter('workspaceId', i) as string;

				if (resource === 'customer') {
					if (operation === 'list') {
						responseData = await listCustomers.call(this, workspaceId);
					} else if (operation === 'get') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						responseData = await getCustomer.call(this, workspaceId, customerId);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await createCustomer.call(this, workspaceId, {
							name,
							email,
							...additionalFields,
						});
					} else if (operation === 'update') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await updateCustomer.call(this, workspaceId, customerId, updateFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'invoice') {
					if (operation === 'list') {
						responseData = await listInvoices.call(this, workspaceId);
					} else if (operation === 'get') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						responseData = await getInvoice.call(this, workspaceId, invoiceId);
					} else if (operation === 'create') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						const customerName = this.getNodeParameter('customerName', i) as string;
						const customerEmail = this.getNodeParameter('customerEmail', i) as string;
						const lineItemsCollection = this.getNodeParameter('lineItems', i) as IDataObject;
						const lineItems = ((lineItemsCollection.item as IDataObject[]) ?? []).map((item) => ({
							description: item.description,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							vatRate: item.vatRate,
							vatType: item.vatType,
						}));
						responseData = await createInvoice.call(this, workspaceId, {
							type: 'INVOICE',
							customerId,
							customerName,
							customerEmail,
							lineItems,
						});
					} else if (operation === 'send') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						responseData = await sendInvoice.call(this, workspaceId, invoiceId);
					} else if (operation === 'recordPayment') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						const amount = this.getNodeParameter('amount', i) as number;
						const method = this.getNodeParameter('method', i) as string;
						const reference = this.getNodeParameter('reference', i) as string;
						responseData = await recordPayment.call(this, workspaceId, invoiceId, {
							amount,
							method,
							reference,
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
