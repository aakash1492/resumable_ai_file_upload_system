import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadChunk, getUploadedChunks } from '../api';
import { ChunkUploadRequest } from '../../types/upload';

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadChunk', () => {
    it('should successfully upload a chunk', async () => {
      const request: ChunkUploadRequest = {
        uploadId: 'test-id',
        chunkIndex: 0,
        totalChunks: 5,
        chunkData: new Blob(['test data']),
      };

      // Mock Math.random to avoid failures
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // 50% > 10% failure threshold

      await expect(uploadChunk(request)).resolves.not.toThrow();
    });

    it('should simulate network delay', async () => {
      const request: ChunkUploadRequest = {
        uploadId: 'test-id',
        chunkIndex: 0,
        totalChunks: 5,
        chunkData: new Blob(['test data']),
      };

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const startTime = Date.now();
      await uploadChunk(request);
      const endTime = Date.now();

      // Should have some delay (at least 50ms based on implementation)
      expect(endTime - startTime).toBeGreaterThanOrEqual(40);
    });

    it('should occasionally fail to simulate network errors', async () => {
      const request: ChunkUploadRequest = {
        uploadId: 'test-id',
        chunkIndex: 0,
        totalChunks: 5,
        chunkData: new Blob(['test data']),
      };

      // Mock Math.random to return value < 0.1 (10% failure rate)
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      await expect(uploadChunk(request)).rejects.toThrow();
    });

    it('should handle different chunk indices', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const requests: ChunkUploadRequest[] = [
        {
          uploadId: 'test-id',
          chunkIndex: 0,
          totalChunks: 3,
          chunkData: new Blob(['chunk 0']),
        },
        {
          uploadId: 'test-id',
          chunkIndex: 1,
          totalChunks: 3,
          chunkData: new Blob(['chunk 1']),
        },
        {
          uploadId: 'test-id',
          chunkIndex: 2,
          totalChunks: 3,
          chunkData: new Blob(['chunk 2']),
        },
      ];

      const promises = requests.map(req => uploadChunk(req));
      await expect(Promise.all(promises)).resolves.toHaveLength(3);
    });

    it('should work with different upload IDs', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const request1: ChunkUploadRequest = {
        uploadId: 'upload-1',
        chunkIndex: 0,
        totalChunks: 2,
        chunkData: new Blob(['data']),
      };

      const request2: ChunkUploadRequest = {
        uploadId: 'upload-2',
        chunkIndex: 0,
        totalChunks: 2,
        chunkData: new Blob(['data']),
      };

      await expect(uploadChunk(request1)).resolves.not.toThrow();
      await expect(uploadChunk(request2)).resolves.not.toThrow();
    });
  });

  describe('getUploadedChunks', () => {
    it('should return an array of chunk indices', async () => {
      const result = await getUploadedChunks('test-id');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await getUploadedChunks('test-id');
      const endTime = Date.now();

      // Should have some delay (at least 100ms based on implementation)
      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
    });

    it('should return empty array for new uploads', async () => {
      const result = await getUploadedChunks('new-upload-id');
      expect(result).toEqual([]);
    });

    it('should work with different upload IDs', async () => {
      const result1 = await getUploadedChunks('id-1');
      const result2 = await getUploadedChunks('id-2');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });
});

