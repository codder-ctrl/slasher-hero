import { STORAGE_KEY } from './config.js';
import { serializeState } from './logic.js';

// Saves to localStorage. Storage may be unavailable (private windows, embedded previews),
// so every access is wrapped and the game keeps working without it.

export function loadRaw() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function save(state) {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// Save codes for moving progress between devices: base64 of the UTF-8 JSON.
export function exportCode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(serializeState(state)));
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

// Returns the saved data, or null when the code is broken. Check isOwnSave() before loading:
// a valid code from another game (e.g. Piksel Savaşçı) decodes fine but must be refused.
export function importCode(code) {
  try {
    const bin = atob(code.replace(/\s+/g, ''));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}
