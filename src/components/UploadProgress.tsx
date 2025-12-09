import { useEffect, useRef, useState } from 'react';
import { UploadState } from '../types/upload';
import { useResumableUpload } from '../hooks/useResumableUpload';
import { UPLOAD_SPEEDS, type UploadSpeed } from '../utils/api';
import { ChevronDownIcon } from '../assets/icons';

interface UploadProgressProps {
  uploadState: UploadState;
  file: File | null;
  onComplete: () => void;
  onCancel: () => void;
  onFileSelect?: (file: File) => void;
}

export default function UploadProgress({
  uploadState: initialUploadState,
  file,
  onComplete,
  onCancel,
  onFileSelect,
}: UploadProgressProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const {
    state,
    isUploading,
    isPaused,
    uploadSpeed,
    progress,
    uploadedBytes,
    failedChunks,
    startUpload,
    pauseUpload,
    resumeUpload,
    retryFailedChunks,
    changeSpeed,
  } = useResumableUpload({
    uploadState: initialUploadState,
    file,
    onComplete,
  });

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false);
      }
    };

    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSpeedMenu]);

  // Auto-start upload when file is available
  useEffect(() => {
    if (file && !isUploading && state.chunks.some((chunk) => !chunk.uploaded)) {
      startUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getElapsedTime = (): number => {
    return Date.now() - state.startTime;
  };

  const getEstimatedTimeRemaining = (): string => {
    if (progress === 0 || progress === 100) return '--';
    const elapsed = getElapsedTime();
    const estimated = (elapsed / progress) * (100 - progress);
    return formatTime(estimated);
  };

  const uploadedCount = state.chunks.filter((chunk) => chunk.uploaded).length;
  const failedCount = failedChunks.length;

  const needsFile = !file && state.chunks.some((chunk) => !chunk.uploaded);

  const getSpeedLabel = (speed: UploadSpeed): string => {
    const labels: Record<UploadSpeed, string> = {
      fast: 'Fast',
      normal: 'Normal',
      slow: 'Slow',
      verySlow: 'Very Slow',
    };
    return labels[speed];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name === state.fileName && selectedFile.size === state.fileSize) {
        // File matches, pass it to parent
        if (onFileSelect) {
          onFileSelect(selectedFile);
        }
      } else {
        alert('Please select the same file to resume upload.');
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{state.fileName}</h2>
          <p className="text-sm text-gray-500">
            {formatBytes(uploadedBytes)} / {formatBytes(state.fileSize)} • {uploadedCount} / {state.totalChunks} chunks
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      {needsFile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">
            File needed to resume upload. Please select the same file:
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Select File to Resume
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-800">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Uploaded</p>
          <p className="text-lg font-semibold text-gray-800">{uploadedCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-lg font-semibold text-red-600">{failedCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Time Remaining</p>
          <p className="text-lg font-semibold text-gray-800">
            {getEstimatedTimeRemaining()}
          </p>
        </div>
      </div>

      {/* Chunk Status Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Chunk Status</h3>
        <div className="grid grid-cols-10 gap-1">
          {state.chunks.map((chunk, index) => (
            <div
              key={index}
              className={`
                aspect-square rounded text-xs flex items-center justify-center
                ${
                  chunk.uploaded
                    ? 'bg-green-500 text-white'
                    : chunk.failed
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }
              `}
              title={`Chunk ${index}: ${chunk.uploaded ? 'Uploaded' : chunk.failed ? 'Failed' : 'Pending'}`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            title="Change upload speed"
          >
            <span>{getSpeedLabel(uploadSpeed)}</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showSpeedMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSpeedMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              {Object.keys(UPLOAD_SPEEDS).map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    changeSpeed(speed as UploadSpeed);
                    setShowSpeedMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    uploadSpeed === speed ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {getSpeedLabel(speed as UploadSpeed)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isUploading ? (
          <button
            onClick={startUpload}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {uploadedCount === 0 ? 'Start Upload' : 'Resume Upload'}
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeUpload}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pauseUpload}
                className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
              >
                Pause
              </button>
            )}
          </>
        )}

        {failedCount > 0 && (
          <button
            onClick={retryFailedChunks}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Retry Failed ({failedCount})
          </button>
        )}
      </div>

      {/* Upload ID for debugging */}
      <div className="text-xs text-gray-400">
        Upload ID: {state.uploadId}
      </div>
    </div>
  );
}


