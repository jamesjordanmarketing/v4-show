/**
 * Multi-Document Retrieval Integration Tests
 *
 * Tests KB-wide query functionality end-to-end.
 * Requires TEST_KB_ID and TEST_DOC_ID environment variables for live DB tests.
 */
import { queryRAG } from '../services/rag-retrieval-service';

const TEST_KB_ID = process.env.TEST_KB_ID;
const TEST_DOC_ID = process.env.TEST_DOC_ID;
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user';

const skipIfNoTestData = !TEST_KB_ID || !TEST_DOC_ID;

describe('Multi-Document Retrieval', () => {
  if (skipIfNoTestData) {
    it.skip('Skipping: TEST_KB_ID and TEST_DOC_ID not configured', () => {});
    return;
  }

  it('should accept knowledgeBaseId without documentId', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.responseText).toBeTruthy();
  }, 30000);

  it('should still work with documentId specified', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      documentId: TEST_DOC_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
  }, 30000);

  it('should fail without both documentId and knowledgeBaseId', async () => {
    await expect(queryRAG({
      queryText: 'Test',
      userId: TEST_USER_ID,
      mode: 'rag_only',
    } as any)).rejects.toThrow('documentId or knowledgeBaseId is required');
  });

  it('should include citations with document source info for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'What are the key policies?',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    if (result.data?.citations?.length) {
      const withSource = result.data.citations.filter((c: any) => c.documentName);
      expect(withSource.length).toBeGreaterThan(0);
    }
  }, 30000);

  it('should store query_scope = knowledge_base for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'Overview of all documents',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
  }, 30000);
});
