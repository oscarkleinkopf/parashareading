// Cantoral de Torá — helpers de versiones de voz real (sin DOM).
// Agrupa tomas por rabino y elige, para cada versículo, el parche más específico.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) root.RecordingVersions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function clipRange(clip, verseCount) {
        const last = Math.max(0, (verseCount || 1) - 1);
        const start = (clip.verseStart == null || clip.verseStart < 1) ? 0 : clip.verseStart - 1;
        const end = (clip.verseEnd == null || clip.verseEnd < 1) ? last : clip.verseEnd - 1;
        const lo = Math.max(0, Math.min(start, last));
        const hi = Math.max(lo, Math.min(end, last));
        return { start: lo, end: hi, span: hi - lo + 1 };
    }

    function coversVerse(clip, verseIndex, verseCount) {
        const { start, end } = clipRange(clip, verseCount);
        return verseIndex >= start && verseIndex <= end;
    }

    function versionKey(clip) {
        if (clip && clip.uploaderId) return String(clip.uploaderId);
        const name = (clip && clip.uploaderName) ? String(clip.uploaderName) : 'anon';
        return 'name:' + name;
    }

    function createdAtMs(clip) {
        if (!clip || !clip.createdAt) return 0;
        const t = new Date(clip.createdAt).getTime();
        return isNaN(t) ? 0 : t;
    }

    function clipId(clip) {
        return clip && clip.id != null ? String(clip.id) : '';
    }

    // Parche gana a toma larga; si empatan en alcance, la más reciente.
    function pickClipForVerse(clips, verseIndex, verseCount) {
        const covering = (clips || []).filter((c) => coversVerse(c, verseIndex, verseCount));
        if (!covering.length) return null;
        covering.sort((a, b) => {
            const sa = clipRange(a, verseCount).span;
            const sb = clipRange(b, verseCount).span;
            if (sa !== sb) return sa - sb;
            const tb = createdAtMs(b) - createdAtMs(a);
            if (tb) return tb;
            return clipId(b).localeCompare(clipId(a));
        });
        return covering[0];
    }

    function nextCoveredVerse(clips, fromIndex, verseCount) {
        const count = verseCount || 0;
        for (let i = Math.max(0, fromIndex); i < count; i++) {
            if (pickClipForVerse(clips, i, count)) return i;
        }
        return -1;
    }

    // Último versículo consecutivo que usa el mismo clip que verseIndex.
    // Sirve para cortar una toma larga al llegar a un parche más específico.
    function sameClipRunEnd(clips, verseIndex, verseCount) {
        const clip = pickClipForVerse(clips, verseIndex, verseCount);
        if (!clip) return -1;
        let end = verseIndex;
        for (let i = verseIndex + 1; i < verseCount; i++) {
            const next = pickClipForVerse(clips, i, verseCount);
            if (!next || String(next.id) !== String(clip.id)) break;
            end = i;
        }
        return end;
    }

    function groupByUploader(clips) {
        const map = new Map();
        (clips || []).forEach((clip) => {
            const key = versionKey(clip);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    uploaderId: clip.uploaderId || null,
                    uploaderName: clip.uploaderName || 'Rabino',
                    clips: []
                });
            }
            const group = map.get(key);
            group.clips.push(clip);
            if (clip.uploaderName) group.uploaderName = clip.uploaderName;
        });
        const groups = Array.from(map.values());
        groups.forEach((g) => {
            g.clips.sort((a, b) => createdAtMs(b) - createdAtMs(a));
        });
        groups.sort((a, b) => String(a.uploaderName).localeCompare(String(b.uploaderName), 'es'));
        return groups;
    }

    function formatRangeLabel(clip, verseCount) {
        if (clip.verseStart == null && clip.verseEnd == null) return 'Aliá completa';
        const { start, end, span } = clipRange(clip, verseCount);
        if (span === (verseCount || span) && start === 0) return 'Aliá completa';
        if (start === end) return 'Versículo ' + (start + 1);
        return 'Versículos ' + (start + 1) + '–' + (end + 1);
    }

    function coverageSummary(clips, verseCount) {
        const count = verseCount || 0;
        if (!count) return { covered: 0, total: 0, gaps: [] };
        let covered = 0;
        const gaps = [];
        let gapStart = null;
        for (let i = 0; i < count; i++) {
            if (pickClipForVerse(clips, i, count)) {
                covered++;
                if (gapStart != null) {
                    gaps.push({ start: gapStart, end: i - 1 });
                    gapStart = null;
                }
            } else if (gapStart == null) {
                gapStart = i;
            }
        }
        if (gapStart != null) gaps.push({ start: gapStart, end: count - 1 });
        return { covered, total: count, gaps };
    }

    return {
        clipRange,
        coversVerse,
        versionKey,
        pickClipForVerse,
        nextCoveredVerse,
        sameClipRunEnd,
        groupByUploader,
        formatRangeLabel,
        coverageSummary
    };
});
