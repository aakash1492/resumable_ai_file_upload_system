import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveUploadState,
  loadUploadState,
  getAllUploadStates,
  deleteUploadState,
  createUploadState,
  updateChunkStatus,
} from '../uploadState';
import { UploadState } from '../../types/upload';

describe('uploadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createUploadState', () => {
    it('should create initial upload state with all chunks', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 5, 256);

      expect(state.uploadId).toBe('test-id');
      expect(state.fileName).toBe('test.txt');
      expect(state.fileSize).toBe(1024);
      expect(state.totalChunks).toBe(5);
      expect(state.chunkSize).toBe(256);
      expect(state.chunks).toHaveLength(5);
      expect(state.chunks.every(chunk => !chunk.uploaded && !chunk.failed)).toBe(true);
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('should initialize chunks with correct indices', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);

      state.chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.uploaded).toBe(false);
        expect(chunk.failed).toBe(false);
        expect(chunk.retryCount).toBe(0);
      });
    });
  });

  describe('saveUploadState and loadUploadState', () => {
    it('should save and load upload state', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      saveUploadState('test-id', state);

      const loaded = loadUploadState('test-id');

      expect(loaded).not.toBeNull();
      expect(loaded?.uploadId).toBe(state.uploadId);
      expect(loaded?.fileName).toBe(state.fileName);
      expect(loaded?.fileSize).toBe(state.fileSize);
      expect(loaded?.chunks).toHaveLength(3);
    });

    it('should return null for non-existent upload', () => {
      const loaded = loadUploadState('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('upload_state_test', 'invalid json');
      const loaded = loadUploadState('test');
      expect(loaded).toBeNull();
    });
  });

  describe('getAllUploadStates', () => {
    it('should return all upload states', () => {
      const state1 = createUploadState('id1', 'file1.txt', 1024, 2, 512);
      const state2 = createUploadState('id2', 'file2.txt', 2048, 4, 512);

      saveUploadState('id1', state1);
      saveUploadState('id2', state2);

      const allStates = getAllUploadStates();

      expect(allStates).toHaveLength(2);
      expect(allStates.some(s => s.uploadId === 'id1')).toBe(true);
      expect(allStates.some(s => s.uploadId === 'id2')).toBe(true);
    });

    it('should return empty array when no uploads exist', () => {
      const allStates = getAllUploadStates();
      expect(allStates).toHaveLength(0);
    });

    it('should ignore non-upload keys in localStorage', () => {
      localStorage.setItem('other_key', 'value');
      const state = createUploadState('id1', 'file1.txt', 1024, 2, 512);
      saveUploadState('id1', state);

      const allStates = getAllUploadStates();

      expect(allStates).toHaveLength(1);
    });
  });

  describe('deleteUploadState', () => {
    it('should delete upload state from localStorage', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 2, 512);
      saveUploadState('test-id', state);

      expect(loadUploadState('test-id')).not.toBeNull();

      deleteUploadState('test-id');

      expect(loadUploadState('test-id')).toBeNull();
    });

    it('should handle deleting non-existent state gracefully', () => {
      expect(() => deleteUploadState('non-existent')).not.toThrow();
    });
  });

  describe('updateChunkStatus', () => {
    it('should mark chunk as uploaded', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      const updated = updateChunkStatus(state, 1, true, false);

      expect(updated.chunks[1].uploaded).toBe(true);
      expect(updated.chunks[1].failed).toBe(false);
      expect(updated.chunks[1].retryCount).toBe(0);
      expect(updated.chunks[0].uploaded).toBe(false); // Other chunks unchanged
      expect(updated.chunks[2].uploaded).toBe(false);
    });

    it('should mark chunk as failed and increment retry count', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      const updated = updateChunkStatus(state, 0, false, true);

      expect(updated.chunks[0].uploaded).toBe(false);
      expect(updated.chunks[0].failed).toBe(true);
      expect(updated.chunks[0].retryCount).toBe(1);
    });

    it('should increment retry count on subsequent failures', () => {
      let state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      state = updateChunkStatus(state, 1, false, true);
      state = updateChunkStatus(state, 1, false, true);
      state = updateChunkStatus(state, 1, false, true);

      expect(state.chunks[1].retryCount).toBe(3);
    });

    it('should update lastUpdate timestamp', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      const originalTime = state.lastUpdate;

      // Wait a bit to ensure time difference
      return new Promise(resolve => {
        setTimeout(() => {
          const updated = updateChunkStatus(state, 1, true, false);
          expect(updated.lastUpdate).toBeGreaterThan(originalTime);
          resolve(undefined);
        }, 10);
      });
    });

    it('should not modify original state object', () => {
      const state = createUploadState('test-id', 'test.txt', 1024, 3, 256);
      const originalChunks = [...state.chunks];
      
      updateChunkStatus(state, 1, true, false);

      expect(state.chunks).toEqual(originalChunks);
    });
  });
});

