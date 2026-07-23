import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Every InvoSync route below requires X-Workspace-Id (see lib/api-context.ts
 * resolveWorkspaceId()) since n8n authenticates with a single cross-tenant
 * admin key rather than a per-workspace tenant key. Callers pass the workspace
 * to act on per execution, typically from an upstream webhook payload.
 */
async function invoSyncRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	workspaceId: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('invoSyncApi');

	const options = {
		method,
		url: `${credentials.baseUrl}${endpoint}`,
		headers: {
			'X-Workspace-Id': workspaceId,
		},
		body,
		qs,
		json: true,
	};

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'invoSyncApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `InvoSync: request to ${method} ${endpoint} failed`,
		});
	}
}

export async function listCustomers(this: IExecuteFunctions, workspaceId: string) {
	return invoSyncRequest.call(this, 'GET', '/customers', workspaceId);
}

export async function getCustomer(this: IExecuteFunctions, workspaceId: string, customerId: string) {
	return invoSyncRequest.call(this, 'GET', `/customers/${customerId}`, workspaceId);
}

export async function createCustomer(
	this: IExecuteFunctions,
	workspaceId: string,
	body: IDataObject,
) {
	return invoSyncRequest.call(this, 'POST', '/customers', workspaceId, body);
}

export async function updateCustomer(
	this: IExecuteFunctions,
	workspaceId: string,
	customerId: string,
	body: IDataObject,
) {
	return invoSyncRequest.call(this, 'PATCH', `/customers/${customerId}`, workspaceId, body);
}

export async function listInvoices(this: IExecuteFunctions, workspaceId: string) {
	return invoSyncRequest.call(this, 'GET', '/invoices', workspaceId);
}

export async function getInvoice(this: IExecuteFunctions, workspaceId: string, invoiceId: string) {
	return invoSyncRequest.call(this, 'GET', `/invoices/${invoiceId}`, workspaceId);
}

export async function createInvoice(
	this: IExecuteFunctions,
	workspaceId: string,
	body: IDataObject,
) {
	return invoSyncRequest.call(this, 'POST', '/invoices', workspaceId, body);
}

export async function sendInvoice(this: IExecuteFunctions, workspaceId: string, invoiceId: string) {
	return invoSyncRequest.call(this, 'POST', `/invoices/${invoiceId}/send`, workspaceId);
}

export async function recordPayment(
	this: IExecuteFunctions,
	workspaceId: string,
	invoiceId: string,
	body: IDataObject,
) {
	return invoSyncRequest.call(this, 'POST', `/invoices/${invoiceId}/payments`, workspaceId, body);
}
