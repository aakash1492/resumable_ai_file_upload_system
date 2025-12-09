import { useState, useEffect } from 'react';
import { UploadState } from './types/upload';
import { getAllUploadStates, loadUploadState, deleteUploadState } from './utils/uploadState';
import FileUpload from './components/FileUpload';
import UploadProgress from './components/UploadProgress';
import ResumeUploads from './components/ResumeUploads';

function App() {
  const [currentUpload, setCurrentUpload] = useState<UploadState | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previousUploads, setPreviousUploads] = useState<UploadState[]>([]);

  useEffect(() => {
    // Load previous uploads on mount
    const uploads = getAllUploadStates();
    setPreviousUploads(uploads);
  }, []);

  const handleUploadStart = (uploadState: UploadState, file: File) => {
    setCurrentUpload(uploadState);
    setCurrentFile(file);
    // Refresh previous uploads list
    const uploads = getAllUploadStates();
    setPreviousUploads(uploads);
  };

  const handleUploadComplete = () => {
    setCurrentUpload(null);
    setCurrentFile(null);
    // Refresh previous uploads list
    const uploads = getAllUploadStates();
    setPreviousUploads(uploads);
  };

  const handleResume = (uploadId: string, file: File | null) => {
    const state = loadUploadState(uploadId);
    if (state) {
      setCurrentUpload(state);
      setCurrentFile(file);
    }
  };

  const handleDelete = (uploadId: string) => {
    deleteUploadState(uploadId);
    const uploads = getAllUploadStates();
    setPreviousUploads(uploads);
    if (currentUpload?.uploadId === uploadId) {
      setCurrentUpload(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Resumable AI File Upload System
          </h1>
          <p className="text-gray-600 mb-8">
            Upload large AI datasets, model artifacts, or training files with automatic chunking and resume capability.
          </p>

          {!currentUpload ? (
            <>
              <FileUpload onUploadStart={handleUploadStart} />
              {previousUploads.length > 0 && (
                <ResumeUploads
                  uploads={previousUploads}
                  onResume={handleResume}
                  onDelete={handleDelete}
                />
              )}
            </>
          ) : (
            <UploadProgress
              uploadState={currentUpload}
              file={currentFile}
              onComplete={handleUploadComplete}
              onCancel={() => {
                setCurrentUpload(null);
                setCurrentFile(null);
              }}
              onFileSelect={(file) => setCurrentFile(file)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

