# n8n-nodes-datto-rmm-extended

A modern [n8n](https://n8n.io) community node for [Datto RMM](https://www.datto.com/products/rmm/) (Kaseya). Full v2 API coverage across sites, site variables, devices, alerts, components, jobs, audit. **AI-agent ready** (`usableAsTool: true`) with action-oriented operation descriptions, and an **idempotent site-variable upsert** that does the create-or-update by name in one operation.

Built sole-authored by Tristen Rice for Earney IT.

## Installation

```
n8n-nodes-datto-rmm-extended
```

In n8n: **Settings → Community Nodes → Install → paste the package name**.

## Credential

The node ships its own **Datto RMM API (Extended)** credential that extends n8n's built-in `oAuth2Api`. You only see three fields; the OAuth password-grant + token refresh are handled by n8n.

| Field | Description |
|-------|-------------|
| **API URL** | Your regional Datto RMM API base, e.g. `https://pinotage-api.centrastage.net` (US), `https://merlot-api.centrastage.net` (EU), `https://syrah-api.centrastage.net` (AU). |
| **API Key** | The API user's public key. Generate under **Setup → Users → (API user) → Generate API Keys**. |
| **API Secret** | The matching secret. |

Datto says API user role/permission restrictions are **ignored** for API access — treat these credentials as privileged. Tokens expire after 100 hours and auto-refresh via n8n's OAuth helper.

The credential test calls `GET /api/v2/account`.

## Resources & operations

| Resource | Operations |
|---|---|
| **Account** | Get, Get Sites, Get Devices, Get Components, Get Users, Get Variables, Get Open / Resolved Alerts |
| **Account Variable** | Get Many, Get, Create, Update, Delete |
| **Site** | Get, Get Devices, Get Open / Resolved Alerts, Get Audit, Create, Update |
| **Site Variable** | Get Many, Get, Create, Update, Delete, **Upsert** |
| **Device** | Get, Get By Hostname, Get Open / Resolved Alerts, Get Audit, Get Software, Move, Set Warranty, Run Quick Job |
| **Alert** | Get, Resolve, Mute, Unmute |
| **Component** | Get |
| **Job** | Get, Get Results |
| **User** | Get |
| **Audit** | Get Device Audit, Get Device Software |

List operations support **Return All** (auto-paginate with the 100-per-page max) or a **Limit**.

## The "Upsert" site variable

The most common automation pattern is "set this site variable to this value, no matter if it exists yet". Datto's REST API doesn't expose that directly — you have to list, then either `PUT` (create) or `POST` to a specific variable ID (update). This node's `Site Variable → Upsert` does it in one call:

1. Lists the site's variables.
2. Looks up the desired Name.
3. PUTs (create) if absent, POSTs (update) if present, skips if the value already matches.

Output:
```json
{ "action": "created" | "updated" | "noop", "name": "...", "value": "...", "id": ..., "response": {...} }
```

## Use as an AI tool

`usableAsTool: true`. Hook the node up to an AI Agent and the model can call operations directly with full schema awareness. Action labels are written for an LLM (e.g. *"Get many site variables"*, *"Run a quick job against a device"*, *"Upsert a site variable (create or update by name)"*). The Site dropdown also exposes a `loadOptionsMethod` so the AI can resolve site names → UIDs without an explicit lookup step.

## Rate limits

Datto enforces account-wide:
- **600 reads per 60 seconds**
- **100 writes per 60 seconds**

`429` responses are mapped to a clear `Rate limited` NodeApiError so you can add a Wait/retry as needed.

## License

[MIT](LICENSE.md) © Tristen Rice
