import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/terminal-clipboard.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { attachTerminalClipboard } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(clipboardOverrides = {}) {
    let selected = '', listener, visible = true;
    const copied = [], pasted = [], errors = [];
    const element = new EventTarget();
    element.getClientRects = () => visible ? [{}] : [];
    const terminal = {
        getSelection: () => selected,
        onSelectionChange: callback => { listener = callback; return { dispose: () => { listener = undefined; } }; },
        paste: text => pasted.push(text), focus: () => {},
    };
    let reads = 0;
    const clipboard = { writeText: async text => { copied.push(text); }, readText: async () => { reads++; return 'echo prueba\n'; }, ...clipboardOverrides };
    const dispose = attachTerminalClipboard(terminal, element, clipboard, operation => errors.push(operation));
    return { copied, pasted, errors, dispose, reads: () => reads,
        select: text => { selected = text; listener?.(); },
        hide: () => { visible = false; },
        event: (type, button = 2) => {
            const event = new Event(type, { cancelable: true });
            Object.defineProperty(event, 'button', { value: button });
            element.dispatchEvent(event);
            return event;
        },
    };
}

test('selection copies exact Unicode text, skips empty/duplicate events and supports reselection', async () => {
    const f = fixture();
    f.select('línea α\n  espacios'); f.select('línea α\n  espacios'); f.select(''); f.select('línea α\n  espacios');
    await tick();
    assert.deepEqual(f.copied, ['línea α\n  espacios', 'línea α\n  espacios']);
    assert.equal(f.reads(), 0);
    f.dispose();
});

test('right click prevents native context menu and sends clipboard only through terminal.paste', async () => {
    const f = fixture();
    assert.equal(f.event('mousedown').defaultPrevented, true);
    assert.equal(f.event('mousedown', 0).defaultPrevented, false);
    assert.equal(f.reads(), 0);
    assert.equal(f.event('contextmenu').defaultPrevented, true);
    await tick();
    assert.equal(f.reads(), 1);
    assert.deepEqual(f.pasted, ['echo prueba\n']);
    f.dispose();
});

test('closing or hiding a terminal prevents a delayed clipboard read from pasting into it', async () => {
    for (const action of ['dispose', 'hide']) {
        let resolve;
        const f = fixture({ readText: () => new Promise(done => { resolve = done; }) });
        f.event('contextmenu'); f[action](); resolve('no enviar');
        await tick();
        assert.deepEqual(f.pasted, []);
        f.dispose();
    }
});

test('clipboard denials are reported without writing to the terminal and selection copy can retry', async () => {
    const f = fixture({ writeText: async () => { throw new Error('denied'); }, readText: async () => { throw new Error('denied'); } });
    f.select('texto'); await tick(); f.select('texto'); await tick();
    f.event('contextmenu'); await tick();
    assert.deepEqual(f.errors, ['copy', 'copy', 'paste']);
    assert.deepEqual(f.pasted, []);
    f.dispose(); f.select('cerrado'); f.event('contextmenu'); await tick();
    assert.deepEqual(f.errors, ['copy', 'copy', 'paste']);
});

test('empty clipboard is not sent and missing clipboard APIs are handled', async () => {
    const empty = fixture({ readText: async () => '' });
    empty.event('contextmenu'); await tick(); assert.deepEqual(empty.pasted, []); empty.dispose();
    const missing = fixture({ writeText: () => { throw new TypeError('unavailable'); }, readText: () => { throw new TypeError('unavailable'); } });
    missing.select('texto'); missing.event('contextmenu');
    assert.deepEqual(missing.errors, ['copy', 'paste']); missing.dispose();
});
