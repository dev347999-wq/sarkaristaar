"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMockTest, getTestAttempt, saveQuestion, deleteSavedQuestion, getSavedQuestions, normalizeSubject } from "@/lib/database";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, BarChart3, Clock, Target, BookmarkPlus } from "lucide-react";
import { safeText, toDirectFileUrl as toDirectImageUrl } from "@/lib/utils";


export default function TestAnalysis() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [test, setTest] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!user) return;
      
      try {
        const testId = decodeURIComponent(params.id as string);

        // ✅ Check sessionStorage first for a freshly-submitted attempt
        // (written by the test player immediately on submit, before the DB write)
        let cachedAttempt: any = null;
        try {
          const raw = sessionStorage.getItem(`attempt_${testId}`);
          if (raw) {
            cachedAttempt = JSON.parse(raw);
            // Clear so that subsequent visits read from the DB
            sessionStorage.removeItem(`attempt_${testId}`);
          }
        } catch (_) { /* sessionStorage unavailable */ }

        const [testData, savedQuestions] = await Promise.all([
           getMockTest(testId),
           getSavedQuestions(user.uid)
        ]);
        
        if (!testData) {
          setError("Test not found.");
          return;
        }

        // Use cached attempt from session, or fetch from DB
        const attemptData = cachedAttempt || await getTestAttempt(user.uid, testId);

        if (!attemptData) {
          setError("No attempt found. You have not taken this test yet.");
          return;
        }
        
        setTest(testData);
        setAttempt(attemptData);
        setSavedItemIds(savedQuestions.map(q => q.questionId));
      } catch (err) {
        setError("Failed to load analysis data.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysisData();
  }, [params.id, user]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Analysis...</div>;
  }
  
  if (error || !test || !attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h2 className="text-xl font-bold">{error}</h2>
        <button onClick={() => router.push('/mock-tests')} className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const questions: any[] = test.questionsData || [];

  // Guard: if no questions were loaded
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-bold">No Questions Found</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Detailed question data is missing for this test analysis.
        </p>
        <button onClick={() => router.push('/mock-tests')} className="text-primary hover:underline font-semibold">
          ← Back to Tests
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex] || {};
  // Parse the answers object (fallback for older DB entries before adding the field)
  const answers = attempt?.answers || {};
  
  // Debug log to help identify the crash in production if it persists
  console.log("Analysis Debug:", { 
    currentQIndex, 
    questionExists: !!questions[currentQIndex],
    questionsTotal: questions.length,
    attemptId: attempt?.id 
  });

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

  return (
    <div className="max-w-7xl mx-auto p-4 py-8 space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Score Summary */}
      <div className="flex flex-col md:flex-row bg-card border border-border p-6 rounded-xl md:items-center justify-between shadow-sm gap-6">
        <div>
          <button onClick={() => router.push('/mock-tests')} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tests
          </button>
          <h1 className="font-bold text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{attempt.testTitle}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Completed on {attempt.dateCompleted ? new Date(attempt.dateCompleted).toLocaleDateString() : ''} at {attempt.dateCompleted ? new Date(attempt.dateCompleted).toLocaleTimeString() : ''}</p>
        </div>
        
        <div className="flex bg-muted/50 p-4 rounded-xl border border-border gap-6 md:gap-8 overflow-x-auto">
           <div className="flex flex-col items-center justify-center min-w-[80px]">
             <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Score</span>
             <span className="text-2xl font-black text-primary">{attempt.score}<span className="text-sm text-muted-foreground font-medium">/{attempt.totalMarks}</span></span>
           </div>
           
           <div className="w-px bg-border my-2" />
           
           <div className="flex flex-col items-center justify-center min-w-[80px]">
             <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Accuracy</span>
             <span className="text-2xl font-black text-foreground">{attempt.accuracy}%</span>
           </div>
           
           <div className="w-px bg-border my-2 hidden sm:block" />
           
           <div className="flex flex-col items-center justify-center min-w-[80px] hidden sm:flex">
             <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
             <span className="text-xl font-bold text-foreground mt-1">{attempt.timeSpentStr}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Review Section */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8 min-h-[400px] shadow-sm">
            
            <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                Question Review {currentQIndex + 1}
              </h2>
              
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold px-3 py-1 bg-muted rounded-md text-muted-foreground">
                  {safeText(currentQ?.topic) || safeText(test?.categoryId)}
                </div>
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

            {/* Language Toggle in Analysis */}
            <div className="flex justify-end mb-4">
               <div className="bg-muted p-1 rounded-lg flex gap-1">
                  <button 
                    onClick={() => setAttempt({...attempt, language: 'english'})}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${attempt.language === 'english' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => setAttempt({...attempt, language: 'hindi'})}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${attempt.language === 'hindi' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Hindi
                  </button>
               </div>
            </div>

            <p className="text-lg font-medium mb-8 leading-relaxed whitespace-pre-wrap">
              {attempt?.language === 'hindi' 
                ? safeText(currentQ?.question_hindi || currentQ?.question || "No question text") 
                : safeText(currentQ?.question || "No question text")}
            </p>

            {currentQ?.imageUrl && toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith('http') && (
              <div className="mb-8 rounded-xl overflow-hidden border border-border bg-muted/30 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toDirectImageUrl(safeText(currentQ.imageUrl))} alt="Question figure" className="max-w-full max-h-[400px] mx-auto object-contain" />
              </div>
            )}

            <div className="space-y-3">
              {(attempt?.language === 'hindi' && currentQ?.options_hindi?.some((o: any) => safeText(o)) ? currentQ.options_hindi : (currentQ?.options || [])).map((option: any, i: number) => {
                const currentLetter = ["A", "B", "C", "D"][i];
                const uAnswerLetter = answers[currentQIndex]; 
                const isSelected = uAnswerLetter === currentLetter;
                // Safe access to answer
                const correctLetter = safeText(currentQ?.answer).trim().toUpperCase();
                const isCorrectOption = currentLetter === correctLetter;
                
                let btnStyle = "bg-muted/30 border-transparent opacity-60";
                
                if (isCorrectOption) {
                   btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/50";
                } else if (isSelected && !isCorrectOption) {
                   btnStyle = "bg-destructive/10 border-destructive text-destructive font-bold";
                }

                return (
                  <div
                    key={i}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <div className="flex flex-col gap-2">
                      <span className="font-bold mr-3">{currentLetter}.</span> 
                      {(() => {
                        const s = safeText(option);
                        const hasUrl = /https?:\/\//i.test(s);
                        if (!hasUrl) return s;

                        const parts = s.split(/(https?:\/\/[^\s\n\r<>]+)/gi);
                        return parts.map((part, i) => {
                          if (/^https?:\/\//i.test(part.trim())) {
                            return (
                              <div key={i} className="mt-2 rounded-xl overflow-hidden border border-border bg-white p-1 max-w-[250px] shadow-sm">
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
                    </div>
                    {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    {isSelected && !isCorrectOption && <AlertCircle className="w-5 h-5 text-destructive" />}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-xl leading-relaxed text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 font-bold text-primary mb-3 text-lg border-b border-primary/10 pb-2">
                <CheckCircle2 className="w-5 h-5" /> Detailed Explanation
              </div>
              
              {currentQ?.solutionImageUrl && toDirectImageUrl(safeText(currentQ.solutionImageUrl)).startsWith('http') && (
                <div className="mb-4 rounded-lg overflow-hidden border border-primary/10 bg-white dark:bg-slate-900 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toDirectImageUrl(safeText(currentQ.solutionImageUrl))} alt="Solution figure" className="max-w-full max-h-[400px] mx-auto object-contain" />
                </div>
              )}

              <p className="text-sm font-medium whitespace-pre-wrap">
                 {safeText(attempt?.language === 'hindi' ? (currentQ?.explanation_hindi || currentQ?.explanation) : currentQ?.explanation) || "No explanation provided."}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
             <button 
               onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
               disabled={currentQIndex === 0}
               className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
             >
               <ChevronLeft className="w-4 h-4" /> Previous
             </button>
             
             <button 
               onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
               disabled={currentQIndex === questions.length - 1}
               className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
             >
               Next <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Sidebar Grid */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm h-fit sticky top-24">
          
          <h3 className="font-bold mb-4">Jump to Question</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_: any, i: number) => {
              const uAnswerLetter = answers[i];
              const isAttempted = !!uAnswerLetter;
              const qData = questions[i] || {};
              const correctLetter = safeText(qData?.answer).trim().toUpperCase();
              const isCorrect = isAttempted && uAnswerLetter === correctLetter;
              
              let style = "";
              
              if (!isAttempted) {
                 style = "bg-muted text-muted-foreground border border-border hover:bg-muted/80";
              } else if (isCorrect) {
                 style = "bg-emerald-500/20 text-emerald-700 border border-emerald-500/50 dark:text-emerald-400 hover:bg-emerald-500/30";
              } else {
                 style = "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30";
              }
              
              if (currentQIndex === i) {
                style += " ring-2 ring-primary ring-offset-2 ring-offset-card font-black scale-110 z-10";
              } else {
                style += " font-semibold";
              }

              return (
                <button
                  key={i}
                  onClick={() => setCurrentQIndex(i)}
                  className={`w-full aspect-square flex items-center justify-center rounded-md text-xs transition-all ${style}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 pt-4 border-t border-border grid grid-cols-1 gap-3 text-xs text-muted-foreground font-medium">
             <div className="flex items-center gap-3 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <div className="w-4 h-4 rounded-sm bg-emerald-500/40 border border-emerald-500" /> 
                Correct
             </div>
             <div className="flex items-center gap-3 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                <div className="w-4 h-4 rounded-sm bg-destructive/40 border border-destructive" /> 
                Wrong
             </div>
             <div className="flex items-center gap-3 p-2 rounded-md bg-muted border border-border text-foreground">
                <div className="w-4 h-4 rounded-sm bg-muted-foreground/20 border border-muted-foreground/50" /> 
                Unattempted
             </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
