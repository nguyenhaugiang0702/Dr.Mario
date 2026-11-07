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
  // Cổ chai và thân chai
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

export function drawDoc(x: C, next: [number, number], t: number, isToss = false) {
  const b = Math.floor(t / 500) % 2;
  x.clearRect(0, 0, 64, 48);
  x.fillStyle = '#000';
  x.fillRect(0, 0, 64, 48);

  // Thân áo blouse trắng
  x.fillStyle = '#f8f8f8';
  x.fillRect(8, 26, 22, 22);

  // Đầu, tóc, mặt
  x.fillStyle = '#703010';
  x.fillRect(10, 6, 18, 6);
  x.fillStyle = '#f8b878';
  x.fillRect(11, 12, 16, 12);
  x.fillStyle = '#000';
  x.fillRect(14, 16, 2, 2);
  x.fillRect(22, 16, 2, 2);
  x.fillStyle = '#703010';
  x.fillRect(14, 21, 10, 3);
  x.fillStyle = '#ddd';
  x.fillRect(17, 3, 6, 4);

  if (isToss) {
    // TƯ THẾ QUĂNG: Cánh tay vung cao ra phía trước ném thuốc
    x.fillStyle = '#f8f8f8';
    x.fillRect(26, 14, 8, 14); // tay áo vươn cao
    x.fillStyle = '#f8b878';
    x.fillRect(28, 8, 7, 7);   // bàn tay mở ném thuốc
  } else {
    // TƯ THẾ NGHỈ: Bàn tay cầm sẵn viên thuốc tiếp theo
    x.fillStyle = '#f8f8f8';
    x.fillRect(30, 30 + b, 10, 5);
    half(x, 40, 28 + b, COLORS[next[0]], 'R');
    half(x, 48, 28 + b, COLORS[next[1]], 'L');
  }
}

export function drawMag(x: C, t: number, s?: State) {
  x.clearRect(0, 0, 64, 64);
  const disc = (r: number, col: string) => {
    x.fillStyle = col;
    for (let y = -r; y <= r; y++)
      for (let i = -r; i <= r; i++)
        if (i * i + y * y <= r * r) x.fillRect(30 + i, 30 + y, 1, 1);
  };
  disc(28, '#c8c8d8');
  disc(25, '#18186a');
  x.fillStyle = '#a06028';
  for (let i = 0; i < 14; i++) x.fillRect(12 - i, 48 + i, 4, 3);

  // Kiểm tra virus còn lại theo từng màu (0: đỏ, 1: vàng, 2: xanh)
  let hasYellow = true, hasBlue = true, hasRed = true;
  if (s) {
    if (s.viruses <= 0 || s.ph === 'won') {
      hasYellow = false;
      hasBlue = false;
      hasRed = false;
    } else {
      let redCount = 0, yellowCount = 0, blueCount = 0;
      for (let r = 0; r < s.g.length; r++) {
        for (let c = 0; c < s.g[r].length; c++) {
          const cell = s.g[r][c];
          if (cell && cell.v) {
            if (cell.c === 0) redCount++;
            else if (cell.c === 1) yellowCount++;
            else if (cell.c === 2) blueCount++;
          }
        }
      }
      hasRed = redCount > 0;
      hasYellow = yellowCount > 0;
      hasBlue = blueCount > 0;
    }
  }

  const list: [number, number, number][] = [];
  if (hasYellow) list.push([10, 26, 1]);
  if (hasBlue) list.push([22, 10, 2]);
  if (hasRed) list.push([32, 30, 0]);

  list.forEach(([px, py, k], i) =>
    virus(x, px, py + Math.round(Math.sin(t / 200 + i * 2) * 2), COLORS[k], Math.floor(t / 300 + i) % 2, 2)
  );
}

function drawFlyingPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  colA: string,
  colB: string,
  angle: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Viền đen ngoài toàn bộ viên thuốc
  ctx.fillStyle = '#000';
  ctx.fillRect(-9, -5, 18, 10);

  // Nửa viên A (bên trái)
  ctx.fillStyle = colA;
  ctx.fillRect(-8, -4, 8, 8);
  // Bo góc trái
  ctx.fillStyle = '#000';
  ctx.fillRect(-9, -5, 2, 2);
  ctx.fillRect(-9, 3, 2, 2);
  // Ánh sáng bóng trắng (specular reflection)
  ctx.fillStyle = '#fff';
  ctx.fillRect(-6, -3, 2, 1);
  ctx.fillRect(-7, -2, 1, 2);

  // Nửa viên B (bên phải)
  ctx.fillStyle = colB;
  ctx.fillRect(0, -4, 8, 8);
  // Bo góc phải
  ctx.fillStyle = '#000';
  ctx.fillRect(7, -5, 2, 2);
  ctx.fillRect(7, 3, 2, 2);
  // Ánh sáng bóng trắng
  ctx.fillStyle = '#fff';
  ctx.fillRect(2, -3, 2, 1);
  ctx.fillRect(1, -2, 1, 2);

  // Vết nối giữa hai nửa viên
  ctx.fillStyle = '#000';
  ctx.fillRect(-0.5, -4, 1, 8);

  ctx.restore();
}

export function drawToss(
  ctx: CanvasRenderingContext2D,
  s: State,
  cdEl: HTMLCanvasElement | null,
  cfEl: HTMLCanvasElement | null,
  bEl: HTMLElement | null
) {
  if (!bEl || !cdEl || !cfEl) return;
  const bw = bEl.clientWidth;
  const bh = bEl.clientHeight;
  if (ctx.canvas.width !== bw || ctx.canvas.height !== bh) {
    ctx.canvas.width = bw;
    ctx.canvas.height = bh;
  }
  ctx.clearRect(0, 0, bw, bh);

  if (s.ph !== 'toss' || !s.toss) return;

  const bRect = bEl.getBoundingClientRect();
  const docRect = cdEl.getBoundingClientRect();
  const fieldRect = cfEl.getBoundingClientRect();

  // Kích thước viên thuốc bay theo đúng tỉ lệ ô trong bình thuốc
  const cellWidth = (fieldRect.width / 72) * 8;
  const pillScale = Math.max(0.8, cellWidth / 8);

  // Tọa độ tay bác sĩ Mario bên phải
  const startX = docRect.left - bRect.left + docRect.width * 0.45;
  const startY = docRect.top - bRect.top + docRect.height * 0.25;

  // Tọa độ miệng cổ chai
  const neckX = fieldRect.left - bRect.left + fieldRect.width * 0.5;
  const neckY = fieldRect.top - bRect.top + fieldRect.height * (8 / 152);

  // Tọa độ đích đến (hàng 0 trong bình)
  const targetX = fieldRect.left - bRect.left + fieldRect.width * (36 / 72);
  const targetY = fieldRect.top - bRect.top + fieldRect.height * (24 / 152);

  const dur = s.toss.dur || 700;
  const p = Math.min(1, Math.max(0, 1 - s.toss.t / dur));

  let currX: number, currY: number, angle: number;

  const tossSplit = 0.65; // 65% thời gian: bay hình vòng cung và xoay; 35% thời gian: rơi từ từ vào cổ chai
  if (p < tossSplit) {
    const t1 = p / tossSplit;
    // Đường cong parabol bay vút lên trên bình
    const midX = (startX + neckX) * 0.5;
    const apexY = Math.min(startY, neckY) - Math.max(30, fieldRect.height * 0.12);

    currX = (1 - t1) * (1 - t1) * startX + 2 * (1 - t1) * t1 * midX + t1 * t1 * neckX;
    currY = (1 - t1) * (1 - t1) * startY + 2 * (1 - t1) * t1 * apexY + t1 * t1 * neckY;
    // Xoay tròn liên tục trong lúc bay (3 vòng)
    angle = t1 * Math.PI * 6;

    // Vệt hào quang lấp lánh nhẹ theo sau
    if (t1 > 0.08) {
      ctx.save();
      ctx.fillStyle = '#ffffffaa';
      for (let i = 1; i <= 3; i++) {
        const trailT = Math.max(0, t1 - i * 0.05);
        const tx = (1 - trailT) * (1 - trailT) * startX + 2 * (1 - trailT) * trailT * midX + trailT * trailT * neckX;
        const ty = (1 - trailT) * (1 - trailT) * startY + 2 * (1 - trailT) * trailT * apexY + trailT * trailT * neckY;
        ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
      }
      ctx.restore();
    }
  } else {
    // Giai đoạn rơi từ từ từ cổ chai xuống hàng 0
    const t2 = (p - tossSplit) / (1 - tossSplit);
    // Rơi mượt mà từ miệng chai vào hàng 0
    const ease = t2 * (2 - t2);
    currX = neckX + (targetX - neckX) * ease;
    currY = neckY + (targetY - neckY) * ease;
    // Dần dần xoay ngang thẳng thớm
    angle = (1 - t2) * 0.4;
  }

  drawFlyingPill(ctx, currX, currY, COLORS[s.toss.a], COLORS[s.toss.b], angle, pillScale);
}
