/**
 * Test Scenarios for Claude-as-Judge Evaluation
 * 
 * These are HELD-OUT scenarios NOT used in training data.
 * Used to evaluate baseline (untrained) vs trained model.
 */

import { TestScenario, EmotionalArcType, PersonaType } from '@/types/pipeline-evaluation';

export const TEST_SCENARIOS: TestScenario[] = [
  // Anxiety to Confidence
  {
    id: 'test_anxiety_confidence_001',
    arcType: 'anxiety_to_confidence',
    persona: 'anxious_planner',
    topic: 'Market Volatility',
    initialContext: {
      userName: 'Alex',
      userBackground: 'Mid-career professional, 35, first-time serious investor with $80k portfolio',
      emotionalState: {
        primaryEmotion: 'anxiety',
        intensity: 0.8,
        secondaryEmotions: ['fear', 'confusion', 'frustration'],
      },
      situation: 'Market dropped 12% this week, portfolio down $9,600, considering selling everything',
    },
    openingMessage: "I'm freaking out right now. My portfolio is down almost $10,000 this week. I knew I shouldn't have invested so much. Should I just sell everything before it gets worse? I can't sleep at night thinking about this.",
    targetArc: {
      sourceEmotion: 'anxiety',
      targetEmotion: 'confidence',
      expectedTurns: 5,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },
  {
    id: 'test_anxiety_confidence_002',
    arcType: 'anxiety_to_confidence',
    persona: 'overwhelmed_avoider',
    topic: 'Retirement Planning',
    initialContext: {
      userName: 'Jordan',
      userBackground: 'Late 40s, minimal retirement savings, avoided thinking about retirement',
      emotionalState: {
        primaryEmotion: 'anxiety',
        intensity: 0.7,
        secondaryEmotions: ['shame', 'overwhelm'],
      },
      situation: 'Just turned 48, realized retirement is approaching with only $45k saved',
    },
    openingMessage: "I'm 48 and I only have $45,000 saved for retirement. I feel like such a failure. Everyone else my age seems to have it together. Is it even worth trying at this point or is it too late for me?",
    targetArc: {
      sourceEmotion: 'anxiety',
      targetEmotion: 'confidence',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Confusion to Clarity
  {
    id: 'test_confusion_clarity_001',
    arcType: 'confusion_to_clarity',
    persona: 'pragmatic_optimist',
    topic: 'Investment Options',
    initialContext: {
      userName: 'Morgan',
      userBackground: 'New to investing, $30k to invest, overwhelmed by choices',
      emotionalState: {
        primaryEmotion: 'confusion',
        intensity: 0.75,
        secondaryEmotions: ['frustration', 'uncertainty'],
      },
      situation: 'Has $30k inheritance, wants to invest but doesn\'t understand the options',
    },
    openingMessage: "I just inherited $30,000 and everyone is giving me different advice. My dad says stocks, my friend says crypto, my coworker swears by real estate. I don't understand the difference between ETFs and mutual funds. Where do I even start?",
    targetArc: {
      sourceEmotion: 'confusion',
      targetEmotion: 'clarity',
      expectedTurns: 4,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Couple Conflict to Alignment
  {
    id: 'test_conflict_alignment_001',
    arcType: 'couple_conflict_to_alignment',
    persona: 'anxious_planner',
    topic: 'Couple Financial Disagreement',
    initialContext: {
      userName: 'Sam',
      userBackground: 'Married 5 years, spouse is a spender, constant money arguments',
      emotionalState: {
        primaryEmotion: 'frustration',
        intensity: 0.85,
        secondaryEmotions: ['resentment', 'hopelessness'],
      },
      situation: 'Had another fight about money, spouse bought $2k item without discussing',
    },
    openingMessage: "My spouse just bought a $2,000 gaming setup without telling me, AGAIN. I'm so tired of this. We've had this same fight a hundred times. They say I'm too controlling about money, but someone has to be responsible. I don't know how to fix this anymore.",
    targetArc: {
      sourceEmotion: 'frustration',
      targetEmotion: 'alignment',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Overwhelm to Empowerment
  {
    id: 'test_overwhelm_empowerment_001',
    arcType: 'overwhelm_to_empowerment',
    persona: 'overwhelmed_avoider',
    topic: 'Debt Management',
    initialContext: {
      userName: 'Riley',
      userBackground: 'Multiple credit cards, $35k total debt, minimum payments only',
      emotionalState: {
        primaryEmotion: 'overwhelm',
        intensity: 0.9,
        secondaryEmotions: ['shame', 'despair'],
      },
      situation: 'Just added up all debts for first time, shocked by total',
    },
    openingMessage: "I finally added up all my credit cards and I owe $35,000. I've been avoiding looking at the real number for years. I feel sick. I make barely $50k a year. I can't even cover the interest. I feel like I'm drowning and there's no way out.",
    targetArc: {
      sourceEmotion: 'overwhelm',
      targetEmotion: 'empowerment',
      expectedTurns: 7,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Shame to Acceptance
  {
    id: 'test_shame_acceptance_001',
    arcType: 'shame_to_acceptance',
    persona: 'emotional_processor',
    topic: 'Financial Mistakes',
    initialContext: {
      userName: 'Casey',
      userBackground: 'Lost $50k on a failed business, still recovering',
      emotionalState: {
        primaryEmotion: 'shame',
        intensity: 0.8,
        secondaryEmotions: ['guilt', 'self-blame'],
      },
      situation: 'Family found out about the business failure, feeling judged',
    },
    openingMessage: "My family just found out I lost $50,000 on my failed business. My parents looked so disappointed. My brother said 'I told you so.' I feel like such an idiot. Everyone trusted me and I blew it. How do I even face them at family dinners anymore?",
    targetArc: {
      sourceEmotion: 'shame',
      targetEmotion: 'acceptance',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },
];

export function getScenariosByArcType(arcType: EmotionalArcType): TestScenario[] {
  return TEST_SCENARIOS.filter(s => s.arcType === arcType);
}

export function getScenarioById(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find(s => s.id === id);
}
