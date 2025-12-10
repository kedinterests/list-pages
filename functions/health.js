// /functions/health.js
import { json, getHost, KV_KEYS, isStale } from './_lib.js';

export const onRequestGet = async ({ request, env }) => {
  const host = getHost(request);
  const keys = KV_KEYS(host);

  const [raw, etag, updated_at, lastError] = await Promise.all([
    env.TESTIMONIALS_KV.get(keys.data),
    env.TESTIMONIALS_KV.get(keys.etag),
    env.TESTIMONIALS_KV.get(keys.updated),
    env.TESTIMONIALS_KV.get(keys.lastError),
  ]);

  const count = raw ? JSON.parse(raw).length : 0;
  const stale = isStale(updated_at, 120); // stale if older than 2 hours

  const body = { ok: true, host, updated_at, etag, count, stale };
  if (lastError) body.last_error = lastError;

  // If no data or there was a recent refresh error, use 503 to trip monitors.
  const status = (count === 0 || lastError) ? 503 : 200;
  return json(body, { status });
};



