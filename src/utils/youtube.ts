/**
 * The 11-character video id from any YouTube link an admin is likely to paste —
 * `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, mobile and
 * nocookie hosts, with or without `https://`. Null for anything else, so the
 * controller can reject a link the storefront could never play.
 */
export function parseYouTubeId(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;

  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id: string | null | undefined = null;
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// Self-check: `npx ts-node src/utils/youtube.ts`
if (require.main === module) {
  const assert = require('node:assert/strict');
  const ID = 'dQw4w9WgXcQ';
  for (const ok of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?feature=share&v=${ID}&t=42s`,
    `youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}?rel=0`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ]) assert.equal(parseYouTubeId(ok), ID, ok);
  for (const bad of [
    '',
    'not a link',
    'https://vimeo.com/123456789',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/@belovi',
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
  ]) assert.equal(parseYouTubeId(bad), null, bad);
  console.log('youtube.ts: ok');
}
