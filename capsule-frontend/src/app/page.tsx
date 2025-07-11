"use client";

import React from 'react';
import Navigation from '@/components/layout/Navigation';
import HeroSection from '@/components/sections/HeroSection';
import UploadSection from '@/components/sections/UploadSection';
import ManageSection from '@/components/sections/ManageSection';
import AnalysisSection from '@/components/sections/AnalysisSection';
import AboutSection from '@/components/sections/AboutSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Navigation */}
      <Navigation />
      
      {/* Scrollable Sections */}
      <main>
        {/* Hero/Landing Section */}
        <section id="home" className="min-h-screen">
          <HeroSection />
        </section>

        {/* Upload Section */}
        <section id="upload" className="min-h-screen">
          <UploadSection />
        </section>

        {/* Manage Section */}
        <section id="manage" className="min-h-screen">
          <ManageSection />
        </section>

        {/* Analysis Section */}
        <section id="analysis" className="min-h-screen">
          <AnalysisSection />
        </section>

        {/* About Section */}
        <section id="about" className="min-h-screen">
          <AboutSection />
        </section>
      </main>
    </div>
  );
}