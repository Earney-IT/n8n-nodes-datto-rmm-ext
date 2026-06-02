import type { FieldDescriptor, ResourceDescriptor } from '../types';

const jobUid: FieldDescriptor = {
	displayName: 'Job UID',
	name: 'jobUid',
	type: 'string',
	default: '',
	in: 'path',
	description: 'The Datto RMM job UID (UUID)',
	required: true,
};

export const job: ResourceDescriptor = {
	value: 'job',
	name: 'Job',
	description: 'Datto RMM scheduled jobs: get, results',
	fields: [],
	operations: [
		{
			value: 'get',
			name: 'Get',
			action: 'Get a job',
			description: 'Retrieve a single job by UID',
			method: 'GET',
			endpoint: '/api/v2/job/{jobUid}',
			shape: 'object',
			fields: [jobUid],
		},
		{
			value: 'getResults',
			name: 'Get Results',
			action: 'Get job results',
			description: 'Retrieve per-target results for a job',
			method: 'GET',
			endpoint: '/api/v2/job/{jobUid}/results',
			shape: 'paginated',
			listKey: 'results',
			fields: [jobUid],
		},
	],
};
