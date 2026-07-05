// Trope Synthesizer - Ashkenazi Tradition
// Uses Web Audio API to synthesize the traditional musical motifs of Torah Cantillation (Ta'amim)
// Created with love for premium, educational, and high-fidelity Jewish study apps.

const TropeSynthesizer = {
    audioCtx: null,
    synagogueReverb: true,

    // Ashkenazi Torah Trope Scale (Based on traditional Jewish cantillation modes - resembling Dorian / Major Pentatonic shifts)
    // Root pitch G3 = 196 Hz (comfortable baritone/cantor register)
    notes: {
        'Eb3': 155.56,
        'F3': 174.61,
        'G3': 196.00,
        'A3': 220.00,
        'Bb3': 233.08,
        'B3': 246.94,
        'C4': 261.63,
        'D4': 293.66,
        'Eb4': 311.13,
        'E4': 329.63,
        'F4': 349.23,
        'G4': 392.00,
        'A4': 440.00,
        'Bb4': 466.16,
        'B4': 493.88,
        'C5': 523.25
    },

    // Trope definitions: character, name, transliteration, description, musical motif (sequence of [note, duration_ms])
    tropes: {
        'etnachta': {
            char: '◌֥',
            name: 'Etnajtá',
            type: 'Disyuntivo (Pausa Principal)',
            desc: 'La pausa principal a mitad del versículo. Indica una parada importante para respirar.',
            motif: [
                ['A3', 180], ['C4', 180], ['D4', 200], ['C4', 180], ['Bb3', 180], ['A3', 250], ['G3', 400]
            ]
        },
        'sof_pasuk': {
            char: '◌ֽ',
            name: 'Sof Pasúk',
            type: 'Disyuntivo (Final)',
            desc: 'Marca el final definitivo del versículo. Siempre se acompaña de silencio al terminar.',
            motif: [
                ['Bb3', 200], ['A3', 200], ['G3', 200], ['A3', 250], ['F3', 200], ['G3', 500]
            ]
        },
        'munach': {
            char: '◌֕',
            name: 'Munáj',
            type: 'Conjuntivo (Conector)',
            desc: 'Un conector melódico corto que une la palabra actual con el siguiente trope disyuntivo.',
            motif: [
                ['G3', 150], ['A3', 150], ['Bb3', 250]
            ]
        },
        'zakef_katon': {
            char: '◌֔',
            name: 'Zakéf Katón',
            type: 'Disyuntivo (Pausa Media)',
            desc: 'Una pausa intermedia muy común. Sube el tono y luego descansa de forma breve.',
            motif: [
                ['Bb3', 180], ['D4', 180], ['C4', 180], ['D4', 200], ['Bb3', 350]
            ]
        },
        'zakef_gadol': {
            char: '◌֕', // Alternative representation for display
            name: 'Zakéf Gadól',
            type: 'Disyuntivo (Pausa Fuerte)',
            desc: 'Una pausa más enfatizada y melódica que el Zakéf Katón. Raro pero solemne.',
            motif: [
                ['Bb3', 150], ['D4', 150], ['F4', 200], ['Eb4', 150], ['D4', 200], ['C4', 150], ['Bb3', 400]
            ]
        },
        'revia': {
            char: '◌֗',
            name: 'Reviá',
            type: 'Disyuntivo',
            desc: 'Un tono suspendido y repetitivo. Exige cantar con énfasis rítmico en la nota alta.',
            motif: [
                ['D4', 150], ['D4', 150], ['D4', 200], ['C4', 150], ['Bb3', 250], ['A3', 350]
            ]
        },
        'pashta': {
            char: '◌֨',
            name: 'Pashtá',
            type: 'Disyuntivo (Menor)',
            desc: 'Sube rápidamente y da un pequeño salto melódico antes de conectar con el siguiente segmento.',
            motif: [
                ['G3', 150], ['Bb3', 150], ['A3', 150], ['Bb3', 180], ['G3', 300]
            ]
        },
        'tevir': {
            char: '◌֥', // displays similarly or underneath
            name: 'Tevír',
            type: 'Disyuntivo (Bajo)',
            desc: 'Un motivo que desciende a la escala baja con un tono quebrado y resolutivo.',
            motif: [
                ['F3', 200], ['Eb3', 180], ['F3', 180], ['G3', 200], ['F3', 400]
            ]
        },
        'darga': {
            char: '◌֧',
            name: 'Dargá',
            type: 'Conjuntivo (Paso)',
            desc: 'Literalmente "escalón". Una cascada de notas descendentes que guían con fuerza hacia un Tevír.',
            motif: [
                ['Bb3', 150], ['A3', 120], ['G3', 150], ['F3', 120], ['G3', 180], ['Eb3', 300]
            ]
        },
        'kadma': {
            char: '◌֨',
            name: 'Kadmá',
            type: 'Conjuntivo (Ascendente)',
            desc: 'Un paso ascendente y fluido. Siempre precede a un Mapáj o Pashtá.',
            motif: [
                ['F3', 150], ['G3', 150], ['A3', 150], ['Bb3', 250]
            ]
        },
        'mapach': {
            char: '◌֤',
            name: 'Mapáj',
            type: 'Conjuntivo',
            desc: 'Una curva melódica suave en registro medio que prepara la llegada de un Pashtá.',
            motif: [
                ['G3', 150], ['A3', 150], ['Bb3', 150], ['G3', 250]
            ]
        },
        'mercha': {
            char: '◌֥', // below
            name: 'Merjá',
            type: 'Conjuntivo (Acelerado)',
            desc: 'Extiende suavemente la palabra y la conecta directamente con un Tipjá.',
            motif: [
                ['G3', 150], ['Bb3', 150], ['C4', 300]
            ]
        },
        'tipcha': {
            char: '◌֖',
            name: 'Tipjá',
            type: 'Disyuntivo (Antes de Final)',
            desc: 'Un trope disyuntivo muy importante que prepara la resolución final de la frase (Etnajtá o Sof Pasúk).',
            motif: [
                ['Bb3', 180], ['C4', 180], ['A3', 180], ['Bb3', 350]
            ]
        },
        'geresh': {
            char: '◌֜',
            name: 'Gerésh',
            type: 'Disyuntivo',
            desc: 'Un sonido agudo y vibrante, como un lamento corto sobre la palabra.',
            motif: [
                ['C4', 150], ['D4', 120], ['C4', 120], ['D4', 150], ['C4', 300]
            ]
        },
        'gershayim': {
            char: '◌֞',
            name: 'Gersháyim',
            type: 'Disyuntivo (Doble)',
            desc: 'Un lamento doble, con un trino rápido y agudo muy hermoso.',
            motif: [
                ['C4', 100], ['D4', 100], ['C4', 100], ['D4', 100], ['Eb4', 200], ['D4', 350]
            ]
        },
        'pazer': {
            char: '◌֡',
            name: 'Pazér',
            type: 'Disyuntivo Largo',
            desc: 'Un floreo muy largo, festivo y ornamental con notas que suben y bajan repetidamente.',
            motif: [
                ['Bb3', 120], ['D4', 120], ['F4', 150], ['D4', 120], ['F4', 120], ['Eb4', 120], ['D4', 150], ['C4', 120], ['Bb3', 400]
            ]
        },
        'shalshelet': {
            char: '◌֙',
            name: 'Shalshélet',
            type: 'Disyuntivo Raro',
            desc: 'El trope más dramático de la Torá. Aparece solo 4 veces e implica una triple cadena de trinos solemnes.',
            motif: [
                ['A3', 120], ['C4', 120], ['Bb3', 100], ['A3', 120], // primer trino
                ['C4', 120], ['Bb3', 100], ['A3', 120],              // segundo trino
                ['D4', 150], ['C4', 120], ['Bb3', 120], ['C4', 150], ['A3', 450] // resolución
            ]
        },
        'telisha_ketana': {
            char: '◌֧',
            name: 'Telishá Ketaná',
            type: 'Conjuntivo',
            desc: 'Un adorno melódico rápido que se canta al final de la palabra.',
            motif: [
                ['D4', 100], ['C4', 100], ['Bb3', 100], ['D4', 250]
            ]
        },
        'telisha_gedola': {
            char: '◌֨',
            name: 'Telishá Gedolá',
            type: 'Disyuntivo',
            desc: 'Un adorno melódico y dramático que se canta al inicio de la palabra, aislándola ceremonialmente.',
            motif: [
                ['Bb3', 100], ['D4', 100], ['C4', 100], ['D4', 100], ['Bb3', 300]
            ]
        }
    },

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create shared reverb/delay nodes once
            this.reverbNode = this.audioCtx.createDelay(1.0);
            this.reverbFeedback = this.audioCtx.createGain();
            
            this.reverbNode.delayTime.setValueAtTime(0.22, this.audioCtx.currentTime);
            this.reverbFeedback.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
            
            // Connect reverb loop
            this.reverbNode.connect(this.reverbFeedback);
            this.reverbFeedback.connect(this.reverbNode);
            
            // Connect reverb output to destination
            this.reverbNode.connect(this.audioCtx.destination);
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    // Play a single trope motif
    async playTrope(tropeKey, speed = 1.0) {
        this.init();
        const trope = this.tropes[tropeKey];
        if (!trope) return;

        // Cancel previous playing sounds if any (simply using the context time to queue notes)
        let startTime = this.audioCtx.currentTime;

        // Loop through the motif notes
        for (let i = 0; i < trope.motif.length; i++) {
            const [noteName, duration] = trope.motif[i];
            const frequency = this.notes[noteName] || 220;
            const adjustedDuration = (duration / speed) / 1000; // convert to seconds and apply speed

            this.playTone(frequency, startTime, adjustedDuration);
            startTime += adjustedDuration * 0.95; // Legato transition: small overlap or gap
        }
    },

    // Generate organic cantor-like tone using dual oscillators (rich harmonics)
    playTone(frequency, startTime, duration) {
        // Oscillator 1 (Triangle wave - warm, woodwind-like fundamental tone of a human voice)
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(frequency, startTime);

        // Oscillator 2 (Sine wave with double frequency - soft second harmonic to enrich vocal resonance)
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(frequency * 2, startTime);

        // Subtle vibrato (Cantor voice natural oscillation)
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.5, startTime); // 5.5 Hz natural human vibrato
        lfoGain.gain.setValueAtTime(frequency * 0.015, startTime); // depth of vibrato

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        // Gain node for ADSR volume envelope
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        
        // Attack: smooth rise (human voice starting to chant)
        gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
        
        // Decay & Sustain
        gainNode.gain.setValueAtTime(0.35, startTime + duration - 0.05);
        
        // Release: smooth fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        // Lowpass filter to round off any harsh high frequencies and simulate wooden resonance
        const filterNode = this.audioCtx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(900, startTime);

        // Connections
        osc1.connect(filterNode);
        osc2.connect(filterNode);
        
        filterNode.connect(gainNode);

        // Connect main output and delay lines
        gainNode.connect(this.audioCtx.destination);
        if (this.synagogueReverb && this.reverbNode) {
            gainNode.connect(this.reverbNode);
        }

        // Start and Stop
        lfo.start(startTime);
        osc1.start(startTime);
        osc2.start(startTime);

        lfo.stop(startTime + duration);
        osc1.stop(startTime + duration);
        osc2.stop(startTime + duration);
    }
};

// Export to window object
window.TropeSynthesizer = TropeSynthesizer;
