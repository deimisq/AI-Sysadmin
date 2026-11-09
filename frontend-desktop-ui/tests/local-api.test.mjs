import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import ts from 'typescript';
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.__localNativeCommand = async (command, payload) => { calls.push({command, payload}); return { ok: true }; };
globalThis.fetch = async () => { throw new Error('No network permitted in local workspace'); };
const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
    .replace("import { sendCommand } from './bridge';", 'const sendCommand = (...args) => globalThis.__localNativeCommand(...args);')
    .replace("import { isLocalWorkspace, selectWorkspaceMode } from './workspace-mode';", 'const isLocalWorkspace = () => true; const selectWorkspaceMode = () => {};')
    .replace('import.meta.env.VITE_API_URL', 'undefined');
const code = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.ESNext} }).outputText;
const { api, isAuthenticated, diagnoseProblem } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
after(() => { globalThis.fetch = originalFetch; delete globalThis.__localNativeCommand; });

test('local inventory uses the native bridge without an account or HTTP request', async () => {
    assert.equal(isAuthenticated(), true);
    await api.get('/servers/');
    assert.deepEqual(calls.pop(), { command: 'local_request', payload: {method:'GET', endpoint:'/servers/'} });
});
test('local AI goes directly to the native AI adapter', async () => {
    await api.post('/agent/diagnose', {server_id:1, problem_description:'Test query'});
    assert.deepEqual(calls.pop(), { command:'local_ai_diagnose', payload:{server_id:1,problem_description:'Test query'} });
});
test('the diagnosis helper sends only explicitly attached evidence and the visible target identity', async () => {
    const evidence = {content:'selected output',source:'manual',captured_at:'2026-10-25T00:00:00Z'};
    await diagnoseProblem(1,'Test query','es','2026-10-25',evidence,{id:1,hostname:'Server',ip_address:'192.0.2.10',os_info:'Linux',description:'private notes',connection_protocol:'ssh',ssh_port:2222});
    const {payload}=calls.pop();
    assert.deepEqual(payload.evidence,evidence);
    assert.equal(payload.evidence_reviewed,true);
    assert.deepEqual(payload.expected_target,{address:'192.0.2.10',protocol:'ssh',port:2222});
    assert.equal(JSON.stringify(payload).includes('private notes'),false);
    assert.equal(payload.history,undefined);
});
test('the companion passes the session identity without requiring selected evidence', async () => {
    await diagnoseProblem(1,'¿Por qué falló lo último?','es','2026-10-25',undefined,{id:1,hostname:'Server',ip_address:'192.0.2.10',os_info:'Linux',description:'',connection_protocol:'ssh'},'terminal-session-1');
    const {payload}=calls.pop();
    assert.equal(payload.terminal_session_id,'terminal-session-1');
    assert.equal(payload.evidence,undefined);
    assert.equal(payload.evidence_reviewed,undefined);
});
test('a native storage failure never falls back to the enterprise backend', async () => {
    globalThis.__localNativeCommand = async () => { throw new Error('Protected inventory unavailable'); };
    await assert.rejects(api.get('/servers/'), /Protected inventory unavailable/);
});
