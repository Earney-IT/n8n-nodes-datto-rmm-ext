import type { FieldDescriptor, ResourceDescriptor } from '../types';

const componentUid: FieldDescriptor = {
	displayName: 'Component UID',
	name: 'componentUid',
	type: 'string',
	default: '',
	in: 'path',
	description: 'The Datto RMM component UID',
	required: true,
};

export const component: ResourceDescriptor = {
	value: 'component',
	name: 'Component',
	description:
		'Datto RMM components (scripts, monitors, applications) from the Component Library',
	fields: [],
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get a component',
			description: 'Retrieve a single component by its UID',
			method: 'GET',
			endpoint: '/api/v2/component/{componentUid}',
			shape: 'object',
			fields: [componentUid],
		},
	],
};
