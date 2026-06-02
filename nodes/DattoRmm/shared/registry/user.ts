import type { FieldDescriptor, ResourceDescriptor } from '../types';

const userUid: FieldDescriptor = {
	displayName: 'User UID',
	name: 'userUid',
	type: 'string',
	default: '',
	in: 'path',
	description: 'The Datto RMM user (operator) UID',
	required: true,
};

export const user: ResourceDescriptor = {
	value: 'user',
	name: 'User',
	description: 'Datto RMM users (operators) — read-only listing/lookup',
	fields: [],
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get a user',
			description: 'Retrieve a single user (operator) by UID',
			method: 'GET',
			endpoint: '/api/v2/user/{userUid}',
			shape: 'object',
			fields: [userUid],
		},
	],
};
