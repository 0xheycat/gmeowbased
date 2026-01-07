/**
 * QuestImageUploader - Professional file upload with drag-drop
 * 
 * @component
 * Template: gmeowbased0.7/FileUploader (20% adaptation - Bootstrap → Tailwind)
 * Adaptation: Styling, icon system, card design
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Image preview with thumbnails
 * - File size formatting
 * - Remove file functionality
 * - Multiple file support
 * - Professional card layout
 * 
 * Usage:
 * <QuestImageUploader
 *   onFileUpload={(files) => setQuestImages(files)}
 *   showPreview={true}
 *   maxFiles={3}
 * />
 */

'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { cn } from '@/lib/utils';

export type QuestFileType = File & {
  path?: string;
  preview?: string;
  formattedSize?: string;
};

interface QuestImageUploaderProps {
  /** Callback when files are uploaded */
  onFileUpload?: (files: QuestFileType[]) => void;
  /** Show image previews */
  showPreview?: boolean;
  /** Maximum number of files */
  maxFiles?: number;
  /** Accepted file types */
  accept?: Record<string, string[]>;
  /** Custom upload icon */
  icon?: React.ReactNode;
  /** Upload text */
  text?: string;
  /** Additional helper text */
  extraText?: string;
  /** Additional className */
  className?: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function QuestImageUploader({
  onFileUpload,
  showPreview = true,
  maxFiles = 5,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  },
  icon,
  text = 'Drop quest images here or click to upload',
  extraText = 'Supported: PNG, JPG, GIF, WebP (max 5MB each)',
  className,
}: QuestImageUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<QuestFileType[]>([]);

  const handleAcceptedFiles = useCallback(
    (files: File[]) => {
      const formattedFiles: QuestFileType[] = files.map((file) =>
        Object.assign(file, {
          preview: showPreview ? URL.createObjectURL(file) : undefined,
          formattedSize: formatBytes(file.size),
        }),
      );

      setSelectedFiles((prev) => [...prev, ...formattedFiles]);
      onFileUpload?.(formattedFiles);
    },
    [showPreview, onFileUpload],
  );

  const removeFile = useCallback((fileToRemove: QuestFileType) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((file) => file !== fileToRemove);
      // Revoke preview URL to avoid memory leaks
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleAcceptedFiles,
    accept,
    maxFiles,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
          'hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20',
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900',
          'p-12 text-center',
        )}
      >
        <input {...getInputProps()} />

        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          {icon || (
            <CloudUploadIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
          )}
        </div>

        {/* Upload Text */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {text}
        </h3>

        {/* Helper Text */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {extraText}
        </p>

        {/* Drag Active Overlay */}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-500/10 rounded-xl">
            <p className="text-primary-700 dark:text-primary-400 font-semibold text-lg">
              Drop files here...
            </p>
          </div>
        )}
      </div>

      {/* File Previews */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-3">
          {selectedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image Preview */}
              {file.preview && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <Image
                    src={file.preview}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* File Extension Badge (if no preview) */}
              {!file.preview && (
                <div className="w-16 h-16 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase">
                    {file.path?.split('.').pop()}
                  </span>
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {file.formattedSize}
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(file)}
                className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                aria-label="Remove file"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Count */}
      {selectedFiles.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {selectedFiles.length} / {maxFiles} file{maxFiles !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
