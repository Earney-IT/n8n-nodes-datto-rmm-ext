import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Datto RMM API credential.
 *
 * Datto's API auth is technically OAuth2 password-grant. n8n's built-in
 * `oAuth2Api` helper does NOT support that grant type — it auto-fetches only
 * `clientCredentials` and falls back to "Unable to sign without access token"
 * for anything else.
 *
 * Instead, this credential uses n8n's `preAuthentication` hook (same pattern
 * Metabase, Zscaler, Venafi etc. use) to do the password-grant token exchange
 * itself. n8n calls preAuthentication automatically when:
 *   - sessionToken is empty (first use),
 *   - sessionToken is expired (`expirable: true`),
 *   - any request returned 401 (n8n auto-retries once with a fresh token).
 *
 * The user sees 3 fields: API URL, API Key, API Secret.
 */
export class DattoRmmExtApi implements ICredentialType {
	name = 'dattoRmmExtApi';

	displayName = 'Datto RMM (Extended) API';

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
				'Your Datto RMM regional API base URL. Examples — US: https://pinotage-api.centrastage.net, EU: https://merlot-api.centrastage.net, AU: https://syrah-api.centrastage.net, North America Pro: https://concord-api.centrastage.net.',
			placeholder: 'https://concord-api.centrastage.net',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Datto RMM API user public key. Generate under Setup → Users → (your API user) → Generate API Keys. Datto says API users ignore role/permission restrictions, so treat this as a privileged credential.',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Datto RMM API user secret key. Generated alongside the API Key.',
		},
		{
			// Hidden cached bearer token. n8n auto-clears + re-fetches via
			// preAuthentication() when expired.
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
	];

	/**
	 * Called automatically by n8n before each request when `sessionToken` is
	 * empty/expired, or when a request just returned 401. Fetches a fresh
	 * OAuth2 password-grant token from Datto's /auth/oauth/token endpoint.
	 */
	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<{ sessionToken: string }> {
		const apiUrl = String(credentials.apiUrl ?? '').replace(/\/+$/, '');
		if (!apiUrl) throw new Error('Datto RMM credential is missing API URL');
		const tokenUrl = `${apiUrl}/auth/oauth/token`;

		// Datto hardcodes the OAuth "client": Basic public-client:public.
		const basic = Buffer.from('public-client:public').toString('base64');

		const body =
			'grant_type=password' +
			`&username=${encodeURIComponent(String(credentials.apiKey ?? ''))}` +
			`&password=${encodeURIComponent(String(credentials.apiSecret ?? ''))}`;

		const resp = (await this.helpers.httpRequest({
			method: 'POST',
			url: tokenUrl,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${basic}`,
				Accept: 'application/json',
			},
			body,
		})) as { access_token?: string; expires_in?: number };

		const token = resp?.access_token;
		if (!token) {
			throw new Error('Datto RMM OAuth response did not include an access_token');
		}
		return { sessionToken: token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ ($credentials.apiUrl || "").replace(/\\/+$/, "") }}',
			url: '/api/v2/account',
			method: 'GET',
		},
	};
}
