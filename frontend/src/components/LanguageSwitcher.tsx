import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' }
  ];

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none bg-transparent border-none text-white font-medium pr-8 focus:outline-none cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <Globe className="absolute right-0 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
    </div>
  );
};

export default LanguageSwitcher;
