import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/quick-connect.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { parseQuickTarget } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('quick connections preserve hosts and protocol default ports', () => {
    assert.deepEqual(parseQuickTarget(' host.example ', 'ssh'), { host:'host.example', port:22 });
    assert.deepEqual(parseQuickTarget('192.0.2.1', 'rdp'), { host:'192.0.2.1', port:3389 });
    assert.deepEqual(parseQuickTarget('host:2222', 'sftp'), { host:'host', port:2222 });
});
test('IPv6 separates bracketed custom ports from bare addresses', () => {
    assert.deepEqual(parseQuickTarget('[2001:db8::1]:2222', 'ssh'), { host:'2001:db8::1', port:2222 });
    assert.deepEqual(parseQuickTarget('2001:db8::1', 'ssh'), { host:'2001:db8::1', port:22 });
});
test('quick connections reject malformed targets before requesting credentials', () => {
    for (const value of ['', 'https://host', 'user@host', 'host name', 'host:0', 'host:65536', 'host:x', '[bad']) assert.throws(() => parseQuickTarget(value, 'ssh'));
});
