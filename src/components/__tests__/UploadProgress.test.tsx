import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadProgress from '../UploadProgress';
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

describe('UploadProgress', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnFileSelect = vi.fn();
  const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.mocked(api.uploadChunk).mockResolvedValue(undefined);
  });

  it('should display file name and progress', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText(/0 Bytes/i)).toBeInTheDocument();
  });

  it('should show progress percentage', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);
    uploadState.chunks[0].uploaded = true;
    uploadState.chunks[1].uploaded = true;

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText(/50\.0%/i)).toBeInTheDocument();
  });

  it('should display chunk status grid', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 5, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Should show 5 chunk indicators
    const chunkIndicators = screen.getAllByText(/\d+/).filter(
      el => el.textContent && /^[1-5]$/.test(el.textContent)
    );
    expect(chunkIndicators.length).toBeGreaterThanOrEqual(5);
  });

  it('should show cancel button', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show file selection prompt when file is missing', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={null}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText(/file needed to resume/i)).toBeInTheDocument();
  });

  it('should show start/resume button when not uploading', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Button text is "Start Upload" or "Resume Upload" (capitalized)
    expect(screen.getByText('Start Upload')).toBeInTheDocument();
  });

  it('should show pause button when uploading', async () => {
    const user = userEvent.setup();
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 2, 512);

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    const startButton = screen.getByText('Start Upload');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should display failed chunks count', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);
    uploadState.chunks[0].failed = true;
    uploadState.chunks[1].failed = true;

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Check for "Failed" label and the retry button with count
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/Retry Failed \(2\)/)).toBeInTheDocument();
  });

  it('should show retry button when there are failed chunks', () => {
    const uploadState = createUploadState('test-id', 'test.txt', 1024, 4, 256);
    uploadState.chunks[0].failed = true;

    render(
      <UploadProgress
        uploadState={uploadState}
        file={mockFile}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText(/retry failed/i)).toBeInTheDocument();
  });
});

