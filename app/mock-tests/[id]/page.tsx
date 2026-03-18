"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getMockTest, saveTestAttempt, saveQuestion, normalizeSubject, getSavedQuestions, deleteSavedQuestion } from "@/lib/firestore";
import { Clock, AlertCircle, ArrowLeft, BookmarkPlus, CheckCircle2, ChevronRight, ChevronLeft, Flag } from "lucide-react";

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
  const [scoreData, setScoreData] = useState<any>(null);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
        // Default to a 60 min timer for now, real app might read this from config or database mapping
        setTimeLeft(60 * 60); 
      } catch (err) {
        setError("Failed to load the test.");
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [params.id]);

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
  }, [loading, isSubmitted, timeLeft]);

  const handleAnswerSelect = (option: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [currentQIndex]: option
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
    const q = test.questionsData[currentQIndex];
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
      const uAnswer = answers[i];
      if (!uAnswer) {
        unattempted++;
      } else if (uAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
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
      testId: test.id,
      testTitle: `${test.categoryId} Mock ${test.testNumber}`,
      category: test.categoryId,
      score: finalScore,
      totalMarks: totalPossibleMarks,
      accuracy: correct + incorrect > 0 ? Math.round((correct / (correct+incorrect)) * 100) : 0,
      timeSpentStr: `${Math.floor((3600 - timeLeft)/60)}m ${(3600 - timeLeft)%60}s`,
      answers: answers
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

  const questions = test.questionsData;
  const currentQ = questions[currentQIndex];

  // -------------------------------------------------------------
  // Instructions Screen
  // -------------------------------------------------------------
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden flex flex-col h-[85vh]">
          
          <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wide">TEST INSTRUCTIONS</h1>
            <div className="text-sm font-medium bg-slate-700 px-3 py-1 rounded">
              {test.categoryId}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar text-slate-800">
            <h2 className="text-xl font-bold text-center underline mb-8">Please read the instructions carefully</h2>
            
            <div className="space-y-4 text-sm leading-relaxed">
               <h3 className="font-bold text-base">General Instructions:</h3>
               <ol className="list-decimal pl-6 space-y-2">
                 <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
                 <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                    <ul className="mt-2 space-y-2 list-none mb-4">
                      <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-xs">1</div> You have NOT answered the question.</li>
                      <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div> You have answered the question.</li>
                      <li className="flex items-center gap-3"><div className="w-6 h-6 rounded bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center text-xs">3</div> You have NOT answered the question, but have marked the question for review.</li>
                    </ul>
                 </li>
                 <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "&lt;" which appears on the right side of question window.</li>
               </ol>
               
               <h3 className="font-bold text-base mt-6">Navigating to a Question:</h3>
               <ol className="list-decimal pl-6 space-y-2">
                 <li>To answer a question, do the following:
                   <ul className="list-[lower-alpha] pl-6 mt-1 space-y-1">
                     <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                     <li>Click on <strong>Next</strong> to save your answer for the current question and then go to the next question.</li>
                     <li>Click on <strong>Mark for Review</strong> to flag it to look at it later.</li>
                   </ul>
                 </li>
               </ol>
               
               <h3 className="font-bold text-base mt-6">Answering a Question:</h3>
               <ol className="list-decimal pl-6 space-y-2">
                 <li>Procedure for answering a multiple choice type question:
                   <ul className="list-[lower-alpha] pl-6 mt-1 space-y-1">
                     <li>To select your answer, click on the button of one of the options.</li>
                     <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                     <li>To change your chosen answer, click on the button of another option.</li>
                   </ul>
                 </li>
               </ol>
               
               <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-md">
                 <p className="font-bold text-blue-900 mb-2">Examination Summary</p>
                 <ul className="space-y-1 text-blue-800">
                   <li><strong>Total Questions:</strong> {questions.length}</li>
                   <li><strong>Total Time:</strong> {Math.floor(timeLeft / 60)} Minutes</li>
                   <li><strong>Correct Answer:</strong> +2.00 Marks</li>
                   <li><strong>Incorrect Answer:</strong> -0.50 Marks</li>
                 </ul>
               </div>
            </div>
          </div>
          
          <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium select-none text-slate-700">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" id="declare-checkbox" />
              I have read and understood the instructions.
            </label>
            <button 
              onClick={() => {
                const cb = document.getElementById('declare-checkbox') as HTMLInputElement;
                if (!cb.checked) {
                   alert("Please accept the terms and conditions before proceeding.");
                   return;
                }
                setIsStarted(true);
              }}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-sm transition-colors text-sm"
            >
              I am ready to begin
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

            <p className="text-lg md:text-xl font-medium mb-8 leading-relaxed whitespace-pre-wrap">{currentQ.question}</p>

            {currentQ.imageUrl && (
              <div className="mb-8 rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentQ.imageUrl} alt="Question figure" className="w-full max-h-[300px] object-contain bg-muted/30" />
              </div>
            )}

            <div className="space-y-3">
              {currentQ.options.map((option: string, i: number) => {
                const isSelected = answers[currentQIndex] === option;
                
                let btnStyle = "bg-muted/50 hover:bg-muted border-transparent";
                if (isSelected) btnStyle = "bg-primary/10 border-primary text-primary font-medium";
                
                if (isSubmitted) {
                   const isCorrectOption = option.trim().toLowerCase() === currentQ.answer.trim().toLowerCase();
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
                    onClick={() => handleAnswerSelect(option)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${btnStyle}`}
                  >
                    <span className="font-bold mr-3">{["A","B","C","D"][i]}.</span> {option}
                  </button>
                );
              })}
            </div>
            
            {isSubmitted && currentQ.explanation && (
              <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm leading-relaxed">
                <span className="font-bold text-primary mb-1 block">Explanation:</span>
                {currentQ.explanation}
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
             <div className="mb-6 p-4 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl text-center space-y-2">
                 <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Final Score</p>
                 <h2 className="text-4xl font-black text-primary">{scoreData.score}<span className="text-lg text-muted-foreground font-medium">/{scoreData.totalMarks}</span></h2>
                 <div className="flex justify-center gap-4 text-xs font-medium pt-2">
                   <span className="text-emerald-600">{scoreData.correct} Correct</span>
                   <span className="text-destructive">{scoreData.incorrect} Wrong</span>
                 </div>
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
                const isCorrect = answers[i] && answers[i].trim().toLowerCase() === questions[i].answer.trim().toLowerCase();
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
