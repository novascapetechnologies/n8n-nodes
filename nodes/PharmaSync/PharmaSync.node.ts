import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { pharmaSyncRequest } from './GenericFunctions';

/**
 * PharmaSync node — wraps the /api/v1/n8n/* bridge.
 *
 * Covers what a workflow needs to act on a pharmacy's behalf: pick a tenant
 * from a live dropdown, read its integration config, build a report as a real
 * file, send messages through PharmaSync's sender resolution, and close the
 * loop on report schedules and automation executions.
 */
export class PharmaSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PharmaSync',
		name: 'pharmaSync',
		icon: 'file:pharmasync.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with the PharmaSync pharmacy platform',
		defaults: { name: 'PharmaSync' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'pharmaSyncApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Execution', value: 'execution' },
					{ name: 'Integration', value: 'integration' },
					{ name: 'Message', value: 'message' },
					{ name: 'Report', value: 'report' },
					{ name: 'Report Schedule', value: 'reportSchedule' },
					{ name: 'Tenant', value: 'tenant' },
				],
				default: 'report',
			},

			// ── Tenant ──────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tenant'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List pharmacies on the platform',
						action: 'List pharmacies',
					},
					{
						name: 'Get Context',
						value: 'getContext',
						description: 'Get a pharmacy with its quiet hours, send caps and blocklists',
						action: 'Get pharmacy context',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Automations Only',
				name: 'automationsOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only pharmacies with automations enabled',
				displayOptions: { show: { resource: ['tenant'], operation: ['list'] } },
			},

			// ── Shared tenant selector ──────────────────────────────────────────
			//
			// Declared twice with `show` rather than once with `hide`: n8n combines
			// `hide` keys with OR, so a single `hide: { operation: ['list'] }` would
			// have hidden this field for EVERY resource with a list operation —
			// including Integration → List, which needs a tenant. That produced a
			// request to /tenants//integrations and a 404 HTML page.
			{
				displayName: 'Pharmacy Name or ID',
				name: 'tenantId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getTenants' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Accepts a tenant UUID or subdomain slug.',
				displayOptions: { show: { resource: ['integration', 'report', 'message'] } },
			},
			{
				displayName: 'Pharmacy Name or ID',
				name: 'tenantId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getTenants' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Accepts a tenant UUID or subdomain slug.',
				displayOptions: { show: { resource: ['tenant'], operation: ['getContext'] } },
			},

			// ── Integration ─────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['integration'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						description: "Read a pharmacy's configured channels and sender identities",
						action: 'List integrations',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Channels',
				name: 'channels',
				type: 'multiOptions',
				options: [
					{ name: 'Email', value: 'EMAIL' },
					{ name: 'SMS', value: 'SMS' },
					{ name: 'WhatsApp', value: 'WHATSAPP' },
				],
				default: [],
				description: 'Leave empty for every configured channel',
				displayOptions: { show: { resource: ['integration'], operation: ['list'] } },
			},
			{
				displayName: 'Include Credentials',
				name: 'includeCredentials',
				type: 'boolean',
				default: false,
				description:
					'Whether to inline decrypted provider secrets. Requires N8N_ALLOW_CREDENTIAL_READ=true on PharmaSync.',
				displayOptions: { show: { resource: ['integration'], operation: ['list'] } },
			},

			// ── Report ──────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [
					{
						name: 'Build',
						value: 'build',
						description: 'Generate a report as JSON rows or a file',
						action: 'Build a report',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List the reports available to this pharmacy',
						action: 'List reports',
					},
				],
				default: 'build',
			},
			{
				displayName: 'Report Name or ID',
				name: 'reportKey',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getReports', loadOptionsDependsOn: ['tenantId'] },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['report'], operation: ['build'] } },
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'csv' },
					{ name: 'Excel (XLSX)', value: 'xlsx' },
					{ name: 'JSON Rows', value: 'json' },
					{ name: 'PDF', value: 'pdf' },
				],
				default: 'xlsx',
				displayOptions: { show: { resource: ['report'], operation: ['build'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				description:
					'Binary field the generated file is written to. Ignored for the JSON Rows format.',
				displayOptions: {
					show: { resource: ['report'], operation: ['build'] },
					hide: { format: ['json'] },
				},
			},
			{
				displayName: 'Sections',
				name: 'sections',
				type: 'string',
				default: '',
				placeholder: 'summary,sales',
				description: 'Comma-separated section keys. Leave empty for every section.',
				displayOptions: { show: { resource: ['report'], operation: ['build'] } },
			},
			{
				displayName: 'Date Range',
				name: 'dateRange',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['report'], operation: ['build'] } },
				options: [
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Defaults to 30 days ago',
					},
					{
						displayName: 'End Date',
						name: 'endDate',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Defaults to today',
					},
				],
			},

			// ── Message ─────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{
						name: 'Send',
						value: 'send',
						description:
							"Send through PharmaSync — resolves the sender, applies the opt-in gate, logs to the pharmacy's history",
						action: 'Send a message',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'Email', value: 'EMAIL' },
					{ name: 'SMS', value: 'SMS' },
					{ name: 'WhatsApp', value: 'WHATSAPP' },
				],
				default: 'SMS',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+254712345678 or name@example.com',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['message'], operation: ['send'], channel: ['EMAIL'] },
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				options: [
					{
						displayName: 'Customer ID',
						name: 'customerId',
						type: 'string',
						default: '',
						description: "Applies that customer's channel preferences to the send",
					},
					{
						displayName: 'Integration ID',
						name: 'integrationId',
						type: 'string',
						default: '',
						description: 'Pin a specific integration instead of the pharmacy default',
					},
					{
						displayName: 'Purpose',
						name: 'purpose',
						type: 'options',
						options: [
							{ name: 'Billing', value: 'BILLING' },
							{ name: 'Promotional', value: 'PROMOTIONAL' },
							{ name: 'System', value: 'SYSTEM' },
							{ name: 'Transactional', value: 'TRANSACTIONAL' },
						],
						default: 'TRANSACTIONAL',
					},
				],
			},

			// ── Report Schedule ─────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['reportSchedule'] } },
				options: [
					{
						name: 'List Due',
						value: 'listDue',
						description: 'Report schedules whose next run has elapsed, across all pharmacies',
						action: 'List due report schedules',
					},
					{
						name: 'Complete',
						value: 'complete',
						description: 'Log the run and roll the schedule forward',
						action: 'Complete a report schedule run',
					},
				],
				default: 'listDue',
			},
			{
				displayName: 'Schedule ID',
				name: 'scheduleId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['reportSchedule'], operation: ['complete'] } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Sent', value: 'SENT' },
					{ name: 'Partial', value: 'PARTIAL' },
					{ name: 'Failed', value: 'FAILED' },
				],
				default: 'SENT',
				displayOptions: { show: { resource: ['reportSchedule'], operation: ['complete'] } },
			},
			{
				displayName: 'Delivery Details',
				name: 'deliveryDetails',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['reportSchedule'], operation: ['complete'] } },
				options: [
					{
						displayName: 'Recipient Emails',
						name: 'recipientEmails',
						type: 'string',
						default: '',
						description: 'Comma-separated addresses actually delivered to',
					},
					{ displayName: 'File Size (Bytes)', name: 'fileSizeBytes', type: 'number', default: 0 },
					{ displayName: 'Duration (Ms)', name: 'durationMs', type: 'number', default: 0 },
					{ displayName: 'Error Message', name: 'errorMessage', type: 'string', default: '' },
					{
						displayName: 'Advance Schedule',
						name: 'advance',
						type: 'boolean',
						default: true,
						description: 'Whether to roll nextRunAt forward. Turn off to leave the run due.',
					},
				],
			},

			// ── Execution ───────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['execution'] } },
				options: [
					{
						name: 'Report',
						value: 'report',
						description: "Write this run into the automation's history in PharmaSync",
						action: 'Report an execution',
					},
				],
				default: 'report',
			},
			{
				displayName: 'Execution Fields',
				name: 'executionFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['execution'], operation: ['report'] } },
				options: [
					{
						displayName: 'Automation ID',
						name: 'automationId',
						type: 'string',
						default: '',
						description: 'Opens a new execution row. Use when n8n initiated the run.',
					},
					{
						displayName: 'Execution ID',
						name: 'executionId',
						type: 'string',
						default: '',
						description: 'Updates the row PharmaSync opened when it dispatched',
					},
					{ displayName: 'Dispatch ID', name: 'dispatchId', type: 'string', default: '' },
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Completed', value: 'COMPLETED' },
							{ name: 'Failed', value: 'FAILED' },
							{ name: 'Partial', value: 'PARTIAL' },
							{ name: 'Running', value: 'RUNNING' },
						],
						default: 'COMPLETED',
					},
					{ displayName: 'Sent Count', name: 'sentCount', type: 'number', default: 0 },
					{ displayName: 'Failed Count', name: 'failedCount', type: 'number', default: 0 },
					{ displayName: 'Skipped Count', name: 'skippedCount', type: 'number', default: 0 },
					{ displayName: 'Error', name: 'error', type: 'string', default: '' },
				],
			},
		],
	};

	methods = {
		loadOptions: {
			/** Live pharmacy list — GET /api/v1/n8n/tenants */
			async getTenants(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await pharmaSyncRequest.call(this, 'GET', '/tenants', undefined, {
					limit: 200,
				});
				const tenants = (response.data ?? []) as Array<{
					id: string;
					name: string;
					slug: string | null;
				}>;
				return tenants.map((t) => ({
					name: t.slug ? `${t.name} (${t.slug})` : t.name,
					value: t.id,
				}));
			},

			/** Report catalog for the selected pharmacy */
			async getReports(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tenantId = this.getCurrentNodeParameter('tenantId') as string;
				if (!tenantId) return [];
				const response = await pharmaSyncRequest.call(
					this,
					'GET',
					`/tenants/${tenantId}/reports`,
				);
				const data = (response.data ?? {}) as {
					reports?: Array<{ key: string; name: string }>;
				};
				return (data.reports ?? []).map((r) => ({ name: r.name, value: r.key }));
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
				// Which resources address a specific pharmacy. Everything else is
				// platform-scoped and must not put a tenant segment in the path.
				const needsTenant =
					resource === 'integration' ||
					resource === 'report' ||
					resource === 'message' ||
					(resource === 'tenant' && operation === 'getContext');

				const tenantId = needsTenant
					? (this.getNodeParameter('tenantId', i, '') as string).trim()
					: '';

				// Without this the URL becomes /tenants//integrations, which returns
				// PharmaSync's HTML 404 page — an unreadable failure.
				if (needsTenant && !tenantId) {
					throw new NodeOperationError(
						this.getNode(),
						'No pharmacy selected. Pick one in the Pharmacy field, or set it with an expression.',
						{ itemIndex: i },
					);
				}

				let response: IDataObject = {};
				let binary: INodeExecutionData['binary'];

				if (resource === 'tenant' && operation === 'list') {
					response = await pharmaSyncRequest.call(this, 'GET', '/tenants', undefined, {
						limit: 200,
						automationsOnly: this.getNodeParameter('automationsOnly', i, false) as boolean,
					});
				} else if (resource === 'tenant' && operation === 'getContext') {
					response = await pharmaSyncRequest.call(this, 'GET', `/tenants/${tenantId}/context`);
				} else if (resource === 'integration' && operation === 'list') {
					const channels = this.getNodeParameter('channels', i, []) as string[];
					const qs: IDataObject = {
						includeCredentials: this.getNodeParameter('includeCredentials', i, false) as boolean,
					};
					// Comma-joined, not an array: the HTTP layer would serialise an
					// array as `channel[]=EMAIL`, which the API's repeated-param
					// reader does not match. The endpoint accepts both forms.
					if (channels.length > 0) qs.channel = channels.join(',');
					response = await pharmaSyncRequest.call(
						this,
						'GET',
						`/tenants/${tenantId}/integrations`,
						undefined,
						qs,
					);
				} else if (resource === 'report' && operation === 'list') {
					response = await pharmaSyncRequest.call(this, 'GET', `/tenants/${tenantId}/reports`);
				} else if (resource === 'report' && operation === 'build') {
					const format = this.getNodeParameter('format', i) as string;
					const sectionsRaw = (this.getNodeParameter('sections', i, '') as string).trim();
					const dateRange = this.getNodeParameter('dateRange', i, {}) as IDataObject;

					const body: IDataObject = {
						reportKey: this.getNodeParameter('reportKey', i) as string,
						format,
					};
					if (sectionsRaw) {
						body.sections = sectionsRaw
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean);
					}
					if (dateRange.startDate || dateRange.endDate) {
						body.filters = {
							...(dateRange.startDate ? { startDate: dateRange.startDate } : {}),
							...(dateRange.endDate ? { endDate: dateRange.endDate } : {}),
						};
					}

					response = await pharmaSyncRequest.call(
						this,
						'POST',
						`/tenants/${tenantId}/reports`,
						body,
					);

					// Turn the base64 payload into a real binary so downstream
					// email nodes can attach it without a Convert to File step.
					const data = (response.data ?? {}) as IDataObject;
					const file = data.file as
						| { fileName: string; mimeType: string; content: string }
						| undefined;
					if (file?.content) {
						const property = this.getNodeParameter('binaryProperty', i, 'data') as string;
						binary = {
							[property]: await this.helpers.prepareBinaryData(
								Buffer.from(file.content, 'base64'),
								file.fileName,
								file.mimeType,
							),
						};
						// The base64 blob is now in binary; leave it out of JSON.
						delete (data.file as IDataObject).content;
					}
				} else if (resource === 'message' && operation === 'send') {
					const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					response = await pharmaSyncRequest.call(
						this,
						'POST',
						`/tenants/${tenantId}/messages`,
						{
							channel: this.getNodeParameter('channel', i) as string,
							to: this.getNodeParameter('to', i) as string,
							content: this.getNodeParameter('content', i) as string,
							subject: this.getNodeParameter('subject', i, '') as string,
							...additional,
						},
					);
				} else if (resource === 'reportSchedule' && operation === 'listDue') {
					response = await pharmaSyncRequest.call(this, 'GET', '/report-schedules/due');
				} else if (resource === 'reportSchedule' && operation === 'complete') {
					const details = this.getNodeParameter('deliveryDetails', i, {}) as IDataObject;
					const emails = String(details.recipientEmails ?? '')
						.split(',')
						.map((e) => e.trim())
						.filter(Boolean);
					response = await pharmaSyncRequest.call(
						this,
						'POST',
						`/report-schedules/${this.getNodeParameter('scheduleId', i) as string}/complete`,
						{
							status: this.getNodeParameter('status', i) as string,
							...details,
							recipientEmails: emails,
						},
					);
				} else if (resource === 'execution' && operation === 'report') {
					const fields = this.getNodeParameter('executionFields', i, {}) as IDataObject;
					response = await pharmaSyncRequest.call(this, 'POST', '/executions', {
						status: 'COMPLETED',
						...fields,
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" on resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				// List operations return an array. Emit one n8n item per element so
				// downstream nodes can iterate normally — pushing the array as a
				// single item would leave `$json.scheduleId` undefined and make
				// fan-out over due schedules impossible.
				const payload = response.data ?? response;

				if (Array.isArray(payload)) {
					if (payload.length === 0) {
						// Nothing to do: emit an explicit empty marker rather than no
						// items at all, so an "any results?" branch has something to test
						// and the run doesn't look like it silently died.
						returnData.push({
							json: { empty: true, count: 0 },
							pairedItem: { item: i },
						});
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
				throw error;
			}
		}

		return [returnData];
	}
}
