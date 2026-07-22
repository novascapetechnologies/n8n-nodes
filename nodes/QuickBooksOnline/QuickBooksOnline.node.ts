import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	quickBooksApiRequest,
	quickBooksQueryRequest,
	quickBooksUploadRequest,
} from './GenericFunctions';

/**
 * QuickBooks Online node — covers every entity in the "QuickBooks Online API
 * Collections" Postman collection (Account through VendorCredit), plus
 * Reports, Batch and ChangeDataCapture.
 *
 * Entities have wildly different schemas (dozens of fields each), so
 * Create/Update take a raw JSON body instead of hand-built per-entity form
 * fields — the same approach used by every other community QBO connector.
 * Capabilities differ per entity (e.g. CompanyInfo is read-only, TaxService
 * is create-only), so the Operation dropdown is split into groups that each
 * only show the operations that entity actually supports.
 */

// Entities exposing the full Create/Get/Update/Delete/Query set.
const CRUD_ENTITIES = [
	'account',
	'bill',
	'billpayment',
	'class',
	'creditmemo',
	'customer',
	'department',
	'deposit',
	'employee',
	'estimate',
	'item',
	'journalentry',
	'payment',
	'paymentmethod',
	'purchase',
	'purchaseorder',
	'refundreceipt',
	'term',
	'timeactivity',
	'transfer',
	'vendor',
	'vendorcredit',
];

// Same as above, plus a Void operation (issued instead of Delete once a transaction has been sent/paid).
const VOIDABLE_ENTITIES = ['invoice', 'salesreceipt'];

// Create/Get/Query only — no Update or Delete endpoint.
const CREATE_READ_ENTITIES = ['taxagency'];

// Read-only, single record + query — no Create/Update/Delete.
const READ_ONLY_ENTITIES = ['companyinfo', 'exchangerate', 'taxcode', 'taxrate'];

// Query only — QBO has no single-record Read for Budget.
const QUERY_ONLY_ENTITIES = ['budget'];

// Read + Query + Update (Preferences is a singleton company-wide record).
const READ_UPDATE_ENTITIES = ['preferences'];

// Create only.
const CREATE_ONLY_ENTITIES = ['taxservice'];

const ALL_STANDARD_ENTITIES = [
	...CRUD_ENTITIES,
	...VOIDABLE_ENTITIES,
	...CREATE_READ_ENTITIES,
	...READ_ONLY_ENTITIES,
	...QUERY_ONLY_ENTITIES,
	...READ_UPDATE_ENTITIES,
	...CREATE_ONLY_ENTITIES,
];

// Entities whose Get/Update/Delete/Void endpoints take a plain `{entity}/{id}` path.
// ExchangeRate has no such endpoint (Get takes sourcecurrencycode/asofdate query params
// instead), and Preferences is a company-wide singleton addressed with no ID at all.
const ID_BASED_ENTITIES = ALL_STANDARD_ENTITIES.filter(
	(entity) => entity !== 'exchangerate' && entity !== 'preferences',
);

const ENTITY_LABELS: Record<string, string> = {
	account: 'Account',
	bill: 'Bill',
	billpayment: 'Bill Payment',
	class: 'Class',
	creditmemo: 'Credit Memo',
	customer: 'Customer',
	department: 'Department',
	deposit: 'Deposit',
	employee: 'Employee',
	estimate: 'Estimate',
	item: 'Item',
	journalentry: 'Journal Entry',
	payment: 'Payment',
	paymentmethod: 'Payment Method',
	purchase: 'Purchase',
	purchaseorder: 'Purchase Order',
	refundreceipt: 'Refund Receipt',
	term: 'Term',
	timeactivity: 'Time Activity',
	transfer: 'Transfer',
	vendor: 'Vendor',
	vendorcredit: 'Vendor Credit',
	invoice: 'Invoice',
	salesreceipt: 'Sales Receipt',
	taxagency: 'Tax Agency',
	companyinfo: 'Company Info',
	exchangerate: 'Exchange Rate',
	taxcode: 'Tax Code',
	taxrate: 'Tax Rate',
	budget: 'Budget',
	preferences: 'Preferences',
	taxservice: 'Tax Service',
};

const QBO_ENTITY_NAME: Record<string, string> = {
	billpayment: 'BillPayment',
	creditmemo: 'CreditMemo',
	journalentry: 'JournalEntry',
	paymentmethod: 'PaymentMethod',
	purchaseorder: 'PurchaseOrder',
	refundreceipt: 'RefundReceipt',
	timeactivity: 'TimeActivity',
	vendorcredit: 'VendorCredit',
	salesreceipt: 'SalesReceipt',
	taxagency: 'TaxAgency',
	companyinfo: 'CompanyInfo',
	exchangerate: 'ExchangeRate',
	taxcode: 'TaxCode',
	taxrate: 'TaxRate',
};

/** The name QBO's Query language (`SELECT * FROM <Entity>`) expects — CamelCase, not the lowercase URL segment. */
function toQboEntityName(entity: string): string {
	return QBO_ENTITY_NAME[entity] ?? entity.charAt(0).toUpperCase() + entity.slice(1);
}

const REPORT_TYPES = [
	'AccountList',
	'AgedPayableDetail',
	'AgedPayables',
	'AgedReceivableDetail',
	'AgedReceivables',
	'BalanceSheet',
	'CashFlow',
	'CustomerBalance',
	'CustomerBalanceDetail',
	'CustomerIncome',
	'CustomerSales',
	'DepartmentSales',
	'GeneralLedger',
	'InventoryValuationSummary',
	'ItemSales',
	'ProfitAndLoss',
	'ProfitAndLossDetail',
	'TransactionList',
	'TrialBalance',
	'VendorBalance',
	'VendorBalanceDetail',
	'VendorExpense',
];

export class QuickBooksOnline implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuickBooks Online (Novascape)',
		name: 'quickBooksOnline',
		icon: 'file:quickbooks-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the QuickBooks Online Accounting API',
		defaults: { name: 'QuickBooks Online' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'quickBooksOnlineOAuth2Api', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					...ALL_STANDARD_ENTITIES.map((value) => ({ name: ENTITY_LABELS[value], value })),
					{ name: 'Attachable', value: 'attachable' },
					{ name: 'Batch', value: 'batch' },
					{ name: 'Change Data Capture', value: 'changeDataCapture' },
					{ name: 'Report', value: 'report' },
				].sort((a, b) => a.name.localeCompare(b.name)),
				default: 'customer',
			},

			// ── Operation groups ──────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: CRUD_ENTITIES } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a record' },
					{ name: 'Delete', value: 'delete', action: 'Delete a record' },
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
					{ name: 'Update', value: 'update', action: 'Update a record' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: VOIDABLE_ENTITIES } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a record' },
					{ name: 'Delete', value: 'delete', action: 'Delete a record' },
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
					{ name: 'Update', value: 'update', action: 'Update a record' },
					{ name: 'Void', value: 'void', action: 'Void a record' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: CREATE_READ_ENTITIES } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a record' },
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: READ_ONLY_ENTITIES } },
				options: [
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: QUERY_ONLY_ENTITIES } },
				options: [{ name: 'Get Many', value: 'getAll', action: 'Get many records' }],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: READ_UPDATE_ENTITIES } },
				options: [
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
					{ name: 'Update', value: 'update', action: 'Update a record' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: CREATE_ONLY_ENTITIES } },
				options: [{ name: 'Create', value: 'create', action: 'Create a record' }],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['attachable'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a record' },
					{ name: 'Delete', value: 'delete', action: 'Delete a record' },
					{ name: 'Get', value: 'get', action: 'Get a record' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
					{ name: 'Update', value: 'update', action: 'Update a record' },
					{ name: 'Upload', value: 'upload', action: 'Upload a file attachment' },
				],
				default: 'upload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [{ name: 'Get', value: 'get', action: 'Get a report' }],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['batch'] } },
				options: [{ name: 'Execute', value: 'execute', action: 'Execute a batch of requests' }],
				default: 'execute',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['changeDataCapture'] } },
				options: [{ name: 'Get', value: 'get', action: 'Get changed entities' }],
				default: 'get',
			},

			// ── Shared record fields (Get / Update / Delete / Void) ──────────────
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [...ID_BASED_ENTITIES, 'attachable'],
						operation: ['get', 'update', 'delete', 'void'],
					},
				},
				description: 'The ID of the QuickBooks record',
			},
			{
				displayName: 'Sync Token',
				name: 'syncToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [...ID_BASED_ENTITIES, 'preferences', 'attachable'],
						operation: ['update', 'delete', 'void'],
					},
				},
				description:
					'The current SyncToken of the record (from a prior Get), required by QuickBooks to prevent conflicting updates',
			},
			{
				displayName: 'Source Currency Code',
				name: 'sourceCurrencyCode',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'USD',
				displayOptions: { show: { resource: ['exchangerate'], operation: ['get'] } },
				description: 'Three-letter ISO 4217 currency code to look up the exchange rate for',
			},
			{
				displayName: 'As Of Date',
				name: 'asOfDate',
				type: 'string',
				default: '',
				placeholder: '2024-01-01',
				displayOptions: { show: { resource: ['exchangerate'], operation: ['get'] } },
				description: 'Optional date (YYYY-MM-DD) to get the exchange rate as of. Defaults to today.',
			},

			// ── Create / Update body ─────────────────────────────────────────────
			{
				displayName: 'Fields (JSON)',
				name: 'fieldsJson',
				type: 'json',
				default: '{}',
				required: true,
				displayOptions: {
					show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['create', 'update'] },
				},
				description:
					'Entity fields as JSON, matching the QuickBooks Online API schema for this entity (see the Intuit Accounting API reference for the required/optional properties of each entity)',
			},
			{
				displayName: 'Sparse Update',
				name: 'sparse',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['update'] },
				},
				description:
					'Whether to only update the fields provided (recommended) instead of replacing the entire record',
			},

			// ── Get Many (Query) ─────────────────────────────────────────────────
			{
				displayName: 'Where Clause',
				name: 'where',
				type: 'string',
				default: '',
				placeholder: "DisplayName = 'John Doe'",
				displayOptions: { show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['getAll'] } },
				description:
					'Optional QBO query WHERE clause (without the WHERE keyword). Leave empty to fetch all records.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				default: '',
				placeholder: 'Metadata.LastUpdatedTime DESC',
				displayOptions: { show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['getAll'] } },
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				displayOptions: { show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['getAll'] } },
			},
			{
				displayName: 'Start Position',
				name: 'startPosition',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				displayOptions: { show: { resource: [...ALL_STANDARD_ENTITIES, 'attachable'], operation: ['getAll'] } },
			},

			// ── Attachable ────────────────────────────────────────────────────
			{
				displayName: 'Input Binary Field',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { resource: ['attachable'], operation: ['upload'] } },
				description: 'Name of the binary property containing the file to attach',
			},
			{
				displayName: 'Metadata (JSON)',
				name: 'attachableMetadata',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['attachable'], operation: ['upload'] } },
				description:
					'Optional Attachable fields (e.g. AttachableRef linking the file to a Transaction) as JSON',
			},

			// ── Report ────────────────────────────────────────────────────────
			{
				displayName: 'Report Type',
				name: 'reportType',
				type: 'options',
				noDataExpression: true,
				options: REPORT_TYPES.map((name) => ({ name, value: name })),
				default: 'ProfitAndLoss',
				displayOptions: { show: { resource: ['report'] } },
			},
			{
				displayName: 'Query Parameters (JSON)',
				name: 'reportParams',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['report'] } },
				description:
					'Optional report parameters as JSON (e.g. {"start_date": "2024-01-01", "end_date": "2024-12-31"})',
			},

			// ── Batch ─────────────────────────────────────────────────────────
			{
				displayName: 'Batch Items (JSON)',
				name: 'batchItems',
				type: 'json',
				default:
					'[\n  { "bId": "1", "operation": "create", "Customer": { "DisplayName": "New Customer" } }\n]',
				required: true,
				displayOptions: { show: { resource: ['batch'] } },
				description: 'Array of BatchItemRequest objects, as documented for the QuickBooks Batch endpoint',
			},

			// ── Change Data Capture ───────────────────────────────────────────
			{
				displayName: 'Entities',
				name: 'cdcEntities',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Invoice,Customer,Payment',
				displayOptions: { show: { resource: ['changeDataCapture'] } },
				description: 'Comma-separated list of entity names to check for changes',
			},
			{
				displayName: 'Changed Since',
				name: 'changedSince',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['changeDataCapture'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i += 1) {
			try {
				let response: IDataObject = {};

				if (resource === 'report') {
					if (operation === 'get') {
						const reportType = this.getNodeParameter('reportType', i) as string;
						const params = this.getNodeParameter('reportParams', i, {}) as IDataObject;
						const qs = typeof params === 'string' ? (JSON.parse(params) as IDataObject) : params;
						response = await quickBooksApiRequest.call(this, 'GET', `/reports/${reportType}`, undefined, qs);
					}
				} else if (resource === 'batch') {
					if (operation === 'execute') {
						const items_ = this.getNodeParameter('batchItems', i) as string | IDataObject[];
						const batchItemRequest =
							typeof items_ === 'string' ? (JSON.parse(items_) as IDataObject[]) : items_;
						response = await quickBooksApiRequest.call(this, 'POST', '/batch', {
							BatchItemRequest: batchItemRequest,
						});
					}
				} else if (resource === 'changeDataCapture') {
					if (operation === 'get') {
						const entities = this.getNodeParameter('cdcEntities', i) as string;
						const changedSince = this.getNodeParameter('changedSince', i) as string;
						response = await quickBooksApiRequest.call(this, 'GET', '/cdc', undefined, {
							entities,
							changedSince,
						});
					}
				} else if (resource === 'exchangerate' && operation === 'get') {
					const sourceCurrencyCode = this.getNodeParameter('sourceCurrencyCode', i) as string;
					const asOfDate = (this.getNodeParameter('asOfDate', i, '') as string).trim();
					response = await quickBooksApiRequest.call(this, 'GET', '/exchangerate', undefined, {
						sourcecurrencycode: sourceCurrencyCode,
						...(asOfDate ? { asofdate: asOfDate } : {}),
					});
				} else if (resource === 'preferences' && operation === 'get') {
					response = await quickBooksApiRequest.call(this, 'GET', '/preferences');
				} else if (resource === 'attachable' && operation === 'upload') {
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
					const metadataParam = this.getNodeParameter('attachableMetadata', i, {}) as
						| string
						| IDataObject;
					const metadata =
						typeof metadataParam === 'string' ? (JSON.parse(metadataParam) as IDataObject) : metadataParam;

					response = await quickBooksUploadRequest.call(this, metadata, {
						buffer,
						filename: binaryData.fileName ?? 'attachment',
						contentType: binaryData.mimeType,
					});
				} else if (ALL_STANDARD_ENTITIES.includes(resource) || resource === 'attachable') {
					const endpoint =
						resource === 'attachable'
							? 'attachable'
							: resource === 'taxservice'
								? 'taxservice/taxcode'
								: resource;
					const qboName = resource === 'attachable' ? 'Attachable' : toQboEntityName(resource);

					if (operation === 'create') {
						const fieldsJson = this.getNodeParameter('fieldsJson', i) as string | IDataObject;
						const body = typeof fieldsJson === 'string' ? (JSON.parse(fieldsJson) as IDataObject) : fieldsJson;
						response = await quickBooksApiRequest.call(this, 'POST', `/${endpoint}`, body);
					} else if (operation === 'get') {
						const recordId = this.getNodeParameter('recordId', i) as string;
						response = await quickBooksApiRequest.call(this, 'GET', `/${endpoint}/${recordId}`);
					} else if (operation === 'update') {
						const recordId =
							resource === 'preferences' ? '1' : (this.getNodeParameter('recordId', i) as string);
						const syncToken = this.getNodeParameter('syncToken', i) as string;
						const sparse = this.getNodeParameter('sparse', i, true) as boolean;
						const fieldsJson = this.getNodeParameter('fieldsJson', i) as string | IDataObject;
						const fields = typeof fieldsJson === 'string' ? (JSON.parse(fieldsJson) as IDataObject) : fieldsJson;
						const body: IDataObject = { ...fields, Id: recordId, SyncToken: syncToken, sparse };
						response = await quickBooksApiRequest.call(this, 'POST', `/${endpoint}`, body);
					} else if (operation === 'delete' || operation === 'void') {
						const recordId = this.getNodeParameter('recordId', i) as string;
						const syncToken = this.getNodeParameter('syncToken', i) as string;
						response = await quickBooksApiRequest.call(
							this,
							'POST',
							`/${endpoint}`,
							{ Id: recordId, SyncToken: syncToken },
							{ operation },
						);
					} else if (operation === 'getAll') {
						const where = (this.getNodeParameter('where', i, '') as string).trim();
						const orderBy = (this.getNodeParameter('orderBy', i, '') as string).trim();
						const maxResults = this.getNodeParameter('maxResults', i, 100) as number;
						const startPosition = this.getNodeParameter('startPosition', i, 1) as number;

						let query = `select * from ${qboName}`;
						if (where) query += ` where ${where}`;
						if (orderBy) query += ` orderby ${orderBy}`;
						query += ` startposition ${startPosition} maxresults ${maxResults}`;

						const queryResponse = await quickBooksQueryRequest.call(this, query);
						response = { [qboName]: queryResponse[qboName] ?? [] };
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unsupported operation "${operation}" on resource "${resource}"`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
						itemIndex: i,
					});
				}

				const entries = extractEntries(response);
				if (entries.length === 0) {
					returnData.push({ json: response, pairedItem: { item: i } });
				} else {
					for (const entry of entries) {
						returnData.push({ json: entry, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error instanceof NodeOperationError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}

/** QBO wraps single records under their entity name and lists as arrays under the same key. */
function extractEntries(response: IDataObject): IDataObject[] {
	const keys = Object.keys(response).filter((key) => key !== 'time');
	if (keys.length !== 1) return [];

	const value = response[keys[0]];
	if (Array.isArray(value)) return value as IDataObject[];
	if (value && typeof value === 'object') return [value as IDataObject];
	return [];
}
