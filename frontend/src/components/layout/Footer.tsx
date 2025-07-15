"use client";

import React from 'react';
import { Github, Linkedin, Mail, Code, Play } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'GitHub',
      icon: Github,
      href: 'https://github.com/georgecuiX',
      color: 'hover:text-gray-400'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: 'www.linkedin.com/in/george-cui-gc830',
      color: 'hover:text-blue-400'
    },
    {
      name: 'Email',
      icon: Mail,
      href: 'georgecuix@gmail.com',
      color: 'hover:text-purple-400'
    }
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          
          {/* Logo & Brand */}
          <div className="text-center md:text-left">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center space-x-3 text-2xl font-bold text-white hover:text-purple-300 transition-colors group"
            >
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white" fill="currentColor" />
              </div>
              <span>Capsule</span>
            </button>
            <p className="text-white/70 mt-2 text-sm">
              AI-powered video analysis platform
            </p>
          </div>

          {/* Developer Info */}
          <div className="text-center">
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <Code className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Developed by</span>
                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  George Cui
                </span>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-white/70 text-xs">
                <span>Built using Next.js, FastAPI & AI</span>
              </div>
              
              {/* Social Links */}
              <div className="flex justify-center space-x-4 pt-2">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      className={`p-2 text-white/60 ${link.color} transition-colors rounded-lg hover:bg-white/10`}
                      aria-label={link.name}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tech Stack & Info */}
          <div className="text-center md:text-right">
            <div className="space-y-2">
              <div className="text-sm text-white/70">
                <p className="font-medium text-white/90 mb-1">Powered by</p>
                <div className="space-y-1 text-xs">
                  <p>• OpenAI Whisper for transcription</p>
                  <p>• Transformers for summarization</p>
                  <p>• PostgreSQL for data storage</p>
                </div>
              </div>
              
              <div className="pt-2 text-xs text-white/50">
                <p>© {currentYear} Capsule Platform</p>
                <p>All rights reserved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;