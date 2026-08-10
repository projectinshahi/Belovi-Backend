"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToZohoList = exports.isZohoConfigured = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("./logger"));
/**
 * Zoho Campaigns newsletter integration.
 *
 * Adds subscribers to the "BELOVI Newsletter" mailing list via the Campaigns
 * listsubscribe API. Access tokens are short-lived (1 hour), so we mint them on
 * demand from the long-lived refresh token and cache them in memory.
 *
 * IMPORTANT — required OAuth scope:
 *   The listsubscribe endpoint requires `ZohoCampaigns.contact.UPDATE`
 *   (or `ZohoCampaigns.contact.ALL`). A refresh token generated with only
 *   `ZohoCampaigns.contact.CREATE`/`READ` will authenticate but every
 *   listsubscribe call returns HTTP 401. Regenerate the refresh token with the
 *   UPDATE scope if you see persistent 401s here.
 */
const accountsBase = () => `https://accounts.zoho.${env_1.ENV.ZOHO_DC}`;
const campaignsBase = () => `https://campaigns.zoho.${env_1.ENV.ZOHO_DC}`;
/** True only when every credential needed to talk to Zoho is present. */
const isZohoConfigured = () => Boolean(env_1.ENV.ZOHO_CLIENT_ID &&
    env_1.ENV.ZOHO_CLIENT_SECRET &&
    env_1.ENV.ZOHO_REFRESH_TOKEN &&
    env_1.ENV.ZOHO_LIST_KEY);
exports.isZohoConfigured = isZohoConfigured;
// In-memory access-token cache. Reset on process restart, which is fine.
let cachedToken = null;
/**
 * Return a valid access token, refreshing (and caching) when needed.
 * `forceRefresh` bypasses the cache — used to recover from a revoked token.
 */
const getAccessToken = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedToken && cachedToken.expiresAt > now) {
        return cachedToken.value;
    }
    const params = new URLSearchParams({
        refresh_token: env_1.ENV.ZOHO_REFRESH_TOKEN,
        client_id: env_1.ENV.ZOHO_CLIENT_ID,
        client_secret: env_1.ENV.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token',
    });
    const res = await fetch(`${accountsBase()}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        console.log('   🔑 [Zoho] token refresh FAILED:', JSON.stringify(data));
        throw new Error(`Zoho token refresh failed: ${data.error || res.status} (${res.statusText})`);
    }
    console.log(`   🔑 [Zoho] access token obtained. granted scope: "${data.scope}"`);
    // expires_in is in seconds; refresh 60s early to avoid edge-of-expiry races.
    const ttlMs = (Number(data.expires_in) || 3600) * 1000;
    cachedToken = { value: data.access_token, expiresAt: now + ttlMs - 60_000 };
    return cachedToken.value;
};
/**
 * Subscribe an email to the configured Zoho Campaigns list.
 * Never throws — returns a result object so callers can treat Zoho as
 * best-effort and keep the user-facing flow resilient.
 */
const subscribeToZohoList = async (email, source) => {
    if (!(0, exports.isZohoConfigured)()) {
        console.log('   ⚠️  [Zoho] not configured (missing client id/secret/refresh token/list key) — skipping');
        return { ok: false, skipped: true, message: 'Zoho not configured' };
    }
    const endpoint = `${campaignsBase()}/api/v1.1/json/listsubscribe`;
    const doRequest = async (token) => {
        const url = new URL(endpoint);
        url.searchParams.set('resfmt', 'JSON');
        url.searchParams.set('listkey', env_1.ENV.ZOHO_LIST_KEY);
        url.searchParams.set('contactinfo', JSON.stringify({ 'Contact Email': email }));
        if (source)
            url.searchParams.set('source', source);
        console.log(`   📡 [Zoho] POST ${endpoint}  (list=${env_1.ENV.ZOHO_LIST_KEY.slice(0, 8)}…, email=${email})`);
        return fetch(url.toString(), {
            method: 'POST',
            headers: { Authorization: `Zoho-oauthtoken ${token}` },
        });
    };
    try {
        let token = await getAccessToken();
        let res = await doRequest(token);
        // A 401 can mean a revoked/expired cached token — retry once with a fresh
        // one. If it 401s again, the token most likely lacks the UPDATE scope.
        if (res.status === 401) {
            token = await getAccessToken(true);
            res = await doRequest(token);
        }
        const raw = await res.text();
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch {
            data = null; // Zoho returns an HTML page for gateway-level 401s
        }
        console.log(`   📥 [Zoho] response HTTP ${res.status}:`, data ? JSON.stringify(data) : raw.slice(0, 120));
        // Zoho signals success with code "0".
        if (res.ok && data && String(data.code) === '0') {
            console.log('   ✅ [Zoho] contact subscribed to the list');
            return { ok: true, message: data.message || 'Subscribed to Zoho list' };
        }
        const detail = (data && (data.message || data.code)) ||
            (res.status === 401
                ? 'Unauthorized — refresh token likely missing the ZohoCampaigns.contact.UPDATE scope'
                : `HTTP ${res.status}`);
        if (res.status === 401) {
            console.log('   ❌ [Zoho] 401 Unauthorized — the refresh token does NOT have the ZohoCampaigns.contact.UPDATE scope required by listsubscribe. Regenerate it with that scope.');
        }
        logger_1.default.warn('Zoho listsubscribe did not succeed', {
            event: 'ZOHO_SUBSCRIBE_FAILED',
            email,
            status: res.status,
            detail,
        });
        return { ok: false, message: String(detail) };
    }
    catch (err) {
        logger_1.default.error('Zoho listsubscribe error', {
            event: 'ZOHO_SUBSCRIBE_ERROR',
            email,
            error: err?.message || String(err),
        });
        return { ok: false, message: err?.message || 'Zoho request failed' };
    }
};
exports.subscribeToZohoList = subscribeToZohoList;
//# sourceMappingURL=zohoCampaigns.js.map