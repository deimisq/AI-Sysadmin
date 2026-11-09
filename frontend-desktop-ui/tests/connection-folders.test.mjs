import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/connection-folders.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { readFolderLayout, removeFolder, folderPath } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('corrupt layouts and parent cycles do not prevent opening the inventory', () => {
    assert.deepEqual(readFolderLayout('{'), { folders: [], assignments: {} });
    assert.deepEqual(readFolderLayout(JSON.stringify({ folders: [{ id: 'a', name: 'A', parentId: 'b' }, { id: 'b', name: 'B', parentId: 'a' }], assignments: {} })).folders, []);
});

test('folder destinations distinguish duplicate names in different clients', () => {
    const folders = [{id:'a',name:'Client A',parentId:null},{id:'b',name:'Client B',parentId:null},{id:'ap',name:'Production',parentId:'a'},{id:'bp',name:'Production',parentId:'b'}];
    assert.equal(folderPath(folders,'ap'),'Client A / Production');
    assert.equal(folderPath(folders,'bp'),'Client B / Production');
    assert.equal(folderPath(folders,'missing'),'');
    assert.equal(folderPath([{id:'loop',name:'Loop',parentId:'loop'}],'loop'),'Loop');
});
test('nested assignments survive a round trip; unrelated or credential fields are discarded', () => {
    const result = readFolderLayout(JSON.stringify({ folders: [{ id: 'a', name: 'Cliente', parentId: null }, { id: 'b', name: 'Producción', parentId: 'a', password: 'secret' }], assignments: { 1: 'b', 2: 'missing' }, ssh_password: 'secret' }));
    assert.equal(result.assignments['1'], 'b');
    assert.equal(result.assignments['2'], undefined);
    assert.equal(JSON.stringify(result).includes('secret'), false);
    assert.deepEqual(readFolderLayout(JSON.stringify(result)), result);
});
test('removing a subtree restores its connections to their original groups and preserves siblings', () => {
    const layout = { folders: [{ id: 'a', name: 'A', parentId: null }, { id: 'b', name: 'B', parentId: 'a' }, { id: 'c', name: 'C', parentId: 'b' }, { id: 'd', name: 'D', parentId: null }], assignments: { 1: 'b', 2: 'c', 3: 'd' } };
    const result = removeFolder(layout, 'a');
    assert.deepEqual(result.folders.map(f => f.id), ['d']);
    assert.deepEqual(result.assignments, { 3: 'd' });
    assert.equal(layout.folders.length, 4);
});
