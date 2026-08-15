// Cantoral de Torá — Grabaciones de la comunidad
// Integra Netlify Identity (login de rabinos), el aporte de grabaciones (MediaRecorder),
// la reproducción de grabaciones reales sincronizada por versículo y la moderación (admin).
// El frontend sigue en JS vanilla; el SDK de Identity llega vía window.NetlifyIdentity.
(function () {
    'use strict';

    const Recordings = {
        state: {
            identity: null,
            user: null,
            current: { parashaId: null, aliyah: null, verseCount: 0 },
            mediaRecorder: null,
            chunks: [],
            recordedBlob: null,
            recordStartedAt: 0,
            realAudio: null,
            realTimer: null
        },

        api: {
            list: (p, a) => `/api/recordings?parasha=${encodeURIComponent(p)}&aliyah=${encodeURIComponent(a)}`,
            upload: '/api/recordings',
            audio: (id) => `/api/recordings/${id}/audio`,
            moderate: (id) => `/api/recordings/${id}/moderate`,
            queue: (status) => `/api/moderation/recordings?status=${encodeURIComponent(status)}`
        },

        init() {
            // El SDK puede cargar de forma asíncrona (módulo). Esperamos su señal.
            if (window.NetlifyIdentity) {
                this.onIdentityReady();
            } else {
                window.addEventListener('netlify-identity-ready', () => this.onIdentityReady(), { once: true });
            }

            const authBtn = document.getElementById('btnAuthToggle');
            if (authBtn) authBtn.addEventListener('click', () => this.toggleAuthPanel());

            // Reaccionar cuando app.js termina de renderizar una aliyá.
            document.addEventListener('cantoral:aliyah-rendered', (e) => {
                const d = e.detail || {};
                this.state.current = {
                    parashaId: d.parashaId || null,
                    // La app usa 'maftir'; la base de datos usa 'M'.
                    aliyah: d.aliyah === 'maftir' ? 'M' : d.aliyah,
                    verseCount: d.verseCount || 0
                };
                this.refreshRecordingsPanel();
            });
        },

        onIdentityReady() {
            this.state.identity = window.NetlifyIdentity;
            const id = this.state.identity;
            // Procesa callbacks de OAuth / confirmación / invitación al cargar.
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

            const listHtml = items.length
                ? items.map((r) => this.recordingRow(r)).join('')
                : '<p style="color:var(--color-text-muted);font-size:14px;">Aún no hay grabaciones aprobadas para esta aliyá. Mientras tanto, usa el audio generado con melodía sincronizada.</p>';

            section.innerHTML = `
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    Grabaciones de la comunidad
                </h3>
                <div class="recordings-list">${listHtml}</div>
                <div id="contributeArea" style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;"></div>
            `;

            section.querySelectorAll('[data-play-rec]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-play-rec');
                    const vs = parseInt(btn.getAttribute('data-vs'), 10);
                    const ve = parseInt(btn.getAttribute('data-ve'), 10);
                    this.playRealRecording(id, isNaN(vs) ? null : vs, isNaN(ve) ? null : ve);
                });
            });

            this.renderContributeArea();
        },

        recordingRow(r) {
            const range = (r.verseStart && r.verseEnd)
                ? `Versículos ${r.verseStart}–${r.verseEnd}`
                : 'Aliyá completa';
            return `
                <div class="recording-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);margin-bottom:8px;">
                    <div>
                        <div style="font-weight:600;">${this.escape(r.uploaderName || 'Rabino')}</div>
                        <div style="font-size:12px;color:var(--color-text-muted);">${range} · ${this.escape(r.tradition || 'ashkenazi')}</div>
                    </div>
                    <button class="btn-primary" data-play-rec="${r.id}" data-vs="${r.verseStart || ''}" data-ve="${r.verseEnd || ''}" style="padding:8px 16px;">▶ Voz real</button>
                </div>
            `;
        },

        renderContributeArea() {
            const area = document.getElementById('contributeArea');
            if (!area) return;

            if (!this.state.user) {
                area.innerHTML = `<p style="font-size:13px;color:var(--color-text-muted);">¿Eres rabino/a o lector capacitado? <button class="btn-secondary" id="contributeLogin" style="padding:6px 12px;">Ingresa</button> para aportar tu grabación.</p>`;
                const b = document.getElementById('contributeLogin');
                if (b) b.addEventListener('click', () => this.toggleAuthPanel());
                return;
            }
            if (!this.canContribute()) {
                area.innerHTML = `<p style="font-size:13px;color:var(--color-text-muted);">Tu cuenta aún no tiene el rol <strong>rabbi</strong>. Un administrador debe habilitarte para aportar grabaciones.</p>`;
                return;
            }

            const total = this.state.current.verseCount || 0;
            area.innerHTML = `
                <h4 style="margin:0 0 10px;font-family:var(--font-ui);color:var(--accent-gold);">Aportar mi grabación</h4>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
                    <div>
                        <label class="auth-label" for="recVerseStart">Desde versículo</label>
                        <input class="input-control" type="number" id="recVerseStart" min="1" max="${total || 1}" value="1" style="width:110px;">
                    </div>
                    <div>
                        <label class="auth-label" for="recVerseEnd">Hasta versículo</label>
                        <input class="input-control" type="number" id="recVerseEnd" min="1" max="${total || 1}" value="${total || 1}" style="width:110px;">
                    </div>
                    <button class="btn-primary" id="recToggleBtn" style="padding:10px 18px;">● Grabar</button>
                </div>
                <div id="recStatus" role="status" aria-live="polite" style="min-height:18px;font-size:13px;color:var(--color-text-secondary);margin-top:8px;"></div>
                <audio id="recPreview" controls class="hidden" style="width:100%;margin-top:8px;"></audio>
                <div id="recUploadWrap" class="hidden" style="margin-top:8px;">
                    <button class="btn-primary" id="recUploadBtn" style="padding:8px 16px;">Enviar grabación</button>
                </div>
            `;

            document.getElementById('recToggleBtn').addEventListener('click', () => this.toggleRecording());
            const up = document.getElementById('recUploadBtn');
            if (up) up.addEventListener('click', () => this.uploadRecording());
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

                recorder.ondataavailable = (e) => { if (e.data.size > 0) this.state.chunks.push(e.data); };
                recorder.onstop = () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(this.state.chunks, { type: 'audio/webm' });
                    this.state.recordedBlob = blob;
                    this.state.recordDurationMs = Date.now() - this.state.recordStartedAt;
                    const preview = document.getElementById('recPreview');
                    if (preview) {
                        preview.src = URL.createObjectURL(blob);
                        preview.classList.remove('hidden');
                    }
                    document.getElementById('recUploadWrap').classList.remove('hidden');
                    if (btn) { btn.textContent = '● Grabar'; btn.classList.remove('recording'); }
                    if (status) status.textContent = 'Grabación lista. Escúchala y envíala.';
                };

                recorder.start();
                if (btn) { btn.textContent = '■ Detener'; btn.classList.add('recording'); }
                if (status) status.textContent = 'Grabando... canta la porción con calma.';
            } catch (err) {
                if (status) status.textContent = 'No se pudo acceder al micrófono.';
            }
        },

        async uploadRecording() {
            const status = document.getElementById('recStatus');
            const blob = this.state.recordedBlob;
            if (!blob) return;

            const { parashaId, aliyah } = this.state.current;
            const vs = document.getElementById('recVerseStart');
            const ve = document.getElementById('recVerseEnd');

            const form = new FormData();
            form.append('audio', new File([blob], 'grabacion.webm', { type: 'audio/webm' }));
            form.append('parasha', parashaId);
            form.append('aliyah', aliyah);
            if (vs && vs.value) form.append('verseStart', vs.value);
            if (ve && ve.value) form.append('verseEnd', ve.value);
            if (this.state.recordDurationMs) form.append('durationMs', String(this.state.recordDurationMs));
            form.append('tradition', 'ashkenazi');

            if (status) status.textContent = 'Enviando...';
            try {
                const res = await fetch(this.api.upload, { method: 'POST', body: form });
                if (res.ok) {
                    if (status) status.textContent = '¡Enviada! Quedó pendiente de aprobación por un administrador.';
                    this.state.recordedBlob = null;
                    document.getElementById('recUploadWrap').classList.add('hidden');
                } else {
                    const err = await res.json().catch(() => ({}));
                    if (status) status.textContent = err.error || `No se pudo enviar (HTTP ${res.status}).`;
                }
            } catch (e) {
                if (status) status.textContent = 'Error de red al enviar la grabación.';
            }
        },

        // ---------- Reproducción de grabación real, sincronizada por versículo ----------
        playRealRecording(id, verseStart, verseEnd) {
            this.stopRealRecording();
            // Detener el audio sintetizado para no superponer.
            if (window.App && window.App.stopAudio) window.App.stopAudio();

            const audio = new Audio(this.api.audio(id));
            this.state.realAudio = audio;

            const total = this.state.current.verseCount || 0;
            const startIdx = verseStart ? (verseStart - 1) : 0;
            const endIdx = verseEnd ? (verseEnd - 1) : (total > 0 ? total - 1 : 0);

            const highlight = () => {
                if (!audio.duration || !isFinite(audio.duration)) return;
                const frac = Math.min(0.999, audio.currentTime / audio.duration);
                const span = (endIdx - startIdx) + 1;
                const idx = startIdx + Math.floor(frac * span);
                this.highlightVerseRow(idx);
            };

            audio.addEventListener('timeupdate', highlight);
            audio.addEventListener('play', () => this.highlightVerseRow(startIdx));
            audio.addEventListener('ended', () => this.stopRealRecording());
            audio.addEventListener('error', () => {
                this.stopRealRecording();
                const status = document.getElementById('recStatus');
                if (status) status.textContent = 'No se pudo reproducir la grabación.';
            });

            audio.play().catch(() => { /* autoplay bloqueado hasta gesto */ });
        },

        stopRealRecording() {
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

            let items = [];
            try {
                const res = await fetch(this.api.queue('pending'));
                if (res.ok) {
                    const data = await res.json();
                    items = data.recordings || [];
                }
            } catch (e) { /* degradar */ }

            section.classList.remove('hidden');
            const rows = items.length
                ? items.map((r) => `
                    <div class="recording-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);margin-bottom:8px;">
                        <div>
                            <div style="font-weight:600;">${this.escape(r.uploaderName || 'Rabino')} · ${this.escape(r.parashaId)}/${this.escape(r.aliyah)}</div>
                            <div style="font-size:12px;color:var(--color-text-muted);">${(r.verseStart && r.verseEnd) ? `Versículos ${r.verseStart}–${r.verseEnd}` : 'Aliyá completa'}</div>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <audio controls src="${this.api.audio(r.id)}" style="height:34px;"></audio>
                            <button class="btn-primary" data-mod="approved" data-id="${r.id}" style="padding:6px 12px;">Aprobar</button>
                            <button class="btn-secondary" data-mod="rejected" data-id="${r.id}" style="padding:6px 12px;">Rechazar</button>
                        </div>
                    </div>`).join('')
                : '<p style="color:var(--color-text-muted);font-size:14px;">No hay grabaciones pendientes.</p>';

            section.innerHTML = `
                <h3 class="section-title">Moderación de grabaciones (admin)</h3>
                <div>${rows}</div>
            `;

            section.querySelectorAll('[data-mod]').forEach((btn) => {
                btn.addEventListener('click', () => this.moderate(btn.getAttribute('data-id'), btn.getAttribute('data-mod')));
            });
        },

        async moderate(id, status) {
            try {
                const res = await fetch(this.api.moderate(id), {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
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
