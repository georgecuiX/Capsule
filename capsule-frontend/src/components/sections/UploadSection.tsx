"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileVideo, CheckCircle, AlertCircle, X, Play } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

const UploadSection: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/)) {
      return 'Please select a valid video file (MP4, MOV, AVI, MKV, WEBM)';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 500MB';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: error
      });
      return;
    }

    setSelectedFile(file);
    setUploadProgress(null);
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload file to server
  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress({
      progress: 0,
      status: 'uploading',
      message: 'Preparing upload...'
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress({
            progress,
            status: 'uploading',
            message: `Uploading... ${progress}%`
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress({
            progress: 100,
            status: 'completed',
            message: `Upload successful! Video ID: ${response.video_id}`
          });
          
          // Emit upload event for manage section
          window.dispatchEvent(new CustomEvent('videoUploaded', { detail: { videoId: response.video_id } }));
          
          // Auto-start processing
          setTimeout(() => {
            processVideo(response.video_id);
          }, 1000);
        } else {
          const error = JSON.parse(xhr.responseText);
          setUploadProgress({
            progress: 0,
            status: 'error',
            message: error.detail || 'Upload failed'
          });
        }
        setIsUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadProgress({
          progress: 0,
          status: 'error',
          message: 'Network error during upload'
        });
        setIsUploading(false);
      });

      // Start upload
      xhr.open('POST', `${API_BASE}/api/videos/upload`);
      xhr.send(formData);

    } catch {
      console.error('Upload error');
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: 'Upload failed: Network error'
      });
      setIsUploading(false);
    }
  };

  // Start video processing
  const processVideo = async (videoId: number) => {
    try {
      setUploadProgress({
        progress: 100,
        status: 'processing',
        message: 'Starting AI processing...'
      });

      // Emit processing started event for manage section
      window.dispatchEvent(new CustomEvent('videoProcessingStarted', { detail: { videoId } }));

      const response = await fetch(`${API_BASE}/api/videos/${videoId}/process`, {
        method: 'POST',
      });

      if (response.ok) {
        setUploadProgress({
          progress: 100,
          status: 'processing',
          message: 'Video is being processed. This may take a few minutes...'
        });
        
        // Emit processing started event with more details
        window.dispatchEvent(new CustomEvent('videoProcessingStarted', { detail: { videoId } }));
        
        // Emit multiple events to ensure all sections refresh
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('videoStatusChanged', { detail: { videoId, status: 'processing' } }));
        }, 100);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('videoStatusChanged', { detail: { videoId, status: 'processing' } }));
        }, 500);
        
        // Check processing status periodically
        checkProcessingStatus(videoId);
      } else {
        const error = await response.json();
        setUploadProgress({
          progress: 100,
          status: 'error',
          message: `Processing failed: ${error.detail}`
        });
      }
    } catch {
      setUploadProgress({
        progress: 100,
        status: 'error',
        message: 'Failed to start processing'
      });
    }
  };

  // Check processing status
  const checkProcessingStatus = async (videoId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
      if (response.ok) {
        const video = await response.json();
        
        if (video.status === 'completed') {
          setUploadProgress({
            progress: 100,
            status: 'completed',
            message: 'Processing complete! Your video is ready to view.'
          });
          
          // Emit completion event for manage section
          window.dispatchEvent(new CustomEvent('videoProcessingCompleted', { detail: { videoId } }));
          window.dispatchEvent(new CustomEvent('videoStatusChanged', { detail: { videoId, status: 'completed' } }));
        } else if (video.status === 'failed') {
          setUploadProgress({
            progress: 100,
            status: 'error',
            message: 'Processing failed. Please try again.'
          });
          
          // Emit failure event
          window.dispatchEvent(new CustomEvent('videoStatusChanged', { detail: { videoId, status: 'failed' } }));
        } else if (video.status === 'processing' || video.status === 'queued') {
          // Continue checking
          setTimeout(() => checkProcessingStatus(videoId), 3000);
        }
      }
    } catch {
      console.error('Status check error');
    }
  };

  // Reset upload state
  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 pt-16 relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px] animate-pulse"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-4000"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-8">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl backdrop-blur-sm border border-white/20">
                <Upload className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Upload Your Videos
            </h2>
            
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
              Drag and drop your videos or browse to upload. We support MP4, MOV, AVI, MKV, and WEBM files up to 500MB.
            </p>
          </div>

          {/* Upload Area */}
          <div className="space-y-6">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 backdrop-blur-md ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-500/20 scale-105 shadow-2xl shadow-emerald-500/25'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-500/10 shadow-xl shadow-emerald-500/10'
                  : 'border-white/30 bg-white/5 hover:border-emerald-400 hover:bg-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/10'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />

              {selectedFile ? (
                /* Selected File Display */
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <FileVideo className="h-12 w-12 text-green-600" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      disabled={isUploading}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {!uploadProgress && (
                    <button
                      onClick={uploadFile}
                      disabled={isUploading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <Upload className="h-5 w-5" />
                      <span>{isUploading ? 'Uploading...' : 'Upload & Process'}</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Drop Zone */
                <div className="space-y-6">
                  <FileVideo className={`h-16 w-16 mx-auto transition-colors ${
                    isDragOver ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      {isDragOver ? 'Drop your video here' : 'Drag and drop your video'}
                    </p>
                    <p className="text-gray-600">or</p>
                  </div>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Upload className="h-5 w-5" />
                    <span>Browse Files</span>
                  </button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {uploadProgress && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="space-y-4">
                  
                  {/* Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {uploadProgress.status === 'uploading' && (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      )}
                      {uploadProgress.status === 'processing' && (
                        <div className="animate-pulse rounded-full h-6 w-6 bg-blue-600"></div>
                      )}
                      {uploadProgress.status === 'completed' && (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                      {uploadProgress.status === 'error' && (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      )}
                      
                      <span className="font-semibold text-white">
                        {uploadProgress.status === 'uploading' && 'Uploading'}
                        {uploadProgress.status === 'processing' && 'Processing'}
                        {uploadProgress.status === 'completed' && 'Completed'}
                        {uploadProgress.status === 'error' && 'Error'}
                      </span>
                    </div>
                    
                    <span className="text-sm text-emerald-200">
                      {uploadProgress.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        uploadProgress.status === 'error'
                          ? 'bg-red-500'
                          : uploadProgress.status === 'completed'
                          ? 'bg-green-500'
                          : uploadProgress.status === 'processing'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${uploadProgress.progress}%` }}
                    ></div>
                  </div>

                  {/* Status Message */}
                  <p className={`text-sm ${
                    uploadProgress.status === 'error'
                      ? 'text-red-300'
                      : uploadProgress.status === 'completed'
                      ? 'text-emerald-300'
                      : 'text-white/80'
                  }`}>
                    {uploadProgress.message}
                  </p>

                  {/* Action Buttons */}
                  {uploadProgress.status === 'completed' && (
                    <div className="flex justify-center space-x-4 pt-2">
                      <button
                        onClick={() => document.getElementById('manage')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>View Results</span>
                      </button>
                      <button
                        onClick={resetUpload}
                        className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-all backdrop-blur-sm border border-white/20"
                      >
                        Upload Another
                      </button>
                    </div>
                  )}

                  {uploadProgress.status === 'error' && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={resetUpload}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Support Info */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 text-left border border-white/10 shadow-xl">
            <h3 className="font-semibold text-white mb-3">Supported Formats & Features</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-emerald-200">
              <div>
                <p className="font-medium text-white mb-1">Video Formats:</p>
                <p>MP4, MOV, AVI, MKV, WEBM</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Max File Size:</p>
                <p>500MB per video</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Processing Features:</p>
                <p>AI transcription, smart summaries, key quotes</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Languages:</p>
                <p>Multi-language support with auto-detection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;