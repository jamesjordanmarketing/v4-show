// Update evaluation prompts to RQE system
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const MAIN_PROMPT_TEMPLATE = `You are an expert supervisor evaluating the quality of a financial advisor's response to a person in emotional distress. Your evaluation focuses on the ADVISOR'S RESPONSE — how well it addresses the human's emotional and practical needs.

## CONVERSATION HISTORY

{conversation_history}

## CURRENT TURN (Turn {current_turn})

HUMAN'S MESSAGE:
"{user_message}"

ADVISOR'S RESPONSE:
"{response}"

## YOUR EVALUATION TASK

Evaluate the ADVISOR'S RESPONSE across six dimensions. Think step-by-step:

1. Read the human's message carefully. Identify all emotions present — stated and implied.
2. Read the advisor's response. For each dimension, find specific evidence.
3. Score each dimension independently. Do not let strength in one dimension inflate others.
4. After all dimensions, make your holistic Predicted Arc Impact judgment.

Use the FULL scoring range (1-10). A score of 5-6 is COMPETENT — the expected baseline for a general-purpose model. Reserve 7+ for responses demonstrating clear emotional intelligence above baseline. Reserve 9-10 for exceptional responses.

Judge substance and quality, not length. A concise response that connects deeply may be superior to a lengthy one that covers ground superficially.

## DIMENSION 1: EMOTIONAL ATTUNEMENT (1-10)
Does the advisor hear and validate the emotion behind the human's words?
- 1-2: Ignores emotional content. Responds only to facts/finances.
- 3-4: Generic acknowledgment ("I understand this is hard") without naming specific emotions.
- 5-6: Identifies the primary emotion and offers basic validation.
- 7-8: Identifies primary + secondary emotions. Validates specifically and normalizes the experience.
- 9-10: Captures the full emotional landscape including unstated feelings. Deep validation with de-stigmatization.

## DIMENSION 2: EMPATHIC DEPTH (1-10)
How deeply does the advisor demonstrate understanding of the human's internal experience?
- 1-2: Generic statements that could apply to anyone.
- 3-4: Acknowledges the stated reason for the emotion but goes no deeper.
- 5-6: Connects the emotion to specific circumstances with some nuance.
- 7-8: Understands the meaning behind the words — the identity threat, the shame, the fear.
- 9-10: Captures unspoken subtext and the full weight of the experience.

## DIMENSION 3: PSYCHOLOGICAL SAFETY (1-10)
Does the advisor create a space where the human feels safe to be vulnerable?
- 1-2: Cold, clinical, robotic, or subtly judgmental.
- 3-4: Professional and polite but emotionally distant. Reads like a script.
- 5-6: Warm but formulaic. Correct words, but the voice lacks authenticity.
- 7-8: Genuinely warm, natural, non-judgmental. The human would feel cared for.
- 9-10: Deeply compassionate, authentic. Removes shame by how it speaks. The human would feel safe revealing more.

## DIMENSION 4: FACILITATION & EMPOWERMENT (1-10)
Does the advisor bridge emotional support into practical guidance while empowering the human's agency?
- 1-2: All emotion with no path forward, OR all advice with no emotional bridge. Prescriptive ("you need to").
- 3-4: Both present but disconnected. Hard transition from feelings to advice.
- 5-6: Emotional acknowledgment leads into suggestions. Transition noticeable but not jarring.
- 7-8: Natural flow from emotional support into guidance. Empowers with choices rather than commands.
- 9-10: Seamless flow where emotional processing enables practical action. Builds self-efficacy.

## DIMENSION 5: PRACTICAL GUIDANCE QUALITY (1-10)
Is the financial/practical advice sound, specific, and appropriately scaffolded?
- 1-2: Incorrect, harmful, or completely absent when clearly needed.
- 3-4: Generic platitudes ("save more, spend less").
- 5-6: Correct basic advice with some specificity.
- 7-8: Specific, actionable steps appropriate to the stated situation.
- 9-10: Expert-level, personalized guidance with progressive disclosure.
NOTE: If the human's message is purely emotional and not asking for practical help, and the advisor wisely focuses on emotional support, score 6 with a note that guidance was appropriately deferred.

## DIMENSION 6: CONVERSATIONAL CONTINUITY (1-10)
Does the advisor build on prior exchanges and maintain narrative coherence?
- 1-2: Treats the turn as if the conversation just started.
- 3-4: Vague references to earlier discussion without specifics.
- 5-6: References specific prior points. Shows awareness of the conversation's arc.
- 7-8: Explicitly builds on earlier exchanges. Acknowledges growth. Tracks emotional threads.
- 9-10: Sophisticated narrative management. Weaves the human's journey. Creates hooks for continuation.
NOTE: For Turn 1, evaluate whether the response establishes a strong conversational foundation and creates natural openings for the human to continue.

## PREDICTED ARC IMPACT (0-100%)
If a real human in this emotional state received this response, how likely is it they would feel understood and move toward a healthier emotional state?
- 0-15%: Would likely cause disengagement or defensiveness.
- 16-35%: Unlikely to help. The human would feel unheard.
- 36-55%: Provides some value but misses key emotional needs.
- 56-75%: Supportive. The human would feel understood and motivated.
- 76-90%: Highly effective. The human would feel deeply understood, safe, and empowered.
- 91-100%: Exceptional. The human would experience a meaningful emotional shift.

## RESPONSE FORMAT

Respond ONLY with valid JSON. No other text before or after.

{
  "responseQuality": {
    "d1_emotionalAttunement": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations from the response>"
    },
    "d2_empathicDepth": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d3_psychologicalSafety": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d4_facilitationEmpowerment": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d5_practicalGuidance": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d6_conversationalContinuity": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    }
  },
  "predictedArcImpact": {
    "score": <0-100>,
    "reasoning": "<2-3 sentences on why the human would or would not progress>"
  },
  "responseQualityScore": <1.0-10.0>,
  "turnSummary": {
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<area 1>", "<area 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}`;

const PAIRWISE_PROMPT_TEMPLATE = `You are an expert supervisor performing a blind comparison of two financial advisor responses to the same human message.

## CONVERSATION HISTORY

{conversation_history}

## CURRENT TURN (Turn {current_turn})

HUMAN'S MESSAGE:
"{user_message}"

RESPONSE A:
"{response_a}"

RESPONSE B:
"{response_b}"

## YOUR TASK

Compare these two responses holistically. Consider emotional intelligence, facilitation quality, practical guidance, and communication quality.

Which response better serves the human's emotional AND practical needs?

Rules:
- Judge substance, not length or style.
- A shorter response that truly connects may be better than a longer one.
- Consider: Which response would a real human find more helpful in this moment?
- If both are genuinely comparable, "tie" is a valid answer.

Respond ONLY with valid JSON:

{
  "preferred": "A" | "B" | "tie",
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences explaining the preference>",
  "dimensionAdvantages": {
    "A": ["<quality where A is notably better>"],
    "B": ["<quality where B is notably better>"]
  }
}`;

(async () => {
  console.log('🔄 Starting RQE evaluation prompts update...\n');

  try {
    // Step 1: Update the existing multi_turn_arc_aware_v1 record
    console.log('Step 1: Updating primary evaluator prompt...');
    
    const existingId = '6670c6b0-6185-4bc3-be4d-c6ea46f29da5';
    
    const updateResult = await saol.agentExecuteSQL({
      sql: `
        UPDATE evaluation_prompts
        SET 
          name = 'response_quality_multi_turn_v1',
          display_name = 'Response Quality Evaluator (Multi-Turn v1)',
          description = 'Evaluates advisor response quality across 6 EI dimensions with predicted arc impact. Measures the model response, not the human input.',
          prompt_template = $$${MAIN_PROMPT_TEMPLATE}$$,
          includes_arc_context = false,
          model = 'claude-sonnet-4-20250514',
          max_tokens = 3000,
          is_active = true,
          is_default = false,
          updated_at = NOW()
        WHERE id = '${existingId}'
        RETURNING id, name, display_name;
      `,
      transport: 'pg',
      transaction: true
    });

    if (updateResult.success && updateResult.rows && updateResult.rows.length > 0) {
      console.log('✅ Primary evaluator updated successfully');
      console.log(`   Name: ${updateResult.rows[0].name}`);
      console.log(`   Display Name: ${updateResult.rows[0].display_name}`);
      console.log(`   Max tokens: 3000`);
      console.log(`   Includes arc context: false\n`);
    } else {
      console.error('❌ Failed to update primary evaluator');
      console.error('Full result:', JSON.stringify(updateResult, null, 2));
      return;
    }

    // Step 2: Insert the pairwise comparison prompt
    console.log('Step 2: Inserting pairwise comparison prompt...');
    
    const insertResult = await saol.agentExecuteSQL({
      sql: `
        INSERT INTO evaluation_prompts (
          name,
          display_name,
          description,
          prompt_template,
          includes_arc_context,
          model,
          max_tokens,
          is_active,
          is_default,
          version
        ) VALUES (
          'response_quality_pairwise_v1',
          'Response Quality Pairwise Comparison (v1)',
          'Head-to-head comparison of two advisor responses. Used alongside the primary evaluator for sharper winner determination.',
          $$${PAIRWISE_PROMPT_TEMPLATE}$$,
          false,
          'claude-sonnet-4-20250514',
          1500,
          true,
          false,
          1
        )
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          prompt_template = EXCLUDED.prompt_template,
          max_tokens = EXCLUDED.max_tokens,
          updated_at = NOW()
        RETURNING id, name, display_name;
      `,
      transport: 'pg',
      transaction: true
    });

    if (insertResult.success && insertResult.rows && insertResult.rows.length > 0) {
      console.log('✅ Pairwise comparison prompt inserted successfully');
      console.log(`   Name: ${insertResult.rows[0].name}`);
      console.log(`   Display Name: ${insertResult.rows[0].display_name}`);
      console.log(`   Max tokens: 1500\n`);
    } else {
      console.error('❌ Failed to insert pairwise prompt');
      console.error('Full result:', JSON.stringify(insertResult, null, 2));
      return;
    }

    // Step 3: Verify installation
    console.log('Step 3: Verifying installation...');
    
    const verifyResult = await saol.agentQuery({
      table: 'evaluation_prompts',
      select: 'id,name,display_name,includes_arc_context,max_tokens,is_active',
      where: [{ column: 'name', operator: 'like', value: 'response_quality%' }]
    });

    console.log('\n✅ RQE Evaluators installed:\n');
    verifyResult.data.forEach((prompt, index) => {
      console.log(`${index + 1}. ${prompt.display_name}`);
      console.log(`   Name: ${prompt.name}`);
      console.log(`   Max Tokens: ${prompt.max_tokens}`);
      console.log(`   Arc Context: ${prompt.includes_arc_context}`);
      console.log(`   Active: ${prompt.is_active}`);
      console.log(`   ID: ${prompt.id}\n`);
    });

    console.log('🎉 RQE evaluation system successfully installed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test in production app at /pipeline/jobs/[jobId]/chat');
    console.log('   2. Select "Response Quality Evaluator (Multi-Turn v1)"');
    console.log('   3. Verify Turn 1 is evaluated (NOT baseline)');
    console.log('   4. Check progress bars show PAI percentages');

  } catch (error) {
    console.error('\n❌ Error during installation:', error.message);
    console.error(error);
  }
})();
