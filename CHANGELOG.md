# Changelog

All notable changes to `n8n-nodes-datto-rmm-extended` will be documented here.

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
