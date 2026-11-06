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
  playPauseSound,
  playTitleMusic,
  playGameMusic,
  pauseGameMusic,
  resumeGameMusic,
  stopAllMusic,
  haptic,
  toggleMute,
  setMuted,
  getMusicChoice,
  setMusicChoice,
  unlockAudio,
  type MusicType,
} from '../lib/audio';

const SPEEDS = ['CHẬM', 'VỪA', 'NHANH'];

export default function Game() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [level, setLevel] = useState(10), [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true); // Mặc định luôn bật loa khi hiển thị trang chủ
  const [musicType, setMusicType] = useState<MusicType>('fever');
  const [ui, setUi] = useState({ ph: 'toss', score: 0, top: 0, viruses: 0 });

  const screenRef = useRef<'home' | 'game'>('home');
  screenRef.current = screen;

  const isTransitioningRef = useRef(false);

  const S = useRef<State>(newGame(10, 1)), top = useRef(0), run = useRef(false), isPlaying = useRef(false);
  const cf = useRef<HTMLCanvasElement>(null), cd = useRef<HTMLCanvasElement>(null), cm = useRef<HTMLCanvasElement>(null);
  const ct = useRef<HTMLCanvasElement>(null), boardRef = useRef<HTMLDivElement>(null);

  run.current = screen === 'game' && playing && !paused;
  isPlaying.current = playing;

  const reset = (l: number, sp: number) => { S.current = newGame(l, sp, top.current); };
  const act = (fn: (s: State) => void) => () => { if (run.current) fn(S.current); };

  const L = act((s) => { move(s, -1); playMove(); haptic(10); });
  const R = act((s) => { move(s, 1); playMove(); haptic(10); });
  const D = act((s) => { stepDown(s); haptic(12); });
  const U = act((s) => { rotate(s, true); playRotate(); haptic(15); });
  const A = act((s) => { rotate(s, true); playRotate(); haptic(15); });
  const B = act((s) => { rotate(s, false); playRotate(); haptic(15); });

  const togglePause = () => {
    if (!isPlaying.current) return;
    playPauseSound();
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        pauseGameMusic();
      } else {
        resumeGameMusic();
      }
      return next;
    });
  };

  const backToMenu = () => {
    setPlaying(false);
    setPaused(false);
    reset(level, speed);
    playTitleMusic();
  };

  const goToHome = () => {
    setPlaying(false);
    setPaused(false);
    setScreen('home');
    stopAllMusic();
  };

  // Người dùng bấm nút "CHƠI" ở trang chủ: kích hoạt âm thanh và chuyển sang bảng game
  const handleStartFromHome = (e?: React.SyntheticEvent | Event) => {
    if (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch {}
    }
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setTimeout(() => { isTransitioningRef.current = false; }, 350);

    // 1. Chuyển sang màn hình game ngay lập tức (không để bất cứ lỗi audio nào chặn)
    setScreen('game');
    setSoundOn(true);

    // 2. Mở khóa và phát âm thanh an toàn
    try {
      unlockAudio();
      setMuted(false);
      playTitleMusic();
    } catch (err) {
      console.warn('Audio start warning:', err);
    }
  };

  useEffect(() => {
    try { top.current = +(localStorage.getItem('drm-top') || 0); } catch { }
    // Mặc định luôn bật loa khi vào ứng dụng
    setMuted(false);
    setSoundOn(true);

    const initialMusic = getMusicChoice();
    setMusicType(initialMusic);

    let raf = 0, last = performance.now(), sig = '';

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      const s = S.current;
      if (run.current) update(s, dt);

      // Chỉ vẽ khi các canvas trên màn hình game đã sẵn sàng
      if (cf.current && cd.current && cm.current) {
        drawField(cf.current.getContext('2d')!, s, now);
        drawDoc(cd.current.getContext('2d')!, s.next, now, s.ph === 'toss');
        drawMag(cm.current.getContext('2d')!, now);
        if (ct.current) drawToss(ct.current.getContext('2d')!, s, cd.current, cf.current, boardRef.current);
      }

      const n = `${s.ph}|${s.score}|${s.top}|${s.viruses}`;
      if (n !== sig) {
        if (run.current) {
          if (s.ph === 'toss') playToss();
          else if (s.ph === 'clear') playClear(1);
          else if (s.ph === 'won') playWin();
          else if (s.ph === 'lost') playLose();
        }

        sig = n; setUi({ ph: s.ph, score: s.score, top: s.top, viruses: s.viruses });
        if (s.ph === 'won' || s.ph === 'lost') { top.current = s.top; try { localStorage.setItem('drm-top', String(s.top)); } catch { } }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const key = (e: KeyboardEvent) => {
      if (screenRef.current === 'home') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartFromHome();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        if (isPlaying.current) {
          e.preventDefault();
          togglePause();
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

    const hide = () => {
      if (document.hidden && isPlaying.current) {
        setPaused(true);
        pauseGameMusic();
      }
    };

    addEventListener('keydown', key);
    document.addEventListener('visibilitychange', hide);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  const hold = (fn: () => void, ms: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const pid = e.pointerId;
      try { btn.setPointerCapture(pid); } catch { }
      fn();
      const id = setInterval(fn, ms);
      const stop = (ev: PointerEvent) => {
        if (ev.pointerId === pid) {
          clearInterval(id);
          try {
            if (btn.hasPointerCapture(pid)) btn.releasePointerCapture(pid);
          } catch { }
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
    playGameMusic(musicType);
    playToss();
  };
  const over = playing && (ui.ph === 'won' || ui.ph === 'lost');

  return (
    <main className="app">
      {screen === 'home' ? (
        /* MÀN HÌNH TRANG CHỦ: CHỈ SHOW NÚT CHƠI & MẶC ĐỊNH BẬT LOA */
        <section
          className="home-screen"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.sound-btn')) return;
            handleStartFromHome(e);
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('.sound-btn')) return;
            handleStartFromHome(e);
          }}
        >
          <div className="home-top-bar">
            <button
              className="sound-btn"
              onClick={(e) => {
                e.stopPropagation();
                const newMuted = toggleMute(false, false);
                setSoundOn(!newMuted);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Bật tắt âm thanh"
              title="Bật/Tắt âm thanh"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>

            {top.current > 0 && (
              <div className="home-top-score">
                🏆 TOP: <b>{top.current}</b>
              </div>
            )}
          </div>

          <div className="home-hero">
            <div className="home-badge">NES CLASSIC</div>
            <h1 className="home-title">Dr.MARIO</h1>
            <p className="home-subtitle">XẾP THUỐC DIỆT VIRUS • 8-BIT</p>

            <div className="home-viruses">
              <div className="virus-card red">
                <span className="virus-emoji">🔴</span>
                <span className="virus-name">FEVER</span>
              </div>
              <div className="virus-card blue">
                <span className="virus-emoji">🔵</span>
                <span className="virus-name">CHILL</span>
              </div>
              <div className="virus-card yellow">
                <span className="virus-emoji">🟡</span>
                <span className="virus-name">WEIRD</span>
              </div>
            </div>
          </div>

          <div className="home-action">
            <button
              className="home-play-btn"
              onClick={handleStartFromHome}
              onPointerDown={handleStartFromHome}
              aria-label="Chơi game"
            >
              <span className="play-triangle">▶</span>
              <span>CHƠI</span>
            </button>
            <div className="home-hint">Chạm vào màn hình để bắt đầu</div>
          </div>

          <div className="home-footer">
            <span>© 1990 NINTENDO • DR. MARIO REMAKE</span>
          </div>
        </section>
      ) : (
        /* MÀN HÌNH TRÒ CHƠI & KHUNG ĐIỀU KHIỂN */
        <>
          {/* KHUNG CHƠI: 70% CHIỀU CAO THIẾT BỊ */}
          <section className="game-screen">
            <div className="title-row">
              <div className="title-left-group">
                <button
                  className="sound-btn"
                  onClick={() => setSoundOn(!toggleMute(playing, paused))}
                  aria-label="Bật tắt âm thanh"
                  title="Bật/Tắt âm thanh"
                >
                  {soundOn ? '🔊' : '🔇'}
                </button>
                <button
                  className="home-icon-btn"
                  onClick={goToHome}
                  aria-label="Về trang chủ"
                  title="Về trang chủ"
                >
                  🏠
                </button>
              </div>
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
                  <div className="row music-row">
                    {(['fever', 'chill', 'off'] as const).map((m) => (
                      <button
                        key={m}
                        className={m === musicType ? 'on' : ''}
                        onClick={() => {
                          setMusicType(m);
                          setMusicChoice(m);
                        }}
                      >
                        {m === 'fever' ? 'FEVER' : m === 'chill' ? 'CHILL' : 'TẮT NHẠC'}
                      </button>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 4, gap: 10 }}>
                    <button className="go" onClick={() => start()}>BẮT ĐẦU</button>
                    <button onClick={goToHome} style={{ background: '#3b3b8c' }}>TRANG CHỦ</button>
                  </div>
                </div>
              )}
              {playing && paused && (
                <div className="pause-overlay" onClick={togglePause} role="button" aria-label="Tiếp tục chơi">
                  <div className="pause-card">
                    <div className="pause-icon-circle">
                      <div className="pause-bars">
                        <span className="p-bar"></span>
                        <span className="p-bar"></span>
                      </div>
                    </div>
                    <span className="pause-title">TẠM DỪNG</span>
                    <span className="pause-hint">Chạm để tiếp tục</span>
                  </div>
                </div>
              )}
              {over && (
                <div className="ov">
                  <h2>{ui.ph === 'won' ? 'CHIẾN THẮNG!' : 'THUA RỒI!'}</h2>
                  <div className="row">
                    {ui.ph === 'won' ? (
                      <button className="go" onClick={() => { const l = Math.min(20, level + 1); setLevel(l); start(l); }}>
                        MÀN TIẾP
                      </button>
                    ) : (
                      <button className="go" onClick={() => start()}>
                        CHƠI LẠI
                      </button>
                    )}
                    <button onClick={backToMenu}>MENU</button>
                    <button onClick={goToHome} style={{ background: '#3b3b8c' }}>TRANG CHỦ</button>
                  </div>
                </div>
              )}
            </div>

            <div className="bar">
              <button onClick={() => playing && togglePause()}>{paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
              <button onClick={backToMenu}>Menu</button>
              <button onClick={goToHome}>Trang chủ</button>
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
        </>
      )}
    </main>
  );
}
