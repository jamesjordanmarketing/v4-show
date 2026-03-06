/**
 * Inngest Webhook Endpoint
 * 
 * This Next.js API route serves as the communication bridge between
 * Inngest's infrastructure and your application's background functions.
 * 
 * Route: POST /api/inngest
 * 
 * How it works:
 * 1. Inngest sends a webhook request to this endpoint
 * 2. The serve() handler validates the request using INNGEST_SIGNING_KEY
 * 3. Inngest executes the appropriate function based on the event type
 * 4. Function results are sent back to Inngest for logging/monitoring
 * 
 * Security:
 * - INNGEST_SIGNING_KEY ensures only Inngest can call this endpoint
 * - Requests without valid signatures are rejected
 * - Replay attacks are prevented via timestamp validation
 * 
 * Vercel Configuration:
 * - This endpoint does NOT need maxDuration settings
 * - Inngest functions run in Inngest's infrastructure, not on Vercel
 * - This route only handles webhook requests (fast, < 1s)
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { inngestFunctions } from '@/inngest/functions';

/**
 * Inngest Serve Handler
 * 
 * The serve() function from the Inngest SDK handles:
 * - Webhook signature verification
 * - Event routing to the correct function
 * - Response formatting for Inngest's API
 * - Error handling and logging
 * 
 * Configuration:
 * - client: The Inngest client instance (with event key and app ID)
 * - functions: Array of all Inngest functions to register
 * - streaming: Disabled to avoid Vercel streaming issues (recommended for Next.js)
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  
  // Disable streaming to prevent Vercel compatibility issues
  streaming: 'allow',
  
  // Optional: Custom error handling
  // onError: (error) => {
  //   console.error('[Inngest Webhook] Error:', error);
  // },
});

/**
 * Deployment Notes:
 * 
 * 1. **First Deploy:**
 *    - Push code to GitHub → Vercel auto-deploys
 *    - Vercel creates the /api/inngest endpoint at your domain
 *    - Go to Inngest dashboard → "Sync" → "Sync with Vercel"
 *    - Inngest auto-discovers this endpoint and registers your functions
 * 
 * 2. **Subsequent Deploys:**
 *    - Inngest automatically re-syncs on each Vercel deployment
 *    - New functions are auto-discovered
 *    - No manual sync needed (unless you disable auto-sync)
 * 
 * 3. **Testing:**
 *    - Trigger an event: inngest.send({ name: 'rag/document.uploaded', data: {...} })
 *    - View execution in Inngest dashboard → "Runs"
 *    - Check logs for any errors or timeouts
 * 
 * 4. **Troubleshooting:**
 *    - If sync fails: Check INNGEST_SIGNING_KEY is correct in Vercel env vars
 *    - If functions don't appear: Check inngestFunctions array includes them
 *    - If execution fails: Check Inngest dashboard "Runs" tab for detailed logs
 */
