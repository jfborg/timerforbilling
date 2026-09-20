import { buildFoundLinkPageHtml, buildNotFoundLinkPageHtml } from './linkPageHtml';

const baseInput = {
  token: 'abcDEF123456789012_-xyz',
  senderDisplayName: 'Alex',
  unlockAtIso: '2026-09-22T10:40:31.617Z',
  unlockAtLabel: 'Tue, Sep 22, 10:40 AM',
  ogImageUrl: 'https://example.test/functions/v1/og-image/abcDEF123456789012_-xyz',
};

describe('buildFoundLinkPageHtml', () => {
  it('embeds correct og:title/og:description/og:image for crawlers, without any letter body', () => {
    const html = buildFoundLinkPageHtml(baseInput);
    expect(html).toContain('<meta property="og:title" content="A letter from Alex" />');
    expect(html).toContain('<meta property="og:description" content="Opens Tue, Sep 22, 10:40 AM." />');
    expect(html).toContain(`<meta property="og:image" content="${baseInput.ogImageUrl}" />`);
  });

  it('shows the claim code and the sender name in the body', () => {
    const html = buildFoundLinkPageHtml(baseInput);
    expect(html).toContain('From Alex');
    expect(html).toContain('>abcDEF123456789012_-xyz<');
  });

  it('never mentions a "time capsule" and has no em dashes (guardrails apply to generated copy too)', () => {
    const html = buildFoundLinkPageHtml(baseInput);
    expect(html.toLowerCase()).not.toContain('time capsule');
    expect(html).not.toContain(String.fromCharCode(0x2014));
  });

  it('HTML-escapes a hostile sender display name in both the meta tags and the body', () => {
    const html = buildFoundLinkPageHtml({ ...baseInput, senderDisplayName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes a token containing a single quote so the embedded script stays valid', () => {
    const html = buildFoundLinkPageHtml({ ...baseInput, token: "abc'; alert(1); //" });
    expect(html).not.toContain("writeText('abc'; alert(1); //')");
    expect(html).toContain("writeText('abc\\'; alert(1); //')");
  });
});

describe('buildNotFoundLinkPageHtml', () => {
  it('renders a generic page with no letter-specific data', () => {
    const html = buildNotFoundLinkPageHtml();
    expect(html).toContain('This letter has been burned, or the link is wrong.');
  });
});
