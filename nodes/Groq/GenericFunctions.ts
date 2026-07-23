import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Shared request helper for the Groq API (Chat, Audio, Models, Batches, Files).
 *
 * Auth is handled by the `groqNovascapeApi` credential's generic authentication, so
 * this only needs to build the URL and unwrap Groq's error envelope
 * (`{ error: { message, type, code } }`) into a readable NodeApiError.
 */
export async function groqApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('groqNovascapeApi');
	const baseUrl = String(credentials.baseUrl ?? '').replace(/\/+$/, '');

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'groqNovascapeApi', {
			method,
			url: `${baseUrl}${endpoint}`,
			body,
			qs,
			json: true,
			timeout: 120000,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: describeError(error),
		});
	}
}

export interface GroqFormFile {
	buffer: Buffer;
	filename: string;
	contentType?: string;
}

/** Multipart requests (audio transcription/translation, file upload) need FormData, not JSON. */
export async function groqApiFormRequest(
	this: IExecuteFunctions,
	endpoint: string,
	fields: IDataObject,
	file: GroqFormFile,
	fileFieldName = 'file',
): Promise<IDataObject> {
	const credentials = await this.getCredentials('groqNovascapeApi');
	const baseUrl = String(credentials.baseUrl ?? '').replace(/\/+$/, '');

	const form = new FormData();
	form.append(
		fileFieldName,
		new Blob([file.buffer], { type: file.contentType ?? 'application/octet-stream' }),
		file.filename,
	);
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined && value !== null) form.append(key, String(value));
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'groqNovascapeApi', {
			method: 'POST',
			url: `${baseUrl}${endpoint}`,
			body: form,
			timeout: 120000,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: describeError(error),
		});
	}
}

/** File content downloads return raw bytes, not JSON — used for the /files/:id/content routes. */
export async function groqApiBinaryRequest(
	this: IExecuteFunctions,
	endpoint: string,
): Promise<IN8nHttpFullResponse> {
	const credentials = await this.getCredentials('groqNovascapeApi');
	const baseUrl = String(credentials.baseUrl ?? '').replace(/\/+$/, '');

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'groqNovascapeApi', {
			method: 'GET',
			url: `${baseUrl}${endpoint}`,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: describeError(error),
		});
	}
}

function describeError(error: unknown): string {
	const err = error as {
		message?: string;
		httpCode?: string | null;
		statusCode?: number;
		response?: { status?: number; data?: unknown; body?: unknown };
		cause?: { error?: { message?: string; type?: string; code?: string } };
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode;
	const data = (err.response?.data ?? err.response?.body) as
		| { error?: { message?: string; type?: string; code?: string } }
		| undefined;
	const groqError = data?.error ?? err.cause?.error;

	if (groqError?.message) {
		return [status ? `HTTP ${status}` : undefined, groqError.message, groqError.code]
			.filter(Boolean)
			.join(' - ');
	}

	return [status ? `HTTP ${status}` : undefined, err.message].filter(Boolean).join(' - ');
}
