// /functions/refresh.js
import { json, getHost, loadSitesRegistry, getSiteConfig, KV_KEYS, quickHash } from './_lib.js';

export const onRequestPost = async (ctx) => {
  const { request, env } = ctx;
  const host = getHost(request);

  // Header auth
  const provided = request.headers.get('X-Refresh-Key');
  if (!provided || provided !== env.REFRESH_KEY) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Load site config
  let sites, site, keys;
  try {
    sites = await loadSitesRegistry();
    site = getSiteConfig(sites, host);
    keys = KV_KEYS(host);
  } catch (err) {
    return json({ ok: false, error: String(err) }, { status: 400 });
  }

  // Fetch Apps Script JSON (no-cache)
  let upstream;
  const t0 = Date.now();
  try {
    const res = await fetch(site.sheet.url, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      await env.TESTIMONIALS_KV.put(keys.lastError, `apps-script ${res.status}: ${body.slice(0, 300)}`);
      return json({ ok: false, error: `Apps Script error ${res.status}` }, { status: 502 });
    }
    upstream = await res.json();
  } catch (err) {
    await env.TESTIMONIALS_KV.put(keys.lastError, `fetch error: ${String(err)}`);
    return json({ ok: false, error: 'Fetch failed' }, { status: 502 });
  }

  // Validate shape
  if (!upstream?.ok) {
    await env.TESTIMONIALS_KV.put(keys.lastError, `upstream not ok: ${JSON.stringify(upstream).slice(0,300)}`);
    return json({ ok: false, error: 'Upstream not ok' }, { status: 502 });
  }
  if (!Array.isArray(upstream.testimonials)) {
    await env.TESTIMONIALS_KV.put(keys.lastError, `invalid testimonials array`);
    return json({ ok: false, error: 'Invalid testimonials array' }, { status: 502 });
  }

  const count = upstream.testimonials.length;
  const nextEtag = upstream.etag || quickHash(upstream.testimonials);

  const keysNow = await env.TESTIMONIALS_KV.get(keys.etag);
  if (keysNow && keysNow === nextEtag) {
    // No change → no write
    const updated_at = await env.TESTIMONIALS_KV.get(keys.updated);
    return json({ status: 'noop', count, etag: nextEtag, updated_at });
  }

  // Write snapshot to KV (as-is; SSR will normalize/derive fields)
  const updated_at = upstream.updated_at || new Date().toISOString();
  await env.TESTIMONIALS_KV.put(keys.data, JSON.stringify(upstream.testimonials));
  await env.TESTIMONIALS_KV.put(keys.etag, nextEtag);
  await env.TESTIMONIALS_KV.put(keys.updated, updated_at);
  await env.TESTIMONIALS_KV.delete(keys.lastError);

  return json({
    status: 'ok',
    count,
    etag: nextEtag,
    updated_at,
    duration_ms: Date.now() - t0,
  });
};



