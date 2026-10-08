export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch(e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function createPinHash(pin: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return hashPinLegacy(pin);
  }
  
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256 // 32 bytes
  );
  
  const saltBase64 = btoa(String.fromCharCode(...new Uint8Array(salt)));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  
  return `pbkdf2_v1.${saltBase64}.${iterations}.${hashBase64}`;
}

export async function hashPinLegacy(pin: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(plainPin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  
  if (storedHash.startsWith('pbkdf2_v1.')) {
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;
    
    try {
      const parts = storedHash.split('.');
      if (parts.length !== 4) return false;
      
      const saltBase64 = parts[1];
      const iterations = parseInt(parts[2], 10);
      const originalHashBase64 = parts[3];
      
      const saltString = atob(saltBase64);
      const salt = new Uint8Array(saltString.length);
      for (let i = 0; i < saltString.length; i++) {
        salt[i] = saltString.charCodeAt(i);
      }
      
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(plainPin),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      
      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: iterations,
          hash: "SHA-256"
        },
        keyMaterial,
        256
      );
      
      const computedHashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      return computedHashBase64 === originalHashBase64;
    } catch (e) {
      console.error("Error verifying PBKDF2 pin:", e);
      return false;
    }
  }
  
  // Legacy check
  const legacyHash = await hashPinLegacy(plainPin);
  return legacyHash === storedHash;
}

export async function encryptData(data: string, password: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return btoa(unescape(encodeURIComponent(data)));
  }
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(data)
  );
  
  const encryptedArray = Array.from(new Uint8Array(encrypted));
  const encryptedHex = encryptedArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return JSON.stringify({ v: 1, s: saltHex, i: ivHex, d: encryptedHex });
}

export async function decryptData(encryptedStr: string, password: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    try {
      if (encryptedStr.startsWith('{')) throw new Error("Fallback cannot decrypt true secure data");
      return decodeURIComponent(escape(atob(encryptedStr)));
    } catch(e) {
      return encryptedStr;
    }
  }
  const enc = new TextEncoder();
  const parsed = JSON.parse(encryptedStr);
  if (parsed.v !== 1) throw new Error("Unsupported version");
  
  const salt = new Uint8Array(parsed.s.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  const iv = new Uint8Array(parsed.i.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  const encryptedData = new Uint8Array(parsed.d.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedData
  );
  
  return new TextDecoder().decode(decrypted);
}

export function formatReminderDate(isoString: string | undefined, lang: 'id' | 'en'): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
      
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    if (isSameDay(d, today)) {
      return lang === 'id' ? `Hari ini, ${timeStr}` : `Today, ${timeStr}`;
    } else if (isSameDay(d, tomorrow)) {
      return lang === 'id' ? `Besok, ${timeStr}` : `Tomorrow, ${timeStr}`;
    } else {
      const day = d.getDate();
      const monthNamesID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthNamesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = lang === 'id' ? monthNamesID[d.getMonth()] : monthNamesEN[d.getMonth()];
      return `${day} ${monthName} ${d.getFullYear()}, ${timeStr}`;
    }
  } catch (e) {
    return isoString;
  }
}

// Legacy XOR key strictly for one-time migration. 
// Do not use for new obfuscations.
const LEGACY_API_KEY_SECRET = 'tata_secure_local_key_salt_2026';

/**
 * Honest Browser Obfuscation
 * Since storing secrets securely in a browser (localStorage) is cryptographically impossible 
 * without a user-provided password, we do not pretend to encrypt it. 
 * We use Base64 to prevent casual shoulder-surfing in DevTools.
 */
export function obfuscateApiKey(rawKey: string): string {
  if (!rawKey) return '';
  try {
    const base64 = btoa(encodeURIComponent(rawKey));
    return `obf_v1:${base64}`;
  } catch (e) {
    return rawKey;
  }
}

export function deobfuscateApiKey(storedValue: string): string {
  if (!storedValue) return '';
  
  if (storedValue.startsWith('obf_v1:')) {
    try {
      const base64 = storedValue.substring(7);
      return decodeURIComponent(atob(base64));
    } catch (e) {
      return storedValue;
    }
  }
  
  if (storedValue.startsWith('enc_v1:')) {
    try {
      const hex = storedValue.substring(7);
      const matches = hex.match(/.{1,2}/g);
      if (!matches) return storedValue;
      
      const bytes = new Uint8Array(matches.map(b => parseInt(b, 16)));
      const keyBytes = new TextEncoder().encode(LEGACY_API_KEY_SECRET);
      
      const plainBytes = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        plainBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return new TextDecoder().decode(plainBytes);
    } catch (e) {
      return storedValue;
    }
  }

  return storedValue;
}

const INDO_MONTH_MAP: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05', may: '05',
  jun: '06', juni: '06', june: '06',
  jul: '07', juli: '07', july: '07',
  agu: '08', agt: '08', agustus: '08', aug: '08', august: '08',
  sep: '09', september: '09',
  okt: '10', oktober: '10', oct: '10', october: '10',
  nov: '11', november: '11',
  des: '12', desember: '12', dec: '12', december: '12',
};

/**
 * Universal date parser that reliably converts ISO, Indonesian localized,
 * English localized, slash, and dash date formats into a standard YYYY-MM-DD string.
 */
export function parseDateToIso(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }

  // Check 'Hari ini', 'Today', 'Besok', 'Tomorrow'
  const lower = trimmed.toLowerCase();
  const now = new Date();
  const todayIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  if (lower === 'hari ini' || lower === 'today') return todayIso;
  if (lower === 'besok' || lower === 'tomorrow') {
    const tomorrow = new Date(now.getTime() + 86400000);
    return new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }

  // Direct YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO DateTime: YYYY-MM-DDTHH:mm:ss
  if (trimmed.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Indonesian / English textual: "29 Agt 2026", "29 Agustus 2026", "Aug 29, 2026", "29-Agt-2026"
  const textPattern = /(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/;
  const textMatch = trimmed.match(textPattern);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const mStr = textMatch[2].toLowerCase().replace(/[^a-z]/g, '');
    const year = textMatch[3];
    const month = INDO_MONTH_MAP[mStr] || '01';
    return `${year}-${month}-${day}`;
  }

  // English month-first: "Aug 29 2026", "August 29, 2026"
  const engPattern = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/;
  const engMatch = trimmed.match(engPattern);
  if (engMatch) {
    const mStr = engMatch[1].toLowerCase().replace(/[^a-z]/g, '');
    const day = engMatch[2].padStart(2, '0');
    const year = engMatch[3];
    const month = INDO_MONTH_MAP[mStr] || '01';
    return `${year}-${month}-${day}`;
  }

  // Fallback to JS standard Date constructor
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
  } catch(e) {}

  return todayIso;
}

/**
 * Format ISO date string into readable text according to current locale
 */
export function formatDateDisplay(isoOrDateStr: string | undefined, lang: 'id' | 'en' = 'id'): string {
  if (!isoOrDateStr) return '';
  const iso = parseDateToIso(isoOrDateStr);
  const parts = iso.split('-');
  if (parts.length !== 3) return isoOrDateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const monthNamesID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthNamesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = lang === 'id' ? monthNamesID[m] : monthNamesEN[m];

  return `${d} ${monthName} ${y}`;
}

