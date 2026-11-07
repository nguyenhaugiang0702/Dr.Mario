export const COLS = 8, ROWS = 16;
export const COLORS = ['#e8402c', '#f8d838', '#3c78f8'];
export type Cell = { c: number; v: boolean; l: string }; // l: liên kết với nửa viên kia: '' | L R U D
export type Pill = { r: number; c: number; o: 0 | 1; a: number; b: number }; // o=0 ngang, o=1 dọc (a ở dưới, b ở trên)

export type Toss = {
  a: number;
  b: number;
  t: number;   // thời gian còn lại (ms)
  dur: number; // tổng thời gian quăng (ms)
};

export type State = {
  g: (Cell | null)[][];
  p: Pill | null;
  next: [number, number];
  ph: 'toss' | 'fall' | 'clear' | 'drop' | 'won' | 'lost';
  t: number;
  acc: number;
  level: number;
  speed: number;
  score: number;
  top: number;
  viruses: number;
  flash: number[][];
  toss: Toss | null;
  pillCount: number;
  speedUpTrigger?: boolean;
};

export function getDropInterval(speed: number, pillCount = 0): number {
  const step = Math.floor(Math.max(0, pillCount - 1) / 10);
  // Cân chỉnh tốc độ tiệm cận bản gốc NES nhưng tối ưu thêm độ trễ cho cảm ứng điện thoại:
  // - CHẬM:  720ms (gốc NES 667ms, cũ 800ms) - giảm 35ms / 10 viên, sàn 220ms
  // - VỪA:   450ms (gốc NES 333ms, cũ 550ms) - giảm 25ms / 10 viên, sàn 160ms
  // - NHANH: 280ms (gốc NES 233ms, cũ 350ms) - giảm 18ms / 10 viên, sàn 110ms
  const base = [720, 450, 280][speed] ?? 450;
  const dec = [35, 25, 18][speed] ?? 25;
  const min = [220, 160, 110][speed] ?? 160;
  return Math.max(min, base - step * dec);
}

const rnd = (n: number) => Math.floor(Math.random() * n);
const DIR: Record<string, number[]> = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] };
const free = (g: State['g'], r: number, c: number) => c >= 0 && c < COLS && r < ROWS && (r < 0 ? c >= 2 && c <= 5 && r >= -1 : !g[r][c]);
const cells = (p: Pill) => [[p.r, p.c], p.o ? [p.r - 1, p.c] : [p.r, p.c + 1]];
const fits = (s: State, p: Pill) => cells(p).every(([r, c]) => free(s.g, r, c));
const run = (g: State['g'], r: number, c: number, dr: number, dc: number, k: number) => {
  let n = 0;
  for (let i = 1; i < 3; i++) { const x = g[r + dr * i]?.[c + dc * i]; if (x && x.c === k) n++; else break; }
  return n;
};

export function newGame(level: number, speed: number, top = 0): State {
  const g: State['g'] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const n = Math.min(4 * (level + 1), 84), h = Math.min(10 + Math.max(0, (level - 14) >> 1), 12);

  // Phân bổ màu xoay vòng (0: đỏ, 1: vàng, 2: xanh) để luôn đảm bảo xuất hiện đủ 3 màu virus trong mọi màn
  const colorsToPlace: number[] = [];
  const startColor = rnd(3);
  for (let i = 0; i < n; i++) {
    colorsToPlace.push((startColor + i) % 3);
  }

  let placed = 0, guard = 0;
  while (placed < n && guard++ < 8000) {
    const r = ROWS - 1 - rnd(h), c = rnd(COLS);
    if (g[r][c]) continue;
    const k = colorsToPlace[placed];
    if (run(g, r, c, 0, -1, k) + run(g, r, c, 0, 1, k) >= 2 || run(g, r, c, -1, 0, k) + run(g, r, c, 1, 0, k) >= 2) continue;
    g[r][c] = { c: k, v: true, l: '' }; placed++;
  }

  // Bảo đảm tuyệt đối: nếu số lượng virus >= 3 thì luôn có ít nhất 1 con cho mỗi màu
  if (placed >= 3) {
    for (let targetColor = 0; targetColor < 3; targetColor++) {
      let hasTarget = false;
      for (let r = 0; r < ROWS && !hasTarget; r++) {
        for (let c = 0; c < COLS && !hasTarget; c++) {
          if (g[r][c]?.v && g[r][c]!.c === targetColor) hasTarget = true;
        }
      }
      if (!hasTarget) {
        outer: for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = g[r][c];
            if (cell && cell.v) {
              const oldColor = cell.c;
              cell.c = targetColor;
              if (run(g, r, c, 0, -1, targetColor) + run(g, r, c, 0, 1, targetColor) < 2 &&
                  run(g, r, c, -1, 0, targetColor) + run(g, r, c, 1, 0, targetColor) < 2) {
                break outer;
              }
              cell.c = oldColor;
            }
          }
        }
      }
    }
  }
  const s: State = {
    g,
    p: null,
    next: [rnd(3), rnd(3)],
    ph: 'toss',
    t: 700,
    acc: 0,
    level,
    speed,
    score: 0,
    top,
    viruses: placed,
    flash: [],
    toss: null,
    pillCount: 0,
    speedUpTrigger: false,
  };
  startToss(s);
  return s;
}

export function startToss(s: State) {
  if (s.g[0][3] || s.g[0][4]) {
    s.ph = 'lost';
    return;
  }
  s.pillCount = (s.pillCount || 0) + 1;
  if (s.pillCount > 1 && (s.pillCount - 1) % 10 === 0) {
    s.speedUpTrigger = true;
  }
  const a = s.next[0];
  const b = s.next[1];
  s.next = [rnd(3), rnd(3)];
  s.ph = 'toss';
  s.t = 700;
  s.toss = { a, b, t: 700, dur: 700 };
  s.p = null;
}

export const move = (s: State, dx: number) => {
  if (s.ph !== 'fall' || !s.p) return;
  const n = { ...s.p, c: s.p.c + dx }; if (fits(s, n)) s.p = n;
};

export const rotate = (s: State, cw: boolean) => {
  const p = s.p; if (s.ph !== 'fall' || !p) return;
  let n: Pill;
  if (!p.o) n = { ...p, o: 1, a: cw ? p.b : p.a, b: cw ? p.a : p.b };
  else { n = { ...p, o: 0, a: cw ? p.a : p.b, b: cw ? p.b : p.a }; if (!fits(s, n)) n = { ...n, c: n.c - 1 }; }
  if (fits(s, n)) s.p = n;
};

export function stepDown(s: State) {
  const p = s.p;
  if (s.ph !== 'fall' || !p) return;
  const n = { ...p, r: p.r + 1 };
  if (fits(s, n)) { s.p = n; s.acc = 0; return; }
  const [A, B] = cells(p);
  if (A[0] < 0 || B[0] < 0) { s.ph = 'lost'; return; }
  const [la, lb] = p.o ? ['U', 'D'] : ['R', 'L'];
  s.g[A[0]][A[1]] = { c: p.a, v: false, l: la };
  s.g[B[0]][B[1]] = { c: p.b, v: false, l: lb };
  s.p = null; check(s);
}

function matches(g: State['g']) {
  const out = new Set<number>();
  const scan = (len: number, wid: number, at: (i: number, j: number) => [number, number]) => {
    for (let i = 0; i < len; i++) for (let j = 0; j < wid;) {
      const [r, c] = at(i, j), x = g[r][c]; let e = j + 1;
      if (!x) { j++; continue; }
      while (e < wid && g[at(i, e)[0]][at(i, e)[1]]?.c === x.c) e++;
      if (e - j >= 4) for (let q = j; q < e; q++) { const [rr, cc] = at(i, q); out.add(rr * COLS + cc); }
      j = e;
    }
  };
  scan(ROWS, COLS, (i, j) => [i, j]); scan(COLS, ROWS, (i, j) => [j, i]);
  return [...out].map((k) => [Math.floor(k / COLS), k % COLS]);
}

function check(s: State) {
  const m = matches(s.g);
  if (m.length) { s.flash = m; s.ph = 'clear'; s.t = 350; return; }
  if (!s.viruses) { s.ph = 'won'; return; }
  startToss(s);
}

function remove(s: State) {
  let k = 0;
  for (const [r, c] of s.flash) {
    const x = s.g[r][c]; if (!x) continue;
    if (x.v) { k++; s.viruses--; }
    if (x.l) { const [dr, dc] = DIR[x.l]; const q = s.g[r + dr]?.[c + dc]; if (q) q.l = ''; }
    s.g[r][c] = null;
  }
  for (let i = 0; i < k; i++) s.score += 100 * 2 ** Math.min(i, 5);
  s.top = Math.max(s.top, s.score); s.flash = [];
}

function fall(s: State) {
  let moved = false;
  for (let r = ROWS - 2; r >= 0; r--) for (let c = 0; c < COLS; c++) {
    const x = s.g[r][c];
    if (!x || x.v || x.l === 'L' || x.l === 'D') continue;
    const w = x.l === 'R' ? [c, c + 1] : [c];
    if (!w.every((k) => !s.g[r + 1][k])) continue;
    for (const k of w) { s.g[r + 1][k] = s.g[r][k]; s.g[r][k] = null; }
    if (x.l === 'U') { s.g[r][c] = s.g[r - 1][c]; s.g[r - 1][c] = null; }
    moved = true;
  }
  return moved;
}

export function update(s: State, dt: number) {
  if (s.ph === 'toss') {
    s.t -= dt;
    if (s.toss) s.toss.t = Math.max(0, s.t);
    if (s.t <= 0) {
      if (s.g[0][3] || s.g[0][4]) {
        s.ph = 'lost';
        s.toss = null;
        return;
      }
      const a = s.toss ? s.toss.a : s.next[0];
      const b = s.toss ? s.toss.b : s.next[1];
      s.p = { r: 0, c: 3, o: 0, a, b };
      s.toss = null;
      s.ph = 'fall';
      s.acc = 0;
    }
  } else if (s.ph === 'fall') {
    s.acc += dt;
    if (s.acc >= getDropInterval(s.speed, s.pillCount)) {
      s.acc = 0;
      stepDown(s);
    }
  } else if (s.ph === 'clear' || s.ph === 'drop') {
    s.t -= dt;
    if (s.t > 0) return;
    if (s.ph === 'clear') {
      remove(s);
      s.ph = 'drop';
      s.t = 90;
    } else if (fall(s)) {
      s.t = 90;
    } else {
      check(s);
    }
  }
}
