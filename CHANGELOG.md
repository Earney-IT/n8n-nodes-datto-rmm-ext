## 0.1.8 — 2026-06-02

### Fixed

- **Site → Create showed a redundant required `Site Name or ID` field.** The `siteUid` field was declared at the resource level in `site.ts`, so the properties generator rendered it for every site operation including `create` — where creating a site obviously has no UID yet. Moved `siteUid` out of resource-level fields and into each operation's `fields` array (except `create`, which doesn't need it). The Site → Create form now shows only the new-site fields (Site Name + optional description/notes/auto-join/splashtop).

## 0.1.7 — 2026-06-02

### Fixed

- **Body field name for masking was wrong.** Datto's OpenAPI spec (`Variable Creation Request` / `Variable Update Request`) uses `masked` for the boolean that hides a variable value in the UI. I was sending `hidden`. End-to-end test showed only the first of seven sequential PUTs actually persisted — symptom of Datto rejecting/dropping the malformed body silently after the first write. The user-facing field is renamed to **"Masked (Hidden in UI)"** but functions identically.

### Breaking (field rename)

- The optional body field on Site Variable / Account Variable Create/Update/Upsert was `hidden`; it is now `masked`. If you had a workflow setting it via Additional Fields, update the field name. The UI label is now "Masked (Hidden in UI)".

## 0.1.6 — 2026-06-02

### Fixed

- The 0.1.5 endpoint fix over-applied — it changed BOTH the list endpoint AND the create endpoint to plural `/variables`. Datto's API actually wants the list at plural `/variables` BUT the create endpoint at singular `/variable` (PUT). With 0.1.5, the list worked but `PUT /variables` returned 405 "Method not allowed" so create-vs-update never fired. Now: GET list → `/variables`, PUT create → `/variable`, POST/DELETE single → `/variable/{id}`. Verified against the live concord-api response.

## 0.1.5 — 2026-06-02

### Fixed

- **Site Variable list endpoint was singular** (`/site/{uid}/variable`) but Datto's API serves the list at the **plural** endpoint (`/site/{uid}/variables`). The singular path exists but only accepts PUT (create) / POST (update via ID) / DELETE (via ID) — GET returns "Method not allowed". This broke Site Variable → Get Many AND the Upsert special handler's existence check.
- Fixed: GET list now hits `/api/v2/site/{siteUid}/variables`. Single Get / Create / Update / Delete keep using the singular path with the variable ID. Verified against the panoptic Datto RMM node which uses the same plural list URL.

## 0.1.4 — 2026-06-02

### Breaking

- **Credential type renamed** from `dattoRmmExtendedOAuth2Api` to `dattoRmmExtApi`. Delete any previously-saved credential and create a fresh one.
- **Credential surface dropped from 7 fields to 3.** You now only enter API URL, API Key, API Secret.

### Fixed

- **The whole `extends: ['oAuth2Api']` approach was wrong.** n8n's OAuth2 helper does NOT auto-fetch tokens for `passwordCredentials` grant type — only for `clientCredentials`. The fallback path produced "Unable to sign without access token" because the cached `oauthTokenData` was never populated. Confirmed by reading n8n-core's `request-helper-functions.js:requestOAuth2()` — there's no `if (grantType === 'passwordCredentials')` branch.
- Rewrote the credential to use n8n's `preAuthentication` hook instead (same pattern Metabase / Zscaler / Venafi credentials use). The hook does the Datto password-grant token exchange itself; n8n then caches the token in the credential's `sessionToken` field with `expirable: true` and re-runs the hook when expired or on 401.

## 0.1.3 — 2026-06-02

### Fixed

- **Hidden credential defaults weren't being persisted on save.** When extending
  `oAuth2Api`, hidden field overrides (`grantType`, `clientId`, `clientSecret`,
  `scope`, `authentication`) are stripped out of the saved credential data —
  the n8n public-API schema explicitly excludes them. At OAuth-fetch time the
  helper then had no grant type / no client creds and threw "Unable to sign
  without access token".
- Made the OAuth bits **visible** fields with their Datto-required defaults
  pre-filled. You should not change them; they're now persisted on save so
  n8n's OAuth helper has everything it needs to fetch the password-grant token.
- Credential UX is now ~7 visible fields instead of 4. The defaults handle
  everything except API URL, Access Token URL, API Key, API Secret.

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
