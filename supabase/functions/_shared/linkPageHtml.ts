// Pure HTML builder for the letter landing page. No Deno APIs, unit tested under Jest. The
// preview data is embedded server-side (not fetched client-side, unlike Phase 2's static
// page) specifically so crawlers that never run JavaScript still see correct per-letter
// og:title/og:description/og:image; a client script only adds the live-ticking countdown and
// the tap-to-copy code on top of what is already in the initial HTML.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c');
}

export interface LinkPageInput {
  token: string;
  senderDisplayName: string;
  unlockAtIso: string;
  unlockAtLabel: string;
  ogImageUrl: string;
}

export function buildFoundLinkPageHtml(input: LinkPageInput): string {
  const title = escapeHtml(`A letter from ${input.senderDisplayName}`);
  const description = escapeHtml(`Opens ${input.unlockAtLabel}.`);
  const from = escapeHtml(input.senderDisplayName);
  const code = escapeHtml(input.token);
  const ogImage = escapeHtml(input.ogImageUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="noindex" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
${STYLE_BLOCK}
</head>
<body>
<main>
  <h1>Sealed</h1>
  <div class="card">
    <div class="wax">S</div>
    <p class="from">From ${from}</p>
    <p class="countdown" id="countdown">Opens ${escapeHtml(input.unlockAtLabel)}</p>
    <p class="code-label">Claim code</p>
    <div class="code" id="code" title="Tap to copy">${code}</div>
    <div class="stores">
      <a class="store-button" href="#" onclick="return false">App Store</a>
      <a class="store-button" href="#" onclick="return false">Google Play</a>
    </div>
  </div>
  <p class="hint">Have the app? Open it and enter the code above under &ldquo;Have a letter?&rdquo;</p>
</main>
<script>
(function () {
  var unlockAt = new Date('${escapeJsString(input.unlockAtIso)}').getTime();
  var el = document.getElementById('countdown');
  function fmt(ms) {
    if (ms <= 0) return 'Opening now';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var parts = [];
    if (d) parts.push(d + 'd');
    parts.push(String(h).padStart(2, '0') + 'h', String(m).padStart(2, '0') + 'm', String(sec).padStart(2, '0') + 's');
    return parts.join(' ');
  }
  function tick() { el.textContent = fmt(unlockAt - Date.now()); }
  tick();
  setInterval(tick, 1000);

  var codeEl = document.getElementById('code');
  codeEl.addEventListener('click', function () {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('${escapeJsString(input.token)}').then(function () {
        codeEl.classList.add('copied');
        setTimeout(function () { codeEl.classList.remove('copied'); }, 2000);
      });
    }
  });
})();
</script>
</body>
</html>`;
}

export function buildNotFoundLinkPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sealed letter</title>
<meta name="robots" content="noindex" />
${STYLE_BLOCK}
</head>
<body>
<main>
  <h1>Sealed</h1>
  <p class="error">This letter has been burned, or the link is wrong.</p>
</main>
</body>
</html>`;
}

const STYLE_BLOCK = `<style>
  :root { color-scheme: light; --paper: #F3E9D6; --card: #FBF5E9; --border: #D8C6A0; --text: #3A2A1A; --muted: #8A7455; --accent: #8B1E1E; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--paper); color: var(--text); font-family: Georgia, 'Times New Roman', serif; padding: 24px; }
  main { width: 100%; max-width: 420px; text-align: center; }
  h1 { font-size: 28px; margin: 0 0 24px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px 20px; margin-bottom: 20px; }
  .wax { width: 64px; height: 64px; border-radius: 50%; background: var(--accent); color: var(--paper); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: bold; margin: 0 auto 16px; }
  .from { font-size: 15px; color: var(--muted); margin: 0 0 4px; }
  .countdown { font-size: 30px; font-weight: bold; color: var(--accent); letter-spacing: 1px; margin: 12px 0 0; }
  .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin: 20px 0 6px; }
  .code { font-family: 'SF Mono', Consolas, monospace; font-size: 15px; background: var(--paper); border: 1px solid var(--border); border-radius: 8px; padding: 10px; word-break: break-all; cursor: pointer; }
  .code.copied::after { content: ' (copied)'; color: var(--accent); font-family: Georgia, serif; }
  .stores { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
  .store-button { border: 1px solid var(--accent); color: var(--accent); text-decoration: none; padding: 10px 16px; border-radius: 10px; font-size: 13px; }
  .hint { font-size: 13px; color: var(--muted); margin-top: 20px; }
  .error { color: var(--accent); }
</style>`;
