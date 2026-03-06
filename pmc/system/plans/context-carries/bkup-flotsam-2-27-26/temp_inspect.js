const fs = require('fs');
require('dotenv').config({ path: './.env.local' });
const saol = require('./supa-agent-ops');

(async () => {
    const r = await saol.agentQuery({ table: 'rag_expert_questions', limit: 2 });
    if (r.success) {
        fs.writeFileSync('temp_data.json', JSON.stringify(r.data, null, 2), 'utf-8');
        console.log('Wrote to temp_data.json');
    } else {
        console.error(r);
    }
})();
