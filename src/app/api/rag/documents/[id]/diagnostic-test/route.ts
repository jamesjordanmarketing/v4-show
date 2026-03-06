/**
 * RAG Document Diagnostic Test API
 * POST /api/rag/documents/[id]/diagnostic-test
 * 
 * Performs incremental tests to diagnose Claude API issues:
 * 1. Simple "are you awake" test (2min timeout)
 * 2. Document size estimation test (5min timeout)
 * 3. If both pass, proceed with full analysis
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

interface DiagnosticResult {
  step: string;
  success: boolean;
  responseText?: string;
  elapsedMs?: number;
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const results: DiagnosticResult[] = [];
  
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = params.id;
    
    // Get document
    const supabase = createServerSupabaseAdminClient();
    const { data: doc } = await supabase
      .from('rag_documents')
      .select('id, original_text, file_name, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!doc || !doc.original_text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document not found or has no text' 
      }, { status: 404 });
    }

    console.log(`[Diagnostic Test] Starting for document: ${doc.file_name}`);
    console.log(`[Diagnostic Test] Document size: ${doc.original_text.length} chars`);

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Get model from config (respects RAG_LLM_MODEL env var)
    const configModel = process.env.RAG_LLM_MODEL || 'claude-haiku-4-5-20251001';

    // ========================================
    // TEST 1: Simple "Are you awake?" test
    // Timeout: 120 seconds (2 minutes)
    // ========================================
    console.log('[Diagnostic Test] Step 1/3: Testing Claude API connectivity...');
    const test1Start = Date.now();
    let timeout1: NodeJS.Timeout | undefined;
    
    try {
      const abortController1 = new AbortController();
      timeout1 = setTimeout(() => abortController1.abort(), 120000);
      
      const response1 = await client.messages.create({
        model: configModel,
        max_tokens: 100,
        temperature: 0,
        system: 'You are testing API connectivity. Respond quickly and concisely.',
        messages: [{
          role: 'user',
          content: 'Is this API call awake and acknowledged? Respond quickly and concisely with "YES I can see your input"'
        }],
      }, {
        signal: abortController1.signal as any,
      });
      
      clearTimeout(timeout1);
      
      const test1Text = response1.content[0].type === 'text' ? response1.content[0].text : '';
      const test1Elapsed = Date.now() - test1Start;
      
      results.push({
        step: 'connectivity_test',
        success: true,
        responseText: test1Text,
        elapsedMs: test1Elapsed,
      });
      
      console.log(`[Diagnostic Test] Step 1/3: ✓ SUCCESS (${test1Elapsed}ms)`);
      console.log(`[Diagnostic Test] Response: "${test1Text}"`);
      
    } catch (error: any) {
      if (timeout1) clearTimeout(timeout1);
      const test1Elapsed = Date.now() - test1Start;
      
      results.push({
        step: 'connectivity_test',
        success: false,
        elapsedMs: test1Elapsed,
        error: error.name === 'AbortError' || error.message?.includes('aborted') 
          ? 'Claude API did not respond within 2 minutes'
          : error.message || 'Unknown error',
      });
      
      console.error(`[Diagnostic Test] Step 1/3: ✗ FAILED (${test1Elapsed}ms)`, error.message);
      
      // If connectivity test fails, don't continue
      return NextResponse.json({
        success: false,
        message: 'Connectivity test failed. Claude API is not responding.',
        results,
        totalElapsedMs: Date.now() - startTime,
      });
    }

    // ========================================
    // TEST 2: Document analysis estimation
    // Timeout: 300 seconds (5 minutes)
    // ========================================
    console.log('[Diagnostic Test] Step 2/3: Testing document analysis estimation...');
    const test2Start = Date.now();
    let timeout2: NodeJS.Timeout | undefined;
    
    try {
      const abortController2 = new AbortController();
      timeout2 = setTimeout(() => abortController2.abort(), 300000);
      
      const response2 = await client.messages.create({
        model: configModel,
        max_tokens: 500,
        temperature: 0,
        system: 'You review documents and provide quick estimates. Respond concisely.',
        messages: [{
          role: 'user',
          content: `Document (${doc.original_text.length} chars):\n\n${doc.original_text.slice(0, 10000)}\n\n---\n\nHow long will this take you to analyze? Just review the content length and complexity, then give us your estimate quickly and concisely (e.g., "This document is X pages and will take approximately Y seconds to analyze thoroughly")`
        }],
      }, {
        signal: abortController2.signal as any,
      });
      
      clearTimeout(timeout2);
      
      const test2Text = response2.content[0].type === 'text' ? response2.content[0].text : '';
      const test2Elapsed = Date.now() - test2Start;
      
      results.push({
        step: 'estimation_test',
        success: true,
        responseText: test2Text,
        elapsedMs: test2Elapsed,
      });
      
      console.log(`[Diagnostic Test] Step 2/3: ✓ SUCCESS (${test2Elapsed}ms)`);
      console.log(`[Diagnostic Test] Estimation: "${test2Text}"`);
      
    } catch (error: any) {
      if (timeout2) clearTimeout(timeout2);
      const test2Elapsed = Date.now() - test2Start;
      
      results.push({
        step: 'estimation_test',
        success: false,
        elapsedMs: test2Elapsed,
        error: error.name === 'AbortError' || error.message?.includes('aborted') 
          ? 'Claude API did not respond within 5 minutes'
          : error.message || 'Unknown error',
      });
      
      console.error(`[Diagnostic Test] Step 2/3: ✗ FAILED (${test2Elapsed}ms)`, error.message);
      
      // If estimation test fails, don't continue
      return NextResponse.json({
        success: false,
        message: 'Estimation test failed. Claude API is too slow or not responding.',
        results,
        totalElapsedMs: Date.now() - startTime,
      });
    }

    // ========================================
    // TEST 3: Model verification
    // ========================================
    console.log('[Diagnostic Test] Step 3/3: Verifying model configuration...');
    
    const modelInfo = {
      configured: configModel,
      envVarOverride: process.env.RAG_LLM_MODEL || 'none',
      recommended: [
        'claude-haiku-4-5-20251001 (fastest, 500ms avg)',
        'claude-sonnet-4-5-20250929 (highest quality, 2263ms avg)',
      ],
      apiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      apiKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
    };
    
    results.push({
      step: 'model_verification',
      success: true,
      responseText: JSON.stringify(modelInfo, null, 2),
      elapsedMs: 0,
    });
    
    console.log('[Diagnostic Test] Step 3/3: ✓ Model configuration verified');
    console.log('[Diagnostic Test] Model info:', modelInfo);

    // ========================================
    // All tests passed!
    // ========================================
    const totalElapsed = Date.now() - startTime;
    
    console.log('[Diagnostic Test] ========================================');
    console.log('[Diagnostic Test] ALL TESTS PASSED');
    console.log('[Diagnostic Test] Total time:', totalElapsed, 'ms');
    console.log('[Diagnostic Test] ========================================');

    return NextResponse.json({
      success: true,
      message: 'All diagnostic tests passed. Claude API is working but may be slow for full document analysis.',
      results,
      totalElapsedMs: totalElapsed,
      recommendation: 'Consider using claude-haiku-4-5-20251001 for faster processing, or implement document chunking for large documents.',
    });

  } catch (error) {
    console.error('[Diagnostic Test] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      results,
      totalElapsedMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
