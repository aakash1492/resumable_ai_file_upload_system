import { useState, useEffect, useCallback, useRef } from 'react';
import { UploadState } from '../types/upload';
import { uploadChunk, getUploadSpeed, setUploadSpeed as setGlobalUploadSpeed, type UploadSpeed } from '../utils/api';
import { saveUploadState, updateChunkStatus } from '../utils/uploadState';
import { splitFileIntoChunks } from '../utils/fileChunker';

interface UseResumableUploadProps {
  uploadState: UploadState;
  file: File | null;
  onComplete: () => void;
}

const MAX_RETRIES = 3;
const MAX_PARALLEL_UPLOADS = 5; // Number of chunks to upload in parallel

export function useResumableUpload({
  uploadState,
  file,
  onComplete,
}: UseResumableUploadProps) {
  const [state, setState] = useState<UploadState>(uploadState);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const stateRef = useRef<UploadState>(uploadState);
  const isPausedRef = useRef(false);

  // Keep stateRef in sync with state (needed for async loop)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Keep isPausedRef in sync with isPaused (needed for async loop)
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Load file chunks when file is available
  useEffect(() => {
    if (file) {
      chunksRef.current = splitFileIntoChunks(file, uploadState.chunkSize);
    }
  }, [file, uploadState.chunkSize]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveUploadState(state.uploadId, state);
  }, [state]);

  const uploadSingleChunk = useCallback(
    async (chunkIndex: number): Promise<boolean> => {
      if (!file || !chunksRef.current[chunkIndex]) {
        return false;
      }

      const chunk = chunksRef.current[chunkIndex];

      try {
        await uploadChunk({
          uploadId: state.uploadId,
          chunkIndex,
          totalChunks: state.totalChunks,
          chunkData: chunk,
        });

        // Mark chunk as uploaded
        setState((prevState) =>
          updateChunkStatus(prevState, chunkIndex, true, false)
        );

        return true;
      } catch (error) {
        console.error(`Failed to upload chunk ${chunkIndex}:`, error);

        // Mark chunk as failed
        setState((prevState) => {
          const updated = updateChunkStatus(prevState, chunkIndex, false, true);
          return updated;
        });

        return false;
      }
    },
    [file, state.uploadId, state.totalChunks]
  );

  const retryFailedChunks = useCallback(async () => {
    const failedChunks = state.chunks.filter(
      (chunk) => !chunk.uploaded && chunk.failed && chunk.retryCount < MAX_RETRIES
    );

    if (failedChunks.length === 0) {
      return;
    }

    // Reset failed status for retry
    setState((prevState) => ({
      ...prevState,
      chunks: prevState.chunks.map((chunk) =>
        chunk.failed && chunk.retryCount < MAX_RETRIES
          ? { ...chunk, failed: false }
          : chunk
      ),
    }));

    // Retry failed chunks
    const retryPromises = failedChunks.map((chunk) =>
      uploadSingleChunk(chunk.chunkIndex)
    );

    await Promise.allSettled(retryPromises);
  }, [state.chunks, uploadSingleChunk]);

  const startUpload = useCallback(async () => {
    if (!file) {
      return;
    }

    // If already uploading and not paused, don't start again
    // But allow resume if paused
    if (isUploading && !isPaused) {
      return;
    }

    // Reset pause state when starting/resuming
    setIsPaused(false);
    isPausedRef.current = false;
    setIsUploading(true);

    let hasMoreChunks = true;

    // Upload chunks in parallel batches
    while (hasMoreChunks) {
      // Check pause state using ref (current value)
      if (isPausedRef.current) {
        break;
      }

      // Get current state to find pending chunks using ref for latest state
      const currentState = stateRef.current;
      const pendingChunks = currentState.chunks.filter((chunk) => !chunk.uploaded);
      
      if (pendingChunks.length === 0) {
        hasMoreChunks = false;
        break;
      }

      const batch = pendingChunks.slice(0, MAX_PARALLEL_UPLOADS);

      // Upload batch in parallel
      const batchPromises = batch.map((chunk) =>
        uploadSingleChunk(chunk.chunkIndex)
      );

      await Promise.allSettled(batchPromises);

      // Check pause state again after batch completes
      if (isPausedRef.current) {
        break;
      }

      // Check if all chunks are uploaded using latest state
      const latestState = stateRef.current;
      const allUploaded = latestState.chunks.every((chunk) => chunk.uploaded);
      if (allUploaded) {
        hasMoreChunks = false;
        setIsUploading(false);
        onComplete();
        break;
      }

      // Small delay between batches to avoid overwhelming
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Retry failed chunks if upload was not paused
    if (!isPausedRef.current) {
      await retryFailedChunks();
    }

    // Final check - only needed if loop exited due to pause
    if (isPausedRef.current) {
      // Keep isUploading as true so resume can work
      return;
    }

    // Check if all chunks uploaded (in case retry completed everything)
    setState((prevState) => {
      const allUploaded = prevState.chunks.every((chunk) => chunk.uploaded);
      if (allUploaded) {
        setIsUploading(false);
        onComplete();
      } else {
        setIsUploading(false);
      }
      return prevState;
    });
  }, [file, isUploading, isPaused, uploadSingleChunk, retryFailedChunks, onComplete]);

  const pauseUpload = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
  }, []);

  const resumeUpload = useCallback(() => {
    // Clear pause state and restart upload
    setIsPaused(false);
    isPausedRef.current = false;
    startUpload();
  }, [startUpload]);

  const cancelUpload = useCallback(() => {
    // Stop upload by pausing and setting isUploading to false
    setIsPaused(true);
    isPausedRef.current = true;
    setIsUploading(false);
  }, []);

  const getProgress = useCallback(() => {
    const uploadedCount = state.chunks.filter((chunk) => chunk.uploaded).length;
    return (uploadedCount / state.totalChunks) * 100;
  }, [state.chunks, state.totalChunks]);

  const getUploadedBytes = useCallback(() => {
    const uploadedCount = state.chunks.filter((chunk) => chunk.uploaded).length;
    return uploadedCount * state.chunkSize;
  }, [state.chunks, state.chunkSize]);

  const getFailedChunks = useCallback(() => {
    return state.chunks.filter((chunk) => chunk.failed && !chunk.uploaded);
  }, [state.chunks]);

  const changeSpeed = useCallback((speed: UploadSpeed) => {
    // Update the global speed setting (used by uploadChunk)
    setGlobalUploadSpeed(speed);
  }, []);

  return {
    state,
    isUploading,
    isPaused,
    uploadSpeed: getUploadSpeed(), // Get from global state
    progress: getProgress(),
    uploadedBytes: getUploadedBytes(),
    failedChunks: getFailedChunks(),
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryFailedChunks,
    changeSpeed,
  };
}
