import { uploadFiles } from '@huggingface/hub';
import { config } from 'dotenv';
import { Buffer } from 'buffer';

config({ path: '.env.local' });

const HF_TOKEN = process.env.HF_TOKEN;

// Intercept global fetch to see what @huggingface/hub does
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    console.log(`\n\n[FETCH INTERCEPT] URL: ${url}`);
    console.log(`[FETCH INTERCEPT] METHOD: ${options.method}`);

    if (options.body && options.body.constructor.name === 'FormData') {
        const fd = options.body;
        console.log('[FETCH INTERCEPT] FormData keys:');
        for (const [key, value] of fd.entries()) {
            console.log(`   --> Key: ${key}`);
            if (value instanceof Blob) {
                console.log(`       Blob! type: ${value.type}, size: ${value.size}, name: ${value.name}`);
                const text = await value.text();
                console.log(`       Preview: ${text.slice(0, 100)}`);
            } else {
                console.log(`       String: ${value.slice(0, 100)}`);
            }
        }
    } else if (options.body) {
        console.log(`[FETCH INTERCEPT] BODY: ${typeof options.body} / ${options.body.constructor.name}`);
        if (typeof options.body === 'string') {
            console.log(`[FETCH INTERCEPT] Body Preview (String): ${options.body.slice(0, 100)}`);
        } else if (options.body instanceof Uint8Array) {
            console.log(`[FETCH INTERCEPT] Body Preview (Uint8Array): ${Buffer.from(options.body).toString('utf-8').slice(0, 100)}`);
        } else {
            console.log(`[FETCH INTERCEPT] Body Preview:`, options.body);
        }
    }

    // We don't actually want to hit the network to avoid side effects
    // just return a mock 200 ok
    return new Response(JSON.stringify({ commitOid: "mock_oid" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

async function run() {
    console.log("Calling @huggingface/hub uploadFiles()...");
    try {
        const result = await uploadFiles({
            repo: { type: 'model', name: 'BrightHub2/lora-emotional-intelligence-4e48e3b4' },
            credentials: { accessToken: HF_TOKEN },
            files: [
                {
                    path: "test.txt",
                    content: new Blob([new Uint8Array(Buffer.from("hello world"))])
                }
            ],
            commitTitle: "mock commit title"
        });
        console.log("Result:", result);
    } catch (err) {
        console.error("Error calling uploadFiles:", err);
    }
}

run();
