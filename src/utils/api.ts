import { ChunkUploadRequest } from '../types/upload';

// Default delay settings (in milliseconds)
export const UPLOAD_SPEEDS = {
  fast: { min: 50, max: 150 },      // 50-150ms (default)
  normal: { min: 150, max: 300 },   // 150-300ms
  slow: { min: 500, max: 1000 },    // 500-1000ms
  verySlow: { min: 1000, max: 2000 }, // 1000-2000ms
} as const;

export type UploadSpeed = keyof typeof UPLOAD_SPEEDS;

let currentSpeed: UploadSpeed = 'verySlow';

/**
 * Sets the upload speed/delay
 */
export function setUploadSpeed(speed: UploadSpeed): void {
  currentSpeed = speed;
  // Store in localStorage for persistence
  localStorage.setItem('uploadSpeed', speed);
}

/**
 * Gets the current upload speed
 */
export function getUploadSpeed(): UploadSpeed {
  const stored = localStorage.getItem('uploadSpeed');
  if (stored && stored in UPLOAD_SPEEDS) {
    return stored as UploadSpeed;
  }
  return 'verySlow';
}

// Initialize speed from localStorage
currentSpeed = getUploadSpeed();

/**
 * Simulates uploading a chunk to the backend
 * Since there's no backend, this simulates network conditions
 */
export async function uploadChunk(request: ChunkUploadRequest): Promise<void> {
  // Get delay based on current speed setting
  const speedConfig = UPLOAD_SPEEDS[currentSpeed];
  const delay = Math.random() * (speedConfig.max - speedConfig.min) + speedConfig.min;
  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate random failures (10% failure rate for demonstration)
  const shouldFail = Math.random() < 0.1;
  
  if (shouldFail) {
    throw new Error(`Failed to upload chunk ${request.chunkIndex}`);
  }

  // Simulate successful upload
  console.log(`Chunk ${request.chunkIndex} uploaded successfully`);
}

/**
 * Simulates checking which chunks are already uploaded on the server
 * In a real implementation, this would query the backend
 */
export async function getUploadedChunks(_uploadId: string): Promise<number[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In a real implementation, this would return chunks already on the server
  // For now, we return empty array (all chunks need to be uploaded)
  return [];
}

