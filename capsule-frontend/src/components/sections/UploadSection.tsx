"use client";

import React from 'react';
import { Upload, FileVideo } from 'lucide-react';

const UploadSection: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-green-600 rounded-2xl shadow-lg">
              <Upload className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Upload Your Videos
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Drag and drop your videos or browse to upload. We support MP4, MOV, AVI, and more.
          </p>
          
          {/* Upload functionality will be added here */}
          <div className="bg-gray-50 rounded-2xl p-12 border-2 border-dashed border-gray-300">
            <FileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Upload functionality coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;