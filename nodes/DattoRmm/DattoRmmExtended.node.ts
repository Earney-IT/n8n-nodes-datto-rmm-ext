import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { buildProperties } from './shared/properties';
import { executeDattoRmm } from './shared/engine';
import { getComponents, getSites } from './shared/methods';

// Class name MUST match the filename root (DattoRmmExtended.node.js) so n8n's
// community-package loader can resolve `exports.DattoRmmExtended` at load time.
export class DattoRmmExtended implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Datto RMM (Extended)',
		name: 'dattoRmmExtended',
		icon: 'file:datto-rmm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Manage Datto RMM (Kaseya): sites, site variables, devices, alerts, components, jobs, audit. Includes idempotent site-variable upsert. AI-agent ready.',
		defaults: {
			name: 'Datto RMM (Extended)',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'dattoRmmExtApi',
				required: true,
			},
		],
		properties: buildProperties(),
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getSites.call(this);
			},
			async getComponents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getComponents.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const rows = await executeDattoRmm.call(this, i);
				for (const row of rows) {
					out.push({ json: row, pairedItem: { item: i } });
				}
			} catch (err) {
				if (this.continueOnFail()) {
					out.push({
						json: { error: (err as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), err as Error, { itemIndex: i });
			}
		}

		return [out];
	}
}
