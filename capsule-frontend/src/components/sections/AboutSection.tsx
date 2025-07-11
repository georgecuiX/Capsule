"use client";

import React from 'react';
import { Info, Zap, Brain, Search, Shield } from 'lucide-react';

const AboutSection: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Process videos quickly with optimized AI models'
    },
    {
      icon: Brain,
      title: 'Smart Analysis',
      description: 'Extract meaningful insights and summaries automatically'
    },
    {
      icon: Search,
      title: 'Powerful Search',
      description: 'Find any moment across all your videos instantly'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your videos and data remain private and secure'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-12">
          <div className="space-y-8">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                <Info className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold">
              About Capsule
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Capsule transforms how you interact with video content. Using advanced AI, 
              we automatically transcribe, summarize, and analyze your videos, making them 
              searchable and actionable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-800 rounded-2xl p-6 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-blue-600 rounded-xl">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;