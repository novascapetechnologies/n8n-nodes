import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Shared request helper for the PharmaSync bridge API.
 *
 * Every call authenticates with the service token from the PharmaSync API
 * credential and targets /api/v1/n8n/*. Errors are unwrapped so the node
 * surfaces PharmaSync's `error.message` instead of a generic 4xx.
 */
export async function pharmaSyncRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('pharmaSyncApi');
	const baseUrl = String(credentials.baseUrl ?? '').replace(/\/+$/, '');

	try {
		const response = (await this.helpers.httpRequest({
			method,
			url: `${baseUrl}/api/v1/n8n${endpoint}`,
			headers: {
				'x-pharmasync-service-token': String(credentials.serviceToken ?? ''),
				'Content-Type': 'application/json',
			},
			body,
			qs,
			json: true,
			timeout: 60000,
		})) as IDataObject;

		// The bridge always answers { ok, data } or { ok:false, error }.
		if (response && response.ok === false) {
			const error = (response.error ?? {}) as { code?: string; message?: string };
			throw new NodeApiError(this.getNode(), response as JsonObject, {
				message: error.message ?? 'PharmaSync request failed',
				description: error.code,
			});
		}

		return response;
	} catch (error) {
		if (error instanceof NodeApiError) throw error;
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: describeError(error),
		});
	}
}

/** Pulls the real failure reason out of an HTTP error so it isn't hidden. */
function describeError(error: unknown): string {
	const err = error as {
		message?: string;
		description?: string;
		httpCode?: string | null;
		response?: { status?: number; data?: unknown; body?: unknown };
		statusCode?: number;
	};
	const status = err.httpCode ?? err.response?.status ?? err.statusCode;
	const data = err.response?.data ?? err.response?.body;

	let dataStr: string | undefined;
	if (typeof data === 'string') {
		dataStr = summariseBody(data, status);
	} else if (data) {
		dataStr = JSON.stringify(data).slice(0, 500);
	}

	return [status ? `HTTP ${status}` : undefined, err.description, dataStr, err.message]
		.filter(Boolean)
		.join(' - ');
}

/**
 * PharmaSync is a Next.js app, so a wrong path returns a full HTML error page —
 * ~100KB of inlined CSS that buries the actual problem. Collapse it to one
 * actionable line instead of pasting the page into the node's error.
 */
function summariseBody(body: string, status?: string | number | null): string {
	const looksLikeHtml = /^\s*(<!doctype|<html|globalThis\.__)/i.test(body) || body.includes('@layer');
	if (!looksLikeHtml) return body.slice(0, 500);

	if (String(status) === '404') {
		return 'PharmaSync returned its HTML 404 page — the URL did not match a route. Usually an empty Pharmacy field (producing /tenants//...) or a Base URL with a trailing path.';
	}
	if (String(status) === '500') {
		return 'PharmaSync returned an HTML error page. Check the Next.js server console for the stack trace.';
	}
	return 'PharmaSync returned an HTML page instead of JSON — check the Base URL points at the app root (no trailing path).';
}
