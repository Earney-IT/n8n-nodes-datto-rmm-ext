import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

/**
 * Whether the operation returns a list (paginated), a single object, or no
 * meaningful body (action with 204-like semantics).
 */
export type ResponseShape = 'paginated' | 'list' | 'object' | 'action';

export type FieldType = 'string' | 'number' | 'boolean' | 'options' | 'dateTime' | 'json';

/**
 * Where a field's value is consumed when building the request.
 *
 *   - 'path'  → URL path placeholder, e.g. /site/{siteUid}
 *   - 'query' → query string parameter
 *   - 'body'  → JSON body field
 */
export type FieldIn = 'path' | 'query' | 'body';

export interface FieldDescriptor {
	/** Field name. For 'path' fields this must match the placeholder in `endpoint`. */
	name: string;
	displayName: string;
	type: FieldType;
	in: FieldIn;
	description?: string;
	required?: boolean;
	/** Default to send when the user leaves the field at the empty default. */
	default?: string | number | boolean;
	/** Static choices for `type: 'options'`. */
	options?: INodePropertyOptions[];
	/** loadOptions method name (mutually exclusive with `options`). */
	loadOptionsMethod?: string;
	/** displayName hint for AI tools (defaults to displayName). */
	hint?: string;
}

export interface OperationDescriptor {
	value: string;
	name: string;
	action: string;
	description: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	endpoint: string;
	shape: ResponseShape;
	/** The JSON key holding the list (for paginated / list shapes). */
	listKey?: string;
	/** Fields specific to this operation. Resource-level fields are also applied. */
	fields?: FieldDescriptor[];
	/**
	 * For 'object' shape: optionally extract a nested object from the response.
	 * For 'paginated' / 'list': overrides listKey resolution.
	 */
	responsePath?: string;
}

export interface ResourceDescriptor {
	value: string;
	name: string;
	description: string;
	/** Resource-level fields applied to every operation (e.g. siteUid for Site ops). */
	fields: FieldDescriptor[];
	operations: OperationDescriptor[];
}

/** Helper used by the engine when serialising body / query / path. */
export interface ResolvedFields {
	path: IDataObject;
	query: IDataObject;
	body: IDataObject;
}
