// Mock data for Dataset Management View (P02)

export interface ScaffoldingDistribution {
  persona: string;
  arc: string;
  topics: number;
  count: number;
}

export interface Dataset {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  format: 'brightrun-lora-v4' | 'brightrun-lora-v3';
  totalConversations: number;
  totalTrainingPairs: number;
  qualityScore: number;
  vertical: string;
  consultantName: string;
  consultantTitle: string;
  trainingReady: boolean;
  readinessIssues: string[];
  scaffoldingDistribution: ScaffoldingDistribution[];
  humanReviewPercent: number;
  fileStoragePath: string;
  fileSizeBytes: number;
}

export const PERSONAS = [
  { id: 'anxious_planner', name: 'Anxious Planner', color: '#3B82F6' },
  { id: 'overwhelmed_avoider', name: 'Overwhelmed Avoider', color: '#F59E0B' },
  { id: 'pragmatic_optimist', name: 'Pragmatic Optimist', color: '#10B981' },
];

export const EMOTIONAL_ARCS = [
  'couple_conflict_to_alignment',
  'fear_to_confidence',
  'confusion_to_clarity',
  'overwhelm_to_control',
  'resistance_to_acceptance',
  'anxiety_to_peace',
  'avoidance_to_engagement',
];

export const SAMPLE_CONVERSATIONS = [
  {
    id: 'conv-001',
    title: 'Retirement Planning Discussion',
    persona: 'anxious_planner',
    arc: 'fear_to_confidence',
    turnCount: 12,
    createdAt: '2024-12-15T10:30:00Z',
  },
  {
    id: 'conv-002',
    title: 'Investment Strategy Session',
    persona: 'pragmatic_optimist',
    arc: 'confusion_to_clarity',
    turnCount: 18,
    createdAt: '2024-12-14T14:20:00Z',
  },
  {
    id: 'conv-003',
    title: 'Debt Management Consultation',
    persona: 'overwhelmed_avoider',
    arc: 'overwhelm_to_control',
    turnCount: 15,
    createdAt: '2024-12-13T09:15:00Z',
  },
];

// Generate scaffolding distribution for a dataset
function generateScaffoldingDistribution(totalPairs: number): ScaffoldingDistribution[] {
  const distribution: ScaffoldingDistribution[] = [];
  const pairsPerPersona = Math.floor(totalPairs / PERSONAS.length);
  
  PERSONAS.forEach((persona) => {
    const arcsPerPersona = Math.floor(pairsPerPersona / EMOTIONAL_ARCS.length);
    
    EMOTIONAL_ARCS.forEach((arc) => {
      distribution.push({
        persona: persona.id,
        arc: arc,
        topics: 20, // Each arc has ~20 topics covered
        count: arcsPerPersona + Math.floor(Math.random() * 20), // Add some variation
      });
    });
  });
  
  return distribution;
}

export const mockDatasets: Dataset[] = [
  {
    id: 'dataset-001',
    name: 'Financial Planning - Elena Morales Full Dataset',
    createdAt: '2024-12-01T08:00:00Z',
    lastModified: '2024-12-18T15:30:00Z',
    format: 'brightrun-lora-v4',
    totalConversations: 242,
    totalTrainingPairs: 1567,
    qualityScore: 4.2,
    vertical: 'Financial Planning Consultant',
    consultantName: 'Elena Morales',
    consultantTitle: 'CFP',
    trainingReady: true,
    readinessIssues: [],
    scaffoldingDistribution: generateScaffoldingDistribution(1567),
    humanReviewPercent: 0,
    fileStoragePath: '/training-files/dataset-001-v4.jsonl',
    fileSizeBytes: 4_567_890,
  },
  {
    id: 'dataset-002',
    name: 'Career Transition Coaching - Marcus Chen',
    createdAt: '2024-11-15T10:30:00Z',
    lastModified: '2024-12-10T11:20:00Z',
    format: 'brightrun-lora-v4',
    totalConversations: 189,
    totalTrainingPairs: 1243,
    qualityScore: 3.8,
    vertical: 'Career Coach',
    consultantName: 'Marcus Chen',
    consultantTitle: 'PCC',
    trainingReady: true,
    readinessIssues: [],
    scaffoldingDistribution: generateScaffoldingDistribution(1243),
    humanReviewPercent: 5,
    fileStoragePath: '/training-files/dataset-002-v4.jsonl',
    fileSizeBytes: 3_234_567,
  },
  {
    id: 'dataset-003',
    name: 'Executive Leadership Development - Dr. Sarah Williams',
    createdAt: '2024-10-20T09:15:00Z',
    lastModified: '2024-11-25T16:45:00Z',
    format: 'brightrun-lora-v4',
    totalConversations: 156,
    totalTrainingPairs: 987,
    qualityScore: 4.5,
    vertical: 'Executive Coach',
    consultantName: 'Dr. Sarah Williams',
    consultantTitle: 'PhD, MCC',
    trainingReady: true,
    readinessIssues: [],
    scaffoldingDistribution: generateScaffoldingDistribution(987),
    humanReviewPercent: 12,
    fileStoragePath: '/training-files/dataset-003-v4.jsonl',
    fileSizeBytes: 2_876_543,
  },
  {
    id: 'dataset-004',
    name: 'Small Business Tax Advisory - James Rodriguez',
    createdAt: '2024-12-10T14:00:00Z',
    lastModified: '2024-12-15T10:30:00Z',
    format: 'brightrun-lora-v4',
    totalConversations: 98,
    totalTrainingPairs: 432,
    qualityScore: 3.2,
    vertical: 'Tax Consultant',
    consultantName: 'James Rodriguez',
    consultantTitle: 'CPA, EA',
    trainingReady: false,
    readinessIssues: ['Insufficient training pairs (minimum 500 recommended)'],
    scaffoldingDistribution: generateScaffoldingDistribution(432),
    humanReviewPercent: 0,
    fileStoragePath: '/training-files/dataset-004-v4.jsonl',
    fileSizeBytes: 1_234_567,
  },
  {
    id: 'dataset-005',
    name: 'Mental Health Counseling - Lisa Anderson (Legacy)',
    createdAt: '2024-09-05T11:20:00Z',
    lastModified: '2024-09-20T13:15:00Z',
    format: 'brightrun-lora-v3',
    totalConversations: 203,
    totalTrainingPairs: 1345,
    qualityScore: 2.8,
    vertical: 'Mental Health Counselor',
    consultantName: 'Lisa Anderson',
    consultantTitle: 'LMFT',
    trainingReady: false,
    readinessIssues: ['Legacy format (v3) - upgrade to v4 recommended', 'Quality score below 3.0'],
    scaffoldingDistribution: generateScaffoldingDistribution(1345),
    humanReviewPercent: 8,
    fileStoragePath: '/training-files/dataset-005-v3.jsonl',
    fileSizeBytes: 3_456_789,
  },
  {
    id: 'dataset-006',
    name: 'Nutritional Coaching - Amanda Foster',
    createdAt: '2024-11-01T08:45:00Z',
    lastModified: '2024-12-05T14:20:00Z',
    format: 'brightrun-lora-v4',
    totalConversations: 167,
    totalTrainingPairs: 892,
    qualityScore: 3.9,
    vertical: 'Nutritionist',
    consultantName: 'Amanda Foster',
    consultantTitle: 'RD, CSSD',
    trainingReady: true,
    readinessIssues: [],
    scaffoldingDistribution: generateScaffoldingDistribution(892),
    humanReviewPercent: 3,
    fileStoragePath: '/training-files/dataset-006-v4.jsonl',
    fileSizeBytes: 2_567_890,
  },
];

export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'quality-desc' | 'quality-asc' | 'size-desc' | 'size-asc';

export interface DatasetFilters {
  format?: 'brightrun-lora-v4' | 'brightrun-lora-v3' | 'all';
  qualityMin?: number;
  qualityMax?: number;
  dateFrom?: string;
  dateTo?: string;
  trainingReady?: boolean | 'all';
  searchQuery?: string;
}

export function filterAndSortDatasets(
  datasets: Dataset[],
  filters: DatasetFilters,
  sortBy: SortOption
): Dataset[] {
  let filtered = [...datasets];

  // Apply filters
  if (filters.format && filters.format !== 'all') {
    filtered = filtered.filter(d => d.format === filters.format);
  }

  if (filters.qualityMin !== undefined) {
    filtered = filtered.filter(d => d.qualityScore >= filters.qualityMin!);
  }

  if (filters.qualityMax !== undefined) {
    filtered = filtered.filter(d => d.qualityScore <= filters.qualityMax!);
  }

  if (filters.trainingReady !== undefined && filters.trainingReady !== 'all') {
    filtered = filtered.filter(d => d.trainingReady === filters.trainingReady);
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.consultantName.toLowerCase().includes(query) ||
      d.vertical.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'quality-desc':
        return b.qualityScore - a.qualityScore;
      case 'quality-asc':
        return a.qualityScore - b.qualityScore;
      case 'size-desc':
        return b.totalTrainingPairs - a.totalTrainingPairs;
      case 'size-asc':
        return a.totalTrainingPairs - b.totalTrainingPairs;
      default:
        return 0;
    }
  });

  return filtered;
}
