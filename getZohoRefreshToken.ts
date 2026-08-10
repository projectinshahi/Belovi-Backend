/**
 * One-shot helper to turn a Zoho "grant code" into a REFRESH TOKEN and write it
 * into .env — so you never accidentally paste the grant code itself.
 *
 * HOW TO USE
 *   1. Go to https://api-console.zoho.in/  → your Self Client → "Generate Code"
 *        Scope:  ZohoCampaigns.contact.ALL
 *        Duration: 10 minutes  → Create → copy the code (starts with "1000.")
 *   2. Immediately run (within 10 min, code is single-use):
 *        npx ts-node getZohoRefreshToken.ts PASTE_THE_CODE_HERE
 *
 * It exchanges the code, checks the scope includes contact.UPDATE, updates
 * ZOHO_REFRESH_TOKEN in .env, and tells you to restart the server.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DC = process.env.ZOHO_DC || 'in';
const clientId = process.env.ZOHO_CLIENT_ID || '';
const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
const code = (process.argv[2] || '').trim();

const fail = (msg: string) => {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
};

async function main() {
  if (!code) {
    fail(
      'No grant code provided.\n' +
        '   Usage: npx ts-node getZohoRefreshToken.ts <GRANT_CODE>\n' +
        '   Get a code at https://api-console.zoho.' +
        DC +
        '/ → Self Client → Generate Code (scope: ZohoCampaigns.contact.ALL).'
    );
  }
  if (!clientId || !clientSecret) {
    fail('ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET are missing from .env.');
  }

  console.log(`\n🔄 Exchanging grant code on accounts.zoho.${DC} ...`);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });

  const res = await fetch(`https://accounts.zoho.${DC}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data: any = await res.json().catch(() => ({}));

  if (data.error || !data.refresh_token) {
    // Most common: invalid_code = code expired (>10 min), already used once,
    // or generated on a different data center than ZOHO_DC=${DC}.
    fail(
      `Exchange failed: ${JSON.stringify(data)}\n` +
        '   → Generate a FRESH code and run this again immediately.\n' +
        '   → The code is single-use and expires in ~10 minutes.\n' +
        `   → Make sure the code was generated on api-console.zoho.${DC} (same data center).`
    );
  }

  const scope: string = data.scope || '';
  const hasUpdate = /contact\.(UPDATE|ALL)/i.test(scope);

  console.log('\n✅ Got a refresh token.');
  console.log(`   scope: ${scope}`);
  if (!hasUpdate) {
    console.log(
      '\n⚠️  WARNING: this scope does NOT include contact.UPDATE, so adding\n' +
        '   contacts to a list (listsubscribe) will still return 401.\n' +
        '   Re-generate the code with scope "ZohoCampaigns.contact.ALL".'
    );
  }

  // Update ZOHO_REFRESH_TOKEN in .env, preserving everything else.
  const envPath = path.resolve(__dirname, '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  const line = `ZOHO_REFRESH_TOKEN=${data.refresh_token}`;
  if (/^ZOHO_REFRESH_TOKEN=.*$/m.test(env)) {
    env = env.replace(/^ZOHO_REFRESH_TOKEN=.*$/m, line);
  } else {
    env = `${line}\n${env}`;
  }
  fs.writeFileSync(envPath, env);

  console.log(`\n💾 Wrote ZOHO_REFRESH_TOKEN to ${envPath}`);
  console.log('   Restart the backend (Ctrl-C then `npm run dev`) and subscribe again.\n');
}

main().catch((e) => fail(e?.message || String(e)));
