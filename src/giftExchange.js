// ============================================================================
// WINTERHOF — Serverless Christmas Gift Parcel Exchange (Code & Share Link)
// ============================================================================

import { ITEMS } from './gameData.js';

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeGiftParcel({ from, note, items }) {
  const cleanItems = {};
  for (const [id, qty] of Object.entries(items)) {
    if (ITEMS[id] && qty > 0) cleanItems[id] = Math.min(9, Math.floor(qty));
  }
  const payload = {
    v: 1,
    id: Math.random().toString(36).slice(2, 9),
    f: (from || 'Dein Winterhof').slice(0, 24),
    n: (note || 'Frohe Weihnachten! 🎄❤️').slice(0, 120),
    i: cleanItems
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return 'WH-' + toBase64Url(bytes);
}

export function decodeGiftParcel(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  let token = rawInput.trim();
  // Support pasting a full URL containing ?gift=...
  const urlMatch = token.match(/[?&]gift=([A-Za-z0-9_-]+)/);
  if (urlMatch) token = urlMatch[1];
  if (token.startsWith('WH-')) token = token.slice(3);
  try {
    const bytes = fromBase64Url(token);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || data.v !== 1 || !data.id || !data.i || typeof data.i !== 'object') return null;
    const validItems = {};
    let total = 0;
    for (const [id, qty] of Object.entries(data.i)) {
      if (ITEMS[id] && Number.isFinite(qty) && qty > 0) {
        validItems[id] = Math.min(9, Math.floor(qty));
        total += validItems[id];
      }
    }
    if (total === 0) return null;
    return {
      id: String(data.id),
      from: String(data.f || 'Weihnachtsfreund').slice(0, 24),
      note: String(data.n || 'Ein liebes Weihnachtspäckchen für dich!').slice(0, 120),
      items: validItems
    };
  } catch {
    return null;
  }
}

export function buildGiftShareUrl(code) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('gift', code);
    return u.toString();
  } catch {
    return code;
  }
}

export function getIncomingUrlGift() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('gift');
    if (!code) return null;
    return decodeGiftParcel(code);
  } catch {
    return null;
  }
}

export function clearIncomingUrlGift() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has('gift')) {
      u.searchParams.delete('gift');
      window.history.replaceState({}, '', u.toString());
    }
  } catch {
    // ignore in file:// or sandboxed iframe
  }
}
