'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /rag route — superseded by the Work Base architecture.
 * Documents are now managed at /workbase/[id]/fact-training/documents.
 * Redirect to /home so users find their Work Bases.
 */
export default function RAGPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return null;
}
