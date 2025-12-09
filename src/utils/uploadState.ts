import { UploadState, ChunkStatus } from '../types/upload';

const STORAGE_PREFIX = 'upload_state_';

/**
 * Saves upload state to localStorage
 */
export function saveUploadState(uploadId: string, state: UploadState): void {
  try {
    const key = `${STORAGE_PREFIX}${uploadId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save upload state:', error);
  }
}

/**
 * Loads upload state from localStorage
 */
export function loadUploadState(uploadId: string): UploadState | null {
  try {
    const key = `${STORAGE_PREFIX}${uploadId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load upload state:', error);
    return null;
  }
}

/**
 * Gets all upload states from localStorage
 */
export function getAllUploadStates(): UploadState[] {
  const states: UploadState[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          states.push(JSON.parse(data));
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all upload states:', error);
  }
  
  return states;
}

/**
 * Deletes upload state from localStorage
 */
export function deleteUploadState(uploadId: string): void {
  try {
    const key = `${STORAGE_PREFIX}${uploadId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete upload state:', error);
  }
}

/**
 * Creates initial upload state
 */
export function createUploadState(
  uploadId: string,
  fileName: string,
  fileSize: number,
  totalChunks: number,
  chunkSize: number
): UploadState {
  const chunks: ChunkStatus[] = Array.from({ length: totalChunks }, (_, index) => ({
    chunkIndex: index,
    uploaded: false,
    failed: false,
    retryCount: 0,
  }));

  return {
    uploadId,
    fileName,
    fileSize,
    totalChunks,
    chunkSize,
    chunks,
    startTime: Date.now(),
    lastUpdate: Date.now(),
  };
}

/**
 * Updates chunk status in upload state
 */
export function updateChunkStatus(
  state: UploadState,
  chunkIndex: number,
  uploaded: boolean,
  failed: boolean = false
): UploadState {
  const updatedChunks = [...state.chunks];
  const chunk = updatedChunks[chunkIndex];
  
  if (chunk) {
    updatedChunks[chunkIndex] = {
      ...chunk,
      uploaded,
      failed,
      retryCount: failed ? chunk.retryCount + 1 : chunk.retryCount,
    };
  }

  return {
    ...state,
    chunks: updatedChunks,
    lastUpdate: Date.now(),
  };
}

