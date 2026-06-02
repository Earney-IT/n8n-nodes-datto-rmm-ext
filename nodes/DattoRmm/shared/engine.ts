import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { dattoApiRequest, dattoApiRequestAllItems, dattoApiRequestPage } from './transport';
import { fieldsFor, getOperation, getResource } from './registry';
import type { FieldDescriptor, OperationDescriptor, ResourceDescriptor } from './types';

/** Resolve a path template like /api/v2/site/{siteUid}/variable using the gathered field values. */
function fillPath(
	exec: IExecuteFunctions,
	endpoint: string,
	pathFields: IDataObject,
	itemIndex: number,
): string {
	return endpoint.replace(/\{(\w+)\}/g, (_m, key) => {
		const v = pathFields[key];
		if (v === undefined || v === null || v === '') {
			throw new NodeOperationError(
				exec.getNode(),
				`Missing required path field "${key}"`,
				{ itemIndex },
			);
		}
		return encodeURIComponent(String(v));
	});
}

function parseJsonLoose(
	exec: IExecuteFunctions,
	value: unknown,
	fieldName: string,
	fallback: unknown,
	itemIndex: number,
): unknown {
	if (value == null || value === '') return fallback;
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch (e) {
		throw new NodeOperationError(
			exec.getNode(),
			`Field "${fieldName}" is not valid JSON: ${(e as Error).message}`,
			{ itemIndex },
		);
	}
}

function collectField(
	exec: IExecuteFunctions,
	value: unknown,
	field: FieldDescriptor,
	buckets: { path: IDataObject; query: IDataObject; body: IDataObject },
	itemIndex: number,
): void {
	if (value === undefined || value === null || value === '') return;
	let coerced: unknown = value;
	if (field.type === 'json') {
		coerced = parseJsonLoose(exec, value, field.name, undefined, itemIndex);
		if (coerced === undefined) return;
	} else if (field.type === 'number') {
		coerced = Number(value);
	} else if (field.type === 'boolean') {
		coerced = value === true || value === 'true' || value === 1 || value === '1';
	}
	buckets[field.in][field.name] = coerced as IDataObject[string];
}

/** Pull all field values for an operation into path / query / body buckets. */
function gatherFields(
	exec: IExecuteFunctions,
	itemIndex: number,
	resource: ResourceDescriptor,
	operation: OperationDescriptor,
): { path: IDataObject; query: IDataObject; body: IDataObject } {
	const buckets = { path: {} as IDataObject, query: {} as IDataObject, body: {} as IDataObject };
	const fields = fieldsFor(resource, operation.value);
	const additionalFields = (exec.getNodeParameter(
		'additionalFields',
		itemIndex,
		{},
	) as IDataObject) ?? {};
	const seen = new Set<string>();

	for (const f of fields) {
		if (seen.has(f.name)) continue;
		seen.add(f.name);
		let raw: unknown;
		if (f.required) {
			raw = exec.getNodeParameter(f.name, itemIndex);
		} else {
			raw = additionalFields[f.name];
		}
		collectField(exec, raw, f, buckets, itemIndex);
	}
	return buckets;
}

/** Normalise the response of a single GET into an array of items. */
function extractList(resp: unknown, listKey?: string): IDataObject[] {
	if (Array.isArray(resp)) return resp as IDataObject[];
	const env = resp as { [k: string]: unknown } | null;
	if (env && listKey && Array.isArray(env[listKey])) return env[listKey] as IDataObject[];
	if (env && typeof env === 'object') {
		// Try common Datto envelope keys if listKey not provided/matched
		for (const k of ['variables', 'sites', 'devices', 'alerts', 'components', 'users', 'results']) {
			if (Array.isArray((env as Record<string, unknown>)[k])) {
				return (env as Record<string, unknown>)[k] as IDataObject[];
			}
		}
	}
	return [resp as IDataObject];
}

/** Special handler for siteVariable.upsert (create or update by Name). */
async function upsertSiteVariable(
	this: IExecuteFunctions,
	body: IDataObject,
	siteUid: string,
): Promise<IDataObject> {
	const name = String(body.name);
	const value = body.value == null ? '' : String(body.value);
	const hidden = body.hidden === true;
	const list = (await dattoApiRequestAllItems.call(
		this,
		`/api/v2/site/${encodeURIComponent(siteUid)}/variables`,
		'variables',
	)) as Array<{ id?: number | string; name?: string; value?: string }>;
	const existing = list.find((v) => v && v.name === name);
	if (existing && existing.id != null) {
		const currVal = existing.value == null ? '' : String(existing.value);
		if (currVal === value) {
			return { action: 'noop', name, value, id: existing.id };
		}
		const updated = (await dattoApiRequest.call(
			this,
			'POST',
			`/api/v2/site/${encodeURIComponent(siteUid)}/variable/${encodeURIComponent(String(existing.id))}`,
			{ name, value, hidden },
		)) as IDataObject;
		return { action: 'updated', name, value, id: existing.id, response: updated };
	}
	const created = (await dattoApiRequest.call(
		this,
		'PUT',
		`/api/v2/site/${encodeURIComponent(siteUid)}/variables`,
		{ name, value, hidden },
	)) as IDataObject;
	return { action: 'created', name, value, response: created };
}

export async function executeDattoRmm(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const resourceValue = this.getNodeParameter('resource', itemIndex) as string;
	const operationValue = this.getNodeParameter('operation', itemIndex) as string;

	const resource = getResource(resourceValue);
	if (!resource) {
		throw new NodeOperationError(this.getNode(), `Unknown resource: ${resourceValue}`, {
			itemIndex,
		});
	}
	const op = getOperation(resource, operationValue);
	if (!op) {
		throw new NodeOperationError(
			this.getNode(),
			`Unknown operation "${operationValue}" for resource "${resourceValue}"`,
			{ itemIndex },
		);
	}

	const buckets = gatherFields(this, itemIndex, resource, op);

	// --- Special handler: Site Variable upsert ---
	if (resource.value === 'siteVariable' && op.value === 'upsert') {
		const siteUid = String(buckets.path.siteUid);
		const result = await upsertSiteVariable.call(this, buckets.body, siteUid);
		return [result];
	}

	const endpoint = fillPath(this, op.endpoint, buckets.path, itemIndex);

	// --- 'object' / 'action' shapes: single request, normalise to array of items ---
	if (op.shape === 'object' || op.shape === 'action') {
		const resp = await dattoApiRequest.call(
			this,
			op.method,
			endpoint,
			['POST', 'PUT', 'PATCH'].includes(op.method) ? buckets.body : undefined,
			buckets.query,
		);
		if (op.shape === 'action') {
			return [
				{ success: true, ...(resp && typeof resp === 'object' ? (resp as IDataObject) : {}) },
			];
		}
		return extractList(resp, op.listKey);
	}

	// --- list / paginated shapes ---
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;

	if (op.shape === 'list') {
		// non-paginated list endpoints (e.g. site variables): single fetch, slice if limited
		const resp = await dattoApiRequest.call(this, op.method, endpoint, undefined, buckets.query);
		const items = extractList(resp, op.listKey);
		if (returnAll) return items;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		return items.slice(0, limit);
	}

	// paginated
	if (returnAll) {
		return await dattoApiRequestAllItems.call(
			this,
			endpoint,
			op.listKey ?? 'data',
			buckets.query,
		);
	}
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	const collected: IDataObject[] = [];
	const pageSize = Math.min(Math.max(limit, 1), 100);
	for (let page = 0; collected.length < limit; page++) {
		const { items, hasNext } = await dattoApiRequestPage.call(
			this,
			endpoint,
			op.listKey ?? 'data',
			{ ...buckets.query, page, max: pageSize },
		);
		collected.push(...items);
		if (!hasNext || items.length < pageSize || items.length === 0) break;
		if (page > 200) break; // safety cap
	}
	return collected.slice(0, limit);
}
