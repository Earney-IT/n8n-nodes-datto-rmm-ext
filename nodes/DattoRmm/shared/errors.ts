import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { INode, JsonObject } from 'n8n-workflow';

type MinimalCtx = { getNode: () => INode };

/**
 * Maps a raw HTTP/transport error to an n8n NodeApiError or NodeOperationError.
 *
 * Datto RMM's error envelopes vary by endpoint:
 *   - JSON object: `{ errors: [{message, code}], status: 400 }` or `{ message }`
 *   - Plain text: `"Unauthorized"`, `"Invalid grant"`, etc.
 *   - 401 typically means token expired or apiKey/apiSecret bad
 *   - 429 rate-limited (account-wide: 600 reads / 60s, 100 writes / 60s)
 *
 * Always throws — return type is `never`.
 */
export function toNodeError(ctx: MinimalCtx, error: unknown): never {
	const err = error as {
		response?: {
			status?: number;
			data?: unknown;
		};
		statusCode?: number;
		message?: string;
	};

	const status =
		err.response?.status ??
		err.statusCode ??
		(typeof (error as { httpCode?: number })?.httpCode === 'number'
			? (error as { httpCode: number }).httpCode
			: undefined);

	const detail = extractMessage(err.response?.data) || err.message || 'No detail available';
	const errorObj = error as unknown as JsonObject;

	if (status) {
		switch (status) {
			case 400:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Bad request: ${detail}`,
					httpCode: '400',
				});
			case 401:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message:
						'Authentication failed — check the Datto RMM API URL, API Key, and API Secret. Tokens auto-refresh, so 401 usually means the credentials are wrong or the API user was disabled.',
					httpCode: '401',
				});
			case 403:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Access forbidden. The API user may lack the required role. (${detail})`,
					httpCode: '403',
				});
			case 404:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Not found. (${detail})`,
					httpCode: '404',
				});
			case 409:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Conflict — the resource already exists or violates a uniqueness constraint. (${detail})`,
					httpCode: '409',
				});
			case 422:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Validation failed: ${detail}`,
					httpCode: '422',
				});
			case 429:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Rate limited — Datto's account-wide limit is 600 reads / 100 writes per 60s. (${detail})`,
					httpCode: '429',
				});
			default:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `Datto RMM API error (${status}): ${detail}`,
					httpCode: String(status),
				});
		}
	}

	throw new NodeOperationError(
		ctx.getNode(),
		`Datto RMM request failed: ${err.message ?? 'No error message available'}`,
	);
}

/** Pull a human message out of Datto's varied error envelope shapes. */
function extractMessage(data: unknown): string | undefined {
	if (data == null) return undefined;
	if (typeof data === 'string') return data;
	if (typeof data !== 'object') return String(data);
	const d = data as Record<string, unknown>;
	if (typeof d.message === 'string') return d.message;
	if (typeof d.error === 'string') return d.error;
	if (typeof d.error_description === 'string') return d.error_description;
	if (Array.isArray(d.errors) && d.errors.length > 0) {
		const messages = (d.errors as Array<{ message?: string; code?: string }>)
			.map((e) => e?.message || e?.code)
			.filter(Boolean);
		if (messages.length > 0) return messages.join('; ');
	}
	return undefined;
}
