// Utility functions for dataset management

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string, includeTime = false): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Get color class for quality score
 */
export function getQualityColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-blue-600';
  if (score >= 2) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get background color for quality score
 */
export function getQualityBgColor(score: number): string {
  if (score >= 4) return 'bg-green-50';
  if (score >= 3) return 'bg-blue-50';
  if (score >= 2) return 'bg-yellow-50';
  return 'bg-red-50';
}

/**
 * Format arc name from snake_case to Title Case
 */
export function formatArcName(arc: string): string {
  return arc
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate percentage with precision
 */
export function calculatePercentage(value: number, total: number, decimals = 1): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Validate dataset readiness
 */
export function validateDatasetReadiness(dataset: {
  format: string;
  totalTrainingPairs: number;
  qualityScore: number;
}): { ready: boolean; issues: string[] } {
  const issues: string[] = [];

  if (dataset.format !== 'brightrun-lora-v4') {
    issues.push('Legacy format - upgrade to v4 recommended');
  }

  if (dataset.totalTrainingPairs < 500) {
    issues.push('Insufficient training pairs (minimum 500 recommended)');
  }

  if (dataset.qualityScore < 3.0) {
    issues.push('Quality score below 3.0 threshold');
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Generate color from string (for consistent persona colors)
 */
export function getColorFromString(str: string): string {
  const colors = [
    '#3B82F6', // blue
    '#F59E0B', // amber
    '#10B981', // green
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
