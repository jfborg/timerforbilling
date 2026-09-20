import { buildFallbackOgImageSvg, buildLetterOgImageSvg } from './ogImage';

describe('buildLetterOgImageSvg', () => {
  it('embeds the sender name and unlock label', () => {
    const svg = buildLetterOgImageSvg({ senderDisplayName: 'Alex', unlockAtLabel: 'Sat, Sep 20' });
    expect(svg).toContain('From Alex');
    expect(svg).toContain('Opens Sat, Sep 20');
  });

  it('is well-formed SVG with the expected dimensions', () => {
    const svg = buildLetterOgImageSvg({ senderDisplayName: 'Alex', unlockAtLabel: 'now' });
    expect(svg).toMatch(/^<svg width="1200" height="630"/);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('escapes XML-significant characters in the sender name so the SVG stays valid', () => {
    const svg = buildLetterOgImageSvg({ senderDisplayName: '<script>&"\'', unlockAtLabel: 'now' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;&quot;&apos;');
  });
});

describe('buildFallbackOgImageSvg', () => {
  it('renders a generic, well-formed image with no letter-specific data', () => {
    const svg = buildFallbackOgImageSvg();
    expect(svg).toContain('Sealed');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });
});
