"use client";

import { useState, useEffect } from "react";
import { Search, BookMarked, Tag, Languages, SpellCheck, LayoutGrid, ArrowRight, Trash2, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getSavedQuestions, deleteSavedQuestion, SavedQuestion, normalizeSubject } from "@/lib/firestore";

// Helper for batching
const chunkArray = (array: any[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export default function NotesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"vocab" | "grammar" | "subjects">("vocab");

  useEffect(() => {
    if (user) {
      getSavedQuestions(user.uid).then((fetchedQuestions) => {
        setSavedQuestions(fetchedQuestions);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (questionId: string) => {
    if (!user) return;
    if (confirm("Remove this item from your notes?")) {
      try {
        await deleteSavedQuestion(user.uid, questionId);
        setSavedQuestions(prev => prev.filter(q => q.questionId !== questionId));
      } catch (error) {
        console.error("Failed to delete saved question:", error);
      }
    }
  };

  // Automated Categories
  const vocabItems = savedQuestions.filter(q => q.topic === "Daily Vocab");
  const grammarItems = savedQuestions.filter(q => {
    const isEnglish = normalizeSubject(q.subject) === "English";
    const isVocab = q.topic === "Daily Vocab";
    return isEnglish && !isVocab;
  });
  const otherItems = savedQuestions.filter(q => {
    const isEnglish = normalizeSubject(q.subject) === "English";
    return !isEnglish;
  });

  const getFilteredItems = () => {
    let base = [];
    if (activeTab === "vocab") base = vocabItems;
    else if (activeTab === "grammar") base = grammarItems;
    else base = otherItems;

    return base.filter(q => 
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.explanation || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const batchedPages = chunkArray(getFilteredItems(), 5); // 5 items per A4 sheet for full visibility

  if (loading) return <div className="p-20 text-center animate-pulse text-muted-foreground font-hand">Opening your study notebook...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in duration-500">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');
        
        .font-hand {
          font-family: 'Kalam', cursive;
        }

        .paper-bg {
          background-color: #fdfdfd;
          background-image: 
            linear-gradient(90deg, transparent 79px, #d1e5e9 79px, #d1e5e9 81px, transparent 81px),
            linear-gradient(#e5e5e5 .1em, transparent .1em);
          background-size: 100% 1.8em;
        }

        .a4-page {
          min-height: 800px;
          aspect-ratio: 1 / 1.414;
          box-shadow: 
            0 1px 3px rgba(0,0,0,0.1), 
            0 10px 0 -5px #fff, 
            0 10px 1px -4px rgba(0,0,0,0.2), 
            0 20px 0 -10px #fff, 
            0 20px 1px -9px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          position: relative;
        }

        .ink-black {
          color: #1a1a1a;
          line-height: 1.8em;
        }

        .ink-blue {
          color: #0047AB; /* Classic Blue Pen Ink */
          line-height: 1.8em;
        }
      `}</style>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">{t("digitalNotebook")}</h1>
        <p className="text-muted-foreground max-w-2xl font-medium font-hand text-xl">{t("notebookSubtitle")}</p>
      </div>

      {/* Repository Navigation & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card border border-border p-4 rounded-3xl shadow-sm">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/50 rounded-2xl w-full lg:w-auto">
          <TabButton 
            active={activeTab === "vocab"} 
            onClick={() => setActiveTab("vocab")} 
            icon={<Languages className="w-4 h-4" />} 
            label={t("vocabSheets", "Vocab")} 
            count={vocabItems.length}
          />
          <TabButton 
            active={activeTab === "grammar"} 
            onClick={() => setActiveTab("grammar")} 
            icon={<SpellCheck className="w-4 h-4" />} 
            label={t("grammarSheets", "Grammar")} 
            count={grammarItems.length}
          />
          <TabButton 
            active={activeTab === "subjects"} 
            onClick={() => setActiveTab("subjects")} 
            icon={<LayoutGrid className="w-4 h-4" />} 
            label={t("subjectSheets")} 
            count={otherItems.length}
          />
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={t("searchPlaceholder")} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-12 w-full rounded-2xl border border-input bg-background pl-11 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-12">
        {batchedPages.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/10 space-y-6">
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto opacity-50 shadow-inner">
              <BookMarked className="text-muted-foreground w-10 h-10" />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <p className="text-foreground font-bold text-lg font-hand">New Notebook Page</p>
              <p className="text-muted-foreground text-sm font-hand italic">Start saving items from the Vocab Hub or Mock Tests to see them appear here in your notebook.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-12">
            {batchedPages.map((pageItems, idx) => (
              <A4Page 
                key={idx} 
                items={pageItems} 
                pageIndex={idx + 1}
                onDelete={handleDelete}
                type={activeTab}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active 
          ? "bg-background text-primary shadow-sm ring-1 ring-border/50" 
          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
        {count}
      </span>
    </button>
  );
}

function TranslatedNoteItem({ item, i, isVocab, onDelete }: { item: SavedQuestion, i: number, isVocab: boolean, onDelete: (id: string) => void }) {
  const { language, translateText } = useLanguage();
  const [translatedText, setTranslatedText] = useState(item.questionText);
  const [translatedAnswer, setTranslatedAnswer] = useState(item.correctAnswer);
  const [translatedExplanation, setTranslatedExplanation] = useState(item.explanation);
  const [translatedNotes, setTranslatedNotes] = useState(item.userNotes);

  useEffect(() => {
    if (language === "en") {
      setTranslatedText(item.questionText);
      setTranslatedAnswer(item.correctAnswer);
      setTranslatedExplanation(item.explanation);
      setTranslatedNotes(item.userNotes);
      return;
    }

    const category = isVocab ? "Vocab" : normalizeSubject(item.subject);
    
    // Translate question text
    translateText(item.questionText, category).then(setTranslatedText);
    
    // Translate correct answer/meaning
    if (item.correctAnswer) {
      translateText(item.correctAnswer, category).then(setTranslatedAnswer);
    }
    
    // Translate explanation
    if (item.explanation) {
      translateText(item.explanation, category).then(setTranslatedExplanation);
    }

    // Translate user notes
    if (item.userNotes) {
      translateText(item.userNotes, category).then(setTranslatedNotes);
    }
  }, [language, item, isVocab, translateText]);

  return (
    <div className="relative group/item border-b border-dashed border-border/20 pb-3 last:border-0">
       <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 w-full">
            <h4 className="font-bold text-2xl leading-tight text-[#1a1a1a]">
              {i + 1}. {translatedText}
            </h4>
            
            {/* Meaning in Blue Pen */}
            {isVocab && translatedAnswer && (
               <p className="text-xl ink-blue leading-snug">
                 <span className="underline decoration-blue-500/20 font-bold">Meaning</span>: {translatedAnswer}
               </p>
            )}

            {/* Explanation in Blue Pen */}
            {translatedExplanation && (
               <p className="text-lg ink-blue leading-tight opacity-90 italic">
                 {translatedExplanation}
               </p>
            )}

            {/* Rule Detail if applicable (Grammar) */}
            {!isVocab && translatedAnswer && translatedAnswer !== translatedExplanation && (
               <p className="text-lg ink-blue leading-snug">
                 <span className="font-bold">Rule</span>: {translatedAnswer}
               </p>
            )}

            {/* User Notes/P.S. in Blue Pen */}
            {translatedNotes && (
               <p className="text-md ink-blue border-l-2 border-blue-200/50 pl-2 opacity-70 italic mt-1">
                 * {translatedNotes}
               </p>
            )}
          </div>
          <button 
            onClick={() => onDelete(item.questionId)} 
            className="p-1 px-2 hover:bg-destructive/10 text-destructive/40 hover:text-destructive rounded-lg transition-all opacity-0 group-hover/item:opacity-100 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
       </div>
    </div>
  );
}

function A4Page({ items, pageIndex, onDelete, type }: { items: SavedQuestion[], pageIndex: number, onDelete: (id: string) => void, type: string }) {
  const isVocab = type === "vocab";
  
  return (
    <div className="group relative a4-page overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white">
      {/* Paper texture and lines */}
      <div className="absolute inset-0 paper-bg pointer-events-none opacity-80" />
      
      {/* Content wrapper */}
      <div className="relative h-full flex flex-col p-8 pt-10 pl-24 font-hand ink-black overflow-y-auto custom-scrollbar">
        
        {/* Margin Area Header line */}
        <div className="flex justify-between items-center mb-6 w-full opacity-60 font-bold border-b border-border/20 pb-2 italic text-[#1a1a1a] flex-shrink-0">
           <span className="text-[12px] uppercase tracking-widest">{type === 'subjects' ? 'Subject Mixed Revision' : isVocab ? 'Vocab Repository' : 'Grammar & Rules Log'}</span>
           <span className="text-[14px]">Page {pageIndex}</span>
        </div>

        {/* Items List */}
        <div className="space-y-4 flex-1">
          {items.map((item, i) => (
            <TranslatedNoteItem 
              key={item.questionId} 
              item={item} 
              i={i} 
              isVocab={isVocab} 
              onDelete={onDelete} 
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 flex justify-between items-center text-[10px] opacity-20 font-bold uppercase tracking-widest border-t border-border/10 text-[#1a1a1a] flex-shrink-0">
           <span>Premium Revision Log</span>
           <span>SarkariStaar Notebook</span>
        </div>
      </div>

      {/* Subtle corner fold */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white via-white/40 to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
