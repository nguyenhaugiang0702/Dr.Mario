// Hệ thống âm thanh 8-bit Retro sử dụng Web Audio API (không cần tải file ngoài)
let ctx: AudioContext | null = null;
let muted = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem('drm-mute', muted ? '1' : '0');
  } catch {}
  return muted;
}

export function initMute(): boolean {
  try {
    muted = localStorage.getItem('drm-mute') === '1';
  } catch {}
  return muted;
}

// Rung phản hồi xúc giác nhẹ trên điện thoại
export function haptic(ms = 12) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}

// 1. Tiếng di chuyển viên thuốc sang trái/phải
export function playMove() {
  if (muted) return;
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
}

// 2. Tiếng xoay viên thuốc (A hoặc B)
export function playRotate() {
  if (muted) return;
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
}

// 3. Tiếng viên thuốc chạm đáy / đáp xuống
export function playDrop() {
  if (muted) return;
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
}

// 4. Tiếng Bác sĩ Mario quăng viên thuốc lên không trung
export function playToss() {
  if (muted) return;
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
}

// 5. Tiếng tiêu diệt virus / ăn điểm (kèm combo)
export function playClear(combo = 1) {
  if (muted) return;
  const ac = getAudioContext();
  if (!ac) return;
  const baseFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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
}

// 6. Nhạc chiến thắng khi diệt hết virus
export function playWin() {
  if (muted) return;
  const ac = getAudioContext();
  if (!ac) return;
  const melody = [
    { f: 523.25, d: 0.12 }, // C5
    { f: 659.25, d: 0.12 }, // E5
    { f: 783.99, d: 0.12 }, // G5
    { f: 1046.5, d: 0.3 },  // C6
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
}

// 7. Nhạc thua cuộc (Game Over)
export function playLose() {
  if (muted) return;
  const ac = getAudioContext();
  if (!ac) return;
  const notes = [440, 415.3, 392, 349.23]; // A4, Ab4, G4, F4
  let t = ac.currentTime + 0.05;
  notes.forEach((freq, i) => {
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
}

