'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headphones, Grid3X3 } from 'lucide-react';

export default function FieldNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white overflow-hidden relative font-sans">
      {/* Background Grid + Forest Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a2521_1px,transparent_1px),linear-gradient(to_bottom,#1a2521_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      
      {/* Forest Background Image Simulation - Replace with real image in production */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
        style={{
          backgroundImage: `url('https://picsum.photos/id/1015/1920/1080')`, // Replace with your forest image
          filter: 'brightness(0.6) contrast(1.1)'
        }}
      />
      
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f0a]/80 to-[#0a0f0a]" />
 {/* Main Content */}
      <div className="relative z-50 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12 text-center">
        <div className="relative mb-8">
          {/* Plant Icon with Error Badge */}
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-emerald-800/80 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-emerald-500/30">
              <span className="text-6xl">🌱</span>
            </div>
            {/* Error Badge */}
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-zinc-900 rounded-full border-4 border-[#0a0f0a] flex items-center justify-center">
              <div className="w-9 h-9 bg-rose-500/10 border border-rose-500 rounded-full flex items-center justify-center">
                <span className="text-rose-500 text-2xl font-bold">!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-emerald-400 text-sm tracking-[3px] font-mono mb-3">ERROR CODE 404</div>
        
        <h1 className="text-7xl font-bold tracking-tighter mb-6">Field Not Found</h1>
        
        <p className="max-w-md text-lg text-zinc-300 leading-relaxed mb-12">
          It seems our AI scouts couldn&apos;t locate the coordinates you&apos;re looking for. 
          You might have strayed beyond the monitored forest boundaries.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-base font-medium rounded-xl flex items-center gap-3 transition-all active:scale-95"
            onClick={() => window.history.back()}
          >
            <Grid3X3 className="w-5 h-5" />
            Return to Dashboard
          </Button>

          <Button 
            variant="outline" 
            size="lg"
            className="border-white/20 hover:bg-white/5 px-8 py-6 text-base font-medium rounded-xl flex items-center gap-3 transition-all"
          >
            <Headphones className="w-5 h-5" />
            Contact Support
          </Button>
        </div>

        {/* Quick Links */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl">
          {/* Resources */}
          <div>
            <div className="uppercase text-emerald-400 text-xs tracking-widest mb-4">RESOURCES</div>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-emerald-400 transition-colors">Knowledge Base</a>
              <a href="#" className="block hover:text-emerald-400 transition-colors">API Documentation</a>
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            <div className="uppercase text-emerald-400 text-xs tracking-widest mb-4">SHORTCUTS</div>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-emerald-400 transition-colors">Device Status</a>
              <a href="#" className="block hover:text-emerald-400 transition-colors">Field Analysis</a>
            </div>
          </div>

          {/* Systems */}
          <div>
            <div className="uppercase text-emerald-400 text-xs tracking-widest mb-4">SYSTEMS</div>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-emerald-400 transition-colors">Operational Status</a>
              <a href="#" className="block hover:text-emerald-400 transition-colors">System Logs</a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-50 border-t border-white/10 py-8 px-8 text-xs text-zinc-500">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-medium">Forest Intelligence</span>
            <span>© 2024 Agricultural AI Systems</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}