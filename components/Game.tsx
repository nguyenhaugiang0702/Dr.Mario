'use client';
import { useEffect, useRef, useState } from 'react';
import { State, newGame, move, rotate, stepDown, update } from '../lib/engine';
import { drawField, drawDoc, drawMag, drawToss } from '../lib/draw';
import {
  playMove,
  playRotate,
  playToss,
  playClear,
  playWin,
  playLose,
  haptic,
  toggleMute,
  initMute,
} from '../lib/audio';

const SPEEDS = ['CHẬM', 'VỪA', 'NHANH'];

export default function Game() {
  const [level, setLevel] = useState(10), [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [ui, setUi] = useState({ ph: 'toss', score: 0, top: 0, viruses: 0 });
  const S = useRef<State>(newGame(10, 1)), top = useRef(0), run = useRef(false), isPlaying = useRef(false);
  const cf = useRef<HTMLCanvasElement>(null), cd = useRef<HTMLCanvasElement>(null), cm = useRef<HTMLCanvasElement>(null);
  const ct = useRef<HTMLCanvasElement>(null), boardRef = useRef<HTMLDivElement>(null);

  run.current = playing && !paused;
  isPlaying.current = playing;

  const reset = (l: number, sp: number) => { S.current = newGame(l, sp, top.current); };
  const act = (fn: (s: State) => void) => () => { if (run.current) fn(S.current); };

  const L = act((s) => { move(s, -1); playMove(); haptic(10); });
  const R = act((s) => { move(s, 1); playMove(); haptic(10); });
  const D = act((s) => { stepDown(s); haptic(12); });
  const U = act((s) => { rotate(s, true); playRotate(); haptic(15); });
  const A = act((s) => { rotate(s, true); playRotate(); haptic(15); });
  const B = act((s) => { rotate(s, false); playRotate(); haptic(15); });

  useEffect(() => {
    try { top.current = +(localStorage.getItem('drm-top') || 0); } catch {}
    setSoundOn(!initMute());

    let raf = 0, last = performance.now(), sig = '';
    const ctx = (r: React.RefObject<HTMLCanvasElement | null>) => r.current!.getContext('2d')!;

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      const s = S.current;
      if (run.current) update(s, dt);

      drawField(ctx(cf), s, now);
      drawDoc(ctx(cd), s.next, now, s.ph === 'toss');
      drawMag(ctx(cm), now);
      if (ct.current) drawToss(ct.current.getContext('2d')!, s, cd.current, cf.current, boardRef.current);

      const n = `${s.ph}|${s.score}|${s.top}|${s.viruses}`;
      if (n !== sig) {
        if (run.current) {
          if (s.ph === 'toss') playToss();
          else if (s.ph === 'clear') playClear(1);
          else if (s.ph === 'won') playWin();
          else if (s.ph === 'lost') playLose();
        }

        sig = n; setUi({ ph: s.ph, score: s.score, top: s.top, viruses: s.viruses });
        if (s.ph === 'won' || s.ph === 'lost') { top.current = s.top; try { localStorage.setItem('drm-top', String(s.top)); } catch {} }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const key = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        if (isPlaying.current) {
          e.preventDefault();
          setPaused((prev) => !prev);
        }
        return;
      }
      if (!run.current) return;
      const s = S.current;
      if (e.key === 'ArrowLeft') { move(s, -1); playMove(); }
      else if (e.key === 'ArrowRight') { move(s, 1); playMove(); }
      else if (e.key === 'ArrowDown') { stepDown(s); }
      else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') { rotate(s, true); playRotate(); }
      else if (e.key === 'z' || e.key === 'Z') { rotate(s, false); playRotate(); }
      else return;
      e.preventDefault();
    };

    const hide = () => document.hidden && setPaused(true);
    addEventListener('keydown', key); document.addEventListener('visibilitychange', hide);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); document.removeEventListener('visibilitychange', hide); };
  }, []);

  const hold = (fn: () => void, ms: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const pid = e.pointerId;
      try { btn.setPointerCapture(pid); } catch {}
      fn();
      const id = setInterval(fn, ms);
      const stop = (ev: PointerEvent) => {
        if (ev.pointerId === pid) {
          clearInterval(id);
          try {
            if (btn.hasPointerCapture(pid)) btn.releasePointerCapture(pid);
          } catch {}
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        }
      };
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const tap = (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      fn();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const start = (l = level) => {
    reset(l, speed);
    setPlaying(true);
    setPaused(false);
    playToss();
  };
  const over = playing && (ui.ph === 'won' || ui.ph === 'lost');

  return (
    <main className="app">
      {/* KHUNG CHƠI: 70% CHIỀU CAO THIẾT BỊ */}
      <section className="game-screen">
        <div className="title-row">
          <button
            className="sound-btn"
            onClick={() => setSoundOn(!toggleMute())}
            aria-label="Bật tắt âm thanh"
            title="Bật/Tắt âm thanh"
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <h1 className="title">Dr.MARIO</h1>
        </div>

        {/* Dòng thông số dạng text nằm ngang, không kẻ bảng */}
        <div className="status-bar">
          <span className="stat-item">MÀN <b>{level}</b></span>
          <span className="stat-sep">•</span>
          <span className="stat-item">TỐC ĐỘ <b>{SPEEDS[speed]}</b></span>
          <span className="stat-sep">•</span>
          <span className="stat-item">VIRUS <b>{ui.viruses}</b></span>
        </div>

        <div ref={boardRef} className="board">
          {/* Kính lúp virus bên trái */}
          <div className="side-panel side-left">
            <canvas ref={cm} width={64} height={64} className="px mag" />
          </div>

          {/* Khung chứa thuốc ở giữa - ĐƯỢC PHÓNG TO TỐI ĐA */}
          <div className="field-wrap">
            <canvas ref={cf} width={72} height={152} className="px field" />
          </div>

          {/* Bác sĩ Mario bên phải */}
          <div className="side-panel side-right">
            <canvas ref={cd} width={64} height={48} className="px doc" />
          </div>

          {/* Lớp vẽ hiệu ứng quăng viên thuốc xoay trên không và rơi vào bình */}
          <canvas ref={ct} className="toss-overlay" />

          {!playing && (
            <div className="ov">
              <h2>CHỌN MÀN</h2>
              <div className="row">
                <button onClick={() => { const l = Math.max(0, level - 1); setLevel(l); reset(l, speed); }}>−</button>
                <span className="lvl-text">Màn {level}</span>
                <button onClick={() => { const l = Math.min(20, level + 1); setLevel(l); reset(l, speed); }}>+</button>
              </div>
              <div className="row">
                {SPEEDS.map((n, i) => (
                  <button key={n} className={i === speed ? 'on' : ''} onClick={() => setSpeed(i)}>
                    {n}
                  </button>
                ))}
              </div>
              <button className="go" onClick={() => start()}>BẮT ĐẦU</button>
            </div>
          )}
          {playing && paused && (
            <div className="ov">
              <h2>TẠM DỪNG</h2>
              <button className="go" onClick={() => setPaused(false)}>TIẾP TỤC</button>
            </div>
          )}
          {over && (
            <div className="ov">
              <h2>{ui.ph === 'won' ? 'CHIẾN THẮNG!' : 'THUA RỒI!'}</h2>
              {ui.ph === 'won' ? (
                <button className="go" onClick={() => { const l = Math.min(20, level + 1); setLevel(l); start(l); }}>
                  MÀN TIẾP
                </button>
              ) : (
                <button className="go" onClick={() => start()}>
                  CHƠI LẠI
                </button>
              )}
              <button onClick={() => { setPlaying(false); reset(level, speed); }}>MENU</button>
            </div>
          )}
        </div>

        <div className="bar">
          <button onClick={() => playing && setPaused(!paused)}>{paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
          <button onClick={() => { setPlaying(false); setPaused(false); reset(level, speed); }}>Menu</button>
        </div>
      </section>

      {/* CỤM NÚT ĐIỀU KHIỂN: 30% CHIỀU CAO THIẾT BỊ */}
      <section className="controls-screen">
        <div className="dpad">
          <button className="d-btn d-up" {...tap(U)} aria-label="Lên / Xoay">▲</button>
          <button className="d-btn d-left" {...hold(L, 110)} aria-label="Sang trái">◀</button>
          <div className="d-center" />
          <button className="d-btn d-right" {...hold(R, 110)} aria-label="Sang phải">▶</button>
          <button className="d-btn d-down" {...hold(D, 45)} aria-label="Hạ nhanh">▼</button>
        </div>
        <div className="ab">
          <button className="round" {...tap(B)} aria-label="Nút B (Xoay ngược)">B</button>
          <button className="round" {...tap(A)} aria-label="Nút A (Xoay thuận)">A</button>
        </div>
      </section>
    </main>
  );
}
