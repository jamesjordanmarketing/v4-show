const fs = require('fs');
const path = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_multi-lora-pipeline-full-dataset-JSON-example_v2.json';
const outPath = 'C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/pmct/training-data-seeds/c-alpha-build_v3.4_multi-lora-pipeline-full-dataset-JSON-example_v3.json';

try {
  console.log('Reading from:', path);
  if (!fs.existsSync(path)) {
    console.error('File not found!');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));

  function clean(obj) {
    if (Array.isArray(obj)) {
      return obj.map(clean);
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj = {};
      for (const key in obj) {
        // 1. Keys to REMOVE
        if ([
          'identifies_blind_spots',
          'blind_spot_identification',
          'user_didnt_ask_this',
          'blind_spots_identified_that_user_didnt_ask',
          'blind_spots_identified',
          'avg_blind_spots_identified_per_conversation',
          'blind_spot_detection_enabled'
        ].includes(key)) {
          continue;
        }

        // 2. Keys to RENAME
        if (key === 'blind_spots_identified_by_deliberation') {
          newObj['risks_identified'] = clean(obj[key]);
          continue;
        }

        // 3. Process VALUE (recurse)
        let value = clean(obj[key]);

        // 4. String replacements
        if (typeof value === 'string') {
          if (key === 'human_review_process') {
            value = value.replace('blind-spot identification quality', 'comprehensive coverage quality');
          }
          if (key === 'turn_type') {
            value = value.replace('_with_blind_spot_identification', '_with_comprehensive_coverage');
          }
          if (key === 'perspective_focus') {
            value = value.replace('blind_spot_identification', 'comprehensive_risk_identification');
          }
        }

        newObj[key] = value;
      }
      return newObj;
    }
    return obj;
  }

  const cleanedData = clean(data);

  if (cleanedData.dataset_metadata) {
    cleanedData.dataset_metadata.schema_version = 'brightrun-multi-lora-pipeline-v3.0';
    cleanedData.dataset_metadata.last_updated = new Date().toISOString();
  }

  fs.writeFileSync(outPath, JSON.stringify(cleanedData, null, 2));
  console.log('Successfully wrote refactored JSON to ' + outPath);

} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
