// Alinea un transcript (hebreo cantado, imperfecto) con los versículos de la Aliá.
// Sin DOM: lo usa la Function de detección y los tests.

export function stripHebrew(text: string): string {
  return String(text || "")
    .replace(/[\u0591-\u05C7\u05F3\u05F4]/g, "")
    .replace(/[^\u05D0-\u05EA]/g, "");
}

export function lcsLength(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return 0;
  let prev = new Uint16Array(m + 1);
  let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const tmp = prev;
    prev = cur;
    cur = tmp;
    cur.fill(0);
  }
  return prev[m];
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aa = a.length > 480 ? a.slice(0, 480) : a;
  const bb = b.length > 900 ? b.slice(0, 900) : b;
  const l = lcsLength(aa, bb);
  return (2 * l) / (aa.length + bb.length);
}

export type AlignHit = {
  verseStart: number;
  verseEnd: number;
  score: number;
};

// Elige la ventana contigua de versículos cuyo esqueleto consonántico
// más se parece al transcript.
export function alignTranscriptToVerses(transcript: string, verses: string[]): AlignHit | null {
  const t = stripHebrew(transcript);
  if (t.length < 8 || !verses || !verses.length) return null;

  const skeletons = verses.map((v) => stripHebrew(v));
  const prefixes: string[] = [""];
  for (let i = 0; i < skeletons.length; i++) {
    prefixes.push(prefixes[i] + skeletons[i]);
  }

  let best: AlignHit | null = null;
  for (let start = 0; start < verses.length; start++) {
    for (let end = start; end < verses.length; end++) {
      const window = prefixes[end + 1].slice(prefixes[start].length);
      if (window.length < 6) continue;
      const score = similarity(t, window);
      if (!best || score > best.score) {
        best = { verseStart: start + 1, verseEnd: end + 1, score };
      }
    }
  }

  if (!best || best.score < 0.18) return null;
  return best;
}

export function vocabFromVerses(verses: string[], max = 80): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of verses || []) {
    const words = String(v || "")
      .split(/\s+/)
      .map((w) => w.replace(/[\u0591-\u05C7]/g, "").trim())
      .filter((w) => w.length >= 2);
    for (const w of words.slice(0, 4)) {
      if (seen.has(w)) continue;
      seen.add(w);
      out.push(w);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function parseVerseJson(raw: string): string[] {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.text === "string") return item.text;
        return "";
      });
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function clampRange(start: number, end: number, verseCount: number): { verseStart: number; verseEnd: number } {
  const last = Math.max(1, verseCount || 1);
  let a = Math.round(start);
  let b = Math.round(end);
  if (!Number.isFinite(a)) a = 1;
  if (!Number.isFinite(b)) b = last;
  a = Math.min(Math.max(1, a), last);
  b = Math.min(Math.max(1, b), last);
  if (b < a) {
    const t = a;
    a = b;
    b = t;
  }
  return { verseStart: a, verseEnd: b };
}
