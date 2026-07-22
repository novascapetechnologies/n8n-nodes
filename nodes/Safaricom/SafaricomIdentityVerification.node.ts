import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { identityApiRequest } from './GenericFunctions';

export class SafaricomIdentityVerification implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Safaricom Identity Verification',
		name: 'safaricomIdentityVerification',
		icon: 'file:safaricom-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'IMSI/SWAP CheckATI and organization info lookups against Safaricom identity APIs',
		defaults: {
			name: 'Safaricom Identity Verification',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'safaricomIdentityApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'IMSI Check ATI',
						value: 'imsiCheckAti',
						description: 'Check the Authentication Triplet Info for a customer number (IMSI v1)',
						action: 'Check imsi ati',
					},
					{
						name: 'SWAP Check ATI',
						value: 'swapCheckAti',
						description: 'Check the Authentication Triplet Info for a customer number after a SIM swap (IMSI v2)',
						action: 'Check swap ati',
					},
					{
						name: 'Query Org Info',
						value: 'queryOrgInfo',
						description: 'Look up organization information by identifier',
						action: 'Query org info',
					},
				],
				default: 'imsiCheckAti',
			},
			{
				displayName: 'Customer Number',
				name: 'customerNumber',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['imsiCheckAti', 'swapCheckAti'] } },
			},
			{
				displayName: 'Identifier Type',
				name: 'identifierType',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['queryOrgInfo'] } },
			},
			{
				displayName: 'Identifier',
				name: 'identifier',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['queryOrgInfo'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject = {};

				if (operation === 'imsiCheckAti') {
					responseData = await identityApiRequest.call(this, 'POST', '/imsi/v1/checkATI', {
						customerNumber: this.getNodeParameter('customerNumber', i) as string,
					});
				} else if (operation === 'swapCheckAti') {
					responseData = await identityApiRequest.call(this, 'POST', '/imsi/v2/checkATI', {
						customerNumber: this.getNodeParameter('customerNumber', i) as string,
					});
				} else if (operation === 'queryOrgInfo') {
					responseData = await identityApiRequest.call(this, 'POST', '/sfcverify/v1/query/info', {
						IdentifierType: this.getNodeParameter('identifierType', i) as string,
						Identifier: this.getNodeParameter('identifier', i) as string,
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`, {
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
