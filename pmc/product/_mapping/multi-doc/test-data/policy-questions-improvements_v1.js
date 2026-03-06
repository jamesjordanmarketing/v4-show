const path = require('path');
const fs = require('fs');

/*
 * Extractor Script: Bank Policy Improvement Questions
 * 
 * DESCRIPTION:
 * This script extracts expert questions and their associated reasons from the 
 * `rag_expert_questions` Supabase table using the Supabase Agent Ops Library (SAOL).
 * It organizes the questions by their impact level (e.g. HIGH, MEDIUM, LOW) and 
 * outputs them into a structured Markdown document, placing the Reason before the Question.
 * 
 * HOW TO RUN:
 * Open your terminal and navigate to this script's directory:
 *   cd C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data
 * 
 * Then run the script using Node.js:
 *   node policy-questions-improvements_v1.js
 * 
 * EXPECTED RESULTS:
 * The script will output a file named:
 *   bank-policy-improvement-questions_v1.md
 * 
 * This file will be created in the exact same directory as this script:
 *   C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data\bank-policy-improvement-questions_v1.md
 */

// The script runs from `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data`
// .env.local is at `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
// supa-agent-ops is at `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`
require('dotenv').config({ path: path.resolve(__dirname, '../../../../../.env.local') });
const saol = require(path.resolve(__dirname, '../../../../../supa-agent-ops'));

const OUTPUT_PATH = path.resolve(__dirname, 'bank-policy-improvement-questions_v1.md');

async function extractQuestions() {
    console.log('Querying rag_expert_questions from Supabase via SAOL...');

    // Use saol.agentQuery to get all records, ordering by impact_level and sort_order
    const queryResult = await saol.agentQuery({
        table: 'rag_expert_questions',
        orderBy: [
            { column: 'impact_level', asc: true },
            { column: 'sort_order', asc: true }
        ]
    });

    if (!queryResult.success) {
        console.error('Failed to query rag_expert_questions:', queryResult.summary || queryResult);
        return;
    }

    const questions = queryResult.data || [];
    console.log(`Retrieved ${questions.length} questions from the database.`);

    // Group by impact_level
    const grouped = {};
    for (const q of questions) {
        const tier = q.impact_level || 'uncategorized';
        const tierKey = tier.toUpperCase();
        if (!grouped[tierKey]) {
            grouped[tierKey] = [];
        }
        grouped[tierKey].push(q);
    }

    // Build Markdown Document
    let md = `# Bank Policy Improvement Questions\n\n`;
    md += `This document contains extracted reasons and questions used for improving bank policy documents.\n\n`;

    const tiers = Object.keys(grouped).sort();

    for (const tier of tiers) {
        md += `## Tier: ${tier} IMPACT\n\n`;

        const tierQuestions = grouped[tier];
        tierQuestions.forEach((q, index) => {
            md += `### Item ${index + 1}\n\n`;

            const reason = q.question_reason ? q.question_reason.trim() : 'No reason provided.';
            const question = q.question_text ? q.question_text.trim() : 'No question provided.';

            // Per requirements: Puts the Questions Reasons first in each row block and then followed by the Questions themselves.
            md += `#### Reason\n> ${reason}\n\n`;
            md += `#### Question\n${question}\n\n`;
            md += `---\n\n`;
        });
    }

    // Write to output file
    fs.writeFileSync(OUTPUT_PATH, md, 'utf-8');
    console.log(`Output successfully written to: ${OUTPUT_PATH}`);
}

extractQuestions().catch(err => {
    console.error('Unhandled error during extraction:', err);
});
