"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, category?: string) => string;
  translateText: (text: string, category?: string) => Promise<string>;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    home: "Home",
    mockTests: "Mock Tests",
    practice: "Practice",
    vocabGrammar: "Vocab & Grammar",
    currentAffairs: "Current Affairs & GS",
    notes: "Notes",
    dashboard: "Dashboard",
    adminArea: "Admin Area",
    login: "Login",
    signOut: "Sign Out",
    myProfile: "My Profile",
    myDashboard: "My Dashboard",
    searchPlaceholder: "Search within notebook...",
    digitalNotebook: "Digital Revision Notebook",
    notebookSubtitle: "Your automated study notebook.",
    vocabSheets: "Vocab Sheets",
    grammarSheets: "Grammar Sheets",
    subjectSheets: "Subject Sheets",
    langEn: "English",
    langHi: "हिन्दी",
    langTa: "தமிழ்",
    mockTestsDesc: "Simulate the real exam environment with our full-length mock tests.",
    practiceDesc: "Focus on Quant, Reasoning, English, or GA with targeted question banks.",
    currentAffairsDesc: "Stay updated with daily current affairs and comprehensive GS materials.",
    notesDesc: "Access your automated digital revision notebook anytime, anywhere.",
  },
  hi: {
    home: "होम",
    mockTests: "मॉक टेस्ट",
    practice: "प्रैक्टिस",
    vocabGrammar: "वोकैब और ग्रामर",
    currentAffairs: "करेंट अफेयर्स और GS",
    notes: "नोट्स",
    dashboard: "डैशबोर्ड",
    adminArea: "एडमिन एरिया",
    login: "लॉगिन",
    signOut: "साइन आउट",
    myProfile: "मेरी प्रोफाइल",
    myDashboard: "मेरा डैशबोर्ड",
    searchPlaceholder: "नोटबुक में खोजें...",
    digitalNotebook: "डिजिटल रिवीजन नोटबुक",
    notebookSubtitle: "आपकी स्वचालित अध्ययन नोटबुक।",
    vocabSheets: "वोकैब शीट्स",
    grammarSheets: "ग्रामर शीट्स",
    subjectSheets: "विषय शीट्स",
    langEn: "English",
    langHi: "हिन्दी",
    langTa: "தமிழ்",
    mockTestsDesc: "हमारे पूर्ण-लंबाई वाले मॉक टेस्ट के साथ वास्तविक परीक्षा वातावरण का अनुभव करें।",
    practiceDesc: "लक्षित प्रश्न बैंकों के साथ क्वांट, रीजनिंग, अंग्रेजी या GA पर ध्यान केंद्रित करें।",
    currentAffairsDesc: "दैनिक करेंट अफेयर्स और व्यापक GS सामग्री के साथ अपडेट रहें।",
    notesDesc: "अपनी स्वचालित डिजिटल रिवीजन नोटबुक को कभी भी, कहीं भी एक्सेस करें।",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  // Load from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("preferredLanguage") as Language;
    if (saved && ["en", "hi"].includes(saved)) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("preferredLanguage", lang);
  };

  const t = (key: string, category?: string) => {
    // Skip translation for English subjects as requested
    if (category === "English" || category === "Vocab" || category === "Grammar") {
      return key;
    }
    return translations[language][key] || key;
  };

  const translateText = async (text: string, category?: string) => {
    if (!text || language === "en" || category === "English" || category === "Vocab" || category === "Grammar") {
      return text;
    }

    try {
      // Use a free translation API (MyMemory)
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${language}`);
      const data = await res.json();
      if (data.responseData) {
        return data.responseData.translatedText;
      }
      return text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
