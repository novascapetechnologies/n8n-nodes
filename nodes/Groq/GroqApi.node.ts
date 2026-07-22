import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { groqApiBinaryRequest, groqApiFormRequest, groqApiRequest } from './GenericFunctions';

/**
 * Groq API node — covers every route in the "Groq API" Postman collection:
 * Chat, Audio, Models, Batches and Files.
 */
export class GroqApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Groq API (Novascape)',
		name: 'groqApi',
		icon: 'file:groq-logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Groq API (chat, audio, models, batches, files)',
		defaults: { name: 'Groq API' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'groqApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Audio', value: 'audio' },
					{ name: 'Batch', value: 'batch' },
					{ name: 'Chat', value: 'chat' },
					{ name: 'File', value: 'file' },
					{ name: 'Model', value: 'model' },
				],
				default: 'chat',
			},

			// ── Chat ────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['chat'] } },
				options: [
					{
						name: 'Create Completion',
						value: 'createCompletion',
						description: 'Create a model response for a chat conversation',
						action: 'Create a chat completion',
					},
				],
				default: 'createCompletion',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getModels' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['chat'], operation: ['createCompletion'] } },
			},
			{
				displayName: 'Messages',
				name: 'messages',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Message',
				default: { message: [{ role: 'user', content: '' }] },
				required: true,
				displayOptions: { show: { resource: ['chat'], operation: ['createCompletion'] } },
				options: [
					{
						name: 'message',
						displayName: 'Message',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{ name: 'System', value: 'system' },
									{ name: 'User', value: 'user' },
									{ name: 'Assistant', value: 'assistant' },
								],
								default: 'user',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								typeOptions: { rows: 3 },
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['chat'], operation: ['createCompletion'] } },
				options: [
					{
						displayName: 'JSON Mode',
						name: 'jsonMode',
						type: 'boolean',
						default: false,
						description: 'Whether to force the response to valid JSON (response_format)',
					},
					{
						displayName: 'Max Completion Tokens',
						name: 'max_completion_tokens',
						type: 'number',
						default: 1024,
					},
					{
						displayName: 'Stop Sequences',
						name: 'stop',
						type: 'string',
						default: '',
						description: 'Comma-separated list of sequences where the API stops generating',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
						default: 1,
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						default: 1,
					},
				],
			},

			// ── Audio ───────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['audio'] } },
				options: [
					{
						name: 'Transcribe',
						value: 'transcribe',
						description: 'Convert audio into text in its source language',
						action: 'Transcribe audio',
					},
					{
						name: 'Translate',
						value: 'translate',
						description: 'Translate audio into English text',
						action: 'Translate audio',
					},
				],
				default: 'transcribe',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the audio file',
				displayOptions: { show: { resource: ['audio'] } },
			},
			{
				displayName: 'Model Name or ID',
				name: 'audioModel',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getModels' },
				default: 'whisper-large-v3',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['audio'] } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				description: 'ISO-639-1 language code of the audio. Leave empty to auto-detect.',
				displayOptions: { show: { resource: ['audio'], operation: ['transcribe'] } },
			},

			// ── Models ──────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['model'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'Retrieve all active models',
						action: 'List models',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a specific model',
						action: 'Get a model',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Model Name or ID',
				name: 'modelId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getModels' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['model'], operation: ['get'] } },
			},

			// ── Batches ─────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['batch'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create and execute a batch',
						action: 'Create a batch',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a batch by ID',
						action: 'Get a batch',
					},
					{
						name: 'List',
						value: 'list',
						description: "List the organization's batches",
						action: 'List batches',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Input File ID',
				name: 'inputFileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'options',
				options: [
					{ name: '/V1/chat/completions', value: '/v1/chat/completions' },
					{ name: '/V1/audio/transcriptions', value: '/v1/audio/transcriptions' },
					{ name: '/V1/audio/translations', value: '/v1/audio/translations' },
				],
				default: '/v1/chat/completions',
				displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
			},
			{
				displayName: 'Completion Window',
				name: 'completionWindow',
				type: 'string',
				default: '24h',
				displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
			},
			{
				displayName: 'Batch ID',
				name: 'batchId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['batch'], operation: ['get'] } },
			},

			// ── Files ───────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file by ID',
						action: 'Delete a file',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve file information',
						action: 'Get a file',
					},
					{
						name: 'Get Content',
						value: 'getContent',
						description: 'Retrieve the raw content of a file',
						action: 'Get file content',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Retrieve a list of files',
						action: 'List files',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file for use with batches',
						action: 'Upload a file',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Input Binary Field',
				name: 'fileBinaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the file to upload',
				displayOptions: { show: { resource: ['file'], operation: ['upload'] } },
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'options',
				options: [{ name: 'Batch', value: 'batch' }],
				default: 'batch',
				displayOptions: { show: { resource: ['file'], operation: ['upload'] } },
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['file'], operation: ['delete', 'get', 'getContent'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'outputBinaryProperty',
				type: 'string',
				default: 'data',
				description: 'Binary field the downloaded file content is written to',
				displayOptions: { show: { resource: ['file'], operation: ['getContent'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			/** Live model list — GET /models, shared by Chat, Audio and Models resources */
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await groqApiRequest.call(this, 'GET', '/models');
				const models = (response.data ?? []) as Array<{ id: string; owned_by?: string }>;
				return models
					.map((m) => ({
						name: m.owned_by ? `${m.id} (${m.owned_by})` : m.id,
						value: m.id,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i += 1) {
			try {
				let response: IDataObject = {};
				let binary: INodeExecutionData['binary'];

				if (resource === 'chat' && operation === 'createCompletion') {
					const messageList = (
						this.getNodeParameter('messages', i, {}) as {
							message?: Array<{ role: string; content: string }>;
						}
					).message;
					if (!messageList?.length) {
						throw new NodeOperationError(this.getNode(), 'At least one message is required', {
							itemIndex: i,
						});
					}

					const options = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;
					const body: IDataObject = {
						model: this.getNodeParameter('model', i) as string,
						messages: messageList,
					};
					if (options.temperature !== undefined) body.temperature = options.temperature;
					if (options.max_completion_tokens !== undefined)
						body.max_completion_tokens = options.max_completion_tokens;
					if (options.top_p !== undefined) body.top_p = options.top_p;
					if (options.stop) {
						body.stop = String(options.stop)
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean);
					}
					if (options.jsonMode) body.response_format = { type: 'json_object' };

					response = await groqApiRequest.call(this, 'POST', '/chat/completions', body);
				} else if (resource === 'audio' && (operation === 'transcribe' || operation === 'translate')) {
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					const binaryData = this.helpers.assertBinaryData(i, binaryProperty);

					const fields: IDataObject = {
						model: this.getNodeParameter('audioModel', i) as string,
					};
					if (operation === 'transcribe') {
						const language = (this.getNodeParameter('language', i, '') as string).trim();
						if (language) fields.language = language;
					}

					const endpoint =
						operation === 'transcribe' ? '/audio/transcriptions' : '/audio/translations';
					response = await groqApiFormRequest.call(this, endpoint, fields, {
						buffer,
						filename: binaryData.fileName ?? 'audio',
						contentType: binaryData.mimeType,
					});
				} else if (resource === 'model' && operation === 'list') {
					response = await groqApiRequest.call(this, 'GET', '/models');
				} else if (resource === 'model' && operation === 'get') {
					const modelId = this.getNodeParameter('modelId', i) as string;
					response = await groqApiRequest.call(this, 'GET', `/models/${modelId}`);
				} else if (resource === 'batch' && operation === 'create') {
					response = await groqApiRequest.call(this, 'POST', '/batches', {
						input_file_id: this.getNodeParameter('inputFileId', i) as string,
						endpoint: this.getNodeParameter('endpoint', i) as string,
						completion_window: this.getNodeParameter('completionWindow', i) as string,
					});
				} else if (resource === 'batch' && operation === 'get') {
					const batchId = this.getNodeParameter('batchId', i) as string;
					response = await groqApiRequest.call(this, 'GET', `/batches/${batchId}`);
				} else if (resource === 'batch' && operation === 'list') {
					response = await groqApiRequest.call(this, 'GET', '/batches');
				} else if (resource === 'file' && operation === 'upload') {
					const binaryProperty = this.getNodeParameter('fileBinaryProperty', i) as string;
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					const binaryData = this.helpers.assertBinaryData(i, binaryProperty);

					response = await groqApiFormRequest.call(
						this,
						'/files',
						{ purpose: this.getNodeParameter('purpose', i) as string },
						{
							buffer,
							filename: binaryData.fileName ?? 'file',
							contentType: binaryData.mimeType,
						},
					);
				} else if (resource === 'file' && operation === 'list') {
					response = await groqApiRequest.call(this, 'GET', '/files');
				} else if (resource === 'file' && operation === 'get') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					response = await groqApiRequest.call(this, 'GET', `/files/${fileId}`);
				} else if (resource === 'file' && operation === 'delete') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					response = await groqApiRequest.call(this, 'DELETE', `/files/${fileId}`);
				} else if (resource === 'file' && operation === 'getContent') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const fullResponse = await groqApiBinaryRequest.call(this, `/files/${fileId}/content`);
					const property = this.getNodeParameter('outputBinaryProperty', i, 'data') as string;
					const contentType = (fullResponse.headers['content-type'] as string) ?? 'application/octet-stream';

					binary = {
						[property]: await this.helpers.prepareBinaryData(
							fullResponse.body as Buffer,
							fileId,
							contentType,
						),
					};
					response = { fileId };
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" on resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const payload = response.data ?? response;

				if (Array.isArray(payload)) {
					if (payload.length === 0) {
						returnData.push({ json: { empty: true, count: 0 }, pairedItem: { item: i } });
					} else {
						for (const entry of payload as IDataObject[]) {
							returnData.push({ json: entry, pairedItem: { item: i } });
						}
					}
				} else {
					returnData.push({
						json: payload as IDataObject,
						...(binary ? { binary } : {}),
						pairedItem: { item: i },
					});
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
