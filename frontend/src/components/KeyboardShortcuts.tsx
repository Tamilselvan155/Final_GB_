import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'Ctrl/Cmd + B', description: 'Toggle sidebar' },
    { key: 'Ctrl/Cmd + U', description: 'Toggle user menu' },
    { key: 'Ctrl/Cmd + D', description: 'Toggle dark mode' },
    { key: 'Escape', description: 'Close open menus' },
  ];

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft-lg max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Keyboard className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="toggle-button p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
