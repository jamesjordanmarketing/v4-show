require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  try {
    const result1 = await saol.agentQuery({
      table: 'conversation_turns',
      select: 'conversation_id,turn_number,control_response,adapted_response,control_tokens_used,adapted_tokens_used',
      where: [{ column: 'conversation_id', operator: 'eq', value: 'fef42c3f-03f5-4935-9880-03bf5bda9fcd' }],
      order: [{ column: 'turn_number', ascending: true }]
    });
    
    const result2 = await saol.agentQuery({
      table: 'conversation_turns',
      select: 'conversation_id,turn_number,control_response,adapted_response,control_tokens_used,adapted_tokens_used',
      where: [{ column: 'conversation_id', operator: 'eq', value: 'ba7ebb4f-8631-4b58-a239-dd68de14abcb' }],
      order: [{ column: 'turn_number', ascending: true }]
    });
    
    console.log('=== CONVERSATION fef42c3f (BEFORE fixes) ===');
    console.log('Control tokens:', result1.data[0].control_tokens_used);
    console.log('Control response length:', result1.data[0].control_response.length);
    console.log('Control response:', result1.data[0].control_response.substring(0, 300));
    console.log('\nAdapter tokens:', result1.data[0].adapted_tokens_used);
    console.log('Adapter response length:', result1.data[0].adapted_response.length);
    console.log('Adapter response:', result1.data[0].adapted_response.substring(0, 300));
    
    console.log('\n\n=== CONVERSATION ba7ebb4f (AFTER fixes) ===');
    console.log('Control tokens:', result2.data[0].control_tokens_used);
    console.log('Control response length:', result2.data[0].control_response.length);
    console.log('Control response:', result2.data[0].control_response.substring(0, 300));
    console.log('\nAdapter tokens:', result2.data[0].adapted_tokens_used);
    console.log('Adapter response length:', result2.data[0].adapted_response.length);
    console.log('Adapter response:', result2.data[0].adapted_response.substring(0, 300));
  } catch (error) {
    console.error('Error:', error);
  }
})();
