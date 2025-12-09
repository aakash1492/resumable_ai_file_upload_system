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
  const [uploadSpeed, setUploadSpeed] = useState<UploadSpeed>(getUploadSpeed());
  const abortControllerRef = useRef<AbortController | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stateRef = useRef<UploadState>(uploadState);
  const isPausedRef = useRef(false);
  const isUploadingRef = useRef(false);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Keep isPausedRef in sync with isPaused
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Keep isUploadingRef in sync with isUploading
  useEffect(() => {
    isUploadingRef.current = isUploading;
  }, [isUploading]);

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
    // But if paused, we want to resume, so allow it
    if (isUploadingRef.current && !isPausedRef.current) {
      return;
    }

    // Reset pause state when starting/resuming
    setIsPaused(false);
    isPausedRef.current = false;
    setIsUploading(true);
    isUploadingRef.current = true;
    abortControllerRef.current = new AbortController();

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

      // Check completion after state updates
      // Use a small delay to allow state updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      // Check if all chunks are uploaded using latest state
      const latestState = stateRef.current;
      const allUploaded = latestState.chunks.every((chunk) => chunk.uploaded);
      if (allUploaded) {
        hasMoreChunks = false;
        setIsUploading(false);
        isUploadingRef.current = false;
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

    // Final check
    setState((prevState) => {
      const allUploaded = prevState.chunks.every((chunk) => chunk.uploaded);
      if (allUploaded) {
        setIsUploading(false);
        isUploadingRef.current = false;
        onComplete();
      } else if (isPausedRef.current) {
        // If paused, keep isUploading as true so resume can work
        // Don't set isUploading to false when paused
        // isUploadingRef.current remains true
      } else {
        setIsUploading(false);
        isUploadingRef.current = false;
      }
      return prevState;
    });
  }, [file, uploadSingleChunk, retryFailedChunks, onComplete]);

  const pauseUpload = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const resumeUpload = useCallback(() => {
    // Always restart the upload loop when resuming
    // Clear the pause state
    setIsPaused(false);
    isPausedRef.current = false;
    
    // Reset uploading ref to allow startUpload to proceed
    // (it will set it back to true)
    isUploadingRef.current = false;
    
    // Now start the upload
    startUpload();
  }, [startUpload]);

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
    // Update the global speed setting in the API module
    setGlobalUploadSpeed(speed);
    // Update local state
    setUploadSpeed(speed);
  }, []);

  return {
    state,
    isUploading,
    isPaused,
    uploadSpeed,
    progress: getProgress(),
    uploadedBytes: getUploadedBytes(),
    failedChunks: getFailedChunks(),
    startUpload,
    pauseUpload,
    resumeUpload,
    retryFailedChunks,
    changeSpeed,
  };
}

