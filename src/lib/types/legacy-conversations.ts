/**
 * Legacy Conversation System Types
 * 
 * DEPRECATED: These types support the legacy conversation generation system.
 * New features should use the multi-turn A/B testing system instead.
 * 
 * Migration: Planned for Phase 2 (E06+)
 */

// Re-export existing types but mark as legacy
export type LegacyConversationTurn = import('./conversations').StorageConversationTurn;

export type LegacyConversation = import('./conversations').StorageConversation;

/**
 * @deprecated Use multi-turn conversation system instead
 */
export const LEGACY_TURNS_TABLE = 'legacy_conversation_turns' as const;

/**
 * @deprecated Use multi_turn_conversations instead
 */
export const LEGACY_CONVERSATIONS_TABLE = 'conversations' as const;
