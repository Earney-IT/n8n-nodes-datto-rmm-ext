import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Datto RMM OAuth2 credential — extends n8n's built-in `oAuth2Api` so the
 * credential works with both this node AND raw HTTP Request nodes (n8n's OAuth2
 * helper handles token fetch + automatic refresh).
 *
 * The token URL is a visible field with a regional default, because n8n's
 * OAuth2 token-exchange helper does NOT evaluate `={{ $self... }}` expressions
 * against credential defaults (only literal strings are honoured). It auto-fills
 * to the US region; switch the host for EU/AU.
 *
 * Static OAuth bits hidden from the user:
 *   - grantType   = passwordCredentials (Datto's "API user" pattern)
 *   - clientId    = "public-client"     (hardcoded by Datto)
 *   - clientSecret= "public"             (hardcoded by Datto)
 *   - authentication = "header"
 *
 * Reference: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
 */
export class DattoRmmExtendedOAuth2Api implements ICredentialType {
	name = 'dattoRmmExtendedOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Datto RMM (Extended) OAuth2 API';

	icon = 'file:../nodes/DattoRmm/datto-rmm.svg' as const;

	documentationUrl = 'https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://pinotage-api.centrastage.net',
			required: true,
			description:
				'Your Datto RMM regional API base URL. US: https://pinotage-api.centrastage.net, EU: https://merlot-api.centrastage.net, AU: https://syrah-api.centrastage.net, etc. Trailing slash is stripped. If you change this, also update Access Token URL below to the same host.',
			placeholder: 'https://pinotage-api.centrastage.net',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://pinotage-api.centrastage.net/auth/oauth/token',
			required: true,
			description:
				'OAuth2 token endpoint. Defaults to the US region. If your API URL above is EU/AU, change the host here to match (e.g. https://merlot-api.centrastage.net/auth/oauth/token).',
		},
		{
			displayName: 'API Key',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description:
				'Datto RMM API user public key. Generate under Setup → Users → (your API user) → Generate API Keys. Treat this as a username — Datto says API users ignore role/permission restrictions, so this is a privileged credential.',
		},
		{
			displayName: 'API Secret',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Datto RMM API user secret key. Generated alongside the API Key. Treat as a password.',
		},

		// --- Inherited OAuth2 fields pre-filled for the Datto password-grant flow ---
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'passwordCredentials',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'hidden',
			default: 'public-client',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'hidden',
			typeOptions: { password: true },
			default: 'public',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];

	// n8n's OAuth2 helper attaches `Authorization: Bearer <token>` via the inherited
	// authenticate block; nothing extra needed here.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	// Credential test: hit /api/v2/account — cheapest authenticated GET.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ ($credentials.apiUrl || "").replace(/\\/+$/, "") }}',
			url: '/api/v2/account',
			method: 'GET',
		},
	};
}
