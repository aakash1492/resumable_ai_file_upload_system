export interface ChunkStatus {
  chunkIndex: number;
  uploaded: boolean;
  failed: boolean;
  retryCount: number;
}

export interface UploadState {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunkSize: number;
  chunks: ChunkStatus[];
  startTime: number;
  lastUpdate: number;
}

export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkData: Blob;
}

