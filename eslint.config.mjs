import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		ignores: ['**/*.test.ts', '**/__testutils__/**'],
	},
	{
		rules: {
			'n8n-nodes-base/community-package-json-n8n-nodes-apiversion': 'off',
		},
	},
];
