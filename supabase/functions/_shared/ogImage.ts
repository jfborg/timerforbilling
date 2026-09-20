// Pure SVG builder for the Open Graph preview image (brief section 6: "sealed envelope, the
// sender's chosen display name and the opening date. Never any content."). No Deno APIs, so
// it is unit tested directly under Jest, not just exercised indirectly through a live
// function call this sandbox cannot make.

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface OgImageInput {
  senderDisplayName: string;
  unlockAtLabel: string;
}

const WIDTH = 1200;
const HEIGHT = 630;

export function buildLetterOgImageSvg({ senderDisplayName, unlockAtLabel }: OgImageInput): string {
  const from = escapeXml(`From ${senderDisplayName}`);
  const opens = escapeXml(`Opens ${unlockAtLabel}`);

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#F3E9D6" />
  <rect x="60" y="60" width="${WIDTH - 120}" height="${HEIGHT - 120}" rx="24" fill="#FBF5E9" stroke="#D8C6A0" stroke-width="2" />
  <circle cx="${WIDTH / 2}" cy="230" r="80" fill="#8B1E1E" />
  <text x="${WIDTH / 2}" y="255" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#F3E9D6" text-anchor="middle">S</text>
  <text x="${WIDTH / 2}" y="380" font-family="Georgia, serif" font-size="40" fill="#3A2A1A" text-anchor="middle">${from}</text>
  <text x="${WIDTH / 2}" y="440" font-family="Georgia, serif" font-size="30" fill="#8B1E1E" text-anchor="middle">${opens}</text>
</svg>`;
}

export function buildFallbackOgImageSvg(): string {
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#F3E9D6" />
  <text x="${WIDTH / 2}" y="${HEIGHT / 2}" font-family="Georgia, serif" font-size="40" fill="#3A2A1A" text-anchor="middle">Sealed</text>
</svg>`;
}
