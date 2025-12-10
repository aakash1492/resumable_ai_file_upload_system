import { useRef } from 'react';
import { UploadState } from '../types/upload';
import { formatBytes } from '../utils/formatters';

interface ResumeUploadsProps {
  uploads: UploadState[];
  onResume: (uploadId: string, file: File | null) => void;
  onDelete: (uploadId: string) => void;
}

export default function ResumeUploads({
  uploads,
  onResume,
  onDelete,
}: ResumeUploadsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeUploadIdRef = useRef<string | null>(null);

  const handleResumeClick = (uploadId: string) => {
    resumeUploadIdRef.current = uploadId;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uploadId = resumeUploadIdRef.current;
    
    if (file && uploadId) {
      const upload = uploads.find((u) => u.uploadId === uploadId);
      if (upload && file.name === upload.fileName && file.size === upload.fileSize) {
        onResume(uploadId, file);
      } else {
        alert('Please select the same file to resume upload.');
      }
    }
    
    // Reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resumeUploadIdRef.current = null;
  };
  const getProgress = (upload: UploadState): number => {
    const uploadedCount = upload.chunks.filter((chunk) => chunk.uploaded).length;
    return (uploadedCount / upload.totalChunks) * 100;
  };

  const isComplete = (upload: UploadState): boolean => {
    return upload.chunks.every((chunk) => chunk.uploaded);
  };

  const incompleteUploads = uploads.filter((upload) => !isComplete(upload));
  const completeUploads = uploads.filter((upload) => isComplete(upload));

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <h2 className="text-xl font-semibold text-gray-800">Previous Uploads</h2>

      {incompleteUploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-600">Incomplete</h3>
          {incompleteUploads.map((upload) => {
            const progress = getProgress(upload);
            return (
              <div
                key={upload.uploadId}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{upload.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {formatBytes(upload.fileSize)} • {progress.toFixed(1)}% complete
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResumeClick(upload.uploadId)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => onDelete(upload.uploadId)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completeUploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-600">Completed</h3>
          {completeUploads.map((upload) => (
            <div
              key={upload.uploadId}
              className="border border-green-200 rounded-lg p-4 bg-green-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{upload.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {formatBytes(upload.fileSize)} • Completed
                  </p>
                </div>
                <button
                  onClick={() => onDelete(upload.uploadId)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
