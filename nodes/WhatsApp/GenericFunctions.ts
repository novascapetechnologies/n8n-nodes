import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/** Pulls the real failure reason out of Meta's `{ error: { message, type, code, error_subcode, fbtrace_id } }` envelope. */
function describeError(error: unknown): string {
	const err = error as {
		message?: string;
		httpCode?: string | null;
		statusCode?: number;
		response?: { status?: number; data?: unknown; body?: unknown };
		cause?: {
			response?: { status?: number; data?: unknown; body?: unknown };
			error?: { message?: string; type?: string; code?: number; error_subcode?: number };
		};
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode ?? err.cause?.response?.status;
	const data = (err.response?.data ?? err.response?.body ?? err.cause?.response?.data) as
		| { error?: { message?: string; type?: string; code?: number; error_subcode?: number } }
		| undefined;
	const graphError = data?.error ?? err.cause?.error;

	if (graphError?.message) {
		return [status ? `HTTP ${status}` : undefined, graphError.message, graphError.type, graphError.code]
			.filter(Boolean)
			.join(' - ');
	}

	return [status ? `HTTP ${status}` : undefined, err.message].filter(Boolean).join(' - ');
}

export async function getWhatsAppBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<string> {
	const credentials = await this.getCredentials('whatsAppCloudNovascapeApi');
	return `https://graph.facebook.com/${credentials.apiVersion as string}`;
}

/** JSON request/response helper for the Graph API - auth is attached via the credential's generic authentication. */
export async function whatsAppApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const baseUrl = await getWhatsAppBaseUrl.call(this);

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppCloudNovascapeApi', {
			method,
			url: `${baseUrl}${endpoint}`,
			body,
			qs,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `WhatsApp Cloud API: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

export interface WhatsAppFormFile {
	buffer: Buffer;
	filename: string;
	contentType?: string;
	fieldName?: string;
}

/** Multipart requests (Create Flow, Upload Flow JSON, Upload Media) need FormData, not JSON. */
export async function whatsAppApiFormRequest(
	this: IExecuteFunctions,
	endpoint: string,
	fields: IDataObject = {},
	file?: WhatsAppFormFile,
): Promise<IDataObject> {
	const baseUrl = await getWhatsAppBaseUrl.call(this);

	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined && value !== null) form.append(key, String(value));
	}
	if (file) {
		form.append(
			file.fieldName ?? 'file',
			new Blob([file.buffer], { type: file.contentType ?? 'application/octet-stream' }),
			file.filename,
		);
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppCloudNovascapeApi', {
			method: 'POST',
			url: `${baseUrl}${endpoint}`,
			body: form,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `WhatsApp Cloud API: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** Resumable Upload API's file-data step needs a raw binary body plus non-standard headers, not JSON. */
export async function whatsAppApiBinaryRequest(
	this: IExecuteFunctions,
	endpoint: string,
	body: Buffer,
	headers: IDataObject,
): Promise<IDataObject> {
	const baseUrl = await getWhatsAppBaseUrl.call(this);

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppCloudNovascapeApi', {
			method: 'POST',
			url: `${baseUrl}${endpoint}`,
			body,
			headers,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `WhatsApp Cloud API: request to ${endpoint} failed - ${describeError(error)}`,
		});
	}
}

/** Parses a JSON-editor node parameter, throwing a clear error if the user typed invalid JSON. */
export function parseJsonParameter(
	this: IExecuteFunctions,
	value: unknown,
	itemIndex: number,
	fieldName: string,
): IDataObject {
	if (typeof value === 'object' && value !== null) return value as IDataObject;
	if (typeof value !== 'string' || value.trim() === '') return {};

	try {
		return JSON.parse(value) as IDataObject;
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`WhatsApp Cloud API: "${fieldName}" is not valid JSON - ${(error as Error).message}`,
			{ itemIndex },
		);
	}
}
