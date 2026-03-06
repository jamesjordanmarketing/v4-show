/**
 * Mock data for BrightRun LoRA Training Pipeline
 * This file contains all mock data used throughout the application
 */

export interface TrainingJob {
  id: string;
  name: string;
  status: 'training' | 'queued' | 'completed' | 'failed' | 'warning';
  progress: number;
  startTime: string;
  estimatedCompletion?: string;
  currentEpoch?: number;
  totalEpochs?: number;
  gpuType?: string;
  costPerHour?: number;
  elapsedTime?: string;
  dataset?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface CostData {
  currentMonth: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  breakdown: {
    training: number;
    storage: number;
    api: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'training_started' | 'training_completed' | 'model_deployed' | 'dataset_uploaded';
  description: string;
  timestamp: string;
  user?: string;
}

export interface UserData {
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

// Mock Active Training Jobs
export const mockActiveJobs: TrainingJob[] = [
  {
    id: 'job-001',
    name: 'Customer Support LoRA v2.1',
    status: 'training',
    progress: 67,
    startTime: '2025-12-20T10:30:00Z',
    estimatedCompletion: '2025-12-20T14:15:00Z',
    currentEpoch: 2,
    totalEpochs: 3,
    gpuType: 'A100 80GB',
    costPerHour: 2.49,
    elapsedTime: '2h 15m',
    dataset: 'customer-support-conv-2025-12'
  },
  {
    id: 'job-002',
    name: 'Technical Documentation Assistant',
    status: 'training',
    progress: 34,
    startTime: '2025-12-20T11:45:00Z',
    estimatedCompletion: '2025-12-20T16:30:00Z',
    currentEpoch: 1,
    totalEpochs: 3,
    gpuType: 'A100 40GB',
    costPerHour: 1.89,
    elapsedTime: '1h 0m',
    dataset: 'tech-docs-conv-2025-12'
  }
];

export const mockQueuedJobs: TrainingJob[] = [
  {
    id: 'job-003',
    name: 'Sales Conversation Model',
    status: 'queued',
    progress: 0,
    startTime: '2025-12-20T12:00:00Z',
    gpuType: 'A100 40GB',
    dataset: 'sales-conv-2025-11'
  }
];

export const mockCompletedJobs: TrainingJob[] = [
  {
    id: 'job-004',
    name: 'Customer Support LoRA v2.0',
    status: 'completed',
    progress: 100,
    startTime: '2025-12-19T09:00:00Z',
    currentEpoch: 3,
    totalEpochs: 3,
    gpuType: 'A100 80GB',
    costPerHour: 2.49,
    elapsedTime: '4h 23m',
    dataset: 'customer-support-conv-2025-11'
  },
  {
    id: 'job-005',
    name: 'Product Description Generator',
    status: 'completed',
    progress: 100,
    startTime: '2025-12-18T14:30:00Z',
    currentEpoch: 3,
    totalEpochs: 3,
    gpuType: 'A100 40GB',
    costPerHour: 1.89,
    elapsedTime: '3h 45m',
    dataset: 'product-desc-conv-2025-11'
  },
  {
    id: 'job-006',
    name: 'Code Review Assistant',
    status: 'failed',
    progress: 45,
    startTime: '2025-12-17T10:00:00Z',
    currentEpoch: 1,
    totalEpochs: 3,
    gpuType: 'A100 40GB',
    dataset: 'code-review-conv-2025-11'
  }
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'success',
    title: 'Training Completed',
    message: 'Customer Support LoRA v2.0 has finished training successfully',
    timestamp: '2025-12-19T13:23:00Z',
    read: false,
    actionUrl: '/training/job-004',
    actionLabel: 'View Results'
  },
  {
    id: 'notif-002',
    type: 'warning',
    title: 'High Cost Alert',
    message: 'Your training costs for this month have exceeded $40',
    timestamp: '2025-12-20T09:15:00Z',
    read: false,
    actionUrl: '/settings',
    actionLabel: 'Review Budget'
  },
  {
    id: 'notif-003',
    type: 'error',
    title: 'Training Failed',
    message: 'Code Review Assistant training failed due to insufficient GPU memory',
    timestamp: '2025-12-17T12:30:00Z',
    read: true,
    actionUrl: '/training/job-006',
    actionLabel: 'View Details'
  },
  {
    id: 'notif-004',
    type: 'info',
    title: 'New Dataset Ready',
    message: 'sales-conv-2025-11 has been processed and is ready for training',
    timestamp: '2025-12-16T16:45:00Z',
    read: true,
    actionUrl: '/datasets',
    actionLabel: 'View Dataset'
  },
  {
    id: 'notif-005',
    type: 'success',
    title: 'Model Deployed',
    message: 'Product Description Generator v1.2 is now live in production',
    timestamp: '2025-12-18T18:30:00Z',
    read: true,
    actionUrl: '/models',
    actionLabel: 'View Model'
  }
];

// Mock Cost Data
export const mockCostData: CostData = {
  currentMonth: 47.23,
  trend: 'up',
  trendPercentage: 12.5,
  breakdown: {
    training: 38.50,
    storage: 5.23,
    api: 3.50
  }
};

// Mock Recent Activity
export const mockRecentActivity: RecentActivity[] = [
  {
    id: 'activity-001',
    type: 'training_started',
    description: 'Started training Customer Support LoRA v2.1',
    timestamp: '2025-12-20T10:30:00Z',
    user: 'Sarah Chen'
  },
  {
    id: 'activity-002',
    type: 'training_started',
    description: 'Started training Technical Documentation Assistant',
    timestamp: '2025-12-20T11:45:00Z',
    user: 'Marcus Rodriguez'
  },
  {
    id: 'activity-003',
    type: 'training_completed',
    description: 'Completed training Customer Support LoRA v2.0',
    timestamp: '2025-12-19T13:23:00Z',
    user: 'Sarah Chen'
  },
  {
    id: 'activity-004',
    type: 'model_deployed',
    description: 'Deployed Product Description Generator v1.2 to production',
    timestamp: '2025-12-18T18:30:00Z',
    user: 'Alex Kim'
  },
  {
    id: 'activity-005',
    type: 'dataset_uploaded',
    description: 'Uploaded new dataset: sales-conv-2025-11',
    timestamp: '2025-12-16T16:45:00Z',
    user: 'Jordan Taylor'
  }
];

// Mock User Data
export const mockUserData: UserData = {
  name: 'Sarah Chen',
  email: 'sarah.chen@brightrun.ai',
  role: 'AI Engineer'
};

// Helper function to get unread notification count
export const getUnreadNotificationCount = (): number => {
  return mockNotifications.filter(n => !n.read).length;
};

// Helper function to get active job count
export const getActiveJobCount = (): number => {
  return mockActiveJobs.length;
};

// Helper function to format time ago
export const formatTimeAgo = (timestamp: string): string => {
  const now = new Date('2025-12-20T12:45:00Z'); // Current mock time
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
};
