import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { dattoApiRequestAllItems } from './transport';

/**
 * loadOptions: populate the Site (customer) dropdown. Hits /api/v2/account/sites
 * with full pagination so very large accounts don't truncate.
 */
export async function getSites(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const sites = (await dattoApiRequestAllItems.call(
		this,
		'/api/v2/account/sites',
		'sites',
	)) as Array<{ uid?: string; id?: string; name?: string }>;
	return sites
		.filter((s) => s && (s.uid || s.id))
		.map((s) => ({ name: s.name || '(unnamed site)', value: String(s.uid || s.id) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * loadOptions: populate a Component dropdown (for Quick Job → Component selection).
 * Lists /api/v2/account/components.
 */
export async function getComponents(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const comps = (await dattoApiRequestAllItems.call(
		this,
		'/api/v2/account/components',
		'components',
	)) as Array<{ uid?: string; id?: string; name?: string; category?: string }>;
	return comps
		.filter((c) => c && (c.uid || c.id))
		.map((c) => ({
			name: c.category ? `${c.name} (${c.category})` : c.name || '(unnamed component)',
			value: String(c.uid || c.id),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
