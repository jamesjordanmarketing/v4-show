// scripts/verify-adapter-env.js
require('dotenv').config({ path: '.env.local' });

const required = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', name: 'Supabase URL', public: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', name: 'Supabase Anon Key', public: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', name: 'Supabase Service Key', public: false },
  { key: 'RUNPOD_API_KEY', name: 'RunPod API Key', public: false },
];

const optional = [
  { key: 'ANTHROPIC_API_KEY', name: 'Anthropic API Key (Claude evaluation)', public: false },
];

console.log('Adapter Module - Environment Variable Check');
console.log('==========================================\n');

let allRequired = true;

console.log('Required Variables:');
for (const { key, name, public: isPublic } of required) {
  const value = process.env[key];
  const present = !!value;
  
  if (present) {
    const displayValue = isPublic ? value.substring(0, 30) + '...' : '***' + value.substring(value.length - 4);
    console.log(`  ✓ ${name}`);
    console.log(`    ${key}=${displayValue}`);
  } else {
    console.log(`  ✗ ${name} - MISSING`);
    console.log(`    ${key} is not set`);
    allRequired = false;
  }
  console.log('');
}

console.log('\nOptional Variables:');
for (const { key, name } of optional) {
  const present = !!process.env[key];
  console.log(`  ${present ? '✓' : '○'} ${name}${present ? '' : ' (not set - some features disabled)'}`);
}

console.log('\n==========================================');
if (allRequired) {
  console.log('✓ All required variables are set');
  console.log('✓ Ready for deployment');
  process.exit(0);
} else {
  console.log('✗ Some required variables are missing');
  console.log('✗ Set missing variables before deploying');
  process.exit(1);
}
