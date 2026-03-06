const fs = require('fs');
const readline = require('readline');

const sourcePath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_emotional-dataset-full-JSON-format_v4.jsonl';
const targetPath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_emotional-dataset-full-JSON-format_v5.jsonl';

const BLIND_SPOT_KEYS = [
    'identifies_blind_spots',
    'identifies_blind_spot',
    'blind_spot_identification',
    'user_didnt_ask_this',
    'blind_spots_identified_that_user_didnt_ask',
    'blind_spots_identified',
    'avg_blind_spots_identified_per_conversation',
    'blind_spot_detection_enabled'
];

function clean(obj) {
    if (Array.isArray(obj)) {
        return obj.map(clean);
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (BLIND_SPOT_KEYS.includes(key)) continue;

            // Recursive clean
            let value = clean(obj[key]);

            // Rename or Transform if needed? 
            // Current instruction implies primarily blind spot removal and version update.
            // v5 schema doesn't seem to rename 'blind_spots_identified_by_deliberation' to 'risks_identified'
            // because emotional dataset likely doesn't have 'consensus_building' block in the same way.
            // But if it did, we'd handle it.

            newObj[key] = value;
        }
        return newObj;
    }
    return obj;
}

async function processLineByLine() {
    const fileStream = fs.createReadStream(sourcePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outputStream = fs.createWriteStream(targetPath);

    let firstLine = true;

    for await (const line of rl) {
        if (!line.trim()) continue;

        let data = JSON.parse(line);

        if (firstLine && data._meta) {
            // Update Metadata Header
            data._meta.version = '5.0.0';
            data._meta.format_spec = 'brightrun-lora-v5';
            data._meta.description = (data._meta.description || "").replace('v4', 'v5');

            // Clean metadata just in case
            data = clean(data);

            firstLine = false;
        } else {
            // Process Training Pair
            data = clean(data);
        }

        outputStream.write(JSON.stringify(data) + '\n');
    }

    console.log('Conversion complete.');
}

processLineByLine().catch(err => console.error(err));
