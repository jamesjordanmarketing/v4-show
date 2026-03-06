// ============================================
// Work Base Types
// ============================================

export type WorkbaseStatus = 'active' | 'archived';

export interface Workbase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  activeAdapterJobId: string | null;
  documentCount: number;
  status: WorkbaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkbaseRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  active_adapter_job_id: string | null;
  document_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkbaseRequest {
  name: string;
  description?: string;
}

export interface UpdateWorkbaseRequest {
  name?: string;
  description?: string;
  status?: WorkbaseStatus;
  activeAdapterJobId?: string | null;
}

export interface WorkbaseResponse {
  success: boolean;
  data?: Workbase;
  error?: string;
}

export interface WorkbaseListResponse {
  success: boolean;
  data?: Workbase[];
  error?: string;
}

// ============================================
// Conversation Comment Types (D9)
// ============================================

export interface ConversationComment {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationCommentRow {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CommentListResponse {
  success: boolean;
  data?: ConversationComment[];
  error?: string;
}

// ============================================
// Training Set Types
// ============================================

export type TrainingSetStatus = 'processing' | 'ready' | 'failed';

export interface TrainingSet {
  id: string;
  workbaseId: string;
  userId: string;
  name: string;
  conversationIds: string[];
  conversationCount: number;
  trainingPairCount: number;
  status: TrainingSetStatus;
  jsonlPath: string | null;
  datasetId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Mapper Functions
// ============================================

export function mapRowToWorkbase(row: WorkbaseRow): Workbase {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    activeAdapterJobId: row.active_adapter_job_id,
    documentCount: row.document_count,
    status: row.status as WorkbaseStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToComment(row: ConversationCommentRow): ConversationComment {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
