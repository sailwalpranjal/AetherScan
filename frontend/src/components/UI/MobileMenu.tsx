import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import LayerManager from '../Map/LayerManager';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
  layerOpacity: Record<string, number>;
  onUpdateOpacity: (layerId: string, opacity: number) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onUpdateOpacity,
}) => {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-up Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-white/10 max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Map Layers</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Layer Manager */}
          <div className="flex-1 overflow-y-auto p-4">
            <LayerManager
              activeLayers={activeLayers}
              onToggleLayer={onToggleLayer}
              layerOpacity={layerOpacity}
              onUpdateOpacity={onUpdateOpacity}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
