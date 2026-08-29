import assert from "node:assert/strict";
import {
  alignTranscriptToVerses,
  clampRange,
  similarity,
  stripHebrew,
  vocabFromVerses,
} from "../netlify/functions/_shared/align.ts";

const v1 = "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ";
const v2 = "וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ וְחֹשֶׁךְ עַל פְּנֵי תְהוֹם";
const v3 = "וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי אוֹר";
const verses = [v1, v2, v3];

assert.equal(stripHebrew(v1).startsWith("בראשיתברא"), true);
assert.equal(similarity("abcdef", "abzzef") > 0.4, true);

const hitAll = alignTranscriptToVerses(stripHebrew(v1 + v2 + v3), verses);
assert.ok(hitAll);
assert.equal(hitAll.verseStart, 1);
assert.equal(hitAll.verseEnd, 3);

const hitMid = alignTranscriptToVerses(v2, verses);
assert.ok(hitMid);
assert.equal(hitMid.verseStart, 2);
assert.equal(hitMid.verseEnd, 2);

const miss = alignTranscriptToVerses("hello world", verses);
assert.equal(miss, null);

const vocab = vocabFromVerses(verses);
assert.ok(vocab.length >= 3);

const clamped = clampRange(6, 2, 5);
assert.deepEqual(clamped, { verseStart: 2, verseEnd: 5 });

console.log("recording-align: ok");
