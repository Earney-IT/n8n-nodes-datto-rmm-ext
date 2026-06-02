import type { FieldDescriptor, ResourceDescriptor } from '../types';

export const audit: ResourceDescriptor = {
	value: 'audit',
	name: 'Audit',
	description: 'Datto RMM audit log (events on devices/sites/users/settings)',
	fields: [],
	operations: [
		{
			value: 'getDevice',
			name: 'Get Device Audit',
			action: 'Get audit log for a device',
			description: 'Retrieve the audit log entries for a specific device',
			method: 'GET',
			endpoint: '/api/v2/audit/device/{deviceUid}',
			shape: 'object',
			fields: [
				{
					displayName: 'Device UID',
					name: 'deviceUid',
					type: 'string',
					default: '',
					in: 'path',
					required: true,
				} satisfies FieldDescriptor,
			],
		},
		{
			value: 'getDeviceSoftware',
			name: 'Get Device Software',
			action: 'Get installed software on a device',
			description: 'Retrieve the list of installed software (SW Audit) on a device',
			method: 'GET',
			endpoint: '/api/v2/audit/device/{deviceUid}/software',
			shape: 'paginated',
			listKey: 'software',
			fields: [
				{
					displayName: 'Device UID',
					name: 'deviceUid',
					type: 'string',
					default: '',
					in: 'path',
					required: true,
				} satisfies FieldDescriptor,
			],
		},
	],
};
