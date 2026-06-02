import type { INodeProperties } from 'n8n-workflow';
import type { FieldDescriptor, ResourceDescriptor } from './types';
import { RESOURCES } from './registry';

const LIST_SHAPES = new Set(['paginated', 'list']);

const isListLikeOp = (resource: ResourceDescriptor): string[] =>
	resource.operations.filter((o) => LIST_SHAPES.has(o.shape)).map((o) => o.value);

const fieldDisplayType = (f: FieldDescriptor) =>
	f.type === 'json'
		? 'json'
		: f.type === 'options'
			? 'options'
			: f.type === 'dateTime'
				? 'dateTime'
				: f.type;

const fieldDefault = (f: FieldDescriptor): unknown =>
	f.default ??
	(f.type === 'number'
		? 0
		: f.type === 'boolean'
			? false
			: f.type === 'json'
				? ''
				: '');

/** Required field → top-level standalone property scoped by displayOptions. */
function requiredFieldProp(
	f: FieldDescriptor,
	resource: string,
	operation: string,
): INodeProperties {
	const prop: INodeProperties = {
		displayName: f.displayName,
		name: f.name,
		type: fieldDisplayType(f) as INodeProperties['type'],
		default: fieldDefault(f) as INodeProperties['default'],
		description: f.description ?? f.displayName,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		required: true,
	};
	if (f.type === 'options') {
		if (f.loadOptionsMethod) {
			prop.typeOptions = { loadOptionsMethod: f.loadOptionsMethod };
		} else if (f.options) {
			prop.options = f.options;
		}
	}
	return prop;
}

/** Optional field → collection entry (so unset = absent). */
function optionalFieldOption(f: FieldDescriptor): INodeProperties {
	const opt: INodeProperties = {
		displayName: f.displayName,
		name: f.name,
		type: fieldDisplayType(f) as INodeProperties['type'],
		default: fieldDefault(f) as INodeProperties['default'],
		description: f.description ?? f.displayName,
	};
	if (f.type === 'options' && f.options) opt.options = f.options;
	return opt;
}

/**
 * Generate the full INodeProperties list from the registry.
 *
 * Layout:
 *   - Resource selector
 *   - Per-resource Operation selector
 *   - Return All + Limit for list-like operations
 *   - Required fields as top-level (with displayOptions scoping)
 *   - Optional fields as a per-operation "Additional Fields" collection
 */
export function buildProperties(): INodeProperties[] {
	const props: INodeProperties[] = [];

	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing -- default is set below from the registry
	props.push({
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: RESOURCES.map((r) => ({
			name: r.name,
			value: r.value,
			description: r.description,
		})),
		default: RESOURCES[0].value,
	});

	for (const r of RESOURCES) {
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing -- default is set below per resource
		props.push({
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [r.value] } },
			options: r.operations.map((o) => ({
				name: o.name,
				value: o.value,
				action: o.action,
				description: o.description,
			})),
			default: r.operations[0].value,
		});
	}

	// Return All / Limit
	for (const r of RESOURCES) {
		const listOps = isListLikeOp(r);
		if (listOps.length === 0) continue;
		props.push({
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show: { resource: [r.value], operation: listOps } },
		});
		props.push({
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: {
				show: { resource: [r.value], operation: listOps, returnAll: [false] },
			},
		});
	}

	// Per-operation fields
	for (const r of RESOURCES) {
		for (const op of r.operations) {
			const all: FieldDescriptor[] = [...r.fields, ...(op.fields ?? [])];
			const seen = new Set<string>();
			const dedup = all.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
			const required = dedup.filter((f) => f.required);
			const optional = dedup.filter((f) => !f.required);

			for (const f of required) {
				props.push(requiredFieldProp(f, r.value, op.value));
			}

			if (optional.length > 0) {
				props.push({
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					placeholder: 'Add Field',
					default: {},
					displayOptions: { show: { resource: [r.value], operation: [op.value] } },
					options: optional.map(optionalFieldOption),
				});
			}
		}
	}

	return props;
}
