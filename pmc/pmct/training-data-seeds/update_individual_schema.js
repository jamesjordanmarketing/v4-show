const fs = require('fs');

const v4IndividualPath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_emotional-dataset-individual-JSON-format_v4.json';
const v5FullPath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_emotional-dataset-full-JSON-format_v5.json';
const targetPath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_emotional-dataset-individual-JSON-format_v5.json';

try {
    const v4Data = JSON.parse(fs.readFileSync(v4IndividualPath, 'utf8'));
    const v5Data = JSON.parse(fs.readFileSync(v5FullPath, 'utf8'));

    // 1. Initialize v5 Individual with v4's Root Base
    const newSchema = {
        "$schema": v4Data["$schema"],
        "$id": v4Data["$id"].replace('v4.0', 'v5.0'),
        "title": v4Data["title"].replace('v4.0', 'v5.0'),
        "description": "Schema for single enriched conversation files - output of the enrichment pipeline. v5.0: Aligned with Full Training File schema v5.0 and removed blind-spot detection.",
        "type": "object",
        "required": v4Data.required,
        "additionalProperties": false,
        "properties": {
            // Keep dataset_metadata but update version default
            "dataset_metadata": v4Data.properties.dataset_metadata,
            // Keep consultant_profile
            "consultant_profile": v4Data.properties.consultant_profile,
            // Keep training_pairs structure
            "training_pairs": v4Data.properties.training_pairs
        },
        "$defs": {}
    };

    // 2. Update Metadata Version Default
    if (newSchema.properties.dataset_metadata.properties.version) {
        newSchema.properties.dataset_metadata.properties.version.default = "5.0.0";
    }

    // 3. Update Definitions from v5 Full
    // We want to use v5's definitions for training_pair and its dependencies to ensure strict alignment.

    // Exclude 'conversation_object' as that is unique to the aggregate file
    const v5Defs = v5Data["$defs"];
    for (const key in v5Defs) {
        if (key !== 'conversation_object') {
            newSchema["$defs"][key] = v5Defs[key];
        }
    }

    // 4. Verify training_pairs reference
    // v4 training_pairs referred to #/$defs/training_pair. 
    // v5 definitions include training_pair, so this reference remains valid.

    // 5. Explicitly check for Blind Spots (just in case they lingered in v5 defs - unlikely but good to verify)
    function removeBlindSpots(obj) {
        if (typeof obj !== 'object' || obj === null) return;
        if (Array.isArray(obj)) {
            obj.forEach(removeBlindSpots);
            return;
        }
        for (const key in obj) {
            if (key.includes('blind_spot') || key.includes('blind_spots')) {
                delete obj[key];
                continue;
            }
            removeBlindSpots(obj[key]);
        }
    }
    removeBlindSpots(newSchema);

    // Write Result
    fs.writeFileSync(targetPath, JSON.stringify(newSchema, null, 2));
    console.log('Successfully created v5 Individual Schema at:', targetPath);

} catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
}
