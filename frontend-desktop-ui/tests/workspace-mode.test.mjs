import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, beforeEach, after } from 'node:test';
import ts from 'typescript';
const original = globalThis.sessionStorage;
let mode = null;
globalThis.sessionStorage = { getItem: () => mode, setItem: (_key, value) => { mode = value; } };
const source = readFileSync(new URL('../src/lib/workspace-mode.ts', import.meta.url), 'utf8')
    .replace("import { isWebView2 } from './bridge';", 'const isWebView2 = () => globalThis.__nativeWindows;');
const code = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.ESNext} }).outputText;
const { isLocalWorkspace, selectWorkspaceMode } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
beforeEach(() => { mode = null; globalThis.__nativeWindows = true; });
after(() => { globalThis.sessionStorage = original; delete globalThis.__nativeWindows; });
test('Windows starts locally without a token or account', () => { assert.equal(isLocalWorkspace(), true); });
test('enterprise and local selection are explicit and reversible', () => {
    selectWorkspaceMode('enterprise'); assert.equal(isLocalWorkspace(), false);
    selectWorkspaceMode('local'); assert.equal(isLocalWorkspace(), true);
});
test('a browser cannot enable a local vault merely by changing storage', () => {
    mode = 'local'; globalThis.__nativeWindows = false;
    assert.equal(isLocalWorkspace(), false);
    assert.throws(() => selectWorkspaceMode('local'), /cliente Windows/);
});
