import { RESOURCES, getResource, getOperation, fieldsFor } from './registry';

test('exposes core resources', () => {
  const names = RESOURCES.map((r) => r.value);
  for (const expected of [
    'account', 'accountVariable', 'site', 'siteVariable', 'device',
    'alert', 'component', 'job', 'user', 'audit',
  ]) {
    expect(names).toContain(expected);
  }
});

test('siteVariable has full CRUD + upsert', () => {
  const sv = getResource('siteVariable')!;
  const ops = sv.operations.map((o) => o.value);
  expect(ops).toEqual(expect.arrayContaining(['getAll', 'get', 'create', 'update', 'delete', 'upsert']));
});

test('siteVariable.get inherits siteUid + adds variableId', () => {
  const sv = getResource('siteVariable')!;
  const fields = fieldsFor(sv, 'get');
  const names = fields.map((f) => f.name);
  expect(names).toContain('siteUid');
  expect(names).toContain('variableId');
});

test('every endpoint starts with /api/v2/ or /auth/', () => {
  for (const r of RESOURCES) {
    for (const op of r.operations) {
      expect(op.endpoint.startsWith('/api/v2/') || op.endpoint.startsWith('/auth/')).toBe(true);
    }
  }
});

test('paginated operations declare a listKey', () => {
  for (const r of RESOURCES) {
    for (const op of r.operations) {
      if (op.shape === 'paginated' || op.shape === 'list') {
        expect(typeof op.listKey).toBe('string');
        expect(op.listKey).not.toBe('');
      }
    }
  }
});

test('siteUid uses loadOptionsMethod getSites', () => {
  const sv = getResource('siteVariable')!;
  const siteUidField = sv.fields.find((f) => f.name === 'siteUid');
  expect(siteUidField?.loadOptionsMethod).toBe('getSites');
});

test('unknown resource lookup returns undefined', () => {
  expect(getResource('nope')).toBeUndefined();
  expect(getOperation(getResource('account')!, 'nope')).toBeUndefined();
});
