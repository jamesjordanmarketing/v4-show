/**
 * Edge Runtime stub for @supabase/realtime-js
 *
 * Vercel middleware runs in the Edge Runtime (V8 isolate, no Node.js globals).
 * The real @supabase/realtime-js uses __dirname and process.versions which
 * don't exist in Edge Runtime, causing a ReferenceError on every request.
 *
 * Middleware only calls supabase.auth.getUser() — it never uses Realtime
 * subscriptions — so this no-op stub is safe.
 */

class RealtimeClient {
  constructor(_url, _options) {}
  connect() { return Promise.resolve(); }
  disconnect(_code, _reason) { return Promise.resolve(); }
  channel(_topic, _params) {
    return {
      subscribe: () => this,
      unsubscribe: () => Promise.resolve('ok'),
      on: () => this,
      off: () => this,
      send: () => Promise.resolve('ok'),
      track: () => Promise.resolve('ok'),
      untrack: () => Promise.resolve('ok'),
    };
  }
  removeChannel(_channel) { return Promise.resolve('ok'); }
  removeAllChannels() { return Promise.resolve([]); }
  getChannels() { return []; }
  setAuth(_token) {}
  log() {}
}

module.exports = { RealtimeClient };
module.exports.default = RealtimeClient;
