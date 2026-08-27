// Cantoral de Torá — Grabaciones de la comunidad
// Integra Netlify Identity (login de rabinos), el aporte de grabaciones (MediaRecorder),
// la reproducción de versiones (toma completa + parches por versículo) y la moderación.
(function () {
    'use strict';

    const Versions = window.RecordingVersions || {};

    const Recordings = {
        state: {
            identity: null,
            user: null,
            current: { parashaId: null, aliyah: null, verseCount: 0 },
            mediaRecorder: null,
            chunks: [],
            recordedBlob: null,
            recordStartedAt: 0,
            recordDurationMs: 0,
            realAudio: null,
            realTimer: null,
            approvedItems: [],
            realGeneration: 0,
            markMode: false,
            recRange: { start: 1, end: 1, anchor: null },
            playingClip: null,
            playingRunEnd: -1
        },

        api: {
            list: (p, a) => `/api/recordings?parasha=${encodeURIComponent(p)}&aliyah=${encodeURIComponent(a)}`,
            upload: '/api/recordings',
            audio: (id) => `/api/recordings/${id}/audio`,
            moderate: (id) => `/api/recordings/${id}/moderate`,
            queue: (status) => `/api/moderation/recordings?status=${encodeURIComponent(status)}`
        },

        init() {
            if (window.NetlifyIdentity) {
                this.onIdentityReady();
            } else {
                window.addEventListener('netlify-identity-ready', () => this.onIdentityReady(), { once: true });
            }

            const authBtn = document.getElementById('btnAuthToggle');
            if (authBtn) authBtn.addEventListener('click', () => this.toggleAuthPanel());

            document.addEventListener('cantoral:aliyah-rendered', (e) => {
                const d = e.detail || {};
                const verseCount = d.verseCount || 0;
                this.state.current = {
                    parashaId: d.parashaId || null,
                    aliyah: d.aliyah === 'maftir' ? 'M' : d.aliyah,
                    verseCount
                };
                this.state.recRange = { start: 1, end: Math.max(1, verseCount), anchor: null };
                this.state.markMode = false;
                this.refreshRecordingsPanel();
                this.applyRecordRangeHighlight();
            });
        },

        onIdentityReady() {
            this.state.identity = window.NetlifyIdentity;
            const id = this.state.identity;
            Promise.resolve()
                .then(() => (id.handleAuthCallback ? id.handleAuthCallback() : null))
                .catch(() => null)
                .then(() => (id.getUser ? id.getUser() : null))
                .then((user) => this.setUser(user))
                .catch(() => this.setUser(null));

            if (id.onAuthChange) {
                id.onAuthChange((_event, user) => this.setUser(user || null));
            }
        },

        setUser(user) {
            this.state.user = user || null;
            this.updateAuthButton();
            this.refreshRecordingsPanel();
            this.refreshModerationPanel();
        },

        roles() {
            const u = this.state.user;
            return u && Array.isArray(u.roles) ? u.roles : [];
        },
        canContribute() {
            const r = this.roles();
            return r.includes('rabbi') || r.includes('admin');
        },
        isAdmin() {
            return this.roles().includes('admin');
        },
        isRecording() {
            const mr = this.state.mediaRecorder;
            return !!(mr && mr.state === 'recording');
        },

        updateAuthButton() {
            const btn = document.getElementById('btnAuthToggle');
            if (!btn) return;
            const u = this.state.user;
            btn.textContent = u ? (u.name || u.email || 'Mi cuenta') : 'Ingresar';
        },

        // ---------- Panel de autenticación ----------
        toggleAuthPanel() {
            const panel = document.getElementById('authPanel');
            if (!panel) return;
            if (panel.classList.contains('hidden')) {
                this.renderAuthPanel();
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        },

        renderAuthPanel() {
            const panel = document.getElementById('authPanel');
            if (!panel) return;
            const u = this.state.user;

            if (!this.state.identity) {
                panel.innerHTML = this.card(`
                    <h3 class="section-title">Ingreso de rabinos</h3>
                    <p style="color:var(--color-text-secondary);font-size:14px;">
                        El sistema de cuentas requiere el entorno de Netlify (Netlify Identity).
                        En desarrollo local con <code>netlify dev</code> el login no está disponible;
                        se habilita al desplegar en Netlify.
                    </p>
                    <button class="btn-secondary" data-act="close">Cerrar</button>
                `);
            } else if (u) {
                const rolesTxt = this.roles().length ? this.roles().join(', ') : 'sin rol asignado';
                panel.innerHTML = this.card(`
                    <h3 class="section-title">Mi cuenta</h3>
                    <p style="font-size:14px;color:var(--color-text-secondary);">
                        <strong>${this.escape(u.name || u.email || '')}</strong><br>
                        Roles: ${this.escape(rolesTxt)}
                    </p>
                    ${this.canContribute() ? '' : '<p style="font-size:13px;color:var(--color-text-muted);">Para aportar grabaciones, un administrador debe asignarte el rol <strong>rabbi</strong>.</p>'}
                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button class="btn-primary" data-act="logout">Salir</button>
                        <button class="btn-secondary" data-act="close">Cerrar</button>
                    </div>
                `);
            } else {
                panel.innerHTML = this.card(`
                    <h3 class="section-title">Ingresar / Registrarse</h3>
                    <div id="authMsg" role="status" aria-live="polite" style="min-height:18px;font-size:13px;color:var(--accent-gold);margin-bottom:8px;"></div>
                    <label class="auth-label" for="authEmail">Correo</label>
                    <input class="input-control" type="email" id="authEmail" autocomplete="email" placeholder="rabino@comunidad.org" style="width:100%;margin-bottom:10px;">
                    <label class="auth-label" for="authPass">Contraseña</label>
                    <input class="input-control" type="password" id="authPass" autocomplete="current-password" placeholder="••••••••" style="width:100%;margin-bottom:14px;">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn-primary" data-act="login">Ingresar</button>
                        <button class="btn-secondary" data-act="signup">Registrarse</button>
                        <button class="btn-secondary ghost" data-act="close">Cerrar</button>
                    </div>
                `);
            }

            panel.querySelectorAll('[data-act]').forEach((el) => {
                el.addEventListener('click', (ev) => this.handleAuthAction(ev.currentTarget.getAttribute('data-act')));
            });
        },

        async handleAuthAction(act) {
            const id = this.state.identity;
            const msg = document.getElementById('authMsg');
            const setMsg = (t) => { if (msg) msg.textContent = t; };

            try {
                if (act === 'close') {
                    document.getElementById('authPanel').classList.add('hidden');
                } else if (act === 'logout' && id) {
                    await id.logout();
                    this.setUser(null);
                    document.getElementById('authPanel').classList.add('hidden');
                } else if (act === 'login' && id) {
                    const email = document.getElementById('authEmail').value.trim();
                    const pass = document.getElementById('authPass').value;
                    setMsg('Ingresando...');
                    const user = await id.login(email, pass);
                    this.setUser(user);
                    document.getElementById('authPanel').classList.add('hidden');
                } else if (act === 'signup' && id) {
                    const email = document.getElementById('authEmail').value.trim();
                    const pass = document.getElementById('authPass').value;
                    setMsg('Creando cuenta...');
                    const user = await id.signup(email, pass, {});
                    if (user && user.emailVerified) {
                        this.setUser(user);
                        document.getElementById('authPanel').classList.add('hidden');
                    } else {
                        setMsg('Cuenta creada. Revisa tu correo para confirmarla.');
                    }
                }
            } catch (err) {
                setMsg((err && err.message) ? err.message : 'No se pudo completar la acción.');
            }
        },

        // ---------- Panel de grabaciones de la comunidad ----------
        async refreshRecordingsPanel() {
            const section = document.getElementById('sectionRecordings');
            if (!section) return;
            const { parashaId, aliyah } = this.state.current;

            if (!parashaId || !aliyah) {
                section.classList.add('hidden');
                return;
            }
            section.classList.remove('hidden');

            let items = [];
            try {
                const res = await fetch(this.api.list(parashaId, aliyah));
                if (res.ok) {
                    const data = await res.json();
                    items = data.recordings || [];
                }
            } catch (e) { /* backend no disponible: degradar a lista vacía */ }

            this.state.approvedItems = items;
            this.syncPlayerSourceSelect(items);

            const groups = Versions.groupByUploader ? Versions.groupByUploader(items) : [];
            const verseCount = this.state.current.verseCount || 0;
            const listHtml = groups.length
                ? groups.map((g) => this.versionCard(g, verseCount)).join('')
                : '<p style="color:var(--color-text-muted);font-size:14px;">Aún no hay grabaciones de referencia para esta aliyá. Mientras tanto, usa el audio generado con melodía sincronizada.</p>';

            section.innerHTML = `
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    Grabaciones de referencia
                </h3>
                <p class="recordings-lead">Cada rabino deja una <strong>versión</strong> permanente. Si corrige un error, graba solo esos versículos: al escuchar, la app usa el parche más reciente en ese tramo.</p>
                <div class="recordings-list">${listHtml}</div>
                <div id="contributeArea" style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;"></div>
            `;

            section.querySelectorAll('[data-play-version]').forEach((btn) => {
                btn.addEventListener('click', () => this.useVersionInPlayer(btn.getAttribute('data-play-version')));
            });
            section.querySelectorAll('[data-play-rec]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-play-rec');
                    const vs = parseInt(btn.getAttribute('data-vs'), 10);
                    const ve = parseInt(btn.getAttribute('data-ve'), 10);
                    const ms = parseInt(btn.getAttribute('data-ms'), 10);
                    this.useRecordingInPlayer(id, isNaN(vs) ? null : vs, isNaN(ve) ? null : ve, isNaN(ms) ? null : ms);
                });
            });

            this.renderContributeArea();
            this.applyRecordRangeHighlight();
        },

        versionCard(group, verseCount) {
            const summary = Versions.coverageSummary
                ? Versions.coverageSummary(group.clips, verseCount)
                : { covered: 0, total: verseCount };
            const coverTxt = summary.total
                ? `${summary.covered} de ${summary.total} versículos`
                : `${group.clips.length} toma(s)`;
            const clips = (group.clips || []).map((r) => {
                const range = Versions.formatRangeLabel
                    ? Versions.formatRangeLabel(r, verseCount)
                    : ((r.verseStart && r.verseEnd) ? `Versículos ${r.verseStart}–${r.verseEnd}` : 'Aliá completa');
                const isPatch = r.verseStart != null && r.verseEnd != null &&
                    !(r.verseStart === 1 && r.verseEnd === verseCount);
                return `
                    <div class="recording-clip-row">
                        <span>${this.escape(range)}${isPatch ? ' · corrección' : ''}</span>
                        <button class="btn-secondary" data-play-rec="${r.id}" data-vs="${r.verseStart || ''}" data-ve="${r.verseEnd || ''}" data-ms="${r.durationMs || ''}" style="padding:6px 12px;">Solo este tramo</button>
                    </div>`;
            }).join('');
            return `
                <div class="recording-version-card">
                    <div class="recording-version-head">
                        <div>
                            <div class="recording-version-name">${this.escape(group.uploaderName || 'Rabino')}</div>
                            <div class="recording-version-meta">${this.escape(coverTxt)} · referencia pública</div>
                        </div>
                        <button class="btn-primary" data-play-version="${this.escape(group.key)}" style="padding:8px 16px;">▶ Escuchar versión</button>
                    </div>
                    ${clips}
                </div>`;
        },

        renderContributeArea() {
            const area = document.getElementById('contributeArea');
            if (!area) return;

            if (!this.state.user) {
                area.innerHTML = `<p style="font-size:13px;color:var(--color-text-muted);">¿Eres rabino/a o lector capacitado? <button class="btn-secondary" id="contributeLogin" style="padding:6px 12px;">Ingresa</button> para dejar una versión de referencia.</p>`;
                const b = document.getElementById('contributeLogin');
                if (b) b.addEventListener('click', () => this.toggleAuthPanel());
                return;
            }
            if (!this.canContribute()) {
                area.innerHTML = `<p style="font-size:13px;color:var(--color-text-muted);">Tu cuenta aún no tiene el rol <strong>rabbi</strong>. Un administrador debe habilitarte para aportar grabaciones.</p>`;
                return;
            }

            const total = this.state.current.verseCount || 0;
            const range = this.normalizedRange();
            const markOn = this.state.markMode ? ' practice-btn-on' : '';
            area.innerHTML = `
                <h4 style="margin:0 0 8px;font-family:var(--font-ui);color:var(--accent-gold);">Grabar o corregir un tramo</h4>
                <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 12px;line-height:1.45;">
                    No hace falta repetir la Aliá entera. Marca los versículos (o graba solo el actual).
                    Si te equivocas al leer, regraba esa fracción: reemplaza ese tramo en <em>tu</em> versión.
                </p>
                <div class="rec-range-toolbar">
                    <div>
                        <label class="auth-label" for="recVerseStart">Desde</label>
                        <input class="input-control" type="number" id="recVerseStart" min="1" max="${total || 1}" value="${range.start}" style="width:90px;">
                    </div>
                    <div>
                        <label class="auth-label" for="recVerseEnd">Hasta</label>
                        <input class="input-control" type="number" id="recVerseEnd" min="1" max="${total || 1}" value="${range.end}" style="width:90px;">
                    </div>
                    <button class="btn-secondary${markOn}" id="recMarkModeBtn" type="button" aria-pressed="${this.state.markMode ? 'true' : 'false'}" style="padding:10px 14px;">Marcar en el texto</button>
                    <button class="btn-secondary" id="recThisVerseBtn" type="button" style="padding:10px 14px;">Este versículo</button>
                    <button class="btn-secondary" id="recFullAliyahBtn" type="button" style="padding:10px 14px;">Aliá completa</button>
                </div>
                <p id="recRangeHint" class="rec-range-hint">${this.rangeHintText(range, total)}</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px;">
                    <button class="btn-primary" id="recToggleBtn" style="padding:10px 18px;">● Grabar tramo</button>
                    <label class="btn-secondary rec-file-label" for="recFileInput">Subir archivo</label>
                    <input class="hidden" type="file" id="recFileInput" accept="audio/*">
                </div>
                <div id="recStatus" role="status" aria-live="polite" style="min-height:18px;font-size:13px;color:var(--color-text-secondary);margin-top:8px;"></div>
                <audio id="recPreview" controls class="hidden" style="width:100%;margin-top:8px;"></audio>
                <div id="recUploadWrap" class="hidden" style="margin-top:8px;">
                    <button class="btn-primary" id="recUploadBtn" style="padding:8px 16px;">Publicar como referencia</button>
                </div>
            `;

            document.getElementById('recToggleBtn').addEventListener('click', () => this.toggleRecording());
            const up = document.getElementById('recUploadBtn');
            if (up) up.addEventListener('click', () => this.uploadRecording());
            document.getElementById('recMarkModeBtn').addEventListener('click', () => this.toggleMarkMode());
            document.getElementById('recThisVerseBtn').addEventListener('click', () => this.markCurrentVerseRange());
            document.getElementById('recFullAliyahBtn').addEventListener('click', () => this.markFullAliyah());
            document.getElementById('recVerseStart').addEventListener('change', () => this.readRangeInputs());
            document.getElementById('recVerseEnd').addEventListener('change', () => this.readRangeInputs());
            const file = document.getElementById('recFileInput');
            if (file) file.addEventListener('change', (ev) => this.handlePickedFile(ev));
        },

        normalizedRange() {
            const total = this.state.current.verseCount || 1;
            let start = parseInt(this.state.recRange.start, 10);
            let end = parseInt(this.state.recRange.end, 10);
            if (isNaN(start) || start < 1) start = 1;
            if (isNaN(end) || end < 1) end = total;
            start = Math.min(start, total);
            end = Math.min(end, total);
            if (end < start) { const t = start; start = end; end = t; }
            return { start, end };
        },

        rangeHintText(range, total) {
            if (!total) return 'Carga una Aliá para elegir versículos.';
            if (range.start === 1 && range.end === total) {
                return `Vas a grabar la Aliá completa (versículos 1–${total}).`;
            }
            if (range.start === range.end) {
                return `Vas a grabar solo el versículo ${range.start}. Eso corrige ese versículo en tu versión.`;
            }
            return `Vas a grabar los versículos ${range.start}–${range.end}. Ese tramo reemplaza el anterior en tu versión.`;
        },

        syncRangeInputs() {
            const range = this.normalizedRange();
            this.state.recRange.start = range.start;
            this.state.recRange.end = range.end;
            const vs = document.getElementById('recVerseStart');
            const ve = document.getElementById('recVerseEnd');
            if (vs) vs.value = String(range.start);
            if (ve) ve.value = String(range.end);
            const hint = document.getElementById('recRangeHint');
            if (hint) hint.textContent = this.rangeHintText(range, this.state.current.verseCount || 0);
            this.applyRecordRangeHighlight();
        },

        readRangeInputs() {
            const vs = document.getElementById('recVerseStart');
            const ve = document.getElementById('recVerseEnd');
            this.state.recRange.anchor = null;
            this.state.recRange.start = vs ? parseInt(vs.value, 10) : this.state.recRange.start;
            this.state.recRange.end = ve ? parseInt(ve.value, 10) : this.state.recRange.end;
            this.syncRangeInputs();
        },

        toggleMarkMode() {
            this.state.markMode = !this.state.markMode;
            this.state.recRange.anchor = null;
            const btn = document.getElementById('recMarkModeBtn');
            if (btn) {
                btn.classList.toggle('practice-btn-on', this.state.markMode);
                btn.setAttribute('aria-pressed', this.state.markMode ? 'true' : 'false');
            }
            document.body.classList.toggle('marking-record-range', this.state.markMode && this.canContribute());
            const status = document.getElementById('recStatus');
            if (status) {
                status.textContent = this.state.markMode
                    ? 'Clic en un versículo para el inicio, otro clic para el final.'
                    : '';
            }
            this.applyRecordRangeHighlight();
        },

        markCurrentVerseRange() {
            const idx = (window.App && typeof App.state.activeVerseIndex === 'number')
                ? App.state.activeVerseIndex
                : ((window.App && typeof App.state.playIndex === 'number') ? App.state.playIndex : 0);
            const n = Math.max(1, idx + 1);
            this.state.recRange = { start: n, end: n, anchor: null };
            this.syncRangeInputs();
        },

        markFullAliyah() {
            const total = this.state.current.verseCount || 1;
            this.state.recRange = { start: 1, end: total, anchor: null };
            this.syncRangeInputs();
        },

        // Llamado desde app.js al hacer clic en un versículo. true = no reproducir.
        handleVerseMarkClick(verseIndex) {
            if (!this.canContribute() || !this.state.markMode) return false;
            if (this.isRecording()) return true;
            const n = verseIndex + 1;
            const r = this.state.recRange;
            if (r.anchor == null) {
                this.state.recRange = { start: n, end: n, anchor: n };
            } else {
                const a = r.anchor;
                this.state.recRange = {
                    start: Math.min(a, n),
                    end: Math.max(a, n),
                    anchor: null
                };
                this.state.markMode = false;
                document.body.classList.remove('marking-record-range');
                const btn = document.getElementById('recMarkModeBtn');
                if (btn) {
                    btn.classList.remove('practice-btn-on');
                    btn.setAttribute('aria-pressed', 'false');
                }
            }
            this.syncRangeInputs();
            const status = document.getElementById('recStatus');
            if (status) {
                const range = this.normalizedRange();
                status.textContent = this.state.recRange.anchor
                    ? `Inicio: versículo ${range.start}. Clic en el versículo final.`
                    : `Tramo marcado: ${this.rangeHintText(range, this.state.current.verseCount || 0)}`;
            }
            return true;
        },

        applyRecordRangeHighlight() {
            const canShow = this.canContribute() && this.state.current.verseCount;
            document.body.classList.toggle('marking-record-range', !!(this.state.markMode && canShow));
            const range = canShow ? this.normalizedRange() : null;
            const recording = this.isRecording();
            document.querySelectorAll('.verse-row').forEach((row) => {
                const idx = parseInt(row.dataset.verseIndex, 10);
                const n = idx + 1;
                const inRange = !!(range && n >= range.start && n <= range.end);
                row.classList.toggle('verse-in-record-range', inRange && (this.state.markMode || recording));
                row.classList.toggle('verse-recording-now', inRange && recording);
            });
        },

        handlePickedFile(ev) {
            const file = ev.target && ev.target.files && ev.target.files[0];
            if (!file) return;
            this.state.recordedBlob = file;
            this.state.recordDurationMs = 0;
            const preview = document.getElementById('recPreview');
            if (preview) {
                preview.src = URL.createObjectURL(file);
                preview.classList.remove('hidden');
            }
            const wrap = document.getElementById('recUploadWrap');
            if (wrap) wrap.classList.remove('hidden');
            const status = document.getElementById('recStatus');
            if (status) status.textContent = `Archivo listo (${file.name}). Revisa el tramo y publícalo.`;
        },

        // ---------- MediaRecorder ----------
        async toggleRecording() {
            const btn = document.getElementById('recToggleBtn');
            const status = document.getElementById('recStatus');
            const mr = this.state.mediaRecorder;

            if (mr && mr.state === 'recording') {
                mr.stop();
                return;
            }

            if (!navigator.mediaDevices || !window.MediaRecorder) {
                if (status) status.textContent = 'Tu navegador no permite grabar audio.';
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                this.state.mediaRecorder = recorder;
                this.state.chunks = [];
                this.state.recordStartedAt = Date.now();
                this.applyRecordRangeHighlight();

                recorder.ondataavailable = (e) => { if (e.data.size > 0) this.state.chunks.push(e.data); };
                recorder.onstop = () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(this.state.chunks, { type: 'audio/webm' });
                    this.state.recordedBlob = blob;
                    this.state.recordDurationMs = Date.now() - this.state.recordStartedAt;
                    this.state.mediaRecorder = null;
                    const preview = document.getElementById('recPreview');
                    if (preview) {
                        preview.src = URL.createObjectURL(blob);
                        preview.classList.remove('hidden');
                    }
                    const wrap = document.getElementById('recUploadWrap');
                    if (wrap) wrap.classList.remove('hidden');
                    if (btn) { btn.textContent = '● Grabar tramo'; btn.classList.remove('recording'); }
                    const range = this.normalizedRange();
                    if (status) status.textContent = `Listo: ${this.rangeHintText(range, this.state.current.verseCount || 0)} Escúchala y publícala.`;
                    this.applyRecordRangeHighlight();
                };

                recorder.start();
                const range = this.normalizedRange();
                if (btn) { btn.textContent = '■ Detener'; btn.classList.add('recording'); }
                if (status) status.textContent = `Grabando ${this.rangeHintText(range, this.state.current.verseCount || 0)}`;
            } catch (err) {
                if (status) status.textContent = 'No se pudo acceder al micrófono.';
            }
        },

        async authHeaders() {
            const headers = {};
            try {
                const match = document.cookie.match(/(?:^|; )nf_jwt=([^;]*)/);
                if (match) headers.Authorization = 'Bearer ' + decodeURIComponent(match[1]);
            } catch (e) { /* ignore */ }
            return headers;
        },

        async uploadRecording() {
            const status = document.getElementById('recStatus');
            const blob = this.state.recordedBlob;
            if (!blob) return;

            const { parashaId, aliyah } = this.state.current;
            const range = this.normalizedRange();

            const form = new FormData();
            const file = blob instanceof File
                ? blob
                : new File([blob], 'grabacion.webm', { type: blob.type || 'audio/webm' });
            form.append('audio', file);
            form.append('parasha', parashaId);
            form.append('aliyah', aliyah);
            form.append('verseStart', String(range.start));
            form.append('verseEnd', String(range.end));
            if (this.state.recordDurationMs) form.append('durationMs', String(this.state.recordDurationMs));
            form.append('tradition', 'ashkenazi');

            if (status) status.textContent = 'Publicando referencia...';
            try {
                const res = await fetch(this.api.upload, {
                    method: 'POST',
                    body: form,
                    credentials: 'include',
                    headers: await this.authHeaders()
                });
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    const published = data.recording && data.recording.status === 'approved';
                    if (status) {
                        status.textContent = published
                            ? 'Publicada. Ya es referencia para quien estudie esta Aliá. Un parche nuevo en el mismo tramo sustituye al anterior.'
                            : 'Enviada. Quedó pendiente de aprobación.';
                    }
                    this.state.recordedBlob = null;
                    const wrap = document.getElementById('recUploadWrap');
                    if (wrap) wrap.classList.add('hidden');
                    this.refreshRecordingsPanel();
                } else {
                    const err = await res.json().catch(() => ({}));
                    if (status) status.textContent = err.error || `No se pudo enviar (HTTP ${res.status}).`;
                }
            } catch (e) {
                if (status) status.textContent = 'Error de red al enviar la grabación.';
            }
        },

        // ---------- Reproducción de versión / tramo ----------
        sourceSelectValue() {
            if (window.App && App.state.audioSourceValue) return App.state.audioSourceValue;
            const sel = document.getElementById('playerSourceSelect');
            return sel ? sel.value : 'synth';
        },

        clipsForSelection() {
            const items = this.state.approvedItems || [];
            const val = this.sourceSelectValue();
            if (!val || val === 'synth') return [];
            if (val.startsWith('version:')) {
                const key = val.slice(8);
                return items.filter((r) => Versions.versionKey(r) === key);
            }
            if (val.startsWith('real:')) {
                const id = val.slice(5);
                return items.filter((r) => String(r.id) === String(id));
            }
            return items;
        },

        syncPlayerSourceSelect(items) {
            const sel = document.getElementById('playerSourceSelect');
            if (!sel) return;
            const prev = sel.value;
            const groups = Versions.groupByUploader ? Versions.groupByUploader(items) : [];
            const options = ['<option value="synth" style="background: #060913; color: #fff;">Sintetizado</option>'];
            groups.forEach((g) => {
                const label = `${g.uploaderName || 'Rabino'} (versión)`;
                options.push(`<option value="version:${this.escape(g.key)}" style="background: #060913; color: #fff;">${this.escape(label)}</option>`);
            });
            sel.innerHTML = options.join('');
            const stillThere = Array.from(sel.options).some((o) => o.value === prev);
            const next = stillThere ? prev : 'synth';
            sel.value = next;
            if (window.App) {
                if (!stillThere && App.setAudioSource) App.setAudioSource('synth');
                else {
                    App.state.audioSourceValue = next;
                    App.state.audioSource = next === 'synth' ? 'synth' : 'real';
                }
            }
        },

        setSelectValue(value) {
            const sel = document.getElementById('playerSourceSelect');
            if (sel) {
                if (![...sel.options].some((o) => o.value === value)) {
                    const opt = document.createElement('option');
                    opt.value = value;
                    opt.textContent = value.startsWith('version:') ? 'Versión' : 'Voz real';
                    opt.style.background = '#060913';
                    opt.style.color = '#fff';
                    sel.appendChild(opt);
                }
                sel.value = value;
            }
            if (window.App && App.setAudioSource) App.setAudioSource(value);
        },

        useVersionInPlayer(versionKey) {
            const value = `version:${versionKey}`;
            this.setSelectValue(value);
            const clips = (this.state.approvedItems || []).filter((r) => Versions.versionKey(r) === versionKey);
            const count = this.state.current.verseCount || 0;
            const startIdx = Versions.nextCoveredVerse ? Versions.nextCoveredVerse(clips, 0, count) : 0;
            if (window.App) {
                App.revealPlayerDock();
                App.playFromVerse(Math.max(0, startIdx));
            }
        },

        useRecordingInPlayer(id, verseStart, verseEnd, durationMs) {
            const value = `real:${id}`;
            if (!(this.state.approvedItems || []).some((r) => String(r.id) === String(id))) {
                this.state.approvedItems = this.state.approvedItems || [];
                this.state.approvedItems.push({ id, verseStart, verseEnd, durationMs });
            }
            this.setSelectValue(value);
            if (window.App) {
                App.revealPlayerDock();
                const startIdx = verseStart ? verseStart - 1 : 0;
                App.playFromVerse(startIdx);
            } else {
                this.playRealRecording(id, verseStart, verseEnd, durationMs);
            }
        },

        playForVerse(verseIndex) {
            const clips = this.clipsForSelection();
            const count = this.state.current.verseCount || 0;
            let idx = verseIndex;
            let rec = Versions.pickClipForVerse ? Versions.pickClipForVerse(clips, idx, count) : (clips[0] || null);
            if (!rec && Versions.nextCoveredVerse) {
                const next = Versions.nextCoveredVerse(clips, idx, count);
                if (next >= 0) {
                    idx = next;
                    rec = Versions.pickClipForVerse(clips, idx, count);
                    if (window.App) App.state.playIndex = idx;
                }
            }
            if (!rec) {
                if (window.App) {
                    App.state.audioSource = 'synth';
                    App.state.audioSourceValue = 'synth';
                    const sel = document.getElementById('playerSourceSelect');
                    if (sel) sel.value = 'synth';
                    const modeSelect = document.getElementById('playerAudioModeSelect');
                    if (modeSelect) modeSelect.disabled = false;
                    App.chantNextTropeGroup();
                }
                return;
            }
            this.state.playingClip = rec;
            const runEnd = Versions.sameClipRunEnd ? Versions.sameClipRunEnd(clips, idx, count) : idx;
            this.state.playingRunEnd = runEnd;
            this.playRealRecording(rec.id, rec.verseStart, rec.verseEnd, rec.durationMs, idx, {
                fromApp: true,
                runEnd
            });
        },

        // Tras terminar un clip o un tramo: siguiente bloque de la misma versión.
        advanceAfterClip() {
            const count = this.state.current.verseCount || 0;
            const clips = this.clipsForSelection();
            if (!clips.length) return false;
            const from = (this.state.playingRunEnd >= 0 ? this.state.playingRunEnd : (window.App ? App.state.playIndex : 0)) + 1;
            const next = Versions.nextCoveredVerse
                ? Versions.nextCoveredVerse(clips, from, count)
                : -1;
            if (next < 0) return false;
            if (window.App) App.state.playIndex = next;
            this.playForVerse(next);
            return true;
        },

        setPlaybackRate(rate) {
            if (this.state.realAudio) {
                try { this.state.realAudio.playbackRate = rate || 1; } catch (e) { /* ignore */ }
            }
        },

        playRealRecording(id, verseStart, verseEnd, durationMs, startVerseIndex, opts) {
            const fromApp = opts && opts.fromApp;
            this.stopRealRecording();
            if (!fromApp && window.App && window.App.stopAudio) window.App.stopAudio();

            const gen = (this.state.realGeneration || 0) + 1;
            this.state.realGeneration = gen;

            const audio = new Audio(this.api.audio(id));
            audio.preload = 'auto';
            if (window.App && App.state.playbackSpeed) {
                audio.playbackRate = App.state.playbackSpeed;
            }
            this.state.realAudio = audio;

            const total = this.state.current.verseCount || 0;
            const startIdx = verseStart ? (verseStart - 1) : 0;
            const endIdx = verseEnd ? (verseEnd - 1) : (total > 0 ? total - 1 : 0);
            const span = Math.max(1, (endIdx - startIdx) + 1);
            const targetIdx = Math.min(Math.max(startVerseIndex == null ? startIdx : startVerseIndex, startIdx), endIdx);

            const runEnd = (opts && typeof opts.runEnd === 'number') ? opts.runEnd : endIdx;
            const knownTotalSec = durationMs ? (durationMs / 1000) : 0;
            let lastIdx = -1;
            let didSeek = false;
            let handedOff = false;

            const totalSeconds = () => knownTotalSec || (isFinite(audio.duration) ? audio.duration : 0);

            const seekToVerse = (vIdx) => {
                const totalSec = totalSeconds();
                if (!totalSec) return;
                audio.currentTime = ((vIdx - startIdx) / span) * totalSec;
            };

            const handOff = () => {
                if (handedOff || this.state.realGeneration !== gen) return;
                handedOff = true;
                if (window.App && App.onRealAudioEnded) App.onRealAudioEnded();
                else this.stopRealRecording();
            };

            const tick = () => {
                if (this.state.realGeneration !== gen) return;
                const totalSec = totalSeconds();
                if (!totalSec) return;
                const elapsedMs = audio.currentTime * 1000;
                const totalMs = totalSec * 1000;
                let idx = startIdx + Math.floor(Math.min(0.999, audio.currentTime / totalSec) * span);

                if (window.App && App.state.loopVerse) {
                    const stay = App.state.playIndex;
                    if (idx !== stay) {
                        const offset = ((stay - startIdx) / span) * totalSec;
                        if (audio.currentTime - offset > 0.2) audio.currentTime = offset;
                        idx = stay;
                    }
                } else if (idx > runEnd) {
                    handOff();
                    return;
                }

                if (window.App && App.onRealPlaybackTick) {
                    App.onRealPlaybackTick({ verseIndex: idx, elapsedMs, totalMs });
                }
                if (idx === lastIdx) return;
                lastIdx = idx;
                this.highlightVerseRow(idx);
            };

            audio.addEventListener('loadedmetadata', () => {
                if (this.state.realGeneration !== gen) return;
                if (!didSeek) {
                    seekToVerse(targetIdx);
                    didSeek = true;
                }
            });
            audio.addEventListener('timeupdate', tick);
            audio.addEventListener('play', () => {
                if (this.state.realGeneration !== gen) return;
                this.highlightVerseRow(targetIdx);
                if (window.App) {
                    App.state.isPlaying = true;
                    App.updatePlayerButtons(true);
                }
            });
            audio.addEventListener('ended', () => {
                if (this.state.realGeneration !== gen) return;
                handOff();
            });
            audio.addEventListener('error', () => {
                if (this.state.realGeneration !== gen) return;
                this.stopRealRecording();
                const status = document.getElementById('recStatus');
                if (status) status.textContent = 'No se pudo reproducir la grabación.';
            });

            const start = () => {
                if (this.state.realGeneration !== gen) return;
                if (!didSeek) {
                    seekToVerse(targetIdx);
                    didSeek = true;
                }
                audio.play().catch(() => { /* autoplay bloqueado hasta gesto */ });
            };
            if (audio.readyState >= 1) start();
            else audio.addEventListener('canplay', start, { once: true });
        },

        stopRealRecording() {
            this.state.realGeneration = (this.state.realGeneration || 0) + 1;
            const audio = this.state.realAudio;
            if (audio) {
                try { audio.pause(); } catch (e) { /* ignore */ }
                this.state.realAudio = null;
            }
            this.clearVerseHighlight();
        },

        highlightVerseRow(idx) {
            this.clearVerseHighlight();
            const row = document.getElementById(`verse-row-${idx}`);
            if (row) {
                row.classList.add('playing');
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        },
        clearVerseHighlight() {
            document.querySelectorAll('.verse-row.playing').forEach((r) => r.classList.remove('playing'));
        },

        // ---------- Moderación (admin) ----------
        async refreshModerationPanel() {
            const section = document.getElementById('sectionModeration');
            if (!section) return;
            if (!this.isAdmin()) {
                section.classList.add('hidden');
                return;
            }

            const load = async (status) => {
                try {
                    const res = await fetch(this.api.queue(status), {
                        credentials: 'include',
                        headers: await this.authHeaders()
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return data.recordings || [];
                    }
                } catch (e) { /* degradar */ }
                return [];
            };

            const pending = await load('pending');
            const approved = await load('approved');

            section.classList.remove('hidden');
            const rowHtml = (r, actions) => `
                <div class="recording-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);margin-bottom:8px;">
                    <div>
                        <div style="font-weight:600;">${this.escape(r.uploaderName || 'Rabino')} · ${this.escape(r.parashaId)}/${this.escape(r.aliyah)}</div>
                        <div style="font-size:12px;color:var(--color-text-muted);">${(r.verseStart && r.verseEnd) ? `Versículos ${r.verseStart}–${r.verseEnd}` : 'Aliá completa'}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <audio controls src="${this.api.audio(r.id)}" style="height:34px;"></audio>
                        ${actions}
                    </div>
                </div>`;

            const pendingRows = pending.length
                ? pending.map((r) => rowHtml(r, `
                    <button class="btn-primary" data-mod="approved" data-id="${r.id}" style="padding:6px 12px;">Aprobar</button>
                    <button class="btn-secondary" data-mod="rejected" data-id="${r.id}" style="padding:6px 12px;">Rechazar</button>
                `)).join('')
                : '<p style="color:var(--color-text-muted);font-size:14px;">No hay grabaciones pendientes. Las tomas de rabino se publican al instante.</p>';

            const approvedRows = approved.length
                ? approved.slice(0, 20).map((r) => rowHtml(r, `
                    <button class="btn-secondary" data-mod="rejected" data-id="${r.id}" style="padding:6px 12px;">Retirar</button>
                `)).join('')
                : '<p style="color:var(--color-text-muted);font-size:14px;">No hay referencias publicadas.</p>';

            section.innerHTML = `
                <h3 class="section-title">Moderación de grabaciones (admin)</h3>
                <h4 style="margin:8px 0;color:var(--color-text-secondary);font-size:14px;">Pendientes</h4>
                <div>${pendingRows}</div>
                <h4 style="margin:16px 0 8px;color:var(--color-text-secondary);font-size:14px;">Publicadas (se pueden retirar)</h4>
                <div>${approvedRows}</div>
            `;

            section.querySelectorAll('[data-mod]').forEach((btn) => {
                btn.addEventListener('click', () => this.moderate(btn.getAttribute('data-id'), btn.getAttribute('data-mod')));
            });
        },

        async moderate(id, status) {
            try {
                const res = await fetch(this.api.moderate(id), {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'content-type': 'application/json', ...(await this.authHeaders()) },
                    body: JSON.stringify({ status })
                });
                if (res.ok) {
                    this.refreshModerationPanel();
                    this.refreshRecordingsPanel();
                }
            } catch (e) { /* ignore */ }
        },

        // ---------- utilidades ----------
        card(inner) {
            return `<div class="glass-panel auth-card" style="max-width:420px;">${inner}</div>`;
        },
        escape(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Recordings.init());
    } else {
        Recordings.init();
    }
    window.CantoralRecordings = Recordings;
})();
