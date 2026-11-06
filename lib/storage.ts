import { State } from './engine';
import { MusicType } from './audio';

export interface SavedGame {
  state: State;
  level: number;
  speed: number;
  musicType: MusicType;
  savedAt: number;
}

const STORAGE_KEY = 'drm-saved-session';

/** Lưu trạng thái ván đấu hiện tại vào localStorage */
export function saveGameSession(state: State, level: number, speed: number, musicType: MusicType) {
  if (typeof window === 'undefined') return;
  // Không lưu ván đã kết thúc (thắng hoặc thua)
  if (!state || state.ph === 'won' || state.ph === 'lost' || state.viruses <= 0) {
    clearSavedGameSession();
    return;
  }
  try {
    const data: SavedGame = {
      state,
      level,
      speed,
      musicType,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/** Tải ván đấu đã lưu từ localStorage (nếu có và hợp lệ) */
export function loadSavedGameSession(): SavedGame | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedGame = JSON.parse(raw);
    if (
      parsed &&
      parsed.state &&
      Array.isArray(parsed.state.g) &&
      parsed.state.viruses > 0 &&
      parsed.state.ph !== 'won' &&
      parsed.state.ph !== 'lost'
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

/** Xóa ván đấu đã lưu khi ván kết thúc hoặc người chơi chọn Ván mới */
export function clearSavedGameSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

