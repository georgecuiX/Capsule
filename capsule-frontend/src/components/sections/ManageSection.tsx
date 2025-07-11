"use client";

import React from 'react';
import { FolderOpen, Grid3X3 } from 'lucide-react';

const ManageSection: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-purple-600 rounded-2xl shadow-lg">
              <FolderOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Manage Your Library
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organize, search, and manage all your processed videos in one place.
          </p>
          
          {/* Video library will be added here */}
          <div className="bg-white rounded-2xl p-12 shadow-lg">
            <Grid3X3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Video library coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSection;