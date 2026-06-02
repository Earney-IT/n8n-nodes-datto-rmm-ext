import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { toNodeError } from './errors';

export type DattoCtx =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| IHookFunctions;

/**
 * Core HTTP transport for the Datto RMM v2 API.
 *
 * - Pulls the `apiUrl` from the credential and prefixes it on every request.
 * - Delegates auth to n8n's `httpRequestWithAuthentication`; the OAuth2 helper
 *   handles the password-grant + refresh.
 * - Maps Datto's error envelope (`{ errors: [...], message }` or plain text)
 *   to typed NodeApiError via `toNodeError`.
 */
export async function dattoApiRequest(
	this: DattoCtx,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject | undefined = undefined,
	qs: IDataObject = {},
): Promise<unknown> {
	const creds = await this.getCredentials('dattoRmmExtApi');
	const apiUrl = String(creds.apiUrl ?? '').replace(/\/+$/, '');
	if (!apiUrl) {
		throw new NodeOperationError(
			(this as IExecuteFunctions).getNode(),
			'Datto RMM credential is missing apiUrl',
		);
	}

	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	const options: IHttpRequestOptions = {
		method,
		url: `${apiUrl}${cleanPath}`,
		qs,
		json: true,
		headers: {
			Accept: 'application/json',
		},
	};
	if (body !== undefined) {
		options.body = body;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'dattoRmmExtApi',
			options,
		);
	} catch (error) {
		throw toNodeError(this, error);
	}
}

/**
 * Datto's list endpoints page via `page` (0-based) + `max` (default 100, max 100).
 * Returns the merged `<keyName>` array (e.g. "sites", "devices", "variables").
 *
 * Stops when:
 *   - the returned array is shorter than the page size,
 *   - `pageDetails.nextPageUrl` is null,
 *   - the safety cap (200 pages) is hit (throws).
 */
export async function dattoApiRequestAllItems(
	this: DattoCtx,
	path: string,
	keyName: string,
	qs: IDataObject = {},
	pageSize = 100,
): Promise<IDataObject[]> {
	const MAX_PAGES = 200;
	const out: IDataObject[] = [];

	for (let page = 0; ; page++) {
		if (page > MAX_PAGES) {
			throw new NodeOperationError(
				(this as IExecuteFunctions).getNode(),
				`Datto RMM returned more than ${MAX_PAGES} pages for ${path}. Narrow your query (e.g. by site or date filters).`,
			);
		}
		const pageQs: IDataObject = { ...qs, page, max: pageSize };
		const resp = (await dattoApiRequest.call(
			this,
			'GET',
			path,
			undefined,
			pageQs,
		)) as IDataObject;

		const items =
			(Array.isArray(resp?.[keyName]) ? (resp[keyName] as IDataObject[]) : null) ??
			(Array.isArray(resp) ? (resp as unknown as IDataObject[]) : []);
		out.push(...items);

		const pageDetails = resp?.pageDetails as
			| { nextPageUrl?: string | null; count?: number; limit?: number }
			| undefined;
		const next = pageDetails?.nextPageUrl;
		if (!next || items.length < pageSize || items.length === 0) break;
	}

	return out;
}

/** Get the page's items + next-page hint for limit-bounded fetches in the engine. */
export async function dattoApiRequestPage(
	this: DattoCtx,
	path: string,
	keyName: string,
	qs: IDataObject = {},
): Promise<{ items: IDataObject[]; hasNext: boolean; pageSize: number }> {
	const pageSize = Number(qs.max ?? 100);
	const resp = (await dattoApiRequest.call(
		this,
		'GET',
		path,
		undefined,
		qs,
	)) as IDataObject;
	const items =
		(Array.isArray(resp?.[keyName]) ? (resp[keyName] as IDataObject[]) : null) ??
		(Array.isArray(resp) ? (resp as unknown as IDataObject[]) : []);
	const pageDetails = resp?.pageDetails as { nextPageUrl?: string | null } | undefined;
	return { items, hasNext: !!pageDetails?.nextPageUrl, pageSize };
}
