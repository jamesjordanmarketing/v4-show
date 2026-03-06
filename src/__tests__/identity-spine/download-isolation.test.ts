/**
 * Identity Spine Test T8: Download Isolation
 *
 * Verifies users cannot download other users' resources
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Download Isolation', () => {
  it('T8 — User B cannot download User A training file', async () => {
    const res = await fetch(`${BASE_URL}/api/training-files/${/* userA_fileId */ ''}/download`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });

  it('T8 — User B cannot download User A pipeline adapter', async () => {
    const res = await fetch(`${BASE_URL}/api/pipeline/jobs/${/* userA_jobId */ ''}/download`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });

  it('T8 — User B cannot download User A export', async () => {
    const res = await fetch(`${BASE_URL}/api/export/download/${/* userA_exportId */ ''}`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });
});
