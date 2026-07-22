import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { simPortalApiRequest } from './GenericFunctions';

export class SafaricomSimPortal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Safaricom SIM Portal',
		name: 'safaricomSimPortal',
		icon: 'file:safaricom-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage SIMs and send IoT messages via the Safaricom SIM Portal APIs',
		defaults: {
			name: 'Safaricom SIM Portal',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'safaricomSimPortalApi',
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
					{ name: 'Message', value: 'message' },
					{ name: 'SIM', value: 'sim' },
				],
				default: 'sim',
			},

			// ----------------------------------- Message --------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{ name: 'Delete', value: 'delete', description: 'Delete a single message', action: 'Delete a message' },
					{ name: 'Delete Thread', value: 'deleteThread', description: 'Delete a message thread', action: 'Delete a message thread' },
					{ name: 'Filter', value: 'filter', description: 'Filter messages by date range and status', action: 'Filter messages' },
					{ name: 'Get Many', value: 'getAll', description: 'List many messages', action: 'Get many messages' },
					{ name: 'Search', value: 'search', description: 'Search messages by value', action: 'Search messages' },
					{ name: 'Send', value: 'send', description: 'Send a single message', action: 'Send a message' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Search Value',
				name: 'searchValue',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['search'] } },
			},
			{
				displayName: 'Page Number',
				name: 'pageNo',
				type: 'number',
				default: 1,
				displayOptions: { show: { resource: ['message'], operation: ['search', 'filter', 'getAll'] } },
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 10,
				displayOptions: { show: { resource: ['message'], operation: ['search', 'filter', 'getAll'] } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['filter'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['filter'] } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['filter'] } },
			},
			{
				displayName: 'Phone Number (Msisdn)',
				name: 'msisdn',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['send', 'deleteThread'] } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['delete'] } },
			},
			{
				displayName: 'VPN Group',
				name: 'vpnGroup',
				type: 'string',
				default: '',
				description: 'Leave empty to use the VPN Group set on the credential',
				displayOptions: {
					show: { resource: ['message'], operation: ['search', 'filter', 'getAll', 'send', 'delete', 'deleteThread'] },
				},
			},

			// ------------------------------------- SIM -----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sim'] } },
				options: [
					{ name: 'Activate', value: 'activate', description: 'Activate a SIM', action: 'Activate a sim' },
					{ name: 'Get Activation Trends', value: 'activationTrends', description: 'Get activation trends over a date range', action: 'Get activation trends' },
					{ name: 'Get Location Info', value: 'locationInfo', description: 'Look up the location of a SIM', action: 'Get location info' },
					{ name: 'Get Many', value: 'getAll', description: 'List many SIMs', action: 'Get many sims' },
					{ name: 'Query Customer Info', value: 'queryCustomerInfo', description: 'Look up customer information for a SIM', action: 'Query customer info' },
					{ name: 'Query Lifecycle Status', value: 'queryLifecycle', description: 'Check the lifecycle status of a SIM', action: 'Query lifecycle status' },
					{ name: 'Rename Asset', value: 'renameAsset', description: 'Rename a SIM asset', action: 'Rename an asset' },
					{ name: 'Suspend/Unsuspend', value: 'suspendUnsuspend', description: 'Suspend or unsuspend a subscriber', action: 'Suspend or unsuspend a subscriber' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Start At Index',
				name: 'startAtIndex',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['sim'], operation: ['getAll'] } },
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['sim'], operation: ['getAll'] } },
			},
			{
				displayName: 'Phone Number (Msisdn)',
				name: 'msisdn',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['sim'],
						operation: [
							'queryLifecycle',
							'queryCustomerInfo',
							'activate',
							'renameAsset',
							'locationInfo',
							'suspendUnsuspend',
						],
					},
				},
			},
			{
				displayName: 'Asset Name',
				name: 'assetName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['sim'], operation: ['renameAsset'] } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['sim'], operation: ['activationTrends'] } },
			},
			{
				displayName: 'Stop Date',
				name: 'stopDate',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['sim'], operation: ['activationTrends'] } },
			},
			{
				displayName: 'Product',
				name: 'product',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['sim'], operation: ['suspendUnsuspend'] } },
			},
			{
				displayName: 'Operation Type',
				name: 'suspendOperation',
				type: 'options',
				options: [
					{ name: 'Suspend', value: 'suspend' },
					{ name: 'Unsuspend', value: 'unsuspend' },
				],
				default: 'suspend',
				displayOptions: { show: { resource: ['sim'], operation: ['suspendUnsuspend'] } },
			},
			{
				displayName: 'VPN Group',
				name: 'vpnGroup',
				type: 'string',
				default: '',
				description: 'Leave empty to use the VPN Group set on the credential',
				displayOptions: {
					show: {
						resource: ['sim'],
						operation: [
							'getAll',
							'queryLifecycle',
							'queryCustomerInfo',
							'activate',
							'activationTrends',
							'renameAsset',
							'locationInfo',
							'suspendUnsuspend',
						],
					},
				},
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
				const credentials = await this.getCredentials('safaricomSimPortalApi');
				const defaultVpnGroup = (credentials.vpnGroup as string) || '';
				const defaultUsername = (credentials.username as string) || '';

				const vpnGroup = () => (this.getNodeParameter('vpnGroup', i, '') as string) || defaultVpnGroup;

				let responseData: IDataObject = {};

				if (resource === 'message') {
					if (operation === 'search') {
						responseData = await simPortalApiRequest.call(
							this,
							'POST',
							'/simportal/v1/searchmessages',
							{
								searchValue: this.getNodeParameter('searchValue', i) as string,
								vpnGroup: vpnGroup(),
								username: defaultUsername,
							},
							{
								pageNo: this.getNodeParameter('pageNo', i, 1) as number,
								pageSize: this.getNodeParameter('pageSize', i, 10) as number,
							},
						);
					} else if (operation === 'filter') {
						responseData = await simPortalApiRequest.call(
							this,
							'POST',
							'/simportal/v1/filtermessages',
							{
								startDate: this.getNodeParameter('startDate', i, '') as string,
								endDate: this.getNodeParameter('endDate', i, '') as string,
								status: this.getNodeParameter('status', i, '') as string,
								vpnGroup: vpnGroup(),
								username: defaultUsername,
							},
							{
								pageNo: this.getNodeParameter('pageNo', i, 1) as number,
								pageSize: this.getNodeParameter('pageSize', i, 10) as number,
							},
						);
					} else if (operation === 'getAll') {
						responseData = await simPortalApiRequest.call(
							this,
							'POST',
							'/simportal/v1/getallmessages',
							{ vpnGroup: vpnGroup() },
							{
								pageNo: this.getNodeParameter('pageNo', i, 1) as number,
								pageSize: this.getNodeParameter('pageSize', i, 10) as number,
							},
						);
					} else if (operation === 'send') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/sendsinglemessage', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							message: this.getNodeParameter('message', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'delete') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/deletemessage', {
							id: this.getNodeParameter('messageId', i) as number,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'deleteThread') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/deleteMessageThread', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown Message operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'sim') {
					if (operation === 'getAll') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/allsims', {
							vpnGroup: [vpnGroup()],
							startAtIndex: String(this.getNodeParameter('startAtIndex', i, 0)),
							pageSize: String(this.getNodeParameter('pageSize', i, 0)),
							username: defaultUsername,
						});
					} else if (operation === 'queryLifecycle') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/queryLifeCycleStatus', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'queryCustomerInfo') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/querycustomerinfo', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'activate') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/simactivation', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'activationTrends') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/getactivationtrends', {
							vpnGroup: vpnGroup(),
							startDate: this.getNodeParameter('startDate', i) as string,
							stopDate: this.getNodeParameter('stopDate', i) as string,
							username: defaultUsername,
						});
					} else if (operation === 'renameAsset') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/renameasset', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
							assetName: this.getNodeParameter('assetName', i) as string,
						});
					} else if (operation === 'locationInfo') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/getlocationinfo', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							vpnGroup: vpnGroup(),
							username: defaultUsername,
						});
					} else if (operation === 'suspendUnsuspend') {
						responseData = await simPortalApiRequest.call(this, 'POST', '/simportal/v1/suspend_unsuspend_sub', {
							msisdn: this.getNodeParameter('msisdn', i) as string,
							username: defaultUsername,
							vpnGroup: vpnGroup(),
							product: this.getNodeParameter('product', i) as string,
							operation: this.getNodeParameter('suspendOperation', i) as string,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown SIM operation "${operation}"`, {
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
