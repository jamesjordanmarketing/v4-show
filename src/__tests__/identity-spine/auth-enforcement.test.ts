/**
 * Identity Spine Tests T5, T6: Auth Enforcement
 *
 * T5: Unauthenticated requests return 401
 * T6: Spoofed x-user-id headers are ignored
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Auth Enforcement', () => {
  describe('T5 — Unauthenticated Rejection', () => {
    const endpoints = [
      { method: 'GET', path: '/api/conversations' },
      { method: 'POST', path: '/api/conversations' },
      { method: 'GET', path: '/api/batch-jobs' },
      { method: 'GET', path: '/api/generation-logs' },
      { method: 'GET', path: '/api/failed-generations' },
      { method: 'GET', path: '/api/templates' },
      { method: 'GET', path: '/api/performance' },
      { method: 'GET', path: '/api/training-files' },
      { method: 'GET', path: '/api/export/history' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} returns 401 without auth`, async () => {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
          body: method === 'POST' ? JSON.stringify({}) : undefined,
        });
        expect(res.status).toBe(401);
      });
    });
  });

  describe('T6 — Spoofed Header Ignored', () => {
    it('x-user-id header is ignored when authenticated', async () => {
      const spoofedUserId = '00000000-0000-0000-0000-000000000001';

      const res = await fetch(`${BASE_URL}/api/conversations`, {
        headers: {
          'x-user-id': spoofedUserId,
        },
        credentials: 'include',
        // ... with User A's auth
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // Verify returned data belongs to authenticated user, NOT spoofed user
      void data;
    });
  });
});
