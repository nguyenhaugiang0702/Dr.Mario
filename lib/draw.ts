import { COLORS, State } from './engine';
type C = CanvasRenderingContext2D;
const V1 = ['..xxxx..', '.xxxxxx.', 'xxxxxxxx', 'xwwxxwwx', 'xkwxxkwx', 'xxxxxxxx', '.xx..xx.', 'xx....xx'];
const V2 = [...V1.slice(0, 6), 'x.xxxx.x', '.x....x.'];
function virus(x: C, px: number, py: number, col: string, f: number, s = 1) {
  (f ? V2 : V1).forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    x.fillStyle = ch === 'x' ? col : ch === 'w' ? '#fff' : '#000';
    x.fillRect(px + i * s, py + j * s, s, s);
  }));
}
function half(x: C, px: number, py: number, col: string, l: string) {
  x.fillStyle = col; x.fillRect(px, py, 8, 8);
  x.fillStyle = '#000';
  const o = (d: string) => l !== d;
  if (o('U') && o('L')) x.fillRect(px, py, 1, 1);
  if (o('U') && o('R')) x.fillRect(px + 7, py, 1, 1);
  if (o('D') && o('L')) x.fillRect(px, py + 7, 1, 1);
  if (o('D') && o('R')) x.fillRect(px + 7, py + 7, 1, 1);
  x.fillStyle = '#fff'; x.fillRect(px + 2, py + 1, 2, 1); x.fillRect(px + 1, py + 2, 1, 2);
}
export function drawField(x: C, s: State, t: number) {
  x.clearRect(0, 0, 72, 152);
  x.fillStyle = '#aab8f0'; x.fillRect(0, 16, 72, 136); x.fillRect(16, 0, 40, 20);
  x.fillStyle = '#000'; x.fillRect(4, 20, 64, 128); x.fillRect(20, 4, 32, 16);
  const blink = Math.floor(t / 90) % 2, f = Math.floor(t / 400) % 2;
  const fl = new Set(s.flash.map(([r, c]) => r * 8 + c));
  s.g.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell) return;
    const col = fl.has(r * 8 + c) && blink ? '#fff' : COLORS[cell.c];
    if (cell.v) virus(x, 4 + c * 8, 20 + r * 8, col, f); else half(x, 4 + c * 8, 20 + r * 8, col, cell.l);
  }));
  const p = s.p;
  if (p) {
    half(x, 4 + p.c * 8, 20 + p.r * 8, COLORS[p.a], p.o ? 'U' : 'R');
    half(x, 4 + (p.o ? p.c : p.c + 1) * 8, 20 + (p.o ? p.r - 1 : p.r) * 8, COLORS[p.b], p.o ? 'D' : 'L');
  }
}
export function drawDoc(x: C, next: [number, number], t: number) {
  const b = Math.floor(t / 500) % 2;
  x.clearRect(0, 0, 64, 48); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 48);
  x.fillStyle = '#f8f8f8'; x.fillRect(8, 26, 22, 22); x.fillRect(30, 30 + b, 10, 5);
  x.fillStyle = '#703010'; x.fillRect(10, 6, 18, 6);
  x.fillStyle = '#f8b878'; x.fillRect(11, 12, 16, 12);
  x.fillStyle = '#000'; x.fillRect(14, 16, 2, 2); x.fillRect(22, 16, 2, 2);
  x.fillStyle = '#703010'; x.fillRect(14, 21, 10, 3);
  x.fillStyle = '#ddd'; x.fillRect(17, 3, 6, 4);
  half(x, 40, 28 + b, COLORS[next[0]], 'R'); half(x, 48, 28 + b, COLORS[next[1]], 'L');
}
export function drawMag(x: C, t: number) {
  x.clearRect(0, 0, 64, 64);
  const disc = (r: number, col: string) => { x.fillStyle = col; for (let y = -r; y <= r; y++) for (let i = -r; i <= r; i++) if (i * i + y * y <= r * r) x.fillRect(30 + i, 30 + y, 1, 1); };
  disc(28, '#c8c8d8'); disc(25, '#18186a');
  x.fillStyle = '#a06028'; for (let i = 0; i < 14; i++) x.fillRect(12 - i, 48 + i, 4, 3);
  [[10, 26, 1], [22, 10, 2], [32, 30, 0]].forEach(([px, py, k], i) =>
    virus(x, px, py + Math.round(Math.sin(t / 200 + i * 2) * 2), COLORS[k], Math.floor(t / 300 + i) % 2, 2));
}
