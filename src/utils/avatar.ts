/**
 * Local Initials Avatar Generator (Privacy-First, Offline-First)
 * Generates an SVG Data-URI locally without making any external network requests.
 * Fully compliant with strict Content-Security-Policy (img-src 'self' data:).
 */

const AVATAR_PALETTE = [
  '#4f46e5', // indigo-600
  '#7c3aed', // violet-600
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#c026d3', // fuchsia-600
  '#0284c7', // sky-600
  '#475569', // slate-600
  '#ea580c', // orange-600
];

export function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail || typeof nameOrEmail !== 'string') return 'T';
  const clean = nameOrEmail.replace(/@.*/, '').trim();
  if (!clean) return 'T';
  const words = clean.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return 'T';
  if (words.length === 1) {
    const word = words[0];
    return (word.length >= 2 ? word.slice(0, 2) : word[0]).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function generateInitialsAvatar(nameOrEmail?: string): string {
  const seed = (nameOrEmail || 'Tata').trim();
  const initials = getInitials(seed);

  // Deterministic color hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const color = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">` +
    `<rect width="128" height="128" fill="${color}"/>` +
    `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" ` +
    `font-size="52" font-weight="700" fill="#ffffff" letter-spacing="1">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function sanitizeAvatarUrl(avatarUrl?: string | null, fallbackName?: string): string {
  if (!avatarUrl || typeof avatarUrl !== 'string' || avatarUrl.includes('dicebear.com')) {
    return generateInitialsAvatar(fallbackName);
  }
  return avatarUrl;
}
