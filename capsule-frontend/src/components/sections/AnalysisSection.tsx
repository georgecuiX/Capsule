"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, FileText, BookOpen, Quote, Search, Clock, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface Video {
  id: number;
  title: string;
  filename: string;
  file_size: number;
  duration?: number;
  video_type?: string;
  status: string;
  created_at: string;
}

interface Transcript {
  id: number;
  video_id: number;
  full_text: string;
  language: string;
  created_at: string;
}

interface Summary {
  id: number;
  video_id: number;
  summary_type: string;
  content: string;
  word_count: number;
  created_at: string;
}

interface Quote {
  id: number;
  video_id: number;
  text: string;
  start_time: number;
  end_time: number;
  speaker?: string;
  quote_type: string;
  relevance_score: number;
  created_at: string;
}

type ViewMode = 'transcript' | 'summary' | 'quotes';

const AnalysisSection: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Content data
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Fetch completed videos
  const fetchVideos = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      if (!refreshing) setLoading(true);
      
      const response = await fetch(`${API_BASE}/api/videos`);
      const data = await response.json();
      const completedVideos = (data.videos || []).filter((v: Video) => v.status === 'completed');
      setVideos(completedVideos);
      
      // Auto-select first video if none selected or if selected video is no longer available
      if (completedVideos.length > 0) {
        if (!selectedVideo || !completedVideos.find((v: { id: number; }) => v.id === selectedVideo.id)) {
          setSelectedVideo(completedVideos[0]);
        }
      } else {
        setSelectedVideo(null);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedVideo, refreshing]);

  // Fetch content for selected video
  const fetchVideoContent = async (videoId: number) => {
    setContentLoading(true);
    try {
      // Fetch all content types in parallel
      const [transcriptRes, summariesRes, quotesRes] = await Promise.all([
        fetch(`${API_BASE}/api/videos/${videoId}/transcript`),
        fetch(`${API_BASE}/api/videos/${videoId}/summaries`),
        fetch(`${API_BASE}/api/videos/${videoId}/quotes`)
      ]);

      // Handle transcript
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        setTranscript(transcriptData);
      } else {
        setTranscript(null);
      }

      // Handle summaries
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        setSummaries(summariesData.summaries || []);
      } else {
        setSummaries([]);
      }

      // Handle quotes
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.quotes || []);
      } else {
        setQuotes([]);
      }
    } catch (error) {
      console.error('Failed to fetch video content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  // Handle video selection
  const selectVideo = (video: Video) => {
    setSelectedVideo(video);
    setSearchTerm(''); // Clear search when changing videos
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Search within content
  const searchInContent = (content: string): string => {
    if (!searchTerm) return content;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  // Get view mode info
  const getViewModeInfo = (mode: ViewMode) => {
    switch (mode) {
      case 'transcript':
        return {
          icon: FileText,
          title: 'Full Transcript',
          description: 'Complete text transcription with search',
          color: 'text-blue-600 bg-blue-100 border-blue-200'
        };
      case 'summary':
        return {
          icon: BookOpen,
          title: 'AI Summaries',
          description: 'Hierarchical summaries at different lengths',
          color: 'text-green-600 bg-green-100 border-green-200'
        };
      case 'quotes':
        return {
          icon: Quote,
          title: 'Key Insights',
          description: 'Important quotes and memorable moments',
          color: 'text-purple-600 bg-purple-100 border-purple-200'
        };
    }
  };

  useEffect(() => {
    fetchVideos();

    // Listen for video processing events from other sections
    const handleVideoUpload = () => {
      fetchVideos(true);
    };

    const handleVideoProcessing = () => {
      fetchVideos(true);
    };

    const handleVideoCompletion = () => {
      fetchVideos(true);
    };

    const handleVideoStatusChange = () => {
      fetchVideos(true);
    };

    // Add event listeners
    window.addEventListener('videoUploaded', handleVideoUpload as EventListener);
    window.addEventListener('videoProcessingStarted', handleVideoProcessing as EventListener);
    window.addEventListener('videoProcessingCompleted', handleVideoCompletion as EventListener);
    window.addEventListener('videoStatusChanged', handleVideoStatusChange as EventListener);

    return () => {
      window.removeEventListener('videoUploaded', handleVideoUpload as EventListener);
      window.removeEventListener('videoProcessingStarted', handleVideoProcessing as EventListener);
      window.removeEventListener('videoProcessingCompleted', handleVideoCompletion as EventListener);
      window.removeEventListener('videoStatusChanged', handleVideoStatusChange as EventListener);
    };
  }, [fetchVideos]);

  useEffect(() => {
    if (selectedVideo) {
      fetchVideoContent(selectedVideo.id);
    }
  }, [selectedVideo]);

  // Periodic refresh to catch any newly completed videos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/videos`);
        const data = await response.json();
        const allVideos = data.videos || [];
        
        // Check if any videos completed since last check
        const currentCompletedCount = videos.length;
        const newCompletedCount = allVideos.filter((v: Video) => v.status === 'completed').length;
        
        if (newCompletedCount > currentCompletedCount) {
          // New videos completed - refresh the list
          fetchVideos(true);
        }
      } catch (error) {
        console.error('Background refresh error:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [videos.length, fetchVideos]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pt-16">
        <div className="text-center">
          <BarChart3 className="animate-pulse h-8 w-8 mx-auto mb-4 text-rose-600" />
          <p className="text-gray-600">Loading analysis tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-rose-950 to-pink-950 pt-16 relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,20,147,0.1),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(255,105,180,0.1),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(255,182,193,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.02)_40%,rgba(255,255,255,0.02)_60%,transparent_60%)] bg-[length:60px_60px] animate-pulse"></div>
      </div>
      
      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-fuchsia-500/10 to-rose-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-full blur-3xl animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-3/4 w-32 h-32 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 rounded-full blur-2xl animate-float animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-fuchsia-600 to-rose-600 rounded-2xl shadow-2xl backdrop-blur-sm border border-white/10">
              <BarChart3 className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Analyze & Explore
          </h2>
          
          <p className="text-xl text-rose-200 max-w-2xl mx-auto">
            Dive deep into your video content with AI-powered transcripts, summaries, and insights.
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
            <FileText className="h-12 w-12 text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Processed Videos</h3>
            <p className="text-rose-200">
              Process some videos first to analyze their content here.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
            
            {/* Video Selector Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 sticky top-8 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Processed Videos ({videos.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    {refreshing && (
                      <div className="flex items-center space-x-2 text-sm text-rose-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-400"></div>
                        <span>Updating...</span>
                      </div>
                    )}
                    <button
                      onClick={() => fetchVideos(true)}
                      disabled={refreshing}
                      className="p-1 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                      title="Refresh videos"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => selectVideo(video)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedVideo?.id === video.id
                          ? 'border-rose-500 bg-rose-500/20 shadow-lg shadow-rose-500/25'
                          : 'border-white/20 bg-white/5 hover:border-rose-400/50 hover:bg-white/10'
                      }`}
                    >
                      <h4 className="font-medium text-white mb-2 truncate">
                        {video.title}
                      </h4>
                      <div className="text-sm text-rose-200 space-y-1">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(video.duration)}
                        </div>
                        {video.video_type && (
                          <div className="text-rose-400 font-medium">
                            {video.video_type}
                          </div>
                        )}
                        <div className="text-xs">
                          {new Date(video.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedVideo ? (
                <div className="space-y-6">
                  
                  {/* Selected Video Header */}
                  <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">
                        {selectedVideo.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-rose-200">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(selectedVideo.duration)}
                        </span>
                        {selectedVideo.video_type && (
                          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-medium border border-rose-500/30">
                            {selectedVideo.video_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Type Toggle */}
                    <div className="flex flex-wrap gap-2">
                      {(['summary', 'transcript', 'quotes'] as ViewMode[]).map((mode) => {
                        const info = getViewModeInfo(mode);
                        const Icon = info.icon;
                        return (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all backdrop-blur-sm ${
                              viewMode === mode
                                ? 'border-rose-500 bg-rose-500/20 text-white shadow-lg shadow-rose-500/25'
                                : 'border-white/20 text-rose-200 hover:border-rose-400/50 hover:bg-white/10'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{info.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Bar */}
                  {(viewMode === 'transcript' || viewMode === 'quotes') && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          placeholder={`Search in ${viewMode}...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Content Display */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    {contentLoading ? (
                      <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading content...</p>
                      </div>
                    ) : (
                      <div className="p-6">
                        {/* Summary View */}
                        {viewMode === 'summary' && (
                          <div className="space-y-6">
                            <div className="flex items-center space-x-2 mb-4">
                              <BookOpen className="h-5 w-5 text-green-600" />
                              <h4 className="text-lg font-semibold text-gray-900">AI-Generated Summaries</h4>
                            </div>
                            
                            {summaries.length === 0 ? (
                              <p className="text-gray-600 text-center py-8">No summaries available for this video.</p>
                            ) : (
                              <div className="space-y-4">
                                {summaries
                                  .sort((a, b) => {
                                    const order = { short: 1, medium: 2, long: 3 };
                                    return (order[a.summary_type as keyof typeof order] || 4) - (order[b.summary_type as keyof typeof order] || 4);
                                  })
                                  .map((summary) => (
                                    <div key={summary.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium uppercase">
                                          {summary.summary_type} Summary
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          {summary.word_count} words
                                        </span>
                                      </div>
                                      <p className="text-gray-700 leading-relaxed">
                                        {summary.content}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transcript View */}
                        {viewMode === 'transcript' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h4 className="text-lg font-semibold text-gray-900">Full Transcript</h4>
                              </div>
                              {transcript && (
                                <span className="text-sm text-gray-500">
                                  Language: {transcript.language}
                                </span>
                              )}
                            </div>
                            
                            {!transcript ? (
                              <p className="text-gray-600 text-center py-8">No transcript available for this video.</p>
                            ) : (
                              <div className="bg-gray-50 rounded-xl p-6">
                                <div 
                                  className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                                  dangerouslySetInnerHTML={{ 
                                    __html: searchInContent(transcript.full_text) 
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quotes View */}
                        {viewMode === 'quotes' && (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                              <Quote className="h-5 w-5 text-purple-600" />
                              <h4 className="text-lg font-semibold text-gray-900">Key Insights & Quotes</h4>
                            </div>
                            
                            {quotes.length === 0 ? (
                              <p className="text-gray-600 text-center py-8">No key quotes available for this video.</p>
                            ) : (
                              <div className="space-y-4">
                                {quotes
                                  .filter(quote => !searchTerm || quote.text.toLowerCase().includes(searchTerm.toLowerCase()))
                                  .sort((a, b) => b.relevance_score - a.relevance_score)
                                  .map((quote) => (
                                    <div key={quote.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                      <div className="flex items-start justify-between mb-3">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                          {quote.quote_type}
                                        </span>
                                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                                          <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatTimestamp(quote.start_time)}
                                          </span>
                                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                            {Math.round(quote.relevance_score * 100)}% relevance
                                          </span>
                                        </div>
                                      </div>
                                      <blockquote className="text-gray-700 italic leading-relaxed">
                                        <span 
                                          dangerouslySetInnerHTML={{ 
                                            __html: `"${searchInContent(quote.text)}"` 
                                          }}
                                        />
                                      </blockquote>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Video</h3>
                  <p className="text-gray-600">
                    Choose a processed video from the sidebar to analyze its content.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisSection;