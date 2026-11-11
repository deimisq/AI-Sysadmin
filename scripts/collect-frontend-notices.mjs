// Conserva avisos originales; nunca copia credenciales ni el árbol node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function collectNotices(frontend, destination) {
    const root = path.resolve(frontend);
    const output = path.resolve(destination);
    if (output === root || output.startsWith(root + path.sep)) throw new Error('El destino de avisos debe quedar fuera del frontend.');
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    const inventory = [];
    const missing = [];
    const fallbackRoot = fileURLToPath(new URL('../assets/licenses/npm/', import.meta.url));
    const provenance = JSON.parse(fs.readFileSync(path.join(fallbackRoot, 'sources.json'), 'utf8'));
    for (const [relative, entry] of Object.entries(lock.packages || {})) {
        if (!relative.startsWith('node_modules/') || entry.dev || entry.link) continue;
        const directory = path.resolve(root, relative);
        if (!directory.startsWith(root + path.sep) || !relative.split('/').includes('node_modules')) throw new Error(`Ruta de paquete no autorizada: ${relative}`);
        if (!fs.existsSync(directory)) {
            if (entry.optional) continue;
            throw new Error(`Falta el paquete requerido: ${relative}`);
        }
        const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
        if (manifest.version !== entry.version) throw new Error(`Versión instalada distinta del lock: ${relative}`);
        const id = `${manifest.name}@${manifest.version}`;
        const folder = path.join(output, id.replace(/[^a-zA-Z0-9._-]/g, '_'));
        const notices = fs.readdirSync(directory, { withFileTypes: true })
            .filter(item => item.isFile() && /^(licen[cs]e|notice|copying|copyright|third[-_. ]?party)([._-]|$)/i.test(item.name));
        const fallback = path.join(fallbackRoot, id.replace(/[^a-zA-Z0-9._-]/g, '_'), 'LICENSE');
        const origin = provenance.find(item => item.name === manifest.name && item.version === manifest.version);
        if (!notices.length && !(origin && fs.existsSync(fallback))) missing.push(id);
        fs.mkdirSync(folder, { recursive: true });
        for (const notice of notices) fs.copyFileSync(path.join(directory, notice.name), path.join(folder, notice.name));
        if (!notices.length && origin && fs.existsSync(fallback)) fs.copyFileSync(fallback, path.join(folder, 'LICENSE'));
        inventory.push({ name: manifest.name, version: manifest.version, license: manifest.license || entry.license || 'Sin declaración', notices: notices.length ? notices.map(item => item.name) : origin ? ['LICENSE'] : [], source: notices.length ? 'Paquete npm instalado' : origin });
    }
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'inventario.json'), JSON.stringify({ scope: 'Dependencias npm de producción instaladas; inventario conservador, no afirma que todos los paquetes estén incluidos en el bundle.', packages: inventory, missing_notices: missing }, null, 2) + '\n');
    if (missing.length) throw new Error(`Faltan avisos originales en: ${missing.join(', ')}`);
    return inventory.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.length !== 4) throw new Error('Uso: node scripts/collect-frontend-notices.mjs <frontend> <destino>');
    console.log(`Avisos conservados para ${collectNotices(process.argv[2], process.argv[3])} paquetes.`);
}
