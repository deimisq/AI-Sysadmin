import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/documentation.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { documentation, searchArticles } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('both app languages provide the same complete article graph without broken related links', () => {
    assert.deepEqual(documentation.es.map(a => a.id), documentation.en.map(a => a.id));
    for (const articles of Object.values(documentation)) {
        const ids = new Set(articles.map(a => a.id));
        assert.equal(ids.size, articles.length);
        for (const article of articles) {
            assert.ok(article.title && article.summary && article.category);
            assert.ok(article.content.startsWith('## '));
            assert.ok(article.content.split('\n## ').length >= 3);
            assert.ok(article.related.length > 0);
            for (const id of article.related) assert.ok(ids.has(id) && id !== article.id);
        }
    }
});

test('search ignores accents, case and surrounding spaces and matches words across article fields', () => {
    assert.ok(searchArticles(documentation.es, '  CONEXION   autenticacion ').some(a => a.id === 'ssh'));
    assert.deepEqual(searchArticles(documentation.es, 'restaurar contraseña').map(a => a.id), ['backup']);
    assert.ok(searchArticles(documentation.en, 'OLLAMA server').some(a => a.id === 'providers'));
    assert.equal(searchArticles(documentation.es, 'zzzz-no-results').length, 0);
    assert.equal(searchArticles(documentation.en, '   ').length, documentation.en.length);
});

test('articles describe supported context choices and separate chat deletion from journal deletion', () => {
    const settings = readFileSync(new URL('../src/components/settings/TerminalContextSettings.tsx', import.meta.url), 'utf8');
    for (const limit of ['8000', '32000', '120000']) assert.ok(settings.includes(`value="${limit}"`));
    for (const language of ['es', 'en']) {
        const context = documentation[language].find(a => a.id === 'context').content;
        for (const limit of ['8.000', '32.000', '120.000', '240.000']) {
            assert.ok(context.includes(language === 'es' ? limit : limit.replace('.', ',')));
        }
        assert.ok(documentation[language].find(a => a.id === 'backup').content.includes('.aisysbackup'));
    }
});
