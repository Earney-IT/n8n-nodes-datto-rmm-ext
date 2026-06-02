import { IDataObject } from 'n8n-workflow';

export function makeCtx(opts: {
  params?: Record<string, unknown>;
  credentials?: IDataObject;
  httpResponses?: unknown[];
  mode?: string;
  isTool?: boolean;
} = {}) {
  const responses = [...(opts.httpResponses ?? [])];
  const calls: unknown[] = [];
  const ctx: Record<string, unknown> = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({
      name: 'Datto RMM',
      type: 'dattoRmmExtended',
      parameters: opts.isTool ? { __isToolCall: true } : {},
    }),
    getMode: () => opts.mode ?? 'manual',
    isToolExecution: () => !!opts.isTool,
    continueOnFail: () => false,
    getNodeParameter: (n: string, _i: number, d?: unknown) =>
      (opts.params && n in opts.params) ? opts.params[n] : d,
    getCredentials: async () =>
      opts.credentials ?? { apiUrl: 'https://pinotage-api.centrastage.net', apiKey: 'k', apiSecret: 's' },
    helpers: {
      httpRequestWithAuthentication: async (_c: string, o: unknown) => {
        calls.push(o);
        return responses.shift() ?? {};
      },
      httpRequest: async (o: unknown) => {
        calls.push(o);
        return responses.shift() ?? {};
      },
      returnJsonArray: (d: unknown) =>
        (Array.isArray(d) ? d : [d]).map((j: unknown) => ({ json: j })),
    },
    additionalData: opts.isTool ? { isToolExecution: true } : {},
    _calls: calls,
  };
  return ctx as any;
}
