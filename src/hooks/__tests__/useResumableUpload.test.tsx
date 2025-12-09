import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useResumableUpload } from '../useResumableUpload';
import { createUploadState } from '../../utils/uploadState';
import * as api from '../../utils/api';

// Mock the API module
vi.mock('../../utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/api')>();
  return {
    ...actual,
    uploadChunk: vi.fn(),
  };
});

describe('useResumableUpload', () => {
  const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  const mockUploadState = createUploadState('test-id', 'test.txt', 1024, 2, 512);
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: successful uploads
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    // Reset mock implementation for each test
    vi.mocked(api.uploadChunk).mockReset();
    vi.mocked(api.uploadChunk).mockResolvedValue(undefined);
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: mockUploadState,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    expect(result.current.state.uploadId).toBe('test-id');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('should calculate progress correctly', () => {
    const stateWithProgress = createUploadState('test-id', 'test.txt', 1024, 4, 256);
    stateWithProgress.chunks[0].uploaded = true;
    stateWithProgress.chunks[1].uploaded = true;

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: stateWithProgress,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    expect(result.current.progress).toBe(50); // 2 out of 4 chunks
  });

  it('should start upload when startUpload is called', async () => {
    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: mockUploadState,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await waitFor(() => {
      expect(api.uploadChunk).toHaveBeenCalled();
    });
  });

  it('should upload chunks in parallel', async () => {
    const state = createUploadState('test-id', 'test.txt', 1024, 5, 256);

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: state,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await waitFor(() => {
      // Should have called uploadChunk multiple times (up to MAX_PARALLEL_UPLOADS at a time)
      expect(api.uploadChunk).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should skip already uploaded chunks', async () => {
    const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
    state.chunks[0].uploaded = true; // First chunk already uploaded

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: state,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await waitFor(() => {
      // Should only upload chunks 1 and 2, not chunk 0
      const calls = vi.mocked(api.uploadChunk).mock.calls;
      const chunkIndices = calls.map(call => call[0].chunkIndex);
      expect(chunkIndices).not.toContain(0);
    }, { timeout: 2000 });
  });

  it('should handle failed chunks', async () => {
    // Make upload fail for first chunk
    vi.mocked(api.uploadChunk).mockImplementation(async (request) => {
      if (request.chunkIndex === 0) {
        throw new Error('Upload failed');
      }
    });

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: mockUploadState,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await waitFor(() => {
      const failedChunks = result.current.failedChunks;
      expect(failedChunks.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('should pause and resume upload', async () => {
    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: mockUploadState,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await act(async () => {
      result.current.pauseUpload();
    });

    expect(result.current.isPaused).toBe(true);

    await act(async () => {
      result.current.resumeUpload();
    });

    expect(result.current.isPaused).toBe(false);
  });

  it('should retry failed chunks', async () => {
    let callCount = 0;
    vi.mocked(api.uploadChunk).mockImplementation(async (request) => {
      callCount++;
      if (request.chunkIndex === 0 && callCount === 1) {
        throw new Error('Upload failed');
      }
      // Succeed on retry
    });

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: mockUploadState,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    await act(async () => {
      result.current.startUpload();
    });

    await waitFor(() => {
      const failedChunks = result.current.failedChunks;
      if (failedChunks.length > 0) {
        return true;
      }
      return false;
    }, { timeout: 2000 });

    await act(async () => {
      result.current.retryFailedChunks();
    });

    // Should have retried the failed chunk
    await waitFor(() => {
      expect(api.uploadChunk).toHaveBeenCalledTimes(3); // 2 initial + 1 retry
    }, { timeout: 2000 });
  });

  it('should calculate uploaded bytes correctly', () => {
    const state = createUploadState('test-id', 'test.txt', 1024, 4, 256);
    state.chunks[0].uploaded = true;
    state.chunks[1].uploaded = true;

    const { result } = renderHook(() =>
      useResumableUpload({
        uploadState: state,
        file: mockFile,
        onComplete: mockOnComplete,
      })
    );

    expect(result.current.uploadedBytes).toBe(512); // 2 chunks * 256 bytes
  });

});

