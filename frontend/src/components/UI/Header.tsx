import React from 'react';
import Logo from './Logo';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  activeLayersCount: number;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeLayersCount, onMenuClick }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto mx-4 mt-4">
        <div className="glass rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
          <div className="px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Title */}
              <div className="flex items-center space-x-3">
                <Logo size={44} className="flex-shrink-0" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
                    AetherScan
                  </h1>
                  <p className="text-xs text-gray-400 hidden sm:block font-medium">
                    Professional Air Quality Intelligence
                  </p>
                </div>
              </div>

              {/* Desktop - Data Sources Badge */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-300">Live Data:</span>
                  </div>
                  <span className="text-xs font-semibold text-white">
                    OpenAQ · Bhuvan · FIRMS
                  </span>
                </div>

                {/* Active Layers Indicator */}
                {activeLayersCount > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-bold text-blue-300">
                      {activeLayersCount} Layer{activeLayersCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Mobile - Menu Button */}
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
