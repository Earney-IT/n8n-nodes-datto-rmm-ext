import type { FieldDescriptor, ResourceDescriptor, OperationDescriptor } from '../types';
import { account } from './account';
import { accountVariable } from './accountVariable';
import { alert } from './alert';
import { audit } from './audit';
import { component } from './component';
import { device } from './device';
import { job } from './job';
import { site } from './site';
import { siteVariable } from './siteVariable';
import { user } from './user';

/**
 * Full Datto RMM v2 resource registry. Ordered to feel natural in the UI
 * (Account first, then customer-facing data, then ops surfaces).
 */
export const RESOURCES: ResourceDescriptor[] = [
	account,
	accountVariable,
	site,
	siteVariable,
	device,
	alert,
	component,
	job,
	user,
	audit,
];

export function getResource(value: string): ResourceDescriptor | undefined {
	return RESOURCES.find((r) => r.value === value);
}

export function getOperation(
	resource: ResourceDescriptor,
	operationValue: string,
): OperationDescriptor | undefined {
	return resource.operations.find((o) => o.value === operationValue);
}

/** Every field in effect for a given operation (resource-level + op-level). */
export function fieldsFor(
	resource: ResourceDescriptor,
	operationValue: string,
): FieldDescriptor[] {
	const op = getOperation(resource, operationValue);
	return [...resource.fields, ...(op?.fields ?? [])];
}
