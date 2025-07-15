"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Play, Upload, FolderOpen, BarChart3, Info } from 'lucide-react';

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', icon: Play },
    { id: 'about', label: 'About', icon: Info },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'manage', label: 'Manage', icon: FolderOpen },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  ];

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsOpen(false); // Close mobile menu
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'upload', 'manage', 'analysis'];
      const scrollPosition = window.scrollY + 100; // Offset for better detection

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array is fine since we're using static section IDs

  return (
    <nav className="fixed top-0 right-0 z-50 p-6">
      {/* Desktop Navigation - Top Right */}
      <div className="hidden md:block">
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <div key={item.id} className="flex items-center">
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className={`px-6 py-4 text-sm font-medium transition-all duration-300 flex items-center space-x-3 rounded-xl ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg transform scale-105'
                        : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    <span className="font-semibold">{item.label}</span>
                  </button>
                  
                  {/* Separator Bar */}
                  {index < navItems.length - 1 && (
                    <div className="w-px h-8 bg-white/20 mx-2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Top Right */}
      <div className="md:hidden">
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-4 text-white hover:text-white/70 transition-colors rounded-2xl"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="absolute top-20 right-0 w-64 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-4 py-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-3 mb-1 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;