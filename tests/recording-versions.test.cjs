const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'recording-versions.js'), 'utf8');
const sandbox = { module: { exports: {} }, console };
sandbox.exports = sandbox.module.exports;
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const V = sandbox.module.exports;

const full = {
    id: 1,
    uploaderId: 'rabbi-a',
    uploaderName: 'Rabino A',
    verseStart: null,
    verseEnd: null,
    createdAt: '2026-01-01T00:00:00.000Z'
};
const patchOld = {
    id: 2,
    uploaderId: 'rabbi-a',
    uploaderName: 'Rabino A',
    verseStart: 5,
    verseEnd: 6,
    createdAt: '2026-02-01T00:00:00.000Z'
};
const patchNew = {
    id: 3,
    uploaderId: 'rabbi-a',
    uploaderName: 'Rabino A',
    verseStart: 5,
    verseEnd: 6,
    createdAt: '2026-03-01T00:00:00.000Z'
};
const other = {
    id: 4,
    uploaderId: 'rabbi-b',
    uploaderName: 'Rabino B',
    verseStart: 1,
    verseEnd: 8,
    createdAt: '2026-04-01T00:00:00.000Z'
};

const verseCount = 8;
const versionA = [full, patchOld, patchNew];

assert.strictEqual(V.pickClipForVerse(versionA, 0, verseCount).id, 1, 'verse 1 uses full take');
assert.strictEqual(V.pickClipForVerse(versionA, 4, verseCount).id, 3, 'verse 5 uses newest patch');
assert.strictEqual(V.pickClipForVerse(versionA, 5, verseCount).id, 3, 'verse 6 uses newest patch');
assert.strictEqual(V.pickClipForVerse(versionA, 6, verseCount).id, 1, 'verse 7 returns to full take');

assert.strictEqual(V.nextCoveredVerse(versionA, 0, verseCount), 0);
assert.strictEqual(V.nextCoveredVerse([patchNew], 0, verseCount), 4, 'skip uncovered prefix');
assert.strictEqual(V.nextCoveredVerse([patchNew], 6, verseCount), -1, 'nothing after patch');
assert.strictEqual(V.sameClipRunEnd(versionA, 0, verseCount), 3, 'full take only until verse 4');
assert.strictEqual(V.sameClipRunEnd(versionA, 4, verseCount), 5, 'patch covers 5–6');
assert.strictEqual(V.sameClipRunEnd(versionA, 6, verseCount), 7, 'full take resumes 7–8');

const groups = V.groupByUploader([full, patchNew, other]);
assert.strictEqual(groups.length, 2);
assert.ok(groups.some((g) => g.key === 'rabbi-a' && g.clips.length === 2));
assert.ok(groups.some((g) => g.key === 'rabbi-b' && g.clips.length === 1));

assert.strictEqual(V.formatRangeLabel(full, verseCount), 'Aliá completa');
assert.strictEqual(V.formatRangeLabel(patchNew, verseCount), 'Versículos 5–6');
assert.strictEqual(V.formatRangeLabel({ verseStart: 3, verseEnd: 3 }, verseCount), 'Versículo 3');

const summary = V.coverageSummary([patchNew], verseCount);
assert.strictEqual(summary.covered, 2);
assert.strictEqual(JSON.stringify(summary.gaps), JSON.stringify([{ start: 0, end: 3 }, { start: 6, end: 7 }]));

console.log('recording-versions: ok');
