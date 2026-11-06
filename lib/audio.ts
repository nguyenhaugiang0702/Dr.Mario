// Hệ thống âm thanh Dr. Mario NES (Web Audio API synth cho SFX + MP3 cho BGM & Jingles)

export type MusicType = 'fever' | 'chill' | 'off';

let ctx: AudioContext | null = null;
let muted = false; // Mặc định luôn bật loa theo yêu cầu
let musicChoice: MusicType = 'fever';

// Các đường dẫn file nhạc gốc Dr. Mario NES trong public/audio
const AUDIO_PATHS = {
  title: '/audio/01. Title Screen.mp3',
  fever: '/audio/03. Fever.mp3',
  clear: '/audio/04. Fever Clear.mp3',
  chill: '/audio/05. Chill.mp3',
  gameover: '/audio/07. Game Over.mp3',
  pause: '/audio/14. Pause.mp3',
};

// Cache các đối tượng Audio
const audioCache: Partial<Record<keyof typeof AUDIO_PATHS, HTMLAudioElement>> = {};

function getOrCreateAudio(key: keyof typeof AUDIO_PATHS): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioCache[key]) {
    try {
      const el = new Audio(encodeURI(AUDIO_PATHS[key]));
      el.preload = 'auto';
      audioCache[key] = el;
    } catch {
      return null;
    }
  }
  return audioCache[key] || null;
}

// BGM đang phát
let currentBgmAudio: HTMLAudioElement | null = null;
let currentBgmKey: 'title' | 'fever' | 'chill' | null = null;
let currentJingleAudio: HTMLAudioElement | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
  return ctx;
}

export function unlockAudio() {
  try {
    getAudioContext();
  } catch {}
}

export function isMuted(): boolean {
  return muted;
}

export function initMute(): boolean {
  // Mặc định luôn bật loa khi vào ứng dụng
  muted = false;
  return muted;
}

export function setMuted(val: boolean, isPlaying = false, isPaused = false): boolean {
  muted = val;
  try {
    localStorage.setItem('drm-mute', muted ? '1' : '0');
  } catch {}

  try {
    if (muted) {
      if (currentBgmAudio) currentBgmAudio.pause();
      if (currentJingleAudio) currentJingleAudio.pause();
    } else {
      if (isPlaying) {
        if (!isPaused) resumeGameMusic();
      } else {
        playTitleMusic();
      }
    }
  } catch {}
  return muted;
}

export function toggleMute(isPlaying = false, isPaused = false): boolean {
  return setMuted(!muted, isPlaying, isPaused);
}

export function getMusicChoice(): MusicType {
  try {
    const saved = localStorage.getItem('drm-music') as MusicType;
    if (saved === 'fever' || saved === 'chill' || saved === 'off') {
      musicChoice = saved;
    }
  } catch {}
  return musicChoice;
}

export function setMusicChoice(choice: MusicType) {
  musicChoice = choice;
  try {
    localStorage.setItem('drm-music', choice);
  } catch {}
}

// Rung phản hồi xúc giác nhẹ trên điện thoại
export function haptic(ms = 12) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}

// ========================================================
// QUẢN LÝ NHẠC NỀN (BGM) & HIỆU ỨNG MP3
// ========================================================

/** Dừng mọi bản nhạc BGM và Jingle đang phát */
export function stopAllMusic() {
  if (currentBgmAudio) {
    try { currentBgmAudio.pause(); } catch {}
    try { currentBgmAudio.currentTime = 0; } catch {}
    currentBgmAudio = null;
  }
  if (currentJingleAudio) {
    try { currentJingleAudio.pause(); } catch {}
    try { currentJingleAudio.currentTime = 0; } catch {}
    currentJingleAudio = null;
  }
  currentBgmKey = null;
}

/** Phát nhạc màn hình chờ / Menu (Title Screen) */
export function playTitleMusic() {
  if (typeof window === 'undefined') return;
  try {
    if (currentJingleAudio) {
      try { currentJingleAudio.pause(); } catch {}
      currentJingleAudio = null;
    }
    if (currentBgmKey === 'title' && currentBgmAudio && !currentBgmAudio.paused) {
      return;
    }

    stopAllMusic();
    const audio = getOrCreateAudio('title');
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.38;
    currentBgmAudio = audio;
    currentBgmKey = 'title';

    if (!muted) {
      audio.play().catch(() => {});
    }
  } catch {}
}

/** Bắt đầu phát nhạc trong trận đấu (Fever hoặc Chill) */
export function playGameMusic(choice: MusicType = musicChoice) {
  if (typeof window === 'undefined') return;
  setMusicChoice(choice);

  try {
    if (currentJingleAudio) {
      try { currentJingleAudio.pause(); } catch {}
      currentJingleAudio = null;
    }

    if (choice === 'off') {
      if (currentBgmAudio) {
        try { currentBgmAudio.pause(); } catch {}
        try { currentBgmAudio.currentTime = 0; } catch {}
        currentBgmAudio = null;
      }
      currentBgmKey = null;
      return;
    }

    const key = choice === 'chill' ? 'chill' : 'fever';
    if (currentBgmKey === key && currentBgmAudio && !currentBgmAudio.paused) {
      return;
    }

    stopAllMusic();
    const audio = getOrCreateAudio(key);
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.42;
    currentBgmAudio = audio;
    currentBgmKey = key;

    if (!muted) {
      audio.play().catch(() => {});
    }
  } catch {}
}

/** Tạm dừng nhạc khi Pause game */
export function pauseGameMusic() {
  try {
    if (currentBgmAudio && !currentBgmAudio.paused) {
      currentBgmAudio.pause();
    }
  } catch {}
}

/** Tiếp tục phát nhạc khi Unpause game */
export function resumeGameMusic() {
  if (muted || musicChoice === 'off') return;
  try {
    if (currentBgmAudio && currentBgmAudio.paused) {
      currentBgmAudio.play().catch(() => {});
    } else if (!currentBgmAudio && currentBgmKey) {
      playGameMusic(currentBgmKey as MusicType);
    }
  } catch {}
}

/** Âm thanh khi bấm Tạm dừng (Pause jingle) */
export function playPauseSound() {
  if (muted || typeof window === 'undefined') return;
  const audio = getOrCreateAudio('pause');
  if (!audio) return;
  try {
    try { audio.currentTime = 0; } catch {}
    audio.volume = 0.65;
    audio.play().catch(() => {});
  } catch {}
}

/** Nhạc chiến thắng khi diệt hết virus (04. Fever Clear.mp3) */
export function playWin() {
  if (muted) return;
  try {
    if (currentBgmAudio) {
      try { currentBgmAudio.pause(); } catch {}
    }
    const audio = getOrCreateAudio('clear');
    if (audio) {
      try {
        try { audio.currentTime = 0; } catch {}
        audio.volume = 0.65;
        currentJingleAudio = audio;
        audio.play().catch(() => playWinSynth());
        return;
      } catch {}
    }
  } catch {}
  playWinSynth();
}

/** Nhạc khi thua cuộc (07. Game Over.mp3) */
export function playLose() {
  if (muted) return;
  try {
    if (currentBgmAudio) {
      try { currentBgmAudio.pause(); } catch {}
    }
    const audio = getOrCreateAudio('gameover');
    if (audio) {
      try {
        try { audio.currentTime = 0; } catch {}
        audio.volume = 0.65;
        currentJingleAudio = audio;
        audio.play().catch(() => playLoseSynth());
        return;
      } catch {}
    }
  } catch {}
  playLoseSynth();
}

// ========================================================
// HIỆU ỨNG TỨC THỜI (SFX) DÙNG WEB AUDIO API (KHÔNG TRỄ)
// ========================================================

// 1. Tiếng di chuyển viên thuốc sang trái/phải
export function playMove() {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.setValueAtTime(200, now + 0.015);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}

// 2. Tiếng xoay viên thuốc (A hoặc B)
export function playRotate() {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch {}
}

// 3. Tiếng viên thuốc chạm đáy / đáp xuống
export function playDrop() {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.07);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
}

// 4. Tiếng Bác sĩ Mario quăng viên thuốc lên không trung
export function playToss() {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {}
}

// 5. Tiếng tiêu diệt virus / ăn điểm (kèm combo)
export function playClear(combo = 1) {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const baseFreqs = [523.25, 659.25, 783.99, 1046.5];
    const mult = Math.min(1.5, 1 + (combo - 1) * 0.15);
    baseFreqs.forEach((freq, idx) => {
      const now = ac.currentTime + idx * 0.06;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq * mult, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    });
  } catch {}
}

// Fallback Synth Win
function playWinSynth() {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.3 },
    ];
    let t = ac.currentTime + 0.05;
    melody.forEach((note) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + note.d);
      t += note.d + 0.03;
    });
  } catch {}
}

// Fallback Synth Lose
function playLoseSynth() {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const notes = [440, 415.3, 392, 349.23];
    let t = ac.currentTime + 0.05;
    notes.forEach((freq) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.22);
      t += 0.22;
    });
  } catch {}
}
