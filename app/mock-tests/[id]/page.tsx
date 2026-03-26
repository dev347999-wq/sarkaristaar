"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMockTest, saveTestAttempt, saveQuestion, normalizeSubject, getSavedQuestions, deleteSavedQuestion } from "@/lib/firestore";
import { ChevronRight, ChevronLeft, CheckCircle2, Clock, BookOpen, AlertCircle, Globe, ArrowLeft, BookmarkPlus, Flag } from "lucide-react";

// Helper: safely extract string from richText objects
const safeText = (val: any): string => {
  if (val == null) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    return val.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.richText || item.text || item.t || item.v || '';
      return String(item || '');
    }).join('');
  }
  if (typeof val === 'object') {
    if (val.richText) return safeText(val.richText);
    if (val.text) return String(val.text);
    return '';
  }
  return String(val);
};

// Helper: convert Google Drive share links to direct embeddable image URLs
const toDirectImageUrl = (url: string): string => {
  if (!url) return '';
  const s = safeText(url).trim();
  const driveMatch = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  const openMatch = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  if (s.includes('drive.google.com/uc')) return s;
  return s;
};

export default function TestPlayer() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"english" | "hindi">("english");
  const [scoreData, setScoreData] = useState<any>(null);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleAnswerSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    const letter = ["A", "B", "C", "D"][optionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQIndex]: letter
    }));
  };

  const toggleBookmark = () => {
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(currentQIndex)) next.delete(currentQIndex);
      else next.add(currentQIndex);
      return next;
    });
  };

  const toggleSave = async () => {
    if (!user || !test || isSaving) return;
    const questions = test.questionsData || [];
    if (questions.length === 0 || !questions[currentQIndex]) return;
    const q = questions[currentQIndex];
    const questionId = q.id || `mock-${test.id}-${currentQIndex}`;
    const isAlreadySaved = savedItemIds.includes(questionId);
    
    setIsSaving(true);
    try {
      if (isAlreadySaved) {
        await deleteSavedQuestion(user.uid, questionId);
        setSavedItemIds(prev => prev.filter(id => id !== questionId));
      } else {
        await saveQuestion(user.uid, {
          questionId,
          subject: normalizeSubject(q.topic || test.categoryId),
          topic: q.topic || "General",
          questionText: q.question,
          options: q.options,
          correctAnswer: q.answer,
          imageUrl: q.imageUrl,
        });
        setSavedItemIds(prev => [...prev, questionId]);
      }
    } catch(e) {
      console.error("Failed to toggle save", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted || !test || !user) return;
    setIsSubmitted(true);
    
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    
    const questions = test.questionsData;
    
    questions.forEach((q: any, i: number) => {
      const uLetter = answers[i];
      if (!uLetter) {
        unattempted++;
      } else if (uLetter.trim().toUpperCase() === q.answer.trim().toUpperCase()) {
        correct++;
      } else {
        incorrect++;
      }
    });
    
    // SSC CGL Tier 1 standard marking: +2 correct, -0.5 incorrect
    const marksPerCorrect = 2;
    const marksPerIncorrect = -0.5;
    
    const finalScore = Math.max(0, (correct * marksPerCorrect) + (incorrect * marksPerIncorrect));
    const totalPossibleMarks = questions.length * marksPerCorrect;
    
    const resultObj = {
      testId: decodeURIComponent(params.id as string),
      testTitle: (test as any).paperName || `${(test as any).categoryId} Mock ${(test as any).testNumber}`,
      category: (test as any).categoryId,
      score: finalScore,
      totalMarks: totalPossibleMarks,
      accuracy: correct + incorrect > 0 ? Math.round((correct / (correct+incorrect)) * 100) : 0,
      timeSpentStr: `${Math.floor((getTimeLimit((test as any).categoryId) - timeLeft)/60)}m ${(getTimeLimit((test as any).categoryId) - timeLeft)%60}s`,
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [String(k), v])),
      language: selectedLanguage || 'english'
    };
    
    setScoreData({
      ...resultObj,
      correct,
      incorrect,
      unattempted
    });

    try {
      await saveTestAttempt(user.uid, resultObj);
    } catch(e) {
      console.error("Failed to save score");
    }
  };

  const getTimeLimit = (category: string) => {
    if (!category) return 60 * 60;
    if (category.includes("Tier 2") || category.includes("CBT 2")) return 120 * 60; // 2 hours
    if (category.includes("Tier 1") || category.includes("CBT 1") || category.includes("Previous")) return 60 * 60; // 1 hour
    return 60 * 60;
  };

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const testId = decodeURIComponent(params.id as string);
        const [testData, savedQuestions] = await Promise.all([
          getMockTest(testId),
          user ? getSavedQuestions(user.uid) : Promise.resolve([])
        ]);

        if (!testData) {
          setError("Test not found or not available.");
          return;
        }
        
        setTest(testData);
        setSavedItemIds(savedQuestions.map(q => q.questionId));
        setTimeLeft(getTimeLimit((testData as any).categoryId)); 
      } catch (err) {
        setError("Failed to load the test.");
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [params.id, user]);

  useEffect(() => {
    if (loading || !isStarted || isSubmitted || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, isStarted, isSubmitted, timeLeft]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Test Engine...</div>;
  }
  
  if (error || !test) {
    return <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <h2 className="text-xl font-bold">{error}</h2>
      <button onClick={() => router.push('/mock-tests')} className="text-primary hover:underline">Go Back</button>
    </div>;
  }

  const questions: any[] = test.questionsData || [];

  // Guard: if no questions were loaded (e.g. subcollection fetch issue or old empty doc)
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-bold">No Questions Found</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          This test has no questions loaded. The admin may need to re-upload the question file.
        </p>
        <button onClick={() => router.push('/mock-tests')} className="text-primary hover:underline font-semibold">
          ← Back to Tests
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];  // Instructions Screen (with language selection integrated)
  if (!isStarted) {
    const isHindi = selectedLanguage === "hindi";
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden flex flex-col h-[85vh]">
          
          <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wide">{isHindi ? "परीक्षा निर्देश" : "TEST INSTRUCTIONS"}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1">{isHindi ? "भाषा:" : "Language:"}</span>
              <button 
                onClick={() => setSelectedLanguage("english")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedLanguage === 'english' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                English
              </button>
              <button 
                onClick={() => setSelectedLanguage("hindi")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedLanguage === 'hindi' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                हिन्दी
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar text-slate-800">
            <h2 className="text-xl font-bold text-center underline mb-8">{isHindi ? "कृपया निर्देशों को ध्यान से पढ़ें" : "Please read the instructions carefully"}</h2>
            
            <div className="space-y-4 text-sm leading-relaxed">
               <h3 className="font-bold text-base">{isHindi ? "सामान्य निर्देश:" : "General Instructions:"}</h3>
               <ol className="list-decimal pl-6 space-y-2">
                 {isHindi ? (
                   <>
                     <li>घड़ी सर्वर पर सेट की जाएगी। स्क्रीन के ऊपरी दाएं कोने में काउंटडाउन टाइमर परीक्षा पूरा करने के लिए आपके पास उपलब्ध शेष समय प्रदर्शित करेगा। जब टाइमर शून्य पर पहुंच जाएगा, तो परीक्षा अपने आप समाप्त हो जाएगी।</li>
                     <li>स्क्रीन के दाईं ओर प्रदर्शित प्रश्न पैलेट निम्नलिखित प्रतीकों में से एक का उपयोग करके प्रत्येक प्रश्न की स्थिति दिखाएगा:
                        <ul className="mt-2 space-y-2 list-none mb-4">
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-xs">1</div> आपने प्रश्न का उत्तर नहीं दिया है।</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div> आपने प्रश्न का उत्तर दे दिया है।</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center text-xs">3</div> आपने प्रश्न को समीक्षा के लिए चिह्नित किया है।</li>
                        </ul>
                     </li>
                   </>
                 ) : (
                   <>
                     <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.</li>
                     <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                        <ul className="mt-2 space-y-2 list-none mb-4">
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-xs">1</div> You have NOT answered the question.</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div> You have answered the question.</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center text-xs">3</div> You have NOT answered the question, but have marked the question for review.</li>
                        </ul>
                     </li>
                   </>
                 )}
               </ol>
               
               <h3 className="font-bold text-base mt-6">{isHindi ? "प्रश्न पर नेविगेट करना:" : "Navigating to a Question:"}</h3>
               <ol className="list-decimal pl-6 space-y-2">
                 <li>{isHindi ? "प्रश्न का उत्तर देने के लिए, निम्नलिखित करें:" : "To answer a question, do the following:"}
                   <ul className="list-[lower-alpha] pl-6 mt-1 space-y-1">
                     {isHindi ? (
                       <>
                         <li>अपनी स्क्रीन के दाईं ओर प्रश्न पैलेट में प्रश्न संख्या पर क्लिक करें।</li>
                         <li>वर्तमान प्रश्न के लिए अपना उत्तर सुरक्षित करने और अगले प्रश्न पर जाने के लिए <strong>Next</strong> पर क्लिक करें।</li>
                         <li>बाद में इसे देखने के लिए <strong>Mark for Review</strong> पर क्लिक करें।</li>
                       </>
                     ) : (
                       <>
                         <li>Click on the question number in the Question Palette to go to that question directly.</li>
                         <li>Click on <strong>Next</strong> to save your answer for the current question and then go to the next question.</li>
                         <li>Click on <strong>Mark for Review</strong> to flag it to look at it later.</li>
                       </>
                     )}
                   </ul>
                 </li>
               </ol>
               
               <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-md">
                 <p className="font-bold text-blue-900 mb-2">{isHindi ? "परीक्षा सारांश" : "Examination Summary"}</p>
                 <ul className="space-y-1 text-blue-800">
                   <li><strong>{isHindi ? "कुल प्रश्न:" : "Total Questions:"}</strong> {questions.length}</li>
                   <li><strong>{isHindi ? "कुल समय:" : "Total Time:"}</strong> {Math.floor(timeLeft / 60)} {isHindi ? "मिनट" : "Minutes"}</li>
                   <li><strong>{isHindi ? "सही उत्तर:" : "Correct Answer:"}</strong> +2.00 Marks</li>
                   <li><strong>{isHindi ? "गलत उत्तर:" : "Incorrect Answer:"}</strong> -0.50 Marks</li>
                 </ul>
               </div>
            </div>
          </div>
          
          <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 px-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-primary transition-all group select-none">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer" id="declare-checkbox" />
              <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                {isHindi ? "मैंने निर्देशों को पढ़ और समझ लिया है।" : "I have read and understood the instructions."}
              </span>
            </label>
            <button 
              onClick={() => {
                const cb = document.getElementById('declare-checkbox') as HTMLInputElement;
                if (!cb.checked) {
                   cb.closest('label')?.classList.add('animate-bounce', 'border-destructive', 'bg-destructive/5');
                   setTimeout(() => {
                     cb.closest('label')?.classList.remove('animate-bounce', 'border-destructive', 'bg-destructive/5');
                   }, 1000);
                   return;
                }
                setIsStarted(true);
              }}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-sm transition-colors text-sm"
            >
              {isHindi ? "मैं शुरू करने के लिए तैयार हूँ" : "I am ready to begin"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Test Player Screen
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto p-4 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex bg-card border border-border p-4 rounded-xl items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-lg md:text-xl">{test.categoryId} - Mock {test.testNumber}</h1>
          <p className="text-sm text-muted-foreground">{questions.length} Questions</p>
        </div>
        
        {!isSubmitted && (
           <div className="flex items-center gap-3 bg-primary/10 text-primary px-4 py-2 rounded-lg font-mono font-bold text-lg">
             <Clock className="w-5 h-5" />
             {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main QA Section */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8 min-h-[400px] shadow-sm">
            
            <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                Question {currentQIndex + 1}
                {bookmarked.has(currentQIndex) && <Flag className="w-4 h-4 text-amber-500 fill-amber-500" />}
              </h2>
              <div className="flex gap-2">
                 <button onClick={toggleBookmark} className="text-sm p-2 bg-muted hover:bg-muted/80 rounded-md transition-colors" title="Review Later">
                   <Flag className={`w-4 h-4 ${bookmarked.has(currentQIndex) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                 </button>
                 <button 
                   onClick={toggleSave} 
                   disabled={isSaving}
                   className={`text-sm px-3 py-1.5 rounded-md transition-all flex items-center gap-2 border font-bold ${
                     savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`)
                       ? 'bg-primary/10 text-primary border-primary/30' 
                       : 'bg-muted hover:bg-muted/80 border-transparent text-muted-foreground'
                   }`}
                   title="Save Question"
                 >
                   <BookmarkPlus className={`w-4 h-4 ${savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`) ? 'fill-primary' : ''}`} />
                   {savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`) ? 'Saved' : 'Save'}
                 </button>
              </div>
            </div>

            <p className="text-lg md:text-xl font-medium mb-8 leading-relaxed whitespace-pre-wrap">
              {selectedLanguage === 'hindi' ? safeText(currentQ.question_hindi || currentQ.question) : safeText(currentQ.question)}
            </p>

            {currentQ.imageUrl && toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith('http') && (
              <div className="mb-8 rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toDirectImageUrl(safeText(currentQ.imageUrl))} alt="Question figure" className="w-full max-h-[300px] object-contain bg-muted/30" />
              </div>
            )}

            <div className="space-y-3">
              {(selectedLanguage === 'hindi' && currentQ.options_hindi?.some((o: any) => o) ? currentQ.options_hindi : currentQ.options).map((option: any, i: number) => {
                const currentLetter = ["A", "B", "C", "D"][i];
                const isSelected = answers[currentQIndex] === currentLetter;
                
                let btnStyle = "bg-muted/50 hover:bg-muted border-transparent";
                if (isSelected) btnStyle = "bg-primary/10 border-primary text-primary font-medium";
                
                if (isSubmitted) {
                   const isCorrectOption = currentLetter === currentQ.answer.trim().toUpperCase();
                   if (isCorrectOption) {
                      btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold";
                   } else if (isSelected && !isCorrectOption) {
                      btnStyle = "bg-destructive/20 border-destructive text-destructive font-bold";
                   } else {
                      btnStyle = "bg-muted/30 border-transparent opacity-50";
                   }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerSelect(i)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${btnStyle}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-background border-border group-hover:border-primary/50 text-muted-foreground'}`}>
                      {currentLetter}
                    </div>
                    <span className="flex-1">{safeText(option)}</span>
                    {isSelected && !isSubmitted && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    {isSubmitted && currentLetter === currentQ.answer.trim().toUpperCase() && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isSubmitted && isSelected && currentLetter !== currentQ.answer.trim().toUpperCase() && <AlertCircle className="w-5 h-5 text-destructive" />}
                  </button>
                );
              })}
            </div>
            
            {isSubmitted && (selectedLanguage === 'hindi' ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation) && (
              <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-wider text-xs">{selectedLanguage === 'hindi' ? "व्याख्या" : "EXPLANATION"}</h3>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap prose prose-slate max-w-none">
                  {safeText(selectedLanguage === 'hindi' ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation)}
                </div>
                {currentQ.solutionImageUrl && toDirectImageUrl(safeText(currentQ.solutionImageUrl)).startsWith('http') && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDirectImageUrl(safeText(currentQ.solutionImageUrl))} alt="Solution diagram" className="w-full max-h-[400px] object-contain" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
             <button 
               onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
               disabled={currentQIndex === 0}
               className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
             >
               <ChevronLeft className="w-4 h-4" /> Previous
             </button>
             
             {currentQIndex === questions.length - 1 ? (
                <button 
                 onClick={handleSubmit}
                 disabled={isSubmitted}
                 className="flex items-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-md disabled:hidden"
               >
                 Submit Test <CheckCircle2 className="w-4 h-4" />
               </button>
             ) : (
                <button 
                 onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                 className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
               >
                 Next <ChevronRight className="w-4 h-4" />
               </button>
             )}
          </div>
        </div>

      {/* Sidebar Grid */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm h-fit sticky top-24">
        
        {isSubmitted && scoreData && (
           <div className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl text-center space-y-6 animate-in zoom-in-95 duration-500">
               <div className="space-y-1">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Marks Obtained</p>
                 <h2 className="text-5xl font-black text-primary drop-shadow-sm">{scoreData.score}<span className="text-xl text-muted-foreground font-medium opacity-50">/{scoreData.totalMarks}</span></h2>
               </div>
               
               <div className="grid grid-cols-2 gap-3 pt-4 border-t border-primary/10">
                 <div className="p-3 bg-emerald-500/5 text-emerald-600 rounded-xl border border-emerald-500/10">
                   <p className="text-[9px] font-bold uppercase tracking-tighter opacity-70">Correct</p>
                   <p className="text-xl font-black">{scoreData.correct}</p>
                 </div>
                 <div className="p-3 bg-rose-500/5 text-rose-600 rounded-xl border border-rose-500/10">
                   <p className="text-[9px] font-bold uppercase tracking-tighter opacity-70">Wrong</p>
                   <p className="text-xl font-black">{scoreData.incorrect}</p>
                 </div>
               </div>

               <button 
                 onClick={() => router.push(`/mock-tests/${encodeURIComponent(decodeURIComponent(params.id as string))}/analysis`)}
                 className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4"
               >
                 View Detailed Analysis <ChevronRight className="w-4 h-4" />
               </button>
           </div>
        )}

          <h3 className="font-bold mb-4">Questions</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_: any, i: number) => {
              const isAttempted = !!answers[i];
              const isMarked = bookmarked.has(i);
              
              let style = "bg-muted hover:bg-muted/80 text-muted-foreground border border-transparent";
              
              if (currentQIndex === i) {
                style = "ring-2 ring-primary ring-offset-2 ring-offset-card bg-muted text-foreground font-bold";
              } else if (isSubmitted) {
                const uLetter = answers[i];
                const correctLetter = (questions[i].answer || "").trim().toUpperCase();
                const isCorrect = uLetter && uLetter === correctLetter;
                if (!isAttempted) style = "bg-muted text-muted-foreground border-border";
                else if (isCorrect) style = "bg-emerald-500/20 text-emerald-700 border-emerald-500 dark:text-emerald-400";
                else style = "bg-destructive/20 text-destructive border-destructive";
              } else if (isAttempted) {
                style = "bg-primary text-primary-foreground font-bold";
              } else if (isMarked) {
                style = "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30";
              }

              return (
                <button
                  key={i}
                  onClick={() => setCurrentQIndex(i)}
                  className={`w-full aspect-square flex items-center justify-center rounded-md text-sm transition-all ${style}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          
          {!isSubmitted && (
            <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground font-medium">
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary" /> Answered</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-muted border border-border" /> Unanswered</div>
               <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 dark:bg-amber-500/20" /> Marked</div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
