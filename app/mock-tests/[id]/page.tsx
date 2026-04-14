"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMockTest, saveTestAttempt, saveQuestion, normalizeSubject, getSavedQuestions, deleteSavedQuestion } from "@/lib/database";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  Globe, 
  ArrowLeft, 
  BookmarkPlus, 
  Flag,
  Star,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { safeText, toDirectFileUrl as toDirectImageUrl } from "@/lib/utils";


export default function TestPlayer() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"english" | "hindi">("english");
  const [scoreData, setScoreData] = useState<any>(null);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New states for Testbook-style UI
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [markedIndices, setMarkedIndices] = useState<Set<number>>(new Set());
  const [questionTimers, setQuestionTimers] = useState<Record<number, number>>({});
  const [currentQuestionTimer, setCurrentQuestionTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const testId = decodeURIComponent(params.id as string);
        const data = await getMockTest(testId);
        if (data) {
          setTest(data);
          setTimeLeft((data.durationMinutes || 60) * 60);
          
          if (user) {
             const saved = await getSavedQuestions(user.uid);
             setSavedItemIds(saved.map(s => s.questionId));
          }
        } else {
          setError("Test not found");
        }
      } catch (err) {
        setError("Failed to load test data");
      } finally {
        setLoading(false);
      }
    };
    if (params.id && user) fetchTest();
  }, [params.id, user]);

  useEffect(() => {
    if (loading || !isStarted || isSubmitted || timeLeft <= 0 || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
      setCurrentQuestionTimer(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, isStarted, isSubmitted, timeLeft, isPaused]);

  // Update question-specific time when moving away
  const handleNextPrev = (newIndex: number) => {
    setQuestionTimers(prev => ({
      ...prev,
      [currentQIndex]: (prev[currentQIndex] || 0) + currentQuestionTimer
    }));
    setCurrentQuestionTimer(0);
    setCurrentQIndex(newIndex);
    setVisitedIndices(prev => new Set(prev).add(newIndex));
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    const letter = ["A", "B", "C", "D"][optionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQIndex]: letter
    }));
  };

  const toggleSave = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const currentQ = test.questionsData[currentQIndex];
      const qId = currentQ.id || `mock-${test.id}-${currentQIndex}`;
      
      if (savedItemIds.includes(qId)) {
        await deleteSavedQuestion(user.uid, qId);
        setSavedItemIds(prev => prev.filter(id => id !== qId));
      } else {
        await saveQuestion(user.uid, {
          ...currentQ,
          questionId: qId,
          mockTestId: params.id as string,
          mockTestName: test.paperName
        });
        setSavedItemIds(prev => [...prev, qId]);
      }
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
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
    
    const score = (correct * 2) - (incorrect * 0.5);
    const accuracyVal = (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0;
    const timeTakenSeconds = (test.durationMinutes || 60) * 60 - timeLeft;
    const timeSpentStr = `${Math.floor(timeTakenSeconds / 60)}m ${timeTakenSeconds % 60}s`;

    const resultsForDb = {
      testId: decodeURIComponent(params.id as string),
      testTitle: test.paperName || test.testName || `Mock Test`,
      category: test.categoryId || "General",
      score,
      totalMarks: questions.length * 2,
      accuracy: accuracyVal,
      timeSpentStr,
      answers,
      language: selectedLanguage,
      testUploadedAt: test.lastUploadedAt || null
    };

    const resultsForUi = {
      ...resultsForDb,
      correct,
      incorrect,
      unattempted,
      totalQuestions: questions.length,
      timeTaken: timeTakenSeconds,
      status: 'completed'
    };

    setScoreData(resultsForUi);
    if (user) {
      await saveTestAttempt(user.uid, resultsForDb);
    }
  };

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

  const currentQ = questions[currentQIndex];

  // Instructions Screen (with language selection integrated)
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
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center text-xs">2</div> आपने प्रश्न का उत्तर दे दिया है।</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-violet-600 text-white flex items-center justify-center text-xs">3</div> आपने प्रश्न को समीक्षा के लिए चिह्नित किया है।</li>
                        </ul>
                     </li>
                   </>
                 ) : (
                   <>
                     <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.</li>
                     <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                        <ul className="mt-2 space-y-2 list-none mb-4">
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-xs">1</div> You have NOT answered the question.</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center text-xs">2</div> You have answered the question.</li>
                          <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-violet-600 text-white flex items-center justify-center text-xs">3</div> You have NOT answered the question, but have marked the question for review.</li>
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
  // Test Player Screen (Testbook Redesign)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col font-sans text-slate-900">
      
      {/* 1. Top Header */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary p-1 rounded-lg">
              <Star className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SarkariStaar</span>
          </Link>
          <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />
          <h2 className="text-sm font-bold text-slate-600 hidden md:block max-w-[400px] truncate">
            {test.paperName || `${test.categoryId} - Mock ${test.testNumber}`}
          </h2>
        </div>

        {!isSubmitted && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-md shadow-inner">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Time Left</span>
              <div className="flex items-center gap-1 font-mono font-bold text-lg text-slate-700">
                <span className="bg-slate-700 text-white px-1 rounded-sm">00</span>
                <span>:</span>
                <span className="bg-slate-700 text-white px-1 rounded-sm">{String(Math.floor(timeLeft / 60)).padStart(2, '0')}</span>
                <span>:</span>
                <span className="bg-slate-700 text-white px-1 rounded-sm">{String(timeLeft % 60).padStart(2, '0')}</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button 
                onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen();
                  else document.documentElement.requestFullscreen();
                }}
                className="px-3 py-1.5 text-xs font-bold border border-sky-600 text-sky-600 rounded hover:bg-sky-50 transition-colors"
              >
                Switch Full Screen
              </button>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1.5 text-xs font-bold border border-sky-600 text-sky-600 rounded hover:bg-sky-50 transition-colors"
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Section Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center h-10 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Sections |</span>
          <button className="px-6 h-7 flex items-center justify-center bg-[#0e6f8a] text-white text-xs font-bold rounded shadow-sm">
            Test
          </button>
        </div>
      </div>

      {/* 3. Main Content Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Question Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white mr-[1px]">
          
          {/* Question Header Info */}
          <div className="border-b border-slate-100 p-3 px-6 flex justify-between items-center bg-white">
            <h3 className="font-black text-slate-800 tracking-tight">Question No. {currentQIndex + 1}</h3>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Marks</span>
                 <div className="flex gap-1.5">
                    <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[11px] font-bold">+2.0</span>
                    <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[11px] font-bold">-0.5</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Time spent</span>
                 <span className="font-mono font-bold text-slate-700 text-sm">
                   {String(Math.floor(currentQuestionTimer / 60)).padStart(2, '0')}:{String(currentQuestionTimer % 60).padStart(2, '0')}
                 </span>
              </div>

              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">View in </span>
                 <select 
                   value={selectedLanguage}
                   onChange={(e) => setSelectedLanguage(e.target.value as any)}
                   className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                 >
                   <option value="english">English</option>
                   <option value="hindi">Hindi</option>
                 </select>
              </div>

              <button className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors">
                <Flag className="w-3 h-3" /> Report
              </button>
            </div>
          </div>

          {/* Actual Question Display */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-10">
              <p className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedLanguage === 'hindi' ? safeText(currentQ.question_hindi || currentQ.question) : safeText(currentQ.question)}
              </p>

              {currentQ.imageUrl && toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith('http') && (
                <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toDirectImageUrl(safeText(currentQ.imageUrl))} alt="Question figure" className="max-h-[350px] object-contain mx-auto" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedLanguage === 'hindi' && currentQ.options_hindi?.some((o: any) => o) ? currentQ.options_hindi : currentQ.options).map((option: any, i: number) => {
                  const currentLetter = ["A", "B", "C", "D"][i];
                  const isSelected = answers[currentQIndex] === currentLetter;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswerSelect(i)}
                      disabled={isSubmitted}
                      className={`group flex items-center p-4 rounded-full border-2 transition-all text-left ${
                        isSelected 
                          ? 'bg-sky-50 border-sky-500 shadow-md ring-1 ring-sky-500/20' 
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-sky-500 border-sky-500 text-white shadow-sm' 
                          : 'border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`ml-4 text-base font-medium transition-colors flex flex-col gap-2 ${isSelected ? 'text-sky-900' : 'text-slate-600 group-hover:text-slate-800'}`}>
                        {(() => {
                          const s = safeText(option);
                          const hasUrl = /https?:\/\//i.test(s);
                          if (!hasUrl) return s;

                          const parts = s.split(/(https?:\/\/[^\s\n\r<>]+)/gi);
                          return parts.map((part, i) => {
                            if (/^https?:\/\//i.test(part.trim())) {
                              return (
                                <div key={i} className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 max-w-[250px] shadow-sm">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img 
                                    src={toDirectImageUrl(part.trim())} 
                                    alt={`Option figure ${i}`} 
                                    className="w-full h-auto object-contain"
                                  />
                                </div>
                              );
                            }
                            return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                          });
                        })()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isSubmitted && (selectedLanguage === 'hindi' ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation) && (
                <div className="mt-12 p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 text-sky-700">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-[0.15em] text-xs">Solution Explanation</h3>
                  </div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap prose prose-slate max-w-none">
                    {safeText(selectedLanguage === 'hindi' ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation)}
                  </div>
                  {currentQ.solutionImageUrl && toDirectImageUrl(safeText(currentQ.solutionImageUrl)).startsWith('http') && (
                    <div className="mt-6 rounded-xl overflow-hidden border border-slate-200 bg-white p-4 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toDirectImageUrl(safeText(currentQ.solutionImageUrl))} alt="Solution diagram" className="max-h-[400px] object-contain mx-auto" />
                    </div>
                  )}
                </div>
              )}

              {/* 4. Action Navigation Group */}
              {!isSubmitted && (
                <div className="pt-8 mt-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setMarkedIndices(prev => new Set(prev).add(currentQIndex));
                        handleNextPrev(Math.min(questions.length - 1, currentQIndex + 1));
                      }}
                      className="px-6 py-2 bg-sky-100 text-sky-700 border border-sky-200 rounded shadow-sm text-xs font-black uppercase tracking-wider hover:bg-sky-200 transition-all hover:translate-y-[-1px] active:translate-y-0"
                    >
                      Mark for Review & Next
                    </button>
                    <button 
                      onClick={() => setAnswers(prev => {
                        const next = { ...prev };
                        delete next[currentQIndex];
                        return next;
                      })}
                      className="px-6 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded shadow-sm text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all hover:translate-y-[-1px] active:translate-y-0"
                    >
                      Clear Response
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleNextPrev(Math.max(0, currentQIndex - 1))}
                        disabled={currentQIndex === 0}
                        className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold transition-all disabled:opacity-30 flex items-center gap-1"
                       >
                        <ChevronLeft className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => {
                           toggleSave();
                        }}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 border font-bold ${
                          savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`)
                            ? 'bg-primary/10 text-primary border-primary/30' 
                            : 'bg-muted hover:bg-muted/80 border-transparent text-muted-foreground'
                        }`}
                       >
                        <BookmarkPlus className={`w-4 h-4 ${savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`) ? 'fill-primary' : ''}`} />
                       </button>
                    </div>
                    <button 
                      onClick={() => {
                        // Fix: remove from marked if user saves answer
                        if (markedIndices.has(currentQIndex)) {
                          setMarkedIndices(prev => {
                            const next = new Set(prev);
                            next.delete(currentQIndex);
                            return next;
                          });
                        }
                        handleNextPrev(Math.min(questions.length - 1, currentQIndex + 1));
                      }}
                      className="px-8 py-2.5 bg-[#00b2ca] text-white rounded shadow-[0_2px_8px_rgba(0,178,202,0.3)] text-xs font-black uppercase tracking-widest hover:bg-[#009fb5] transition-all hover:translate-y-[-1px] active:translate-y-0"
                    >
                      Save & Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right: Sidebar */}
        <aside className="w-80 bg-[#eef1f5] border-l border-slate-200 flex flex-col shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
          
          {/* User Profile */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-inner">
               <UserCircle className="w-7 h-7" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Candidate</p>
                <p className="text-sm font-black text-slate-700 truncate">{user?.displayName || "Student User"}</p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* Status Legend */}
            <div className="p-4 bg-[#f8fafc] border-b border-slate-200 grid grid-cols-2 gap-3 pb-6">
              {[
                { label: "Answered", count: Object.keys(answers).filter(k => !markedIndices.has(Number(k))).length, color: "bg-emerald-500" },
                { label: "Marked", count: Array.from(markedIndices).filter(idx => !answers[idx]).length, color: "bg-violet-600" },
                { label: "Not Visited", count: questions.length - visitedIndices.size, color: "bg-white border border-slate-300" },
                { label: "Not Answered", count: visitedIndices.size - Object.keys(answers).length - Array.from(markedIndices).filter(idx => !answers[idx]).length, color: "bg-rose-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${item.color} ${item.label === "Not Visited" ? "text-slate-400" : "text-white shadow-sm"}`}>
                    {item.count}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-tight">{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 col-span-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] text-white font-bold shadow-sm relative overflow-hidden">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Marked and answered: <span className="ml-1 text-slate-800">{Object.keys(answers).filter(k => markedIndices.has(Number(k))).length}</span></span>
              </div>
            </div>

            {/* Section Palette Header */}
            <div className="p-3 bg-sky-100 border-b border-sky-200 text-sky-800 text-[10px] font-black uppercase tracking-[0.2em] px-4 flex justify-between items-center">
              <span>Section: Test</span>
              <div className="h-1 flex-1 mx-2 bg-sky-200/50 rounded-full overflow-hidden">
                 <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${(visitedIndices.size / questions.length) * 100}%` }} />
              </div>
            </div>

            {/* Question Grid */}
            <div className="p-4 grid grid-cols-5 gap-2 content-start">
               {questions.map((_, i) => {
                  const isVisited = visitedIndices.has(i);
                  const isAnswered = !!answers[i];
                  const isMarked = markedIndices.has(i);
                  const isCurrent = currentQIndex === i;
                  
                  let btnBg = "bg-white text-slate-400 border border-slate-300";
                  let icon = null;
                  
                  if (isMarked && isAnswered) {
                    btnBg = "bg-violet-600 text-white shadow-sm";
                    icon = <CheckCircle2 className="w-2.5 h-2.5 absolute bottom-0 right-0 bg-emerald-500 rounded-full text-white" />;
                  } else if (isMarked) {
                    btnBg = "bg-violet-600 text-white shadow-sm rounded-full";
                  } else if (isAnswered) {
                    btnBg = "bg-emerald-500 text-white shadow-sm rounded-t-xl rounded-b-sm";
                  } else if (isVisited) {
                    btnBg = "bg-rose-500 text-white shadow-sm rounded-t-sm rounded-b-xl";
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleNextPrev(i)}
                      className={`relative w-full aspect-square flex items-center justify-center text-xs font-black transition-all hover:scale-105 active:scale-95 ${btnBg} ${isCurrent ? 'ring-2 ring-sky-400 ring-offset-1 border-transparent' : 'border border-slate-200'}`}
                    >
                      {i + 1}
                      {icon}
                    </button>
                  );
               })}
            </div>
          </div>

          {/* Sidebar Tools Footer */}
          <div className="p-2 gap-1 grid grid-cols-2 bg-white border-t border-slate-200">
             <button className="h-10 text-[10px] font-black uppercase bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-all shadow-sm">Question Paper</button>
             <button 
               onClick={() => setIsStarted(false)}
               className="h-10 text-[10px] font-black uppercase bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-all shadow-sm"
             >
               Instructions
             </button>
             <button 
               onClick={handleSubmit}
               className="col-span-2 h-10 text-[10px] font-black uppercase bg-sky-500 text-white rounded hover:bg-sky-600 transition-all shadow-md mt-1 active:translate-y-0.5"
             >
               Submit Test
             </button>
          </div>

        </aside>
      </div>

      {isSubmitted && scoreData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl inline-block">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Test Submitted!</h2>
                <p className="text-slate-500 text-sm font-medium">Your final score has been calculated.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-1">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total Marks Obtained</p>
                 <h2 className="text-5xl font-black text-primary drop-shadow-sm">{scoreData.score}<span className="text-xl text-slate-300 font-medium">/{scoreData.totalMarks}</span></h2>
              </div>

              <button 
                onClick={() => router.push(`/mock-tests/${params.id}/analysis`)}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:translate-y-0"
              >
                View Detailed Analysis <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
