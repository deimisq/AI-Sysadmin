import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/ai-connection.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { normalizedAiEndpoint, sameAiEndpoint } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('Ollama server, native API and compatibility addresses identify the same connection', () => {
    for (const suffix of ['', '/', '/api', '/v1/']) {
        assert.equal(normalizedAiEndpoint('ollama', 'http://localhost:11434' + suffix), 'http://localhost:11434/v1');
    }
    assert.equal(normalizedAiEndpoint('ollama', 'https://example.invalid/proxy/api'), 'https://example.invalid/proxy/v1');
});

test('credentials cannot be considered reusable after a host, port or proxy path change', () => {
    const saved = 'https://example.invalid/ollama/v1';
    assert.equal(sameAiEndpoint('ollama', 'https://example.invalid/ollama/api', saved), true);
    for (const changed of ['https://other.invalid/ollama', 'https://example.invalid:8443/ollama', 'https://example.invalid/other', 'invalid']) {
        assert.equal(sameAiEndpoint('ollama', changed, saved), false);
    }
});

test('OpenCode retains its reverse proxy path and rejects credentials inside the URL', () => {
    assert.equal(normalizedAiEndpoint('opencode', 'https://example.invalid/code/'), 'https://example.invalid/code');
    assert.throws(() => normalizedAiEndpoint('opencode', 'https://user:password@example.invalid'));
    assert.throws(() => normalizedAiEndpoint('opencode', 'https://example.invalid?token=secret'));
});
