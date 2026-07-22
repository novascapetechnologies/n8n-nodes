import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';
const SANDBOX_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';

/**
 * Every Accounting API call is namespaced under /v3/company/{realmId} and
 * hits either the production or sandbox host depending on which QuickBooks
 * company the credential's OAuth2 app was authorized against.
 */
async function getBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<string> {
	const credentials = await this.getCredentials('quickBooksOnlineOAuth2Api');
	const host = credentials.environment === 'sandbox' ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
	return `${host}/v3/company/${credentials.companyId}`;
}

export async function quickBooksApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const baseUrl = await getBaseUrl.call(this);

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'quickBooksOnlineOAuth2Api',
			{
				method,
				url: `${baseUrl}${endpoint}`,
				body,
				qs: { minorversion: 65, ...qs },
				json: true,
			},
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: describeError(error),
		});
	}
}

/** The Query endpoint takes a single SQL-like `query` string, not a JSON body. */
export async function quickBooksQueryRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	query: string,
): Promise<IDataObject> {
	const response = await quickBooksApiRequest.call(this, 'GET', '/query', undefined, { query });
	return (response.QueryResponse ?? {}) as IDataObject;
}

/**
 * File uploads (Attachable) use QBO's multipart "attachment_meta" convention:
 * one part named `file_metadata_0` holding the Attachable JSON, one part
 * holding the file bytes under the file's own name.
 */
export async function quickBooksUploadRequest(
	this: IExecuteFunctions,
	metadata: IDataObject,
	file: { buffer: Buffer; filename: string; contentType?: string },
): Promise<IDataObject> {
	const baseUrl = await getBaseUrl.call(this);

	const form = new FormData();
	form.append('file_metadata_0', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
	form.append(
		'file_content_0',
		new Blob([file.buffer], { type: file.contentType ?? 'application/octet-stream' }),
		file.filename,
	);

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'quickBooksOnlineOAuth2Api',
			{
				method: 'POST',
				url: `${baseUrl}/upload`,
				body: form,
				qs: { minorversion: 65 },
			},
		)) as IDataObject;
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
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode;
	const data = (err.response?.data ?? err.response?.body) as
		| { Fault?: { Error?: Array<{ Message?: string; Detail?: string; code?: string }> } }
		| undefined;
	const qbError = data?.Fault?.Error?.[0];

	if (qbError?.Message) {
		return [status ? `HTTP ${status}` : undefined, qbError.Message, qbError.Detail]
			.filter(Boolean)
			.join(' - ');
	}

	return [status ? `HTTP ${status}` : undefined, err.message].filter(Boolean).join(' - ');
}
