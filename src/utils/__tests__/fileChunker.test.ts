import { describe, it, expect } from 'vitest';
import { splitFileIntoChunks, generateUploadId } from '../fileChunker';

describe('fileChunker', () => {
  describe('splitFileIntoChunks', () => {
    it('should split a small file into a single chunk', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const chunks = splitFileIntoChunks(file, 1024 * 1024); // 1 MB chunk size

      expect(chunks).toHaveLength(1);
      expect(chunks[0].size).toBe(file.size);
    });

    it('should split a large file into multiple chunks', () => {
      // Create a 3 MB file
      const content = new Array(3 * 1024 * 1024).fill('a').join('');
      const file = new File([content], 'large.txt', { type: 'text/plain' });
      const chunkSize = 1024 * 1024; // 1 MB
      const chunks = splitFileIntoChunks(file, chunkSize);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.length).toBe(3);
      
      // First chunks should be exactly chunkSize
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].size).toBe(chunkSize);
      }
      
      // Last chunk should be the remainder
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(file.size);
    });

    it('should handle file smaller than chunk size', () => {
      const file = new File(['small'], 'small.txt', { type: 'text/plain' });
      const chunks = splitFileIntoChunks(file, 1024 * 1024);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].size).toBe(file.size);
    });

    it('should handle empty file', () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      const chunks = splitFileIntoChunks(file, 1024 * 1024);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].size).toBe(0);
    });

    it('should create chunks that sum to original file size', () => {
      const content = new Array(2.5 * 1024 * 1024).fill('b').join('');
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const chunkSize = 1024 * 1024;
      const chunks = splitFileIntoChunks(file, chunkSize);

      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(file.size);
    });

    it('should handle exact chunk size multiples', () => {
      const content = new Array(2 * 1024 * 1024).fill('c').join('');
      const file = new File([content], 'exact.txt', { type: 'text/plain' });
      const chunkSize = 1024 * 1024;
      const chunks = splitFileIntoChunks(file, chunkSize);

      expect(chunks).toHaveLength(2);
      chunks.forEach(chunk => {
        expect(chunk.size).toBe(chunkSize);
      });
    });
  });

  describe('generateUploadId', () => {
    it('should generate a unique upload ID', () => {
      const id1 = generateUploadId();
      const id2 = generateUploadId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with upload_ prefix', () => {
      const id = generateUploadId();
      expect(id).toMatch(/^upload_/);
    });

    it('should generate different IDs when called multiple times', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateUploadId());
      }
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });
});

