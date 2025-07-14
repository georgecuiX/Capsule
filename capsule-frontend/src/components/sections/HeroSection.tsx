"use client";

import React from 'react';
import { Play, Zap, Brain, Search, ChevronDown, Upload } from 'lucide-react';

const HeroSection: React.FC = () => {
  const scrollToUpload = () => {
    const element = document.getElementById('upload');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning extracts insights from your videos'
    },
    {
      icon: Brain,
      title: 'Smart Summaries',
      description: 'Get hierarchical summaries from brief to comprehensive'
    },
    {
      icon: Search,
      title: 'Searchable Transcripts',
      description: 'Find any moment with full-text search capabilities'
    }
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        <div className="absolute bottom-40 right-1/3 w-96 h-96 bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-1000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20"></div>
      </div>

      {/* Main Content - Perfectly Centered */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 pt-20">
        {/* Floating Logo - Lowered below navigation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur-lg opacity-75 animate-pulse"></div>
            <div className="relative p-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <Play className="h-16 w-16 text-white" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Main Title - Medium Size (between original and current) */}
        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tight leading-none">
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent blur-sm animate-pulse"></span>
              <span className="relative bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Capsule
              </span>
            </span>
          </h1>
          
          {/* Medium Subtitle */}
          <div className="space-y-4">
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light">
              Transform your videos into 
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-semibold"> searchable knowledge </span>
              with AI-powered transcription and intelligent analysis
            </p>
            
            {/* Glowing Accent Line */}
            <div className="flex justify-center">
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg shadow-purple-500/50"></div>
            </div>
          </div>
        </div>

        {/* Enhanced CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-12">
          <button
            onClick={scrollToUpload}
            className="group relative px-10 py-5 text-lg font-bold text-white overflow-hidden rounded-2xl transition-all duration-300 transform hover:scale-110"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center space-x-3">
              <Upload className="h-6 w-6" />
              <span>Get Started</span>
            </div>
          </button>
          
          <button
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-10 py-5 text-lg font-bold text-white border-2 border-white/30 rounded-2xl transition-all duration-300 transform hover:scale-110 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-3">
              <span>Explore Features</span>
              <ChevronDown className="h-6 w-6 group-hover:animate-bounce" />
            </div>
          </button>
        </div>

        {/* Feature Pills - With bottom spacing */}
        <div className="grid md:grid-cols-3 gap-6 pt-16 pb-24 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 transform hover:-translate-y-4 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative p-4 bg-gradient-to-r from-purple-600/50 to-blue-600/50 rounded-xl border border-white/20">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={scrollToUpload}
          className="group text-white/70 hover:text-white transition-all duration-300 animate-bounce"
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
};

export default HeroSection;