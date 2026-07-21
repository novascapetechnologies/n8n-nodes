import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { kraApiRequest, withCredentialDefault } from './GenericFunctions';

const tinField = {
	displayName: 'TIN',
	name: 'tin',
	type: 'string' as const,
	default: '',
	description: 'Taxpayer PIN. Leave empty to use the TIN configured on the credential.',
};

const bhfIdField = {
	displayName: 'Branch ID',
	name: 'bhfId',
	type: 'string' as const,
	default: '',
	description: 'ETIMS branch office ID. Leave empty to use the branch ID configured on the credential.',
};

const lastReqDtField = {
	displayName: 'Last Request Date',
	name: 'lastReqDt',
	type: 'string' as const,
	default: '20180101000000',
	placeholder: '20260101000000',
	description:
		'Only return records changed after this date/time, format yyyyMMddHHmmss. Keep the old default date to fetch the full list.',
};

export class KraEtims implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KRA eTIMS',
		name: 'kraEtims',
		icon: 'file:kra-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the KRA eTIMS (Electronic Tax Invoice Management System) OSCU API',
		defaults: {
			name: 'KRA eTIMS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'kraEtimsApi',
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
					{ name: 'Branch', value: 'branch' },
					{ name: 'Code List', value: 'codeList' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Device', value: 'device' },
					{ name: 'Imported Item', value: 'importedItem' },
					{ name: 'Insurance', value: 'insurance' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Item', value: 'item' },
					{ name: 'Item Classification', value: 'itemClassification' },
					{ name: 'Notice', value: 'notice' },
					{ name: 'Purchase', value: 'purchase' },
					{ name: 'Sale', value: 'sales' },
					{ name: 'Stock', value: 'stock' },
					{ name: 'Supplier', value: 'supplier' },
					{ name: 'Taxpayer', value: 'taxpayer' },
					{ name: 'User', value: 'user' },
				],
				default: 'device',
			},

			// ---------------------------------- device ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['device'] } },
				options: [
					{
						name: 'Initialize',
						value: 'initialize',
						description: 'Initialize the OSCU device and retrieve its CMC key',
						action: 'Initialize an OSCU device',
					},
				],
				default: 'initialize',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['device'], operation: ['initialize'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['device'], operation: ['initialize'] } },
			},
			{
				displayName: 'Device Serial Number',
				name: 'dvcSrlNo',
				type: 'string',
				default: '',
				description: 'Leave empty to use the device serial number configured on the credential',
				displayOptions: { show: { resource: ['device'], operation: ['initialize'] } },
			},

			// -------------------------------- code list ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['codeList'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the list of standard KRA codes',
						action: 'Get many codes',
					},
				],
				default: 'getAll',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['codeList'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['codeList'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['codeList'], operation: ['getAll'] } },
			},

			// ---------------------------- item classification -----------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['itemClassification'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the list of item classification codes',
						action: 'Get many item classifications',
					},
				],
				default: 'getAll',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['itemClassification'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['itemClassification'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['itemClassification'], operation: ['getAll'] } },
			},

			// -------------------------------- branch --------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['branch'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the list of registered branches',
						action: 'Get many branches',
					},
				],
				default: 'getAll',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['branch'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['branch'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['branch'], operation: ['getAll'] } },
			},

			// -------------------------------- notice --------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['notice'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up KRA notices',
						action: 'Get many notices',
					},
				],
				default: 'getAll',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['notice'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['notice'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['notice'], operation: ['getAll'] } },
			},

			// -------------------------------- customer ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['customer'] } },
				options: [
					{
						name: 'Get PIN Info',
						value: 'getPinInfo',
						description: 'Look up customer PIN information',
						action: 'Get customer PIN info',
					},
					{
						name: 'Save',
						value: 'save',
						description: "Save a branch's customer information",
						action: 'Save a customer',
					},
				],
				default: 'save',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['customer'], operation: ['getPinInfo'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['customer'], operation: ['getPinInfo'] } },
			},
			{
				displayName: 'Customer TIN',
				name: 'custmTin',
				type: 'string',
				default: '',
				required: true,
				description: 'PIN of the customer to look up',
				displayOptions: { show: { resource: ['customer'], operation: ['getPinInfo'] } },
			},
			{
				displayName: 'Customer Number',
				name: 'custNo',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['save'] } },
			},
			{
				displayName: 'Customer TIN',
				name: 'custTin',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['save'] } },
			},
			{
				displayName: 'Customer Name',
				name: 'custNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['customer'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['customer'], operation: ['save'] } },
				options: [
					{
						displayName: 'Active',
						name: 'useYn',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'Y' },
							{ name: 'No', value: 'N' },
						],
						default: 'Y',
					},
					{ displayName: 'Address', name: 'adrs', type: 'string', default: '' },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{ displayName: 'Fax Number', name: 'faxNo', type: 'string', default: '' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
					{ displayName: 'Telephone Number', name: 'telNo', type: 'string', default: '' },
				],
			},

			// -------------------------------- supplier ------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['supplier'] } },
				options: [
					{
						name: 'Save',
						value: 'save',
						description: "Save a branch's supplier information",
						action: 'Save a supplier',
					},
				],
				default: 'save',
			},
			{
				displayName: 'Customer Number',
				name: 'custNo',
				type: 'string',
				default: '',
				required: true,
				description: 'Internal reference number for the supplier',
				displayOptions: { show: { resource: ['supplier'], operation: ['save'] } },
			},
			{
				displayName: 'Supplier TIN',
				name: 'custTin',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['supplier'], operation: ['save'] } },
			},
			{
				displayName: 'Supplier Name',
				name: 'custNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['supplier'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['supplier'], operation: ['save'] } },
				options: [
					{
						displayName: 'Active',
						name: 'useYn',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'Y' },
							{ name: 'No', value: 'N' },
						],
						default: 'Y',
					},
					{ displayName: 'Address', name: 'adrs', type: 'string', default: '' },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{ displayName: 'Fax Number', name: 'faxNo', type: 'string', default: '' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
					{ displayName: 'Telephone Number', name: 'telNo', type: 'string', default: '' },
				],
			},

			// -------------------------------- user -----------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['user'] } },
				options: [
					{
						name: 'Save',
						value: 'save',
						description: 'Save a branch user account',
						action: 'Save a user',
					},
				],
				default: 'save',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['user'], operation: ['save'] } },
			},
			{
				displayName: 'User Name',
				name: 'userNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['user'], operation: ['save'] } },
			},
			{
				displayName: 'Password',
				name: 'pwd',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['user'], operation: ['save'] } },
			},
			{
				displayName: 'Authority Code',
				name: 'authCd',
				type: 'string',
				default: 'AT01',
				required: true,
				displayOptions: { show: { resource: ['user'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['user'], operation: ['save'] } },
				options: [
					{ displayName: 'Address', name: 'adrs', type: 'string', default: '' },
					{ displayName: 'Contact', name: 'cntc', type: 'string', default: '' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
					{
						displayName: 'Active',
						name: 'useYn',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'Y' },
							{ name: 'No', value: 'N' },
						],
						default: 'Y',
					},
				],
			},

			// -------------------------------- insurance -------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['insurance'] } },
				options: [
					{
						name: 'Save',
						value: 'save',
						description: 'Save a branch insurance',
						action: 'Save an insurance',
					},
				],
				default: 'save',
			},
			{
				displayName: 'Insurance Code',
				name: 'isrccCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['insurance'], operation: ['save'] } },
			},
			{
				displayName: 'Insurance Name',
				name: 'isrccNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['insurance'], operation: ['save'] } },
			},
			{
				displayName: 'Insurance Rate',
				name: 'isrcRt',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['insurance'], operation: ['save'] } },
			},

			// ---------------------------------- item ----------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['item'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the product list',
						action: 'Get many items',
					},
					{ name: 'Save', value: 'save', description: 'Save an item', action: 'Save an item' },
					{
						name: 'Save Composition',
						value: 'saveComposition',
						description: 'Save the raw-material composition of an item',
						action: 'Save an item composition',
					},
				],
				default: 'save',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['item'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['item'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['item'], operation: ['getAll'] } },
			},
			{
				displayName: 'Item Code',
				name: 'itemCd',
				type: 'string',
				default: '',
				required: true,
				description:
					'The suffix is server-enforced per (product type + packaging unit + quantity unit) combination. If the API rejects it with "Invalid itemCd Sequence. Expected sequence ending with: ...N", use that suffix verbatim.',
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Item Classification Code',
				name: 'itemClsCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Item Type Code',
				name: 'itemTyCd',
				type: 'string',
				default: '',
				required: true,
				description: '1 = Raw material, 2 = Finished product, 3 = Service',
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Item Name',
				name: 'itemNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Packaging Unit Code',
				name: 'pkgUnitCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Quantity Unit Code',
				name: 'qtyUnitCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Tax Type Code',
				name: 'taxTyCd',
				type: 'string',
				default: 'B',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Default Price',
				name: 'dftPrc',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['item'], operation: ['save'] } },
				options: [
					{
						displayName: 'Active',
						name: 'useYn',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'Y' },
							{ name: 'No', value: 'N' },
						],
						default: 'Y',
					},
					{ displayName: 'Additional Info', name: 'addInfo', type: 'string', default: '' },
					{ displayName: 'Batch Number', name: 'btchNo', type: 'string', default: '' },
					{ displayName: 'Group Price Level 1', name: 'grpPrcL1', type: 'number', default: 0 },
					{ displayName: 'Group Price Level 2', name: 'grpPrcL2', type: 'number', default: 0 },
					{ displayName: 'Group Price Level 3', name: 'grpPrcL3', type: 'number', default: 0 },
					{ displayName: 'Group Price Level 4', name: 'grpPrcL4', type: 'number', default: 0 },
					{
						displayName: 'Insurance Applicable',
						name: 'isrcAplcbYn',
						type: 'options',
						options: [
							{ name: 'Yes', value: 'Y' },
							{ name: 'No', value: 'N' },
						],
						default: 'N',
					},
					{ displayName: 'Origin Country Code', name: 'orgnNatCd', type: 'string', default: 'KE' },
					{ displayName: 'Safety Quantity', name: 'sftyQty', type: 'number', default: 0 },
					{ displayName: 'Standard Item Name', name: 'itemStdNm', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Item Code',
				name: 'itemCd',
				type: 'string',
				default: '',
				required: true,
				description: 'Code of the finished item',
				displayOptions: { show: { resource: ['item'], operation: ['saveComposition'] } },
			},
			{
				displayName: 'Component Item Code',
				name: 'cpstItemCd',
				type: 'string',
				default: '',
				required: true,
				description: 'Code of the raw-material item used in the composition',
				displayOptions: { show: { resource: ['item'], operation: ['saveComposition'] } },
			},
			{
				displayName: 'Component Quantity',
				name: 'cpstQty',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['saveComposition'] } },
			},

			// ------------------------------ imported item -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['importedItem'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the list of imported items',
						action: 'Get many imported items',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an imported item',
						action: 'Update an imported item',
					},
				],
				default: 'getAll',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['importedItem'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['importedItem'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['importedItem'], operation: ['getAll'] } },
			},
			{
				displayName: 'Task Code',
				name: 'taskCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Declaration Date',
				name: 'dclDe',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'ddMMyyyy',
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Item Sequence',
				name: 'itemSeq',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'HS Code',
				name: 'hsCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Item Classification Code',
				name: 'itemClsCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Item Code',
				name: 'itemCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Import Item Status Code',
				name: 'imptItemSttsCd',
				type: 'string',
				default: '',
				required: true,
				description: '1 = Awaiting approval, 2 = Cancelled, 3 = Approved',
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},
			{
				displayName: 'Remark',
				name: 'remark',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['importedItem'], operation: ['update'] } },
			},

			// -------------------------------- invoice ----------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['invoice'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Look up invoice details',
						action: 'Get an invoice',
					},
				],
				default: 'get',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['invoice'], operation: ['get'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['invoice'], operation: ['get'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['invoice'], operation: ['get'] } },
			},
			{
				displayName: 'Invoice Number',
				name: 'invcNo',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['get'] } },
			},

			// --------------------------------- sales -------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sales'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the transaction sales list',
						action: 'Get many sales transactions',
					},
					{
						name: 'Save',
						value: 'save',
						description: 'Send a sales transaction',
						action: 'Save a sales transaction',
					},
				],
				default: 'save',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['sales'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['sales'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['sales'], operation: ['getAll'] } },
			},
			{
				displayName: 'Invoice Number',
				name: 'invcNo',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Sales Type Code',
				name: 'salesTyCd',
				type: 'string',
				default: 'N',
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Receipt Type Code',
				name: 'rcptTyCd',
				type: 'string',
				default: 'S',
				required: true,
				description:
					'S = Sale, R = Credit note/refund. For a credit note, keep Item List quantities positive (the R code already marks it as a return) — only the monetary amounts should be negative.',
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Payment Type Code',
				name: 'pmtTyCd',
				type: 'string',
				default: '01',
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Sales Status Code',
				name: 'salesSttsCd',
				type: 'string',
				default: '02',
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Total Item Count',
				name: 'totItemCnt',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Total Taxable Amount',
				name: 'totTaxblAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Total Tax Amount',
				name: 'totTaxAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Total Amount',
				name: 'totAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Item List (JSON)',
				name: 'itemList',
				type: 'json',
				default: '[]',
				required: true,
				description: 'Array of line items, matching the eTIMS itemList schema',
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['sales'], operation: ['save'] } },
				options: [
					{ displayName: 'Confirmed Date/Time', name: 'cfmDt', type: 'string', default: '' },
					{ displayName: 'Customer Name', name: 'custNm', type: 'string', default: '' },
					{ displayName: 'Customer TIN', name: 'custTin', type: 'string', default: '' },
					{ displayName: 'Original Invoice Number', name: 'orgInvcNo', type: 'number', default: 0 },
					{ displayName: 'Purchaser Acceptance', name: 'prchrAcptcYn', type: 'string', default: 'N' },
					{
						displayName: 'Receipt (JSON)',
						name: 'receipt',
						type: 'json',
						default: '{}',
						description: 'ETIMS receipt object (topMsg, btmMsg, trdeNm, etc.)',
					},
					{ displayName: 'Refund Date/Time', name: 'rfdDt', type: 'string', default: '' },
					{ displayName: 'Refund Reason Code', name: 'rfdRsnCd', type: 'string', default: '' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
					{ displayName: 'Sales Date', name: 'salesDt', type: 'string', default: '' },
					{ displayName: 'Stock Release Date/Time', name: 'stockRlsDt', type: 'string', default: '' },
					{ displayName: 'Tax Amount A', name: 'taxAmtA', type: 'number', default: 0 },
					{ displayName: 'Tax Amount B', name: 'taxAmtB', type: 'number', default: 0 },
					{ displayName: 'Tax Amount C', name: 'taxAmtC', type: 'number', default: 0 },
					{ displayName: 'Tax Amount D', name: 'taxAmtD', type: 'number', default: 0 },
					{ displayName: 'Tax Amount E', name: 'taxAmtE', type: 'number', default: 0 },
					{ displayName: 'Tax Rate A', name: 'taxRtA', type: 'number', default: 0 },
					{ displayName: 'Tax Rate B', name: 'taxRtB', type: 'number', default: 0 },
					{ displayName: 'Tax Rate C', name: 'taxRtC', type: 'number', default: 0 },
					{ displayName: 'Tax Rate D', name: 'taxRtD', type: 'number', default: 0 },
					{ displayName: 'Tax Rate E', name: 'taxRtE', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount A', name: 'taxblAmtA', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount B', name: 'taxblAmtB', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount C', name: 'taxblAmtC', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount D', name: 'taxblAmtD', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount E', name: 'taxblAmtE', type: 'number', default: 0 },
				],
			},

			// -------------------------------- purchase -----------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['purchase'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Look up the purchases list',
						action: 'Get many purchase transactions',
					},
					{
						name: 'Save',
						value: 'save',
						description: 'Send purchase transaction information',
						action: 'Save a purchase transaction',
					},
				],
				default: 'save',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['purchase'], operation: ['getAll'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['purchase'], operation: ['getAll'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['purchase'], operation: ['getAll'] } },
			},
			{
				displayName: 'Invoice Number',
				name: 'invcNo',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Supplier TIN',
				name: 'spplrTin',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Supplier Name',
				name: 'spplrNm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Purchase Type Code',
				name: 'pchsTyCd',
				type: 'string',
				default: 'N',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Receipt Type Code',
				name: 'rcptTyCd',
				type: 'string',
				default: 'P',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Payment Type Code',
				name: 'pmtTyCd',
				type: 'string',
				default: '01',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Purchase Status Code',
				name: 'pchsSttsCd',
				type: 'string',
				default: '02',
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Total Item Count',
				name: 'totItemCnt',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Total Taxable Amount',
				name: 'totTaxblAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Total Tax Amount',
				name: 'totTaxAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Total Amount',
				name: 'totAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Item List (JSON)',
				name: 'itemList',
				type: 'json',
				default: '[]',
				required: true,
				description: 'Array of line items, matching the eTIMS purchase itemList schema',
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['purchase'], operation: ['save'] } },
				options: [
					{ displayName: 'Confirmed Date/Time', name: 'cfmDt', type: 'string', default: '' },
					{ displayName: 'Original Invoice Number', name: 'orgInvcNo', type: 'number', default: 0 },
					{ displayName: 'Purchase Date', name: 'pchsDt', type: 'string', default: '' },
					{ displayName: 'Registration Type Code', name: 'regTyCd', type: 'string', default: 'M' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
					{ displayName: 'Supplier Branch ID', name: 'spplrBhfId', type: 'string', default: '' },
					{ displayName: 'Supplier Invoice Number', name: 'spplrInvcNo', type: 'string', default: '' },
					{ displayName: 'Tax Amount A', name: 'taxAmtA', type: 'number', default: 0 },
					{ displayName: 'Tax Amount B', name: 'taxAmtB', type: 'number', default: 0 },
					{ displayName: 'Tax Amount C', name: 'taxAmtC', type: 'number', default: 0 },
					{ displayName: 'Tax Amount D', name: 'taxAmtD', type: 'number', default: 0 },
					{ displayName: 'Tax Amount E', name: 'taxAmtE', type: 'number', default: 0 },
					{ displayName: 'Tax Rate A', name: 'taxRtA', type: 'number', default: 0 },
					{ displayName: 'Tax Rate B', name: 'taxRtB', type: 'number', default: 0 },
					{ displayName: 'Tax Rate C', name: 'taxRtC', type: 'number', default: 0 },
					{ displayName: 'Tax Rate D', name: 'taxRtD', type: 'number', default: 0 },
					{ displayName: 'Tax Rate E', name: 'taxRtE', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount A', name: 'taxblAmtA', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount B', name: 'taxblAmtB', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount C', name: 'taxblAmtC', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount D', name: 'taxblAmtD', type: 'number', default: 0 },
					{ displayName: 'Taxable Amount E', name: 'taxblAmtE', type: 'number', default: 0 },
					{ displayName: 'Warehouse Date/Time', name: 'wrhsDt', type: 'string', default: '' },
				],
			},

			// ---------------------------------- stock -------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['stock'] } },
				options: [
					{
						name: 'Get Movement',
						value: 'getMovement',
						description: 'Look up stock movement',
						action: 'Get stock movement',
					},
					{
						name: 'Save In/Out',
						value: 'saveInOut',
						description: 'Save a stock IO (in/out) transaction',
						action: 'Save a stock in or out transaction',
					},
					{
						name: 'Save Master',
						value: 'saveMaster',
						description: 'Save stock master information',
						action: 'Save stock master information',
					},
				],
				default: 'saveMaster',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['stock'], operation: ['getMovement'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['stock'], operation: ['getMovement'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['stock'], operation: ['getMovement'] } },
			},
			{
				displayName: 'Item Code',
				name: 'itemCd',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['stock'], operation: ['saveMaster'] } },
			},
			{
				displayName: 'Residual Quantity',
				name: 'rsdQty',
				type: 'number',
				default: 0,
				required: true,
				description:
					'Must exactly equal the cumulative Save In/Out quantity already recorded for this item code, otherwise the save is silently rejected',
				displayOptions: { show: { resource: ['stock'], operation: ['saveMaster'] } },
			},
			{
				displayName: 'Stock Movement Number',
				name: 'sarNo',
				type: 'number',
				default: 0,
				required: true,
				description:
					'Server-enforced strict sequential number per TIN. If the API rejects it with "Invalid sarNo: Expected: N but found: M", use N.',
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Stock Movement Type Code',
				name: 'sarTyCd',
				type: 'string',
				default: '',
				required: true,
				description: '01 = Purchase, 02 = Adjustment, 03 = Stock in, 11 = Sale, 12 = Adjustment out, etc',
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Occurred Date',
				name: 'ocrnDt',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'yyyyMMdd',
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Total Item Count',
				name: 'totItemCnt',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Total Taxable Amount',
				name: 'totTaxblAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Total Tax Amount',
				name: 'totTaxAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Total Amount',
				name: 'totAmt',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Item List (JSON)',
				name: 'itemList',
				type: 'json',
				default: '[]',
				required: true,
				description: 'Array of line items, matching the eTIMS stock IO itemList schema',
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['stock'], operation: ['saveInOut'] } },
				options: [
					{ displayName: 'Customer Branch ID', name: 'custBhfId', type: 'string', default: '' },
					{ displayName: 'Customer Name', name: 'custNm', type: 'string', default: '' },
					{ displayName: 'Customer TIN', name: 'custTin', type: 'string', default: '' },
					{ displayName: 'Original Stock Movement Number', name: 'orgSarNo', type: 'number', default: 0 },
					{ displayName: 'Registration Type Code', name: 'regTyCd', type: 'string', default: 'M' },
					{ displayName: 'Remark', name: 'remark', type: 'string', default: '' },
				],
			},

			// -------------------------------- taxpayer ------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['taxpayer'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Look up taxpayer information',
						action: 'Get taxpayer info',
					},
				],
				default: 'get',
			},
			{
				...tinField,
				displayOptions: { show: { resource: ['taxpayer'], operation: ['get'] } },
			},
			{
				...bhfIdField,
				displayOptions: { show: { resource: ['taxpayer'], operation: ['get'] } },
			},
			{
				...lastReqDtField,
				displayOptions: { show: { resource: ['taxpayer'], operation: ['get'] } },
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
				const credentials = await this.getCredentials('kraEtimsApi');
				let responseData: IDataObject = {};

				const tin = () => withCredentialDefault(this.getNodeParameter('tin', i, '') as string, credentials.tin);
				const bhfId = () =>
					withCredentialDefault(this.getNodeParameter('bhfId', i, '') as string, credentials.bhfId);
				const lastReqDt = () => this.getNodeParameter('lastReqDt', i, '') as string;

				if (resource === 'device' && operation === 'initialize') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectInitOsdcInfo', {
						tin: tin(),
						bhfId: bhfId(),
						dvcSrlNo: withCredentialDefault(
							this.getNodeParameter('dvcSrlNo', i, '') as string,
							credentials.dvcSrlNo,
						),
					});
				} else if (resource === 'codeList' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectCodeList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'itemClassification' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectItemClsList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'branch' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/branchList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'notice' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectNoticeList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'customer' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					responseData = await kraApiRequest.call(this, 'POST', '/branchSendCustomerInfo', {
						custNo: this.getNodeParameter('custNo', i) as string,
						custTin: this.getNodeParameter('custTin', i) as string,
						custNm: this.getNodeParameter('custNm', i) as string,
						regrNm: 'Admin',
						regrId: 'Admin',
						modrNm: 'Admin',
						modrId: 'Admin',
						...additionalFields,
					});
				} else if (resource === 'customer' && operation === 'getPinInfo') {
					responseData = await kraApiRequest.call(this, 'POST', '/customerPinInfo', {
						tin: tin(),
						bhfId: bhfId(),
						custmTin: this.getNodeParameter('custmTin', i) as string,
					});
				} else if (resource === 'supplier' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					responseData = await kraApiRequest.call(this, 'POST', '/saveBhfCustomer', {
						tin: tin(),
						bhfId: bhfId(),
						custNo: this.getNodeParameter('custNo', i) as string,
						custTin: this.getNodeParameter('custTin', i) as string,
						custNm: this.getNodeParameter('custNm', i) as string,
						regrNm: 'Admin',
						regrId: 'Admin',
						modrNm: 'Admin',
						modrId: 'Admin',
						...additionalFields,
					});
				} else if (resource === 'user' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					responseData = await kraApiRequest.call(this, 'POST', '/branchUserAccount', {
						userId: this.getNodeParameter('userId', i) as string,
						userNm: this.getNodeParameter('userNm', i) as string,
						pwd: this.getNodeParameter('pwd', i) as string,
						authCd: this.getNodeParameter('authCd', i) as string,
						regrNm: 'Admin',
						regrId: 'Admin',
						modrNm: 'Admin',
						modrId: 'Admin',
						...additionalFields,
					});
				} else if (resource === 'insurance' && operation === 'save') {
					responseData = await kraApiRequest.call(this, 'POST', '/branchInsuranceInfo', {
						isrccCd: this.getNodeParameter('isrccCd', i) as string,
						isrccNm: this.getNodeParameter('isrccNm', i) as string,
						isrcRt: this.getNodeParameter('isrcRt', i) as number,
						useYn: 'Y',
						regrNm: 'Admin',
						regrId: 'Admin',
						modrNm: 'Admin',
						modrId: 'Admin',
					});
				} else if (resource === 'item' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					responseData = await kraApiRequest.call(this, 'POST', '/saveItem', {
						itemCd: this.getNodeParameter('itemCd', i) as string,
						itemClsCd: this.getNodeParameter('itemClsCd', i) as string,
						itemTyCd: this.getNodeParameter('itemTyCd', i) as string,
						itemNm: this.getNodeParameter('itemNm', i) as string,
						pkgUnitCd: this.getNodeParameter('pkgUnitCd', i) as string,
						qtyUnitCd: this.getNodeParameter('qtyUnitCd', i) as string,
						taxTyCd: this.getNodeParameter('taxTyCd', i) as string,
						dftPrc: this.getNodeParameter('dftPrc', i) as number,
						regrNm: 'Admin',
						regrId: 'admin01',
						modrNm: 'Admin',
						modrId: 'admin01',
						...additionalFields,
					});
				} else if (resource === 'item' && operation === 'saveComposition') {
					responseData = await kraApiRequest.call(this, 'POST', '/saveItemComposition', {
						itemCd: this.getNodeParameter('itemCd', i) as string,
						cpstItemCd: this.getNodeParameter('cpstItemCd', i) as string,
						cpstQty: this.getNodeParameter('cpstQty', i) as number,
						regrNm: 'Admin',
						regrId: 'admin01',
						modrNm: 'Admin',
						modrId: 'admin01',
					});
				} else if (resource === 'item' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/itemInfo', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'importedItem' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/importedItemInfo', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'importedItem' && operation === 'update') {
					responseData = await kraApiRequest.call(this, 'POST', '/updateImportItem', {
						taskCd: this.getNodeParameter('taskCd', i) as string,
						dclDe: this.getNodeParameter('dclDe', i) as string,
						itemSeq: this.getNodeParameter('itemSeq', i) as number,
						hsCd: this.getNodeParameter('hsCd', i) as string,
						itemClsCd: this.getNodeParameter('itemClsCd', i) as string,
						itemCd: this.getNodeParameter('itemCd', i) as string,
						imptItemSttsCd: this.getNodeParameter('imptItemSttsCd', i) as string,
						remark: this.getNodeParameter('remark', i, '') as string,
						modrNm: 'Admin',
						modrId: 'Admin',
					});
				} else if (resource === 'invoice' && operation === 'get') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectInvoiceDetails', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
						invcNo: this.getNodeParameter('invcNo', i) as string,
					});
				} else if (resource === 'sales' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					if (typeof additionalFields.receipt === 'string') {
						additionalFields.receipt = JSON.parse(additionalFields.receipt);
					}
					const itemListRaw = this.getNodeParameter('itemList', i) as string;
					responseData = await kraApiRequest.call(this, 'POST', '/sendSalesTransaction', {
						invcNo: this.getNodeParameter('invcNo', i) as number,
						salesTyCd: this.getNodeParameter('salesTyCd', i) as string,
						rcptTyCd: this.getNodeParameter('rcptTyCd', i) as string,
						pmtTyCd: this.getNodeParameter('pmtTyCd', i) as string,
						salesSttsCd: this.getNodeParameter('salesSttsCd', i) as string,
						totItemCnt: this.getNodeParameter('totItemCnt', i) as number,
						totTaxblAmt: this.getNodeParameter('totTaxblAmt', i) as number,
						totTaxAmt: this.getNodeParameter('totTaxAmt', i) as number,
						totAmt: this.getNodeParameter('totAmt', i) as number,
						itemList: JSON.parse(itemListRaw),
						regrId: 'admin01',
						regrNm: 'Admin',
						modrId: 'admin01',
						modrNm: 'Admin',
						...additionalFields,
					});
				} else if (resource === 'sales' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectTrnsSalesList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'purchase' && operation === 'save') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const itemListRaw = this.getNodeParameter('itemList', i) as string;
					responseData = await kraApiRequest.call(this, 'POST', '/sendPurchaseTransactionInfo', {
						invcNo: this.getNodeParameter('invcNo', i) as number,
						spplrTin: this.getNodeParameter('spplrTin', i) as string,
						spplrNm: this.getNodeParameter('spplrNm', i) as string,
						pchsTyCd: this.getNodeParameter('pchsTyCd', i) as string,
						rcptTyCd: this.getNodeParameter('rcptTyCd', i) as string,
						pmtTyCd: this.getNodeParameter('pmtTyCd', i) as string,
						pchsSttsCd: this.getNodeParameter('pchsSttsCd', i) as string,
						totItemCnt: this.getNodeParameter('totItemCnt', i) as number,
						totTaxblAmt: this.getNodeParameter('totTaxblAmt', i) as number,
						totTaxAmt: this.getNodeParameter('totTaxAmt', i) as number,
						totAmt: this.getNodeParameter('totAmt', i) as number,
						itemList: JSON.parse(itemListRaw),
						regrNm: 'Admin',
						regrId: 'admin01',
						modrNm: 'Admin',
						modrId: 'admin01',
						...additionalFields,
					});
				} else if (resource === 'purchase' && operation === 'getAll') {
					responseData = await kraApiRequest.call(this, 'POST', '/getPurchaseTransactionInfo', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'stock' && operation === 'saveMaster') {
					responseData = await kraApiRequest.call(this, 'POST', '/save/stockMaster', {
						itemCd: this.getNodeParameter('itemCd', i) as string,
						rsdQty: this.getNodeParameter('rsdQty', i) as number,
						regrId: 'admin01',
						regrNm: 'Admin',
						modrNm: 'Admin',
						modrId: 'admin01',
					});
				} else if (resource === 'stock' && operation === 'getMovement') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectStockMoveList', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else if (resource === 'stock' && operation === 'saveInOut') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const itemListRaw = this.getNodeParameter('itemList', i) as string;
					responseData = await kraApiRequest.call(this, 'POST', '/insert/stockIO', {
						sarNo: this.getNodeParameter('sarNo', i) as number,
						sarTyCd: this.getNodeParameter('sarTyCd', i) as string,
						ocrnDt: this.getNodeParameter('ocrnDt', i) as string,
						totItemCnt: this.getNodeParameter('totItemCnt', i) as number,
						totTaxblAmt: this.getNodeParameter('totTaxblAmt', i) as number,
						totTaxAmt: this.getNodeParameter('totTaxAmt', i) as number,
						totAmt: this.getNodeParameter('totAmt', i) as number,
						itemList: JSON.parse(itemListRaw),
						regrId: 'admin01',
						regrNm: 'Admin',
						modrNm: 'Admin',
						modrId: 'admin01',
						...additionalFields,
					});
				} else if (resource === 'taxpayer' && operation === 'get') {
					responseData = await kraApiRequest.call(this, 'POST', '/selectTaxpayerInfo', {
						tin: tin(),
						bhfId: bhfId(),
						lastReqDt: lastReqDt(),
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"!`,
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
