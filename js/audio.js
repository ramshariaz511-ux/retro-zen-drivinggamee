/**
 * RETROZEN DRIVING - PROCEDURAL WEB AUDIO SYNTHESIZER
 * 100% Procedurally generated audio engine - Zero external audio files required!
 * Includes:
 * - Arcade cute clicking sound (Mario Kart style double-blip chime)
 * - Procedural Vinyl crackle & needle pops (audible, warm, analog)
 * - Procedural Rain noise generator (soothing stereo rain + droplet sweeps)
 * - Procedural CRT monitor sound (degauss coil thump, electrical hum, 15kHz flyback)
 * - 6 Chill Lo-Fi procedural beat tracks with chords, bass, and drums
 * - Pitch-shifting car engine rumble & tachometer revs
 * - Skateboard rolling & pavement clatter
 * - Walking footstep synthesizer
 * - Nostalgic tram bell chime for Turkey map
 */

class RetroZenAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.masterVolume = 0.85;

    // Ambient loop states
    this.vinylNode = null;
    this.vinylGain = null;
    this.vinylActive = false;
    this.vinylVolume = 0.55;

    this.rainNode = null;
    this.rainGain = null;
    this.rainActive = false;
    this.rainVolume = 0.6;

    // CRT Sound
    this.crtNode = null;
    this.crtGain = null;
    this.crtActive = false;
    this.crtVolume = 0.25;

    // Vehicle sounds
    this.engine = null;
    this.skateboard = null;
    this.currentMode = 'car';
    this.lastFootstepTime = 0;

    // Lo-Fi Beat Synthesizer
    this.currentTrack = 1;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicBpm = 76;
    this.musicVolume = 0.65;

    this.trackNames = [
      "1. Shibuya Sunset (Tokyo Lo-Fi)",
      "2. Green Hill Breeze (Acoustic Chill)",
      "3. London Drizzle (Melancholy Jazz)",
      "4. Alpine Solitude (Deep Ambient)",
      "5. Times Square Midnight (Boom-Bap)",
      "6. Istiklal Twilight (Bosphorus Chill)"
    ];
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Ambient (Vinyl, Rain, CRT)
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Music Gain
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Vehicle Loops
    this._initVehicleLoops();
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /* ================= 1. ARCADE CUTE CLICK SOUND ================= */
  playArcadeClick(type = 'select') {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;

    if (type === 'select') {
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, t); // C6
      gain1.gain.setValueAtTime(0.35, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(t);
      osc1.stop(t + 0.08);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, t + 0.05); // G6
      gain2.gain.setValueAtTime(0.4, t + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.19);

    } else if (type === 'back') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.09);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);

    } else if (type === 'fanfare') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const timeOffset = t + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, timeOffset);
        gain.gain.setValueAtTime(0.35, timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(timeOffset);
        osc.stop(timeOffset + 0.24);
      });
    }
  }

  // Historic Istanbul Tram Bell ("DING DING!")
  playTramBell() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.16].forEach(delay => {
      const time = t + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2093, time); // C7 bell chime
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.38);
    });
  }

  /* ================= 2. PROCEDURAL VINYL SOUND GENERATOR ================= */
  toggleVinyl(force = null, volume = null) {
    this.ensureContext();
    if (volume !== null) this.vinylVolume = volume;
    this.vinylActive = force !== null ? force : !this.vinylActive;

    if (!this.ctx) return false;

    if (this.vinylActive) {
      if (this.vinylGain) {
        this.vinylGain.gain.setValueAtTime(this.vinylVolume, this.ctx.currentTime);
        return true;
      }

      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        let sample = (Math.random() * 2 - 1) * 0.12;
        if (Math.random() < 0.006) {
          sample += (Math.random() * 2 - 1) * 0.85;
        }
        if (Math.random() < 0.0008) {
          sample += (Math.random() * 2 - 1) * 1.0;
        }
        data[i] = sample;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, this.ctx.currentTime);

      this.vinylGain = this.ctx.createGain();
      this.vinylGain.gain.setValueAtTime(this.vinylVolume, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.vinylGain);
      this.vinylGain.connect(this.ambientGain);
      noise.start();

      this.vinylNode = noise;
      return true;
    } else {
      if (this.vinylGain) {
        this.vinylGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        const ref = this.vinylNode;
        setTimeout(() => {
          try { if (ref) ref.stop(); } catch(e) {}
        }, 100);
        this.vinylNode = null;
        this.vinylGain = null;
      }
      return false;
    }
  }

  setVinylVolume(val) {
    this.vinylVolume = Math.max(0, Math.min(1, val));
    if (this.vinylGain && this.ctx) {
      this.vinylGain.gain.setValueAtTime(this.vinylVolume, this.ctx.currentTime);
    }
  }

  /* ================= 3. PROCEDURAL RAIN SOUND GENERATOR ================= */
  toggleRain(force = null, volume = null) {
    this.ensureContext();
    if (volume !== null) this.rainVolume = volume;
    this.rainActive = force !== null ? force : !this.rainActive;

    if (!this.ctx) return false;

    if (this.rainActive) {
      if (this.rainGain) {
        this.rainGain.gain.setValueAtTime(this.rainVolume, this.ctx.currentTime);
        return true;
      }

      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let b0L = 0, b1L = 0, b2L = 0;
      let b0R = 0, b1R = 0, b2R = 0;

      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        b0L = 0.99765 * b0L + whiteL * 0.0990460;
        b1L = 0.96300 * b1L + whiteL * 0.2965164;
        b2L = 0.57000 * b2L + whiteL * 1.0526913;
        left[i] = (b0L + b1L + b2L) * 0.35;

        const whiteR = Math.random() * 2 - 1;
        b0R = 0.99765 * b0R + whiteR * 0.0990460;
        b1R = 0.96300 * b1R + whiteR * 0.2965164;
        b2R = 0.57000 * b2R + whiteR * 1.0526913;
        right[i] = (b0R + b1R + b2R) * 0.35;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(this.rainVolume, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.ambientGain);
      noise.start();

      this.rainNode = noise;
      return true;
    } else {
      if (this.rainGain) {
        this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        const ref = this.rainNode;
        setTimeout(() => {
          try { if (ref) ref.stop(); } catch(e) {}
        }, 100);
        this.rainNode = null;
        this.rainGain = null;
      }
      return false;
    }
  }

  setRainVolume(val) {
    this.rainVolume = Math.max(0, Math.min(1, val));
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setValueAtTime(this.rainVolume, this.ctx.currentTime);
    }
  }

  /* ================= 4. PROCEDURAL CRT SOUND (NO HIGH PITCH) ================= */
  toggleCRT(force = null) {
    this.ensureContext();
    this.crtActive = force !== null ? force : !this.crtActive;
    if (!this.ctx) return this.crtActive;

    const t = this.ctx.currentTime;

    if (this.crtActive) {
      // Soft vintage relay click when turning on CRT
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(160, t);
      clickOsc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
      clickGain.gain.setValueAtTime(0.3, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(t);
      clickOsc.stop(t + 0.1);
      return true;
    } else {
      // Soft click on turn off
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(120, t);
      clickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.06);
      clickGain.gain.setValueAtTime(0.25, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(t);
      clickOsc.stop(t + 0.08);
      return false;
    }
  }

  /* ================= 5. VEHICLE & MOVEMENT SOUNDS ================= */
  _initVehicleLoops() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const engineFilter = this.ctx.createBiquadFilter();
    const engineGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(45, t);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(90, t);

    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(180, t);

    engineGain.gain.setValueAtTime(0.001, t);

    osc1.connect(engineFilter);
    osc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(this.sfxGain);

    osc1.start();
    osc2.start();

    this.engine = { osc1, osc2, filter: engineFilter, gain: engineGain };

    const skateBufSize = this.ctx.sampleRate * 1.5;
    const skateBuf = this.ctx.createBuffer(1, skateBufSize, this.ctx.sampleRate);
    const skateData = skateBuf.getChannelData(0);
    for (let i = 0; i < skateBufSize; i++) {
      skateData[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const skateSource = this.ctx.createBufferSource();
    skateSource.buffer = skateBuf;
    skateSource.loop = true;

    const skateFilter = this.ctx.createBiquadFilter();
    skateFilter.type = 'bandpass';
    skateFilter.frequency.setValueAtTime(800, t);
    skateFilter.Q.value = 3.2;

    const skateGain = this.ctx.createGain();
    skateGain.gain.setValueAtTime(0.001, t);

    skateSource.connect(skateFilter);
    skateFilter.connect(skateGain);
    skateGain.connect(this.sfxGain);
    skateSource.start();

    this.skateboard = { source: skateSource, filter: skateFilter, gain: skateGain };
  }

  setEngineSpeed(speedRatio, isAccelerating) {
    if (!this.engine || !this.ctx || this.isMuted) return;
    if (this.currentMode !== 'car') {
      this.engine.gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      return;
    }

    const t = this.ctx.currentTime;
    const baseFreq = 42 + speedRatio * 95 + (isAccelerating ? 20 : 0);
    const filterFreq = 160 + speedRatio * 440 + (isAccelerating ? 150 : 0);
    const targetGain = 0.22 + speedRatio * 0.18 + (isAccelerating ? 0.1 : 0);

    this.engine.osc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(baseFreq * 2, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(filterFreq, t, 0.08);
    this.engine.gain.gain.setTargetAtTime(targetGain, t, 0.08);
  }

  setSkateboardSpeed(speedRatio, isPushing) {
    if (!this.skateboard || !this.ctx || this.isMuted) return;
    if (this.currentMode !== 'skateboard') {
      this.skateboard.gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      return;
    }

    const t = this.ctx.currentTime;
    const targetGain = speedRatio > 0.02 ? (0.12 + speedRatio * 0.26) : 0.001;
    const targetFreq = 500 + speedRatio * 950;

    this.skateboard.filter.frequency.setTargetAtTime(targetFreq, t, 0.08);
    this.skateboard.gain.gain.setTargetAtTime(targetGain, t, 0.08);

    if (isPushing) {
      this.playSkatePush();
    }
  }

  playSkatePush() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playFootstep(surface = 'concrete') {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const now = Date.now();
    if (now - this.lastFootstepTime < 320) return;
    this.lastFootstepTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.08);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  setMode(mode) {
    this.currentMode = mode;
    if (this.engine && mode !== 'car' && this.ctx) {
      this.engine.gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    }
    if (this.skateboard && mode !== 'skateboard' && this.ctx) {
      this.skateboard.gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    }
  }

  /* ================= 6. PROCEDURAL LO-FI BEATS ENGINE ================= */
  startMusic(trackIndex = null) {
    this.ensureContext();
    if (trackIndex !== null) this.currentTrack = trackIndex;
    this.isPlayingMusic = true;

    if (this.musicTimer) clearInterval(this.musicTimer);

    const stepDurationMs = (60 / this.musicBpm / 4) * 1000;
    this.musicStep = 0;

    this.musicTimer = setInterval(() => {
      this._stepMusic();
    }, stepDurationMs);

    return true;
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMusic() {
    if (this.isPlayingMusic) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  setMusicTrack(idx) {
    this.currentTrack = Math.max(1, Math.min(6, idx));
    this.musicStep = 0;
    if (!this.isPlayingMusic) {
      this.startMusic();
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  _stepMusic() {
    if (!this.ctx || this.isMuted) return;
    const step = this.musicStep % 16;
    const bar = Math.floor(this.musicStep / 16) % 4;
    this.musicStep++;

    const chordsByTrack = {
      1: [
        [311.13, 392.00, 466.16, 587.33],
        [261.63, 311.13, 392.00, 466.16],
        [174.61, 261.63, 349.23, 440.00],
        [233.08, 293.66, 349.23, 466.16]
      ],
      2: [
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [293.66, 349.23, 440.00, 523.25],
        [196.00, 246.94, 293.66, 392.00]
      ],
      3: [
        [293.66, 349.23, 440.00, 587.33],
        [196.00, 246.94, 329.63, 440.00],
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 277.18, 329.63, 415.30]
      ],
      4: [
        [349.23, 440.00, 523.25, 659.25],
        [329.63, 392.00, 493.88, 587.33],
        [293.66, 349.23, 440.00, 523.25],
        [261.63, 329.63, 392.00, 523.25]
      ],
      5: [
        [207.65, 261.63, 311.13, 392.00],
        [174.61, 207.65, 261.63, 311.13],
        [233.08, 277.18, 349.23, 415.30],
        [155.56, 196.00, 233.08, 311.13]
      ],
      6: [
        [220.00, 261.63, 329.63, 440.00],
        [196.00, 246.94, 293.66, 392.00],
        [174.61, 220.00, 261.63, 349.23],
        [164.81, 207.65, 246.94, 329.63]
      ]
    };

    const currentProgression = chordsByTrack[this.currentTrack] || chordsByTrack[1];
    const currentChord = currentProgression[bar];

    if (step === 0 || (step === 8 && this.currentTrack % 2 === 0)) {
      this._playLofiChord(currentChord);
    }

    if (step === 0 || step === 6 || step === 10) {
      this._playLofiBass(currentChord[0] / 2);
    }

    if (step === 0 || step === 7 || step === 10) {
      this._playLofiKick();
    }
    if (step === 4 || step === 12) {
      this._playLofiSnare();
    }
    if (step % 2 === 0) {
      this._playLofiHiHat(step % 4 === 2 ? 0.09 : 0.06);
    }
  }

  _playLofiChord(notes) {
    const t = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const detune = (Math.random() - 0.5) * 8;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(detune, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1300 + Math.random() * 200, t);

      const delayOffset = idx * 0.02;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + delayOffset + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t + delayOffset);
      osc.stop(t + 1.8);
    });
  }

  _playLofiBass(freq) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, t);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  _playLofiKick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.14);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  _playLofiSnare() {
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.09);

    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(t);
  }

  _playLofiHiHat(vol = 0.08) {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }
}

// Global audio singleton
window.retroAudio = new RetroZenAudioEngine();
