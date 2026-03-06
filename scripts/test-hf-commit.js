import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const HF_TOKEN = process.env.HF_TOKEN;
const HF_ORG = 'BrightHub2';
const hfRepoName = 'lora-emotional-intelligence-4e48e3b4'; // existing test repo

async function testCommit(name, buildFormData) {
  console.log(`\n\n=== Testing ${name} ===`);
  const formData = buildFormData();
  try {
    const res = await fetch(`https://huggingface.co/api/models/${HF_ORG}/${hfRepoName}/commit/main`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      body: formData,
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ HTTP ${res.status}: ${err}`);
      return false;
    } else {
      const data = await res.json();
      console.log(`✅ Success! Commit OID: ${data.commitOid}`);
      return true;
    }
  } catch (e) {
    console.error(`💥 Exception: ${e.message}`);
    return false;
  }
}

async function run() {
  if (!HF_TOKEN) throw new Error('No HF_TOKEN');
  
  // Test 1: Current approach (Blob without filename)
  await testCommit('Current Approach (Blob without filename)', () => {
    const fd = new FormData();
    fd.append('header', new Blob([JSON.stringify({ summary: 'test 1', description: '' })], { type: 'application/json' }));
    fd.append('file', new Blob([new Uint8Array(Buffer.from('hello 1'))]), 'test1.txt');
    return fd;
  });

  // Test 2: Plain string
  await testCommit('Plain String instead of Blob', () => {
    const fd = new FormData();
    fd.append('header', JSON.stringify({ summary: 'test 2', description: '' }));
    fd.append('file', new Blob([new Uint8Array(Buffer.from('hello 2'))]), 'test2.txt');
    return fd;
  });

  // Test 3: Blob but base64 encoding files like huggingface_hub python does
  // The official docs say header.summary, and parts are files
  
  // Wait, let's look at what fetch sends for Blob. It might not actually include the boundary correctly if not node 20 compatible.
}

run();
