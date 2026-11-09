import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/connection-presentation.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { connectionPresentation } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('explicit SSH on Windows retains its protocol and custom port', () => {
    assert.deepEqual(connectionPresentation({ connection_protocol: 'ssh', os_info: 'Windows Server', ssh_port: 2222 }), { protocol: 'SSH', port: 2222 });
});
test('RDP and legacy Windows connections show the correct port without inventing connection state', () => {
    assert.deepEqual(connectionPresentation({ connection_protocol: 'rdp', rdp_port: 3390 }), { protocol: 'RDP', port: 3390 });
    assert.deepEqual(connectionPresentation({ os_info: 'Windows Server' }), { protocol: 'RDP', port: 3389 });
    assert.deepEqual(connectionPresentation(), { protocol: 'SSH', port: 22 });
});
