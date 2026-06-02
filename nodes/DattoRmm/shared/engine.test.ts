import type { IExecuteFunctions } from 'n8n-workflow';
import { executeDattoRmm } from './engine';
import { makeCtx } from '../__testutils__/makeCtx';

type Ctx = ReturnType<typeof makeCtx> & {
  _calls: Array<{ url: string; method: string; qs?: Record<string, unknown>; body?: any }>;
};

const run = (ctx: ReturnType<typeof makeCtx>) =>
  executeDattoRmm.call(ctx as unknown as IExecuteFunctions, 0);

test('account.get returns single object normalized', async () => {
  const ctx = makeCtx({
    params: { resource: 'account', operation: 'get', additionalFields: {} },
    httpResponses: [{ name: 'EarneyIT', uid: 'abc' }],
  });
  const rows = await run(ctx);
  expect(rows).toEqual([{ name: 'EarneyIT', uid: 'abc' }]);
  const c = (ctx as Ctx)._calls[0];
  expect(c.method).toBe('GET');
  expect(c.url).toMatch(/\/api\/v2\/account$/);
});

test('siteVariable.getAll fetches list endpoint and slices to limit', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'getAll', siteUid: 'site-1',
      additionalFields: {}, returnAll: false, limit: 2,
    },
    httpResponses: [{ variables: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }] }],
  });
  const rows = await run(ctx);
  expect(rows).toHaveLength(2);
  expect((ctx as Ctx)._calls[0].url).toMatch(/site\/site-1\/variables$/);
});

test('siteVariable.create posts body and returns object', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'create',
      siteUid: 'site-1', name: 'X', value: 'hello', hidden: false, additionalFields: {},
    },
    httpResponses: [{ id: 42, name: 'X', value: 'hello' }],
  });
  const rows = await run(ctx);
  expect(rows).toEqual([{ id: 42, name: 'X', value: 'hello' }]);
  const c = (ctx as Ctx)._calls[0];
  expect(c.method).toBe('PUT');
  expect(c.url).toMatch(/\/api\/v2\/site\/site-1\/variables$/);
  expect(c.body).toEqual({ name: 'X', value: 'hello' });
});

test('siteVariable.upsert NOOP when value matches', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'upsert',
      siteUid: 'site-1', name: 'COMPANY', value: 'Acme', additionalFields: {},
    },
    httpResponses: [
      // GET list -> existing var with same value
      { variables: [{ id: 7, name: 'COMPANY', value: 'Acme' }] },
    ],
  });
  const rows = await run(ctx);
  expect(rows[0].action).toBe('noop');
  expect((ctx as Ctx)._calls).toHaveLength(1);
});

test('siteVariable.upsert UPDATES when value differs', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'upsert',
      siteUid: 'site-1', name: 'COMPANY', value: 'Acme Inc', additionalFields: {},
    },
    httpResponses: [
      { variables: [{ id: 7, name: 'COMPANY', value: 'Acme' }] },
      { id: 7, name: 'COMPANY', value: 'Acme Inc' },
    ],
  });
  const rows = await run(ctx);
  expect(rows[0].action).toBe('updated');
  const c2 = (ctx as Ctx)._calls[1];
  expect(c2.method).toBe('POST');
  expect(c2.url).toMatch(/variable\/7$/);
  expect(c2.body).toEqual({ name: 'COMPANY', value: 'Acme Inc', hidden: false });
});

test('siteVariable.upsert CREATES when absent', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'upsert',
      siteUid: 'site-1', name: 'NEW_VAR', value: 'v', additionalFields: {},
    },
    httpResponses: [
      { variables: [{ id: 1, name: 'OTHER', value: 'x' }] },
      { id: 99, name: 'NEW_VAR', value: 'v' },
    ],
  });
  const rows = await run(ctx);
  expect(rows[0].action).toBe('created');
  const c2 = (ctx as Ctx)._calls[1];
  expect(c2.method).toBe('PUT');
  expect(c2.url).toMatch(/\/site\/site-1\/variables$/);
});

test('siteVariable.delete returns success envelope', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'siteVariable', operation: 'delete',
      siteUid: 'site-1', variableId: '42', additionalFields: {},
    },
    httpResponses: [null],
  });
  const rows = await run(ctx);
  expect(rows[0].success).toBe(true);
  expect((ctx as Ctx)._calls[0].method).toBe('DELETE');
  expect((ctx as Ctx)._calls[0].url).toMatch(/variable\/42$/);
});

test('site.create with additional fields packs body', async () => {
  const ctx = makeCtx({
    params: {
      resource: 'site', operation: 'create', siteUid: 'unused',
      name: 'Acme - HQ',
      additionalFields: { description: 'main site', autoJoinOnInstallEnabled: true },
    },
    httpResponses: [{ uid: 'new', name: 'Acme - HQ' }],
  });
  await run(ctx);
  const c = (ctx as Ctx)._calls[0];
  expect(c.method).toBe('PUT');
  expect(c.body).toEqual({
    name: 'Acme - HQ',
    description: 'main site',
    autoJoinOnInstallEnabled: true,
  });
});

test('account.getSites returnAll iterates pages', async () => {
  const ctx = makeCtx({
    params: { resource: 'account', operation: 'getSites', returnAll: true, additionalFields: {} },
    httpResponses: [
      { sites: Array.from({ length: 100 }, (_, i) => ({ uid: `s${i}`, name: `S${i}` })), pageDetails: { nextPageUrl: '/n' } },
      { sites: [{ uid: 's100', name: 'S100' }], pageDetails: { nextPageUrl: null } },
    ],
  });
  const rows = await run(ctx);
  expect(rows).toHaveLength(101);
});

test('unknown resource throws', async () => {
  const ctx = makeCtx({ params: { resource: 'nope', operation: 'get', additionalFields: {} } });
  await expect(run(ctx)).rejects.toThrow(/Unknown resource/);
});
