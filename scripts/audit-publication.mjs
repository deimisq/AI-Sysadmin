// Read-only screening. Prints object ids, categories and paths, never secret values.
// Not a replacement for specialist scanning or proof that credentials are inactive.
import { execFileSync, spawnSync, spawn } from 'node:child_process';
const git = (...args) => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, encoding: 'utf8' });
const patterns = [
    ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
    ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{60,255})\b/],
    ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['stripe-secret', /\bsk_(?:live|test)_[A-Za-z0-9]{20,255}\b/],
    ['openai-secret', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,255}\b/],
];
const objects = git('rev-list', '--objects', '--all').trim().split('\n').map(line => {
    const split = line.indexOf(' '); return { id: line.slice(0, split < 0 ? undefined : split), path: split < 0 ? '' : line.slice(split + 1) };
});
const check = spawnSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { input: objects.map(x => x.id).join('\n') + '\n', encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
if (check.status !== 0) throw Error('Cannot enumerate repository objects');
const blobs = check.stdout.trim().split('\n').map((line, index) => ({ ...objects[index], type: line.split(' ')[1], size: Number(line.split(' ')[2]) })).filter(x => x.type === 'blob');
const findings = [], skipped = [];
let buffer = Buffer.alloc(0), record = null, remaining = 0, chunks = [], delimiter = false, index = 0;
const child = spawn('git', ['cat-file', '--batch']);
child.stdin.end(blobs.map(blob => blob.id).join('\n') + '\n');
child.stdout.on('data', data => {
    buffer = buffer.length ? Buffer.concat([buffer, data]) : data;
    while (buffer.length) {
        if (delimiter) { buffer = buffer.subarray(1); delimiter = false; continue; }
        if (!record) {
            const end = buffer.indexOf(10); if (end < 0) return;
            const header = buffer.subarray(0, end).toString('ascii').split(' ');
            buffer = buffer.subarray(end + 1); record = blobs[index++]; remaining = Number(header[2]); chunks = [];
            if (record.id !== header[0] || header[1] !== 'blob' || !Number.isFinite(remaining)) throw Error('Unexpected git object');
            if (record.size > 8 * 1024 * 1024) skipped.push({ object: record.id, path: record.path, size: record.size });
        }
        const count = Math.min(remaining, buffer.length);
        if (record.size <= 8 * 1024 * 1024 && count) chunks.push(buffer.subarray(0, count));
        buffer = buffer.subarray(count); remaining -= count;
        if (remaining) return;
        if (record.size <= 8 * 1024 * 1024) {
            const content = Buffer.concat(chunks).toString('utf8');
            const kinds = patterns.filter(([, pattern]) => pattern.test(content)).map(([name]) => name);
            if (kinds.length) findings.push({ object: record.id, path: record.path, categories: kinds });
        }
        record = null; chunks = []; delimiter = true;
    }
});
child.on('error', () => { throw Error('Cannot read repository objects'); });
child.on('close', code => {
    if (code !== 0 || index !== blobs.length || record) throw Error('Incomplete repository scan');
    process.stdout.write(JSON.stringify({ refs: git('for-each-ref', '--format=%(refname)').trim().split('\n').length, blobs: blobs.length, findings, skipped, scope: 'Pattern screening only. Review every finding and skipped object before publication; examples and test fixtures can match.' }, null, 2) + '\n');
    if (findings.length || skipped.length) process.exitCode = 2;
});