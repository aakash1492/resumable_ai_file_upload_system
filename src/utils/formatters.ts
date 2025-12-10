import { UploadSpeed } from './api';

/**
 * Formats bytes to human-readable string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Gets human-readable label for upload speed
 */
export function getSpeedLabel(speed: UploadSpeed): string {
  const labels: Record<UploadSpeed, string> = {
    fast: 'Fast',
    normal: 'Normal',
    slow: 'Slow',
    verySlow: 'Very Slow',
  };
  return labels[speed];
}

/**
 * Formats milliseconds to human-readable time string
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

