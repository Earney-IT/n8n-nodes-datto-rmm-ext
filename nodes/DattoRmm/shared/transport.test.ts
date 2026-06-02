import { dattoApiRequest, dattoApiRequestAllItems } from './transport';
import { makeCtx } from '../__testutils__/makeCtx';

test('builds URL from credential apiUrl + path', async () => {
  const ctx = makeCtx({ httpResponses: [{ id: '1' }] });
  const res = await dattoApiRequest.call(ctx, 'GET', '/api/v2/account', undefined, { a: 1 });
  const call = (ctx._calls as any[])[0];
  expect(call.url).toBe('https://pinotage-api.centrastage.net/api/v2/account');
  expect(call.method).toBe('GET');
  expect(call.qs).toEqual({ a: 1 });
  expect(res).toEqual({ id: '1' });
});

test('strips trailing slash from apiUrl', async () => {
  const ctx = makeCtx({
    credentials: { apiUrl: 'https://pinotage-api.centrastage.net/', apiKey: 'k', apiSecret: 's' },
    httpResponses: [{}],
  });
  await dattoApiRequest.call(ctx, 'GET', '/api/v2/account');
  expect((ctx._calls as any[])[0].url).toBe('https://pinotage-api.centrastage.net/api/v2/account');
});

test('throws NodeOperationError when apiUrl missing', async () => {
  const ctx = makeCtx({
    credentials: { apiUrl: '', apiKey: 'k', apiSecret: 's' },
    httpResponses: [{}],
  });
  await expect(dattoApiRequest.call(ctx, 'GET', '/api/v2/account')).rejects.toThrow(
    /missing apiUrl/i,
  );
});

test('maps 401 to authentication error', async () => {
  const ctx = makeCtx();
  (ctx.helpers as any).httpRequestWithAuthentication = async () => {
    const e: any = new Error('Unauthorized');
    e.response = { status: 401, data: { message: 'invalid token' } };
    throw e;
  };
  await expect(dattoApiRequest.call(ctx, 'GET', '/api/v2/account')).rejects.toThrow(
    /Authentication failed/i,
  );
});

test('maps 429 to rate-limit error', async () => {
  const ctx = makeCtx();
  (ctx.helpers as any).httpRequestWithAuthentication = async () => {
    const e: any = new Error('Too many');
    e.response = { status: 429, data: { message: 'slow down' } };
    throw e;
  };
  await expect(dattoApiRequest.call(ctx, 'GET', '/api/v2/account')).rejects.toThrow(
    /Rate limited/i,
  );
});

test('dattoApiRequestAllItems paginates until short page', async () => {
  const ctx = makeCtx({
    httpResponses: [
      { variables: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `V${i}` })), pageDetails: { nextPageUrl: '/next' } },
      { variables: [{ id: 100, name: 'V100' }], pageDetails: { nextPageUrl: null } },
    ],
  });
  const out = await dattoApiRequestAllItems.call(ctx, '/api/v2/site/u/variable', 'variables');
  expect(out).toHaveLength(101);
  expect((ctx._calls as any[])[0].qs).toEqual({ page: 0, max: 100 });
  expect((ctx._calls as any[])[1].qs).toEqual({ page: 1, max: 100 });
});
