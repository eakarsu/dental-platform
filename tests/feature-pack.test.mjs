import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pack = JSON.parse(await readFile(path.join(root, 'config/feature-pack.json'), 'utf8'));
const { features } = await import(path.join(root, 'dist/scripts/workspace.mjs'));
const { openStore } = await import(path.join(root, 'dist/hub/runtime/store.mjs'));
const { seedWorkspace } = await import(path.join(root, 'dist/scripts/seed.mjs'));
const { createHub } = await import(path.join(root, 'dist/hub/server.mjs'));

for (const key of ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'WORKSPACE_AUTH_TOKEN']) delete process.env[key];

const temp = await mkdtemp(path.join(os.tmpdir(), 'feature-pack-'));
const databasePath = path.join(temp, 'db.sqlite');
const store = openStore(databasePath, features);
seedWorkspace(store);
store.close();

let server, base;
async function start(complete) {
  server = createHub(complete ? { databasePath, complete } : { databasePath });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { if (server) await new Promise(r => server.close(r)); server = null; }
const req = (url, method = 'GET', body, headers = {}) => fetch(base + url, {
  method, headers: { 'Content-Type': 'application/json', 'X-Legal-Workspace': '1', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
test.after(async () => { await stop(); await rm(temp, { recursive: true, force: true }); });

await start();

test('authenticated tasks list/create/update', async () => {
  process.env.WORKSPACE_AUTH_TOKEN = 'test-token';
  try {
    assert.equal((await req('/api/workspace/features/tasks/records')).status, 401);
    const auth = { Authorization: 'Bearer test-token' };
    const created = await req('/api/workspace/features/tasks/records', 'POST', { title: 'Wave19C auth task', data: { assignee: 'Tester' } }, auth);
    assert.equal(created.status, 201);
    const task = await created.json();
    const list = await (await req('/api/workspace/features/tasks/records?q=Wave19C', 'GET', undefined, auth)).json();
    assert.ok(list.some(r => r.id === task.id));
    const updated = await req(`/api/workspace/records/${task.id}`, 'PUT', { ...task, status: 'completed' }, auth);
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).status, 'completed');
  } finally { delete process.env.WORKSPACE_AUTH_TOKEN; }
});

test('search/filter and CSV/JSON export of main records', async () => {
  const all = await (await req('/api/workspace/features/patients/records')).json();
  assert.ok(all.length >= 15);
  const found = await (await req(`/api/workspace/features/patients/records?q=${encodeURIComponent(all[0].title.slice(0, 6))}`)).json();
  assert.ok(found.length >= 1 && found.every(r => JSON.stringify(r).toLowerCase().includes(all[0].title.slice(0, 6).toLowerCase())));
  const filtered = await (await req('/api/workspace/features/patients/records?status=active')).json();
  assert.ok(filtered.every(r => r.status === 'active'));
  const csv = await (await req('/api/workspace/features/patients/records/export')).text();
  assert.match(csv, /title/);
  const jsonRes = await req('/api/workspace/features/patients/records/export?format=json');
  assert.match(jsonRes.headers.get('content-type'), /application\/json/);
  const json = await jsonRes.json();
  assert.equal(json.count, json.records.length);
  assert.ok(json.count >= 15);
});

test('domain insights are a labelled deterministic fallback without a provider', async () => {
  const catalog = await (await req('/api/workspace/insights')).json();
  assert.ok(catalog.length >= 3);
  for (const def of pack.insights) assert.ok(catalog.some(d => d.id === def.id), def.id);
  const res = await req(`/api/workspace/insights/${pack.insights[0].id}`, 'POST', {});
  assert.equal(res.status, 201);
  const insight = await res.json();
  assert.equal(insight.aiGenerated, false);
  assert.equal(insight.fallback, true);
  assert.match(insight.label, /Deterministic fallback/);
  assert.ok(Array.isArray(insight.sections) && insight.sections.length >= 3);
  assert.ok(insight.sections.every(s => 'label' in s && 'value' in s));
  const priority = await (await req('/api/workspace/insights/priority-actions', 'POST', {})).json();
  const hasOverdue = priority.sections.find(s => s.label === 'Has overdue items');
  const overdueCount = priority.sections.find(s => s.label === 'Overdue count');
  assert.equal(typeof hasOverdue.value, 'boolean');
  assert.equal(typeof overdueCount.value, 'number');
});

test('mocked provider yields aiGenerated:true with narrative section', async () => {
  await stop();
  await start(async () => ({ model: 'test', choices: [{ message: { content: 'Mocked narrative from supplied facts.' } }] }));
  const insight = await (await req(`/api/workspace/insights/${pack.insights[0].id}`, 'POST', {})).json();
  assert.equal(insight.aiGenerated, true);
  assert.equal(insight.sections[0].label, 'Narrative');
  assert.match(insight.sections[0].value, /Mocked narrative/);
});
