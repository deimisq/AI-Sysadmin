import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectNotices } from '../../scripts/collect-frontend-notices.mjs';

function fixture(work) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notices-'));
    try {
        const frontend = path.join(root, 'frontend');
        const packageDir = path.join(frontend, 'node_modules', 'synthetic-library');
        fs.mkdirSync(packageDir, { recursive: true });
        fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: 'synthetic-library', version: '1.0.0', license: 'MIT' }));
        fs.writeFileSync(path.join(frontend, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/synthetic-library': { version: '1.0.0', license: 'MIT' }, 'node_modules/dev-only': { dev: true }, 'node_modules/optional-platform': { optional: true } } }));
        work({ frontend, packageDir, output: path.join(root, 'notices') });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('conserva el texto original de licencia y registra versión sin copiar datos del paquete', () => fixture(({ frontend, packageDir, output }) => {
    const license = 'Texto sintético de aviso legal\n';
    fs.writeFileSync(path.join(packageDir, 'LICENSE'), license);
    fs.writeFileSync(path.join(packageDir, '.env'), 'dato-sintetico-no-distribuible');
    assert.equal(collectNotices(frontend, output), 1);
    assert.equal(fs.readFileSync(path.join(output, 'synthetic-library_1.0.0', 'LICENSE'), 'utf8'), license);
    assert.equal(fs.existsSync(path.join(output, 'synthetic-library_1.0.0', '.env')), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'inventario.json'))).packages[0].version, '1.0.0');
}));

test('rechaza paquetes sin avisos y destinos que podrían contaminar el frontend', () => fixture(({ frontend, output }) => {
    assert.throws(() => collectNotices(frontend, output), /Faltan avisos originales/);
    assert.throws(() => collectNotices(frontend, path.join(frontend, 'notices')), /fuera del frontend/);
}));

test('rechaza una instalación que no corresponde a la versión del lock', () => fixture(({ frontend, packageDir, output }) => {
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: 'synthetic-library', version: '2.0.0' }));
    assert.throws(() => collectNotices(frontend, output), /distinta del lock/);
}));
