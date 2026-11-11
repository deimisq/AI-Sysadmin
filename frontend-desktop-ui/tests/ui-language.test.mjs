import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const source = new URL('../src/lib/ui-language.ts', import.meta.url);
const require = createRequire(source);
function translator(language) {
    const module = { exports: {} };
    const document = { documentElement: { lang: '' } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText, { module, exports: module.exports, require, window: { __AI_AGENT_LANGUAGE__: language }, document });
    return { ...module.exports, document };
}

test('el idioma instalado selecciona la interfaz y sus permisos sin alterar datos compartidos', () => {
    const es = translator('es');
    const en = translator('en');
    assert.equal(es.uiText('Cancelar'), 'Cancelar');
    assert.equal(en.uiText('Cancelar'), 'Cancel');
    assert.equal(en.uiText('Revocar permiso automático'), 'Revoke automatic permission');
    assert.equal(en.document.documentElement.lang, 'en');
    assert.equal(translator('otro').appLanguage(), 'es');
    const command = 'echo "Conexiones"; printf "$& {0}"';
    assert.equal(en.uiText(command), command);
    assert.equal(en.uiFormat('Abrir conexión {0}', command), `Open connection ${command}`);
    assert.equal(en.uiFormat('Restauración completada: {0} conexiones y {1} carpetas agregadas.', 3, 2), 'Restore complete: 3 connections and 2 folders added.');
});

test('las traducciones con parámetros conservan todos los marcadores originales', () => {
    const directory = new URL('../src/locales/', import.meta.url);
    for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
        const messages = JSON.parse(fs.readFileSync(path.join(directory.pathname.replace(/^\/(?=[A-Za-z]:)/, ''), file), 'utf8'));
        for (const [original, translated] of Object.entries(messages)) {
            assert.deepEqual((translated.match(/\{\d+\}/g) || []).sort(), (original.match(/\{\d+\}/g) || []).sort(), `${file}: ${original}`);
        }
    }
});
