"use client";

import React from 'react';
import { BarChart3, FileText } from 'lucide-react';

const AnalysisSection: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-orange-600 rounded-2xl shadow-lg">
              <BarChart3 className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Analyze & Explore
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            View transcripts, summaries, and key insights extracted from your videos.
          </p>
          
          {/* Analysis tools will be added here */}
          <div className="bg-gray-50 rounded-2xl p-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Analysis tools coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSection;