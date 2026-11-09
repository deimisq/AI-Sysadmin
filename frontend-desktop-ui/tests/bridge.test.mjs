import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/bridge.ts', import.meta.url), 'utf8')
    .replace("import { invoke } from '@tauri-apps/api/core';", 'const invoke = globalThis.__testInvoke;');
globalThis.__testInvoke = async (command, payload) => ({ command, payload });
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { sendCommand, notifyDesktopReady, notifyDesktopFailure } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
let host;
const originalWindow = globalThis.window;

beforeEach(() => {
    const handlers = new Set();
    host = {
        sent: [], handlers,
        postMessage(message) { this.sent.push(message); },
        addEventListener(_type, handler) { handlers.add(handler); },
        removeEventListener(_type, handler) { handlers.delete(handler); },
        reply(data) { for (const handler of [...handlers]) handler({ data }); },
    };
    globalThis.window = { chrome: { webview: host } };
});
afterEach(() => { globalThis.window = originalWindow; });

test('concurrent SSH connections resolve to their own session even when replies arrive in reverse order', async () => {
    const a = sendCommand('ssh_connect', { host: 'a' });
    const b = sendCommand('ssh_connect', { host: 'b' });
    assert.notEqual(host.sent[0].requestId, host.sent[1].requestId);
    host.reply({ requestId: host.sent[1].requestId, result: 'session-b' });
    host.reply({ requestId: host.sent[0].requestId, result: 'session-a' });
    assert.deepEqual(await Promise.all([a, b]), ['session-a', 'session-b']);
    assert.equal(host.handlers.size, 0);
});

test('native failures reject the promise and remove the listener', async () => {
    const request = sendCommand('pty_create', { sessionId: 'missing' });
    host.reply({ requestId: host.sent[0].requestId, error: 'Session closed' });
    await assert.rejects(request, /Session closed/);
    assert.equal(host.handlers.size, 0);
});
test('desktop lifecycle notifications do not create pending command listeners', () => {
    notifyDesktopReady(); notifyDesktopFailure();
    assert.deepEqual(host.sent,[{type:'DESKTOP_UI_READY'},{type:'DESKTOP_UI_FAILED'}]);
    assert.equal(host.handlers.size,0);
});

test('unanswered requests time out and remove the listener', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const request = sendCommand('ssh_connect');
    const rejected = assert.rejects(request, /Tiempo de espera/);
    t.mock.timers.tick(35001);
    await rejected;
    assert.equal(host.handlers.size, 0);
});

test('web browser reports that native features are unavailable', async () => {
    globalThis.window = {};
    await assert.rejects(sendCommand('ssh_connect'), /escritorio Windows/);
});

test('Tauri commands retain the original invoke contract', async () => {
    globalThis.window = { __TAURI_INTERNALS__: {} };
    assert.deepEqual(await sendCommand('pty_write', { data: [65] }), { command: 'pty_write', payload: { data: [65] } });
});
