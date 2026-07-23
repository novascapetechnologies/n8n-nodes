import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { checkPin } from './GenericFunctions';

export class KraPinChecker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KRA PIN Checker',
		name: 'kraPinChecker',
		icon: 'file:kra-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Validate a KRA taxpayer PIN using the KRA PIN Checker API',
		defaults: {
			name: 'KRA PIN Checker',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'kraPinCheckerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'PIN', value: 'pin' }],
				default: 'pin',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pin'] } },
				options: [
					{
						name: 'Check by PIN',
						value: 'checkByPin',
						description: 'Validate a taxpayer PIN and retrieve its status',
						action: 'Check a taxpayer PIN',
					},
				],
				default: 'checkByPin',
			},
			{
				displayName: 'KRA PIN',
				name: 'kraPin',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'P318295670X',
				description:
					'PIN of the taxpayer to validate. Format: starts with "A" or "P", followed by 9 digits, ending with any alphabet.',
				displayOptions: { show: { resource: ['pin'], operation: ['checkByPin'] } },
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

				if (resource === 'pin' && operation === 'checkByPin') {
					const kraPin = this.getNodeParameter('kraPin', i) as string;
					responseData = await checkPin.call(this, kraPin);
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
