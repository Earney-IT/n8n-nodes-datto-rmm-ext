import type { FieldDescriptor, ResourceDescriptor } from '../types';

const alertUid: FieldDescriptor = {
	displayName: 'Alert UID',
	name: 'alertUid',
	type: 'string',
	default: '',
	in: 'path',
	description: 'The Datto RMM alert UID (UUID)',
	required: true,
};

export const alert: ResourceDescriptor = {
	value: 'alert',
	name: 'Alert',
	description: 'Datto RMM alerts: get, resolve, mute / unmute',
	fields: [],
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get an alert',
			description: 'Retrieve a single alert by UID',
			method: 'GET',
			endpoint: '/api/v2/alert/{alertUid}',
			shape: 'object',
			fields: [alertUid],
		},
		{
			value: 'resolve',
			name: 'Resolve',
			action: 'Resolve an alert',
			description: 'Mark an alert as resolved',
			method: 'POST',
			endpoint: '/api/v2/alert/{alertUid}/resolve',
			shape: 'object',
			fields: [alertUid],
		},
		{
			value: 'mute',
			name: 'Mute',
			action: 'Mute an alert',
			description: 'Mute an alert (suppress notifications) — Datto distinguishes mute from resolve',
			method: 'POST',
			endpoint: '/api/v2/alert/{alertUid}/mute',
			shape: 'object',
			fields: [alertUid],
		},
		{
			value: 'unmute',
			name: 'Unmute',
			action: 'Unmute an alert',
			description: 'Restore notifications for a previously-muted alert',
			method: 'POST',
			endpoint: '/api/v2/alert/{alertUid}/unmute',
			shape: 'object',
			fields: [alertUid],
		},
	],
};
