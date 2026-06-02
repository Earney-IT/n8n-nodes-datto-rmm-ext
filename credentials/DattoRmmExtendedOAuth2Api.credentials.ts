import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Datto RMM OAuth2 credential — extends n8n's built-in `oAuth2Api` so the user
 * sees a small surface (API URL + API Key + API Secret) but the credential
 * works with both this node AND raw HTTP Request nodes (because n8n's OAuth2
 * helper handles token fetch + automatic refresh).
 *
 * Static OAuth bits the user never has to know about:
 *   - grantType   = passwordCredentials (Datto's "API user" pattern)
 *   - clientId    = "public-client"     (hardcoded by Datto)
 *   - clientSecret= "public"             (hardcoded by Datto)
 *   - accessTokenUrl computed from `apiUrl` + "/auth/oauth/token"
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
				'Your Datto RMM regional API base URL. US: https://pinotage-api.centrastage.net, EU: https://merlot-api.centrastage.net, AU: https://syrah-api.centrastage.net, etc. Trailing slash is stripped.',
			placeholder: 'https://pinotage-api.centrastage.net',
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
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			// Computed from apiUrl. n8n credential expressions support `$self["fieldName"]`.
			default: '={{ $self["apiUrl"].replace(/\\/+$/, "") + "/auth/oauth/token" }}',
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
			baseURL: '={{ $credentials.apiUrl.replace(/\\/+$/, "") }}',
			url: '/api/v2/account',
			method: 'GET',
		},
	};
}
