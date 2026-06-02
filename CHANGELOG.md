## 0.1.2 — 2026-06-02

### Fixed

- **Credential token URL was a literal `={{ $self... }}` expression string.** n8n's OAuth2 token-exchange helper does not evaluate `$self` expressions against credential defaults at OAuth time — it reads them as raw strings. So saved credentials had `accessTokenUrl` set to the literal expression text, and token requests POSTed to nonsense URLs and 4xx'd. The credential's "test" button failed accordingly.
- **`accessTokenUrl` is now a visible field** with a regional US default. If your `API URL` is EU/AU, also change the token URL host below to match. (Two visible URL fields instead of one — small UX cost for a credential that actually works.)
- Hardened the credential-test `baseURL` expression against missing `apiUrl` to surface a clearer error instead of a silent template failure.

# Changelog

All notable changes to `n8n-nodes-datto-rmm-ext` will be documented here.

## 0.1.0 — 2026-06-02

Initial release.

### Added

- **Datto RMM node** (`usableAsTool: true`) — connects n8n to the Datto RMM v2 API (`/api/v2/...`).
- **10 resources** with comprehensive coverage: Account, Account Variable, Site, Site Variable, Device, Alert, Component, Job, User, Audit.
- **Idempotent Site Variable Upsert** — single operation that lists existing, then PUTs (create) or POSTs (update) by name, with a noop fast-path when the value is already correct.
- **Custom OAuth2 credential** (`dattoRmmExtendedApi`) that extends n8n's built-in `oAuth2Api` so the user only enters API URL + API Key + API Secret while n8n's standard OAuth2 helper handles the password-grant token exchange and automatic refresh. The credential works in this node AND in any raw HTTP Request node that selects it.
- **AI-tool-ready** — `usableAsTool: true`, action-oriented operation descriptions, and a `getSites` loadOptions method so AI agents can resolve site names to UIDs without a separate lookup.
- **Datto v2 pagination engine** (`?page=N&max=100`) with envelope-aware extraction (`variables` / `sites` / `devices` / `alerts` / etc.) and configurable Return All / Limit modes.
- **Mapped Datto error envelopes** — 401 (auth), 403 (forbidden), 404, 409 (conflict), 422 (validation), 429 (rate limit), etc.
- **Unit tests** across registry, properties generator, transport, error mapping, and engine including the upsert noop/update/create paths.
- **Official Datto brand mark** (Simple Icons, brand color `#199ED9`).
