import type { INodeProperties } from 'n8n-workflow';
import { buildProperties } from './properties';

const props = buildProperties();
const byName = (n: string) => props.filter((p) => p.name === n);

function shows(p: INodeProperties, r: string, op?: string): boolean {
  const s = p.displayOptions?.show as Record<string, unknown[]> | undefined;
  if (!s) return false;
  if (!(s.resource ?? []).includes(r)) return false;
  if (op && !(s.operation ?? []).includes(op)) return false;
  return true;
}

test('first property is Resource selector', () => {
  expect(props[0].name).toBe('resource');
  expect((props[0].options as Array<{ value: string }>).length).toBeGreaterThanOrEqual(10);
});

test('one Operation selector per resource', () => {
  expect(byName('operation').length).toBeGreaterThanOrEqual(10);
});

test('siteUid rendered as required loadOptions field for siteVariable.upsert', () => {
  const siteUid = byName('siteUid').find((p) => shows(p, 'siteVariable', 'upsert'));
  expect(siteUid).toBeDefined();
  expect(siteUid!.required).toBe(true);
  expect(siteUid!.typeOptions?.loadOptionsMethod).toBe('getSites');
});

test('Return All + Limit only for list-like operations', () => {
  expect(byName('returnAll').some((p) => shows(p, 'siteVariable', 'getAll'))).toBe(true);
  expect(byName('returnAll').some((p) => shows(p, 'account', 'getSites'))).toBe(true);
  expect(byName('returnAll').some((p) => shows(p, 'site', 'get'))).toBe(false);
});

test('optional fields collected into per-operation Additional Fields', () => {
  const af = byName('additionalFields').find((p) => shows(p, 'site', 'create'));
  expect(af).toBeDefined();
  expect(af!.type).toBe('collection');
  const optNames = (af!.options as INodeProperties[]).map((o) => o.name);
  expect(optNames).toContain('description');
  expect(optNames).toContain('autoJoinOnInstallEnabled');
  // required field (name) is top-level, not in collection
  expect(optNames).not.toContain('name');
});

test('boolean hidden field is in collection for siteVariable.create', () => {
  const af = byName('additionalFields').find((p) => shows(p, 'siteVariable', 'create'));
  expect(af).toBeDefined();
  const opts = (af!.options as INodeProperties[]).map((o) => o.name);
  expect(opts).toContain('hidden');
});
