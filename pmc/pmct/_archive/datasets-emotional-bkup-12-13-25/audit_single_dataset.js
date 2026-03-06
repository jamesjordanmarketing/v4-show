const fs = require('fs');
const path = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_multi-lora-pipeline-single-dataset-JSON-example_v2.json';

try {
    console.log('Reading from:', path);
    if (!fs.existsSync(path)) {
        console.error('File not found!');
        process.exit(1);
    }
    const content = fs.readFileSync(path, 'utf8');

    // 1. Check Validity
    const data = JSON.parse(content);
    console.log('✅ JSON Syntax: Valid');

    // 2. Check for Blind Spot Keys (Audit Mode)
    const blindSpotKeys = [
        'identifies_blind_spots',
        'identifies_blind_spot',
        'blind_spot_identification',
        'user_didnt_ask_this',
        'blind_spots_identified_that_user_didnt_ask',
        'blind_spots_identified',
        'avg_blind_spots_identified_per_conversation',
        'blind_spot_detection_enabled'
    ];

    let foundKeys = {};

    function audit(obj, path = '') {
        if (Array.isArray(obj)) {
            obj.forEach((item, i) => audit(item, `${path}[${i}]`));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (blindSpotKeys.includes(key)) {
                    if (!foundKeys[key]) foundKeys[key] = 0;
                    foundKeys[key]++;
                }
                audit(obj[key], `${path}.${key}`);
            }
        }
    }

    audit(data);

    const totalFound = Object.values(foundKeys).reduce((a, b) => a + b, 0);
    if (totalFound > 0) {
        console.log(`ℹ️  Contains Blind Spot Elements (Total: ${totalFound}):`);
        console.log(JSON.stringify(foundKeys, null, 2));
    } else {
        console.log('✨ Clean: No blind spot elements found.');
    }

    // 3. Structure Check
    if (data.conversation_id && data.internal_deliberation) {
        console.log('✅ Structure: Valid Single Dataset format (Root is Conversation).');
    } else if (data.conversations) {
        console.log('⚠️  Structure: Looks like a Full Dataset format (Root has conversations array), but filename implies Single.');
    } else {
        console.log('❓ Structure: Unrecognized root structure.');
    }

} catch (err) {
    console.error('❌ JSON Error:', err.message);
    process.exit(1);
}
