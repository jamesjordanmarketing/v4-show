require('dotenv').config({ path: './.env.local' });

async function testEdgeFunctions() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const functions = [
        'validate-datasets',
        'process-training-jobs',
        'create-model-artifacts'
    ];

    console.log('\n🧪 Testing Edge Functions Deployment\n');

    for (const func of functions) {
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (response.status === 404) {
                console.log(`❌ ${func}: NOT DEPLOYED (404)`);
            } else {
                console.log(`✅ ${func}: DEPLOYED (HTTP ${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${func}: ERROR - ${error.message}`);
        }
    }

    console.log('');
}

testEdgeFunctions();
