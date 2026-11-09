import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../src/lib/connection-form.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {validateConnectionForm:validate}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('local connection identifies missing fields and invalid ports',()=>{
    assert.deepEqual(Object.keys(validate({hostname:' ',ip_address:'',ssh_username:''},true,NaN)),['hostname','ip_address','ssh_username','port']);
    for(const port of [0,65536,2.5]) assert.ok(validate({hostname:'a',ip_address:'::1',ssh_username:'user'},true,port).port);
});
test('DNS and IPv6 work without accepting pasted URLs or changing enterprise requirements',()=>{
    for(const address of ['host.example','::1','192.0.2.1']) assert.deepEqual(validate({hostname:'a',ip_address:address,ssh_username:'user'},true,22),{});
    assert.ok(validate({hostname:'a',ip_address:'ssh://host',ssh_username:'user'},true,22).ip_address);
    assert.deepEqual(validate({hostname:'a',ip_address:'host',ssh_username:''},false,NaN),{});
});
