// Chanted recordings library — local uploads + external HTTPS URLs
// for practicing a full sung Aliyah (not only synthetic tropes).

const ChantedRecordings = {
    DB_NAME: 'cantoralChantedRecordings',
    DB_VERSION: 1,
    STORE: 'recordings',
    MAX_BYTES: 25 * 1024 * 1024, // 25 MB per file (browser IndexedDB friendly)

    _dbPromise: null,
    _objectUrl: null,
    _audioEl: null,

    // External practice sources (open in browser / download then upload).
    // Note: many community leyning sites are HTTP-only and cannot be
    // embedded from an HTTPS deploy — users should download and upload.
    externalSources: {
        sephardicHazzanut: {
            name: 'Sephardic Hazzanut Project',
            description: 'Lecturas cantadas por Aliá (tradición sefardí). Descarga el MP3 y súbelo aquí.',
            basePage: 'http://www.sephardichazzanut.com/',
            books: {
                bereshit: 'Bereshit.htm',
                shemot: 'Shemot.htm',
                vayikra: 'Vayikra.htm',
                bamidbar: 'Bamidbar.htm',
                devarim: 'Debarim.htm'
            }
        },
        mechonMamre: {
            name: 'Mechon Mamre (Talking Bibles)',
            description: 'Hebreo claro por capítulos (pronunciación, no cantileo melódico). HTTPS.',
            indexUrl: 'https://www.mechon-mamre.org/p/pt/ptmp3prq.htm',
            // Chapter files: t{book}{chapter}.mp3 — Genesis=01 … Deuteronomy=05
            bookCodes: {
                Genesis: '01',
                Exodus: '02',
                Leviticus: '03',
                Numbers: '04',
                Deuteronomy: '05'
            }
        },
        tips: [
            'La mejor opción pedagógica: grabación del rabino / baal koreh de tu comunidad (misma melodía que oirás en la bimá).',
            'PocketTorah / tikkun.io y apps similares ofrecen leyning sincronizado; respeta sus términos si los usas.',
            'No redistribuyas grabaciones ajenas sin permiso del cantor o de la licencia del sitio.'
        ]
    },

    async openDb() {
        if (this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    const store = db.createObjectStore(this.STORE, { keyPath: 'id' });
                    store.createIndex('parashaAliyah', 'parashaAliyah', { unique: false });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return this._dbPromise;
    },

    makeId(parashaId, aliyah) {
        return `${parashaId}:${aliyah}`;
    },

    async get(parashaId, aliyah) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readonly');
            const req = tx.objectStore(this.STORE).get(this.makeId(parashaId, aliyah));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    },

    async saveBlob({ parashaId, aliyah, blob, fileName, label, sourceType }) {
        if (!blob || blob.size > this.MAX_BYTES) {
            throw new Error(`El archivo supera el límite de ${Math.round(this.MAX_BYTES / (1024 * 1024))} MB.`);
        }
        const record = {
            id: this.makeId(parashaId, aliyah),
            parashaId,
            aliyah,
            parashaAliyah: this.makeId(parashaId, aliyah),
            fileName: fileName || 'grabacion.mp3',
            label: label || fileName || 'Grabación local',
            sourceType: sourceType || 'upload',
            mimeType: blob.type || 'audio/mpeg',
            size: blob.size,
            blob,
            updatedAt: new Date().toISOString()
        };
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).put(record);
            tx.oncomplete = () => resolve(record);
            tx.onerror = () => reject(tx.error);
        });
    },

    async saveUrl({ parashaId, aliyah, url, label }) {
        const trimmed = (url || '').trim();
        if (!/^https:\/\//i.test(trimmed)) {
            throw new Error('Usa una URL HTTPS directa al audio (mp3, m4a, ogg, wav).');
        }
        const record = {
            id: this.makeId(parashaId, aliyah),
            parashaId,
            aliyah,
            parashaAliyah: this.makeId(parashaId, aliyah),
            fileName: trimmed.split('/').pop() || 'audio',
            label: label || 'Grabación remota',
            sourceType: 'url',
            mimeType: '',
            size: 0,
            url: trimmed,
            blob: null,
            updatedAt: new Date().toISOString()
        };
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).put(record);
            tx.oncomplete = () => resolve(record);
            tx.onerror = () => reject(tx.error);
        });
    },

    async remove(parashaId, aliyah) {
        this.stop();
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).delete(this.makeId(parashaId, aliyah));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    revokeObjectUrl() {
        if (this._objectUrl) {
            URL.revokeObjectURL(this._objectUrl);
            this._objectUrl = null;
        }
    },

    ensureAudioEl() {
        if (!this._audioEl) {
            this._audioEl = new Audio();
            this._audioEl.preload = 'metadata';
        }
        return this._audioEl;
    },

    async prepare(record) {
        const audio = this.ensureAudioEl();
        this.revokeObjectUrl();
        if (record.sourceType === 'url' && record.url) {
            audio.src = record.url;
        } else if (record.blob) {
            this._objectUrl = URL.createObjectURL(record.blob);
            audio.src = this._objectUrl;
        } else {
            throw new Error('La grabación no tiene archivo ni URL.');
        }
        await new Promise((resolve, reject) => {
            const onMeta = () => {
                cleanup();
                resolve();
            };
            const onErr = () => {
                cleanup();
                reject(new Error('No se pudo cargar el audio. Revisa el archivo o la URL.'));
            };
            const cleanup = () => {
                audio.removeEventListener('loadedmetadata', onMeta);
                audio.removeEventListener('error', onErr);
            };
            audio.addEventListener('loadedmetadata', onMeta);
            audio.addEventListener('error', onErr);
            audio.load();
        });
        return audio;
    },

    stop() {
        if (this._audioEl) {
            this._audioEl.pause();
            this._audioEl.currentTime = 0;
            this._audioEl.onended = null;
            this._audioEl.ontimeupdate = null;
        }
    },

    pause() {
        if (this._audioEl) this._audioEl.pause();
    },

    formatBytes(n) {
        if (!n) return '';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    },

    // Map Parasha ref like "Genesis.1.1-6.8" → Mechon Mamre chapter MP3 for first chapter
    mechonMamreChapterUrl(parashaRef) {
        if (!parashaRef) return null;
        const m = String(parashaRef).match(/^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy)\.(\d+)/);
        if (!m) return null;
        const bookCode = this.externalSources.mechonMamre.bookCodes[m[1]];
        const chapter = String(m[2]).padStart(2, '0');
        if (!bookCode) return null;
        return `https://www.mechon-mamre.org/mp3/t${bookCode}${chapter}.mp3`;
    },

    sephardicBookPage(bookKey) {
        const src = this.externalSources.sephardicHazzanut;
        const page = src.books[bookKey];
        return page ? src.basePage + page : src.basePage;
    },

    bookKeyForParasha(parashaId, catalog) {
        if (!catalog) return null;
        for (const [book, list] of Object.entries(catalog)) {
            if (list.some(p => p.id === parashaId)) return book;
        }
        return null;
    }
};

window.ChantedRecordings = ChantedRecordings;
