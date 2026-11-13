// Web Audio API 8-Bit Retro Chiptune Synthesizer & Sound Effects
(function () {
  const bassFrequencies = [
    110, 110, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81,
    110, 110, 130.81, 130.81, 196, 196, 164.81, 146.83
  ];

  const leadFrequencies = [
    440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440,
    523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25
  ];

  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let intervalId = null;
  let currentStep = 0;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playStep() {
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    const step = currentStep % 16;
    currentStep++;

    // Sawtooth Bassline
    const oscBass = audioCtx.createOscillator();
    const gainBass = audioCtx.createGain();
    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(bassFrequencies[step] / 2, t);
    gainBass.gain.setValueAtTime(0.12, t);
    gainBass.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    oscBass.connect(gainBass);
    gainBass.connect(masterGain);
    oscBass.start(t);
    oscBass.stop(t + 0.2);

    // Square Lead Arpeggio
    if (step % 2 === 0 || step % 3 === 0) {
      const oscLead = audioCtx.createOscillator();
      const gainLead = audioCtx.createGain();
      oscLead.type = 'square';
      oscLead.frequency.setValueAtTime(leadFrequencies[step], t);
      gainLead.gain.setValueAtTime(0.08, t);
      gainLead.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      oscLead.connect(gainLead);
      gainLead.connect(masterGain);
      oscLead.start(t);
      oscLead.stop(t + 0.15);
    }

    // Retro Percussion Kick
    if (step % 4 === 2) {
      const oscKick = audioCtx.createOscillator();
      const gainKick = audioCtx.createGain();
      oscKick.type = 'triangle';
      oscKick.frequency.setValueAtTime(180, t);
      oscKick.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      gainKick.gain.setValueAtTime(0.1, t);
      gainKick.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      oscKick.connect(gainKick);
      gainKick.connect(masterGain);
      oscKick.start(t);
      oscKick.stop(t + 0.09);
    }
  }

  function startMusic() {
    initAudio();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(playStep, 120);
    isPlaying = true;
    updateAudioButtons();
  }

  function stopMusic() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isPlaying = false;
    updateAudioButtons();
  }

  function toggleAudio() {
    if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  function playSfx(type, param) {
    initAudio();
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;

    if (type === 'blip') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.06);
    } else if (type === 'crt') {
      // CRT Power-on high pitch whine followed by cathode thump
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(14000, t + 0.3);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'coin') {
      const step = param || 1;
      const baseFreq = step === 2 ? 1046.5 : (step === 3 ? 1174.66 : 987.77);
      const highFreq = step === 2 ? 1396.91 : (step === 3 ? 1567.98 : 1318.51);

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.setValueAtTime(highFreq, t + 0.07);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.36);
    } else if (type === 'powerup') {
      [330, 392, 659, 523, 587, 784].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + 0.05 * idx);
        gain.gain.setValueAtTime(0.08, t + 0.05 * idx);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05 * idx + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t + 0.05 * idx);
        osc.stop(t + 0.05 * idx + 0.09);
      });
    } else if (type === 'start') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + 0.08 * idx);
        gain.gain.setValueAtTime(0.15, t + 0.08 * idx);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08 * idx + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t + 0.08 * idx);
        osc.stop(t + 0.08 * idx + 0.22);
      });
    }
  }

  function updateAudioButtons() {
    const btns = document.querySelectorAll('.audio-toggle-btn');
    btns.forEach((btn) => {
      const textSpan = btn.querySelector('.audio-status-text');
      const waveBars = btn.querySelector('.audio-wave-bars');
      const soundIcon = btn.querySelector('.audio-sound-icon');

      if (isPlaying) {
        btn.classList.add('border-[#00f0ff]', 'bg-[#00f0ff]/15', 'text-[#00f0ff]', 'shadow-[0_0_12px_rgba(0,240,255,0.4)]');
        btn.classList.remove('border-zinc-700', 'text-zinc-400');
        if (textSpan) textSpan.textContent = 'ON';
        if (waveBars) waveBars.classList.remove('hidden');
        if (soundIcon) soundIcon.classList.add('scale-110');
      } else {
        btn.classList.remove('border-[#00f0ff]', 'bg-[#00f0ff]/15', 'text-[#00f0ff]', 'shadow-[0_0_12px_rgba(0,240,255,0.4)]');
        btn.classList.add('border-zinc-700', 'text-zinc-400');
        if (textSpan) textSpan.textContent = 'OFF';
        if (waveBars) waveBars.classList.add('hidden');
        if (soundIcon) soundIcon.classList.remove('scale-110');
      }
    });
  }

  // Export to window
  window.RetroAudio = {
    init: initAudio,
    toggle: toggleAudio,
    playSfx: playSfx,
    isPlaying: () => isPlaying
  };

  // Wire up DOM listeners when document loads
  document.addEventListener('DOMContentLoaded', () => {
    // Audio toggle buttons
    const btns = document.querySelectorAll('.audio-toggle-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        playSfx('coin');
        toggleAudio();
      });
      btn.addEventListener('mouseenter', () => {
        playSfx('blip');
      });
    });

    // Sound effects on elements with data-sfx
    document.querySelectorAll('[data-sfx]').forEach((el) => {
      el.addEventListener('click', () => {
        playSfx(el.getAttribute('data-sfx') || 'blip');
      });
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener('click', () => {
        playSfx('blip');
        mobileMenu.classList.toggle('hidden');
      });
    }

    // Header scroll background effect
    const header = document.querySelector('header');
    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          header.classList.add('bg-[#05020c]/85', 'backdrop-blur-md', 'border-white/10', 'shadow-[0_4px_25px_rgba(0,0,0,0.8)]');
          header.classList.remove('bg-transparent', 'border-transparent');
        } else {
          header.classList.remove('bg-[#05020c]/85', 'backdrop-blur-md', 'border-white/10', 'shadow-[0_4px_25px_rgba(0,0,0,0.8)]');
          header.classList.add('bg-transparent', 'border-transparent');
        }
      }, { passive: true });
    }
  });
})();
