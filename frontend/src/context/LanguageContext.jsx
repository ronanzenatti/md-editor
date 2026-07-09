import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Try to load language from localStorage or default to PT-BR
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('app_lang');
    return saved || 'pt-BR';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  // Translation helper function
  const t = (key, replacements = {}) => {
    const dict = translations[language] || translations['pt-BR'];
    let text = dict[key] || translations['pt-BR'][key] || key;
    
    // Replace placeholders like {name}
    Object.keys(replacements).forEach((placeholder) => {
      text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
