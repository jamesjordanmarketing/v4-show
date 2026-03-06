require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  try {
    const result = await saol.agentQuery({
      table: 'conversation_turns',
      select: '*',
      where: [
        { column: 'conversation_id', operator: 'eq', value: '06c92fae-0869-4405-bd33-80b1bcf9e29c' },
        { column: 'turn_number', operator: 'eq', value: 2 }
      ]
    });

    if (result.data && result.data.length > 0) {
      const turn = result.data[0];
      
      console.log('\n=== TURN 2 CONTROL EVALUATION ===');
      if (turn.control_evaluation) {
        console.log('Full evaluation:', JSON.stringify(turn.control_evaluation, null, 2));
      } else {
        console.log('No control evaluation found');
      }
      
      console.log('\n=== TURN 2 ADAPTED EVALUATION ===');
      if (turn.adapted_evaluation) {
        console.log('Full evaluation:', JSON.stringify(turn.adapted_evaluation, null, 2));
      } else {
        console.log('No adapted evaluation found');
      }
    } else {
      console.log('No data found for turn 2');
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
