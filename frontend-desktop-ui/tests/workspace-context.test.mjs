import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test,after,beforeEach} from 'node:test';
import {create} from 'zustand';
import ts from 'typescript';
globalThis.__workspaceCreate=create;
const source=readFileSync(new URL('../src/stores/workspaceStore.ts',import.meta.url),'utf8').replace("import { create } from 'zustand';",'const create = globalThis.__workspaceCreate;').replace("import { hasNativePreferences, sendCommand } from '../lib/bridge';", 'const hasNativePreferences = () => !!globalThis.__nativePreferences; const sendCommand = async (command, payload) => { globalThis.__nativeRequest = {command,payload}; };');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {useWorkspaceStore:store,readWorkspacePresentation}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
beforeEach(()=>{ globalThis.__nativePreferences=false; delete globalThis.__nativeRequest; store.setState({nativeSessions:{}, tabs:[], activeTabId:null, sidebarVisible:true, explorerAction:null, activeOverlay:null}); });
after(()=>{delete globalThis.__workspaceCreate;delete globalThis.__nativePreferences;delete globalThis.__nativeRequest;});

test('restores panel visibility and scoped folder expansion in a fresh workspace without restoring sessions', async () => {
    const previous = globalThis.localStorage;
    const values = new Map();
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
    try {
        store.setState({sidebarVisible:false, aiPanelVisible:false, toolsVisible:true, explorerExpanded:{}});
        store.getState().setExplorerExpanded('device:1:folder:a',false);
        store.getState().setExplorerExpanded('device:1:folder:child',true);
        store.getState().setExplorerExpanded('enterprise:2:group:a',true);
        store.getState().openTab({id:'sensitive-session',type:'terminal',title:'private-target',server:{password:'synthetic-password'}});
        store.getState().toggleTools();
        const raw = values.get('workspace-presentation:v1');
        assert.equal(raw.includes('synthetic-password'),false);
        assert.equal(raw.includes('sensitive-session'),false);
        const {useWorkspaceStore:reopened} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#reopened`);
        const state = reopened.getState();
        assert.equal(state.sidebarVisible,false);
        assert.equal(state.aiPanelVisible,false);
        assert.equal(state.toolsVisible,false);
        assert.equal(state.explorerExpanded['device:1:folder:a'],false);
        assert.equal(state.explorerExpanded['device:1:folder:child'],true);
        assert.equal(state.explorerExpanded['enterprise:2:group:a'],true);
        assert.deepEqual(state.tabs,[]);
        assert.deepEqual(state.nativeSessions,{});
    } finally {globalThis.localStorage=previous;}
});

test('invalid or unavailable presentation storage falls back safely and never breaks toggles', () => {
    const previous = globalThis.localStorage;
    try {
        globalThis.localStorage = {getItem:()=> '{broken'};
        assert.deepEqual(readWorkspacePresentation(),{sidebarVisible:true,aiPanelVisible:true,toolsVisible:false,explorerExpanded:{}});
        globalThis.localStorage = {getItem:()=> JSON.stringify({sidebarVisible:'false',aiPanelVisible:false,toolsVisible:null,explorerExpanded:{a:false,b:'true'}})};
        assert.deepEqual(readWorkspacePresentation(),{sidebarVisible:true,aiPanelVisible:false,toolsVisible:false,explorerExpanded:{a:false}});
        globalThis.localStorage = {getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('quota');}};
        assert.equal(readWorkspacePresentation().sidebarVisible,true);
        assert.doesNotThrow(()=>store.getState().toggleSidebar());
    } finally {globalThis.localStorage=previous;}
});
test('cleanup from an older terminal cannot remove a replacement session',()=>{
    store.getState().registerNativeSession(1,'old');store.getState().registerNativeSession(1,'new');
    store.getState().clearNativeSession(1,'old');
    assert.equal(store.getState().nativeSessions[1],'new');
    store.getState().clearNativeSession(1,'new');
    assert.equal(store.getState().nativeSessions[1],undefined);
});

test('closing an active tab selects its neighbor and keeps the remaining sessions',()=>{
    for (const id of ['a','b','c','d']) store.getState().openTab({id,type:'terminal',title:id});
    store.getState().registerNativeSession(1,'ssh-session');
    store.getState().setActiveTab('b');
    store.getState().closeTab('b');
    assert.equal(store.getState().activeTabId,'c');
    assert.deepEqual(store.getState().tabs.map(tab=>tab.id),['a','c','d']);
    assert.equal(store.getState().nativeSessions[1],'ssh-session');
    store.getState().closeTab('d');
    assert.equal(store.getState().activeTabId,'c');
    store.getState().closeTab('c');
    assert.equal(store.getState().activeTabId,'a');
    store.getState().closeTab('a');
    assert.equal(store.getState().activeTabId,null);
});

test('a welcome action restores the explorer without discarding sessions or pending actions',()=>{
    store.getState().openTab({id:'active',type:'terminal',title:'Server'});
    store.getState().toggleSidebar();
    store.getState().setActiveOverlay('settings');
    store.getState().requestExplorerAction('add-folder');
    assert.equal(store.getState().sidebarVisible,true);
    assert.equal(store.getState().explorerAction,'add-folder');
    assert.equal(store.getState().activeOverlay,null);
    assert.equal(store.getState().activeTabId,'active');
    store.getState().requestExplorerAction(null);
    assert.equal(store.getState().explorerAction,null);
    assert.equal(store.getState().sidebarVisible,true);
});

test('native preferences open separately without replacing the terminal workspace',()=>{
    const previous=globalThis.window;
    try {
        globalThis.window={sessionStorage:{getItem:()=> 'enterprise'}};
        globalThis.__nativePreferences=true;
        store.getState().openTab({id:'active',type:'terminal',title:'Server'});
        store.getState().registerNativeSession(1,'ssh-session');
        store.getState().setActiveOverlay('settings');
        assert.deepEqual(globalThis.__nativeRequest,{command:'preferences_open',payload:{enterprise:true,section:'general'}});
        assert.equal(store.getState().activeOverlay,null);
        assert.equal(store.getState().activeTabId,'active');
        assert.equal(store.getState().nativeSessions[1],'ssh-session');
    } finally {globalThis.window=previous;}
});

test('preferences links keep their requested section in the embedded fallback',()=>{
    for (const section of ['ai','context','backups']) {
        store.getState().openPreferences(section);
        assert.equal(store.getState().preferencesSection,section);
        assert.equal(store.getState().activeOverlay,'settings');
    }
    store.getState().setActiveOverlay('settings');
    assert.equal(store.getState().preferencesSection,'general');
});

test('native preferences forward the section even when the window is already open',()=>{
    const previous=globalThis.window;
    try {
        globalThis.window={sessionStorage:{getItem:()=> 'local'}};
        globalThis.__nativePreferences=true;
        for (const section of ['ai','context','backups']) {
            store.getState().openPreferences(section);
            assert.deepEqual(globalThis.__nativeRequest,{command:'preferences_open',payload:{enterprise:false,section}});
            assert.equal(store.getState().activeOverlay,null);
        }
    } finally {globalThis.window=previous;}
});
