import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeUploads from '../ResumeUploads';
import { createUploadState } from '../../utils/uploadState';

describe('ResumeUploads', () => {
  const mockOnResume = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock window.alert for all tests
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when there are no uploads', () => {
    render(
      <ResumeUploads
        uploads={[]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText(/previous uploads/i)).not.toBeInTheDocument();
  });

  it('should display previous uploads', () => {
    const upload1 = createUploadState('id1', 'file1.txt', 1024, 4, 256);
    const upload2 = createUploadState('id2', 'file2.txt', 2048, 8, 256);

    render(
      <ResumeUploads
        uploads={[upload1, upload2]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Previous Uploads')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
  });

  it('should separate incomplete and complete uploads', () => {
    const incomplete = createUploadState('id1', 'incomplete.txt', 1024, 4, 256);
    incomplete.chunks[0].uploaded = true; // Only 1 of 4 chunks uploaded

    const complete = createUploadState('id2', 'complete.txt', 1024, 4, 256);
    complete.chunks.forEach(chunk => {
      chunk.uploaded = true;
    });

    render(
      <ResumeUploads
        uploads={[incomplete, complete]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Incomplete')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should show progress for incomplete uploads', () => {
    const upload = createUploadState('id1', 'file.txt', 1024, 4, 256);
    upload.chunks[0].uploaded = true;
    upload.chunks[1].uploaded = true;

    render(
      <ResumeUploads
        uploads={[upload]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/50\.0% complete/i)).toBeInTheDocument();
  });

  it('should validate file name and size when resuming', async () => {
    const user = userEvent.setup();
    const upload = createUploadState('id1', 'file.txt', 1024, 4, 256);
    const wrongFile = new File(['test'], 'wrong.txt', { type: 'text/plain' });

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ResumeUploads
        uploads={[upload]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    const resumeButton = screen.getByText('Resume');
    await user.click(resumeButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      await user.upload(fileInput, wrongFile);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('same file')
        );
      });

      alertSpy.mockRestore();
    }
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const upload = createUploadState('id1', 'file.txt', 1024, 4, 256);

    render(
      <ResumeUploads
        uploads={[upload]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('id1');
  });

  it('should display file size correctly', () => {
    const upload = createUploadState('id1', 'file.txt', 2048, 4, 512);

    render(
      <ResumeUploads
        uploads={[upload]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/2 KB/i)).toBeInTheDocument();
  });

  it('should handle multiple incomplete uploads', () => {
    const upload1 = createUploadState('id1', 'file1.txt', 1024, 4, 256);
    upload1.chunks[0].uploaded = true;

    const upload2 = createUploadState('id2', 'file2.txt', 2048, 8, 256);
    upload2.chunks[0].uploaded = true;
    upload2.chunks[1].uploaded = true;

    render(
      <ResumeUploads
        uploads={[upload1, upload2]}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
    expect(screen.getAllByText('Resume')).toHaveLength(2);
  });
});

