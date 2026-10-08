const fs = require('fs');
let content = fs.readFileSync('src/utils.ts', 'utf8');

// Just rip it out from API_KEY_SECRET to the end of decryptApiKey
const regex = /const API_KEY_SECRET[\s\S]*?decryptApiKey.*?\{[\s\S]*?\n\}/m;

const replacement = `// Legacy XOR key strictly for one-time migration. 
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
    return \`obf_v1:\${base64}\`;
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
}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/utils.ts', content, 'utf8');
console.log("Fixed utils.ts");
