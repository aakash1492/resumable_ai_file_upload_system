import { useRef, useState, useEffect } from 'react';
import { UploadState } from '../types/upload';
import { generateUploadId } from '../utils/fileChunker';
import { createUploadState, saveUploadState } from '../utils/uploadState';
import { UploadIcon } from '../assets/icons';
import { UPLOAD_SPEEDS, getUploadSpeed, setUploadSpeed, type UploadSpeed } from '../utils/api';
import { getSpeedLabel } from '../utils/formatters';

const CHUNK_SIZE = 1024 * 1024; // 1 MB

interface FileUploadProps {
  onUploadStart: (uploadState: UploadState, file: File) => void;
}

export default function FileUpload({ onUploadStart }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSpeed, setUploadSpeedState] = useState<UploadSpeed>(getUploadSpeed());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update global speed when local state changes
  useEffect(() => {
    setUploadSpeed(uploadSpeed);
  }, [uploadSpeed]);

  const handleFileSelect = (file: File) => {
    setError(null);

    if (!file) {
      return;
    }

    // Generate unique upload ID
    const uploadId = generateUploadId();

    // Calculate total chunks without splitting (optimization)
    // Handle empty files - at least 1 chunk needed
    const totalChunks = file.size === 0 ? 1 : Math.ceil(file.size / CHUNK_SIZE);

    // Create initial upload state
    const uploadState = createUploadState(
      uploadId,
      file.name,
      file.size,
      totalChunks,
      CHUNK_SIZE
    );

    // Save to localStorage
    saveUploadState(uploadId, uploadState);

    // Start upload with file reference
    onUploadStart(uploadState, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = e.target.value as UploadSpeed;
    setUploadSpeedState(newSpeed);
    setUploadSpeed(newSpeed);
  };

  return (
    <div className="space-y-4">
      {/* Upload Speed Selector */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="upload-speed" className="block text-sm font-medium text-gray-700 mb-1">
              Upload Speed
            </label>
            <p className="text-xs text-gray-500">
              Choose the upload speed before selecting your file
            </p>
          </div>
          <select
            id="upload-speed"
            value={uploadSpeed}
            onChange={handleSpeedChange}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {Object.keys(UPLOAD_SPEEDS).map((speed) => (
              <option key={speed} value={speed}>
                {getSpeedLabel(speed as UploadSpeed)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="space-y-4">
          <div className="mx-auto text-gray-400">
            <UploadIcon className="h-12 w-12" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports large files - uploads are automatically chunked and resumable
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
