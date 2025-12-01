import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English', country: 'US' },
    { code: 'ta', name: 'தமிழ்', country: 'IN' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleLanguageChange = (code: string) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between space-x-2 px-3 py-2 w-48 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 border border-white/20 hover:border-white/30"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <Globe className="h-4 w-4 text-white flex-shrink-0" />
          <span className="text-white font-medium text-sm hidden sm:inline truncate">
            {currentLang.country} {currentLang.name}
          </span>
          <span className="text-white font-medium text-sm sm:hidden">
            {currentLang.flag}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-white transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white/95 rounded-xl shadow-soft-lg border border-amber-200/20 py-2 z-50 animate-scale-in backdrop-blur-md">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 ${
                currentLanguage === lang.code
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 font-medium border-r-4 border-amber-500'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700'
              }`}
              role="menuitem"
            >
              <span className="text-lg flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{lang.country}</span>
                  <span className="text-sm truncate">{lang.name}</span>
                </div>
              </div>
              {currentLanguage === lang.code && (
                <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
