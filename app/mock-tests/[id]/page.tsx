"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  UserCircle,
  TriangleRight
} from "lucide-react";
import Link from "next/link";
import { safeText, toDirectFileUrl as toDirectImageUrl } from "@/lib/utils";

// ─── SSC CGL exam section definitions (PART-A … PART-D) ──────────────────────
const SSC_SECTIONS = [
  { part: "PART-A", label: "General Intelligence", color: "#0e6f8a",   bg: "#0e6f8a" },
  { part: "PART-B", label: "General Awareness",    color: "#0e6f8a",   bg: "#0e6f8a" },
  { part: "PART-C", label: "Quantitative Aptitude",color: "#0e6f8a",   bg: "#0e6f8a" },
  { part: "PART-D", label: "English Comprehension",color: "#1e8c45",   bg: "#1e8c45" },
];
const PART_COLORS = ["#1a6ea8","#1a6ea8","#1a6ea8","#1e8c45"];

/** Return which PART index a question belongs to (0-indexed, each 25 Qs). */
function getPartIndex(qIndex: number, totalQs: number): number {
  const perPart = Math.ceil(totalQs / SSC_SECTIONS.length);
  return Math.min(Math.floor(qIndex / perPart), SSC_SECTIONS.length - 1);
}

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
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);

  // Ref to always hold the latest handleSubmit to avoid stale closure in timer
  const handleSubmitRef = useRef<() => void>(() => {});

  // Testbook-style UI states
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [markedIndices, setMarkedIndices] = useState<Set<number>>(new Set());
  const [questionTimers, setQuestionTimers] = useState<Record<number, number>>({});
  const [currentQuestionTimer, setCurrentQuestionTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Active section tab (0–3 = PART-A/B/C/D)
  const [activePart, setActivePart] = useState(0);

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
          // Use ref to avoid stale closure capturing old handleSubmit
          handleSubmitRef.current();
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
    // sync active part
    if (test) setActivePart(getPartIndex(newIndex, test.questionsData?.length || 100));
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
        // Map raw question fields to the SavedQuestion schema expected by saveQuestion()
        await saveQuestion(user.uid, {
          questionId: qId,
          subject: normalizeSubject(currentQ.subject || currentQ.section || test.paperName || "General"),
          topic: currentQ.topic || currentQ.section || test.paperName || "Mock Test",
          questionText: currentQ.question || currentQ.question_text || "",
          questionHindi: currentQ.question_hindi,
          options: currentQ.options || [],
          optionsHindi: currentQ.options_hindi,
          correctAnswer: currentQ.answer || currentQ.correct_answer || "",
          answerHindi: currentQ.answer_hindi,
          imageUrl: currentQ.imageUrl || currentQ.image_url,
          explanation: currentQ.explanation,
          explanationHindi: currentQ.explanation_hindi,
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
    setIsSavingAttempt(true);
    
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    
    const questions = test.questionsData;
    
    // Capture current answers snapshot to avoid stale state in async context
    const answersSnapshot = answers;
    
    questions.forEach((q: any, i: number) => {
      const uLetter = answersSnapshot[i];
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
      answers: answersSnapshot,
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
      status: 'completed',
      dateCompleted: new Date().toISOString(),
    };

    setScoreData(resultsForUi);

    // ✅ Store in sessionStorage immediately so the analysis page always has data
    // regardless of whether the DB write has finished yet.
    try {
      sessionStorage.setItem(
        `attempt_${decodeURIComponent(params.id as string)}`,
        JSON.stringify(resultsForUi)
      );
    } catch (_) { /* sessionStorage may be unavailable in some browsers */ }

    if (user) {
      try {
        await saveTestAttempt(user.uid, resultsForDb);
      } catch (saveErr) {
        console.error("Failed to save test attempt:", saveErr);
      }
    }
    setIsSavingAttempt(false);
  };

  // Keep ref in sync so the timer callback always calls the latest handleSubmit
  handleSubmitRef.current = handleSubmit;

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

  // Guard: if no questions were loaded
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
  const totalQs = questions.length;

  // Per-part question ranges
  const perPart = Math.ceil(totalQs / SSC_SECTIONS.length);
  const partRanges = SSC_SECTIONS.map((_, idx) => ({
    start: idx * perPart,
    end: Math.min((idx + 1) * perPart - 1, totalQs - 1),
  }));

  // Which section does the current question belong to?
  const currentPartIndex = getPartIndex(currentQIndex, totalQs);
  const currentSection = SSC_SECTIONS[currentPartIndex];

  // Does this question have a passage/comprehension text?
  // Check all possible field names: new 'passage' key, raw CSV-lowercased key,
  // and legacy names — so it works regardless of when the test was uploaded.
  const getPassage = (q: any) =>
    q?.passage ||
    q?.['paragraph questions'] ||
    q?.['paragraph question'] ||
    q?.paragraph ||
    q?.['passage question header'] ||
    q?.['passage question Header'] ||
    q?.comprehension ||
    q?.passage_text ||
    "";

  const passageText: string = safeText(getPassage(currentQ));
  const hasPassage = passageText.trim().length > 0;

  // Find the range of questions sharing this same passage (for "Que No. X - Y" label)
  const passageRange = (() => {
    if (!hasPassage) return null;
    let first = currentQIndex;
    let last = currentQIndex;
    while (first > 0 && safeText(getPassage(questions[first - 1])) === passageText) first--;
    while (last < totalQs - 1 && safeText(getPassage(questions[last + 1])) === passageText) last++;
    return { first: first + 1, last: last + 1 }; // 1-indexed for display
  })();

  // ─── INSTRUCTIONS SCREEN ──────────────────────────────────────────────────
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

  // ─── OPTION RENDERER (shared) ────────────────────────────────────────────
  const renderOptions = (opts: any[], isCompact = false) => {
    return (
      <div className={`space-y-2 ${isCompact ? "" : "mt-4"}`}>
        {opts.map((option: any, i: number) => {
          const currentLetter = ["A", "B", "C", "D"][i];
          const isSelected = answers[currentQIndex] === currentLetter;

          return (
            <button
              key={i}
              onClick={() => handleAnswerSelect(i)}
              disabled={isSubmitted}
              className={`group w-full flex items-start p-3 rounded border transition-all text-left ${
                isSelected
                  ? "bg-[#e8f4fb] border-[#5b9bd5] shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {/* Radio circle */}
              <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 mr-3 transition-all ${
                isSelected ? "border-[#5b9bd5] bg-[#5b9bd5]" : "border-slate-400"
              }`} />
              <span className={`text-sm leading-snug ${isSelected ? "text-[#1a4571] font-medium" : "text-slate-700"}`}>
                {(() => {
                  const s = safeText(option);
                  const hasUrl = /https?:\/\//i.test(s);
                  if (!hasUrl) return s;
                  const parts = s.split(/(https?:\/\/[^\s\n\r<>]+)/gi);
                  return parts.map((part, pi) => {
                    if (/^https?:\/\//i.test(part.trim())) {
                      return (
                        <div key={pi} className="mt-2 rounded overflow-hidden border border-slate-200 bg-white p-1 max-w-[220px] shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={toDirectImageUrl(part.trim())} alt={`Option figure ${pi}`} className="w-full h-auto object-contain" />
                        </div>
                      );
                    }
                    return <span key={pi} className="whitespace-pre-wrap">{part}</span>;
                  });
                })()}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── TEST PLAYER SCREEN ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col font-sans text-slate-900" style={{ fontSize: 13 }}>

      {/* ══════════════════════════════════════════════════════
          1. TOP HEADER  (SYMBOLS | INSTRUCTIONS | OVERALL TEST SUMMARY  +  nav buttons)
         ══════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-300" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>

        {/* TOP BAR: Logo | Exam Title + Roll No | Timer + Profile avatar */}
        <div className="flex items-center justify-between px-4 border-b border-slate-200" style={{ height: 46 }}>
          <div className="flex items-center gap-2">
            <span className="font-black" style={{ fontSize: 17, color: "#1a6ea8" }}>sarkaristaar</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-slate-500 font-semibold" style={{ fontSize: 11 }}>{test.paperName || test.testName || "Mock Test"}</span>
          </div>
          <div className="text-center hidden md:block">
            <div className="font-black text-slate-800" style={{ fontSize: 13 }}>{test.paperName || test.testName || "Mock Test"}</div>
            <div className="text-slate-400 font-mono" style={{ fontSize: 10 }}>Roll No : {user?.uid?.slice(0, 15).toUpperCase()}</div>
          </div>
          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div className="flex flex-col items-center leading-tight">
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>Time Left</span>
                <span className="font-mono font-black" style={{ fontSize: 16, color: timeLeft < 300 ? "#dc2626" : "#1a6ea8" }}>
                  {String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')} : {String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* SUB-BAR: SYMBOLS | INSTRUCTIONS | OVERALL TEST SUMMARY + answered count */}
        <div className="flex items-center border-b border-slate-200 px-3 h-7 text-[11px] font-bold gap-0">
          <button className="px-3 h-full hover:bg-slate-50 text-[#0e6f8a] border-r border-slate-200 transition-colors">SYMBOLS</button>
          <button className="px-3 h-full hover:bg-slate-50 text-[#0e6f8a] border-r border-slate-200 transition-colors" onClick={() => setIsStarted(false)}>INSTRUCTIONS</button>
          <button className="px-3 h-full hover:bg-slate-50 text-[#0e6f8a] transition-colors">OVERALL TEST SUMMARY</button>
          <div className="ml-auto flex items-center gap-1 text-slate-500 font-semibold">
            <span>Total Questions Answered:</span>
            <span className="font-black ml-1" style={{ color: "#1a6ea8" }}>
              {Object.keys(answers).filter(k => !markedIndices.has(Number(k))).length}
            </span>
          </div>
        </div>

        {/* Main header row */}
        <div className="flex items-center gap-0 px-2 h-10">
          {/* PART buttons */}
          <div className="flex items-center gap-1 mr-4">
            {SSC_SECTIONS.map((sec, idx) => {
              const isActive = activePart === idx;
              return (
                <button
                  key={sec.part}
                  onClick={() => {
                    setActivePart(idx);
                    // jump to first question in that part
                    handleNextPrev(partRanges[idx].start);
                  }}
                  style={{
                    background: isActive ? PART_COLORS[idx] : "#e8e8e8",
                    color: isActive ? "#fff" : "#444",
                    borderRadius: 3,
                    fontWeight: 700,
                    fontSize: 11,
                    padding: "2px 10px",
                    border: "none",
                    cursor: "pointer",
                    transition: "background .15s",
                  }}
                >
                  {sec.part}
                </button>
              );
            })}
          </div>

          {/* Previous */}
          <button
            onClick={() => handleNextPrev(Math.max(0, currentQIndex - 1))}
            disabled={currentQIndex === 0}
            style={{
              height: 28,
              padding: "0 14px",
              fontSize: 11,
              fontWeight: 700,
              background: "#f0f0f0",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 3,
              cursor: currentQIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentQIndex === 0 ? 0.5 : 1,
              marginRight: 4,
            }}
          >
            Previous
          </button>

          {/* Mark for Review */}
          <button
            onClick={() => {
              setMarkedIndices(prev => new Set(prev).add(currentQIndex));
              handleNextPrev(Math.min(totalQs - 1, currentQIndex + 1));
            }}
            style={{
              height: 28,
              padding: "0 14px",
              fontSize: 11,
              fontWeight: 700,
              background: "#f0f0f0",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 3,
              cursor: "pointer",
              marginRight: 4,
            }}
          >
            Mark for Review
          </button>

          {/* Save & Next */}
          <button
            onClick={() => {
              if (markedIndices.has(currentQIndex)) {
                setMarkedIndices(prev => { const n = new Set(prev); n.delete(currentQIndex); return n; });
              }
              handleNextPrev(Math.min(totalQs - 1, currentQIndex + 1));
            }}
            style={{
              height: 28,
              padding: "0 14px",
              fontSize: 11,
              fontWeight: 700,
              background: "#4a90d9",
              color: "#fff",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              marginRight: 4,
            }}
          >
            Save &amp; Next
          </button>

          {/* Submit Test */}
          {!isSubmitted && (
            <button
              onClick={handleSubmit}
              style={{
                height: 28,
                padding: "0 14px",
                fontSize: 11,
                fontWeight: 700,
                background: "#e05c00",
                color: "#fff",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              Submit Test
            </button>
          )}

        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          2. MAIN CONTENT  (question area + right sidebar)
         ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT / CENTRE: Question Area ───────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-white" style={{ borderRight: "1px solid #d8dde4" }}>

          {/* Question No. and meta row */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white" style={{ minHeight: 38 }}>
            <span className="font-bold text-slate-800" style={{ fontSize: 13 }}>Question No. {currentQIndex + 1}</span>

            <div className="flex items-center gap-4">
              {/* Select Language */}
              <div className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                <span className="text-slate-500 font-semibold">Select Language</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as any)}
                  className="border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  style={{ fontSize: 11 }}
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                </select>
              </div>

              {/* Report */}
              <button className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition-colors" style={{ fontSize: 11, fontWeight: 600 }}>
                <Flag className="w-3 h-3" /> Report
              </button>
            </div>
          </div>

          {/* ── COMPREHENSION SPLIT LAYOUT or NORMAL LAYOUT ─── */}
          <style dangerouslySetInnerHTML={{__html: `
            .passage-scrollbar::-webkit-scrollbar { width: 12px !important; display: block !important; -webkit-appearance: none !important; }
            .passage-scrollbar::-webkit-scrollbar-track { background: #f8fafc !important; border-left: 1px solid #e2e8f0 !important; }
            .passage-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1 !important; border-radius: 12px !important; border: 2px solid #f8fafc !important; }
            .passage-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8 !important; }
          `}} />
          {hasPassage ? (
            /* ── SPLIT: passage left, question right ─ */
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Passage panel */}
              <div className="w-[45%] h-full overflow-y-scroll passage-scrollbar p-5" style={{ background: "#fafafa" }}>


                <div className="text-slate-800 leading-relaxed whitespace-pre-wrap" style={{ fontSize: 13 }}>
                  {passageText}
                </div>

                {/* Passage image if any */}
                {currentQ.passageImageUrl && toDirectImageUrl(safeText(currentQ.passageImageUrl)).startsWith('http') && (
                  <div className="mt-4 rounded overflow-hidden border border-slate-200 bg-white p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDirectImageUrl(safeText(currentQ.passageImageUrl))} alt="Passage figure" className="max-h-[300px] object-contain mx-auto" />
                  </div>
                )}
              </div>

              {/* Question + options panel */}
              <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-5 flex flex-col border-l border-slate-200">
                {/* Question label */}
                <p className="font-bold text-slate-800 underline mb-3" style={{ fontSize: 13 }}>Question:</p>

                <p className="text-slate-800 leading-snug whitespace-pre-wrap mb-4" style={{ fontSize: 13 }}>
                  {selectedLanguage === "hindi" ? safeText(currentQ.question_hindi || currentQ.question) : safeText(currentQ.question)}
                </p>

                {/* Question image */}
                {currentQ.imageUrl && toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith('http') && (
                  <div className="rounded overflow-hidden border border-slate-100 shadow-sm bg-slate-50 p-2 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDirectImageUrl(safeText(currentQ.imageUrl))} alt="Question figure" className="max-h-[200px] object-contain mx-auto" />
                  </div>
                )}

                {/* Options */}
                {renderOptions(
                  selectedLanguage === "hindi" && currentQ.options_hindi?.some((o: any) => o)
                    ? currentQ.options_hindi
                    : currentQ.options,
                  true
                )}

                {/* Explanation (post-submit) */}
                {isSubmitted && (selectedLanguage === "hindi" ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation) && (
                  <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded space-y-2 shadow-inner">
                    <div className="flex items-center gap-2 text-sky-700">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-black uppercase tracking-widest" style={{ fontSize: 10 }}>Solution Explanation</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: 12 }}>
                      {safeText(selectedLanguage === "hindi" ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── NORMAL LAYOUT (no passage) ── */
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="max-w-3xl mx-auto">
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap mb-5" style={{ fontSize: 15, fontWeight: 500 }}>
                  {selectedLanguage === "hindi" ? safeText(currentQ.question_hindi || currentQ.question) : safeText(currentQ.question)}
                </p>

                {currentQ.imageUrl && toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith('http') && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 p-4 mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDirectImageUrl(safeText(currentQ.imageUrl))} alt="Question figure" className="max-h-[350px] object-contain mx-auto" />
                  </div>
                )}

                {renderOptions(
                  selectedLanguage === "hindi" && currentQ.options_hindi?.some((o: any) => o)
                    ? currentQ.options_hindi
                    : currentQ.options
                )}

                {isSubmitted && (selectedLanguage === "hindi" ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation) && (
                  <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 text-sky-700">
                      <BookOpen className="w-5 h-5" />
                      <h3 className="font-black uppercase tracking-[0.15em]" style={{ fontSize: 11 }}>Solution Explanation</h3>
                    </div>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap prose prose-slate max-w-none" style={{ fontSize: 13 }}>
                      {safeText(selectedLanguage === "hindi" ? (currentQ.explanation_hindi || currentQ.explanation) : currentQ.explanation)}
                    </div>
                    {currentQ.solutionImageUrl && toDirectImageUrl(safeText(currentQ.solutionImageUrl)).startsWith('http') && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-white p-3 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={toDirectImageUrl(safeText(currentQ.solutionImageUrl))} alt="Solution diagram" className="max-h-[400px] object-contain mx-auto" />
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom action row for non-passage */}
                {!isSubmitted && (
                  <div className="pt-6 mt-6 border-t border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setMarkedIndices(prev => new Set(prev).add(currentQIndex));
                          handleNextPrev(Math.min(totalQs - 1, currentQIndex + 1));
                        }}
                        className="px-4 py-1.5 bg-sky-100 text-sky-700 border border-sky-200 rounded text-xs font-black uppercase tracking-wider hover:bg-sky-200 transition-all"
                      >
                        Mark for Review &amp; Next
                      </button>
                      <button
                        onClick={() => setAnswers(prev => { const next = { ...prev }; delete next[currentQIndex]; return next; })}
                        className="px-4 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                      >
                        Clear Response
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSave}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded border font-bold flex items-center gap-1 text-xs ${
                          savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`)
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <BookmarkPlus className={`w-3.5 h-3.5 ${savedItemIds.includes(currentQ.id || `mock-${test.id}-${currentQIndex}`) ? "fill-primary" : ""}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT: Sidebar ────────────────────────────────── */}
        <aside className="w-72 bg-[#eef1f5] border-l border-slate-200 flex flex-col" style={{ boxShadow: "-2px 0 6px rgba(0,0,0,.04)" }}>

          {/* Section palette header — shows current section label */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200">
            <span style={{ color: "#1a6ea8", fontSize: 14 }}>▶</span>
            <span className="font-black text-slate-700" style={{ fontSize: 12 }}>{currentSection.label}</span>
          </div>

          {/* Question number grid — ONLY active section (Testbook style) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(() => {
              const { start, end } = partRanges[activePart];
              const partQs = questions.slice(start, end + 1);
              const sectionAnswered = Object.keys(answers).filter(k => Number(k) >= start && Number(k) <= end && !markedIndices.has(Number(k))).length;
              const sectionNotAnswered = (end - start + 1) - Object.keys(answers).filter(k => Number(k) >= start && Number(k) <= end).length;
              const sectionMarked = Array.from(markedIndices).filter(i => i >= start && i <= end).length;

              return (
                <>
                  <div className="p-2 grid grid-cols-5 gap-1.5">
                    {partQs.map((_, relIdx) => {
                      const absIdx = start + relIdx;
                      const isAnswered = !!answers[absIdx];
                      const isMarked = markedIndices.has(absIdx);
                      const isVisited = visitedIndices.has(absIdx);
                      const isCurrent = currentQIndex === absIdx;

                      // Testbook color scheme: blue=not visited, red=visited+unanswered, green=answered, purple=marked
                      let btnStyle: React.CSSProperties = { background: "#1a6ea8", color: "#fff", border: "none", borderRadius: 3 };
                      if (isMarked && isAnswered) {
                        btnStyle = { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 3 };
                      } else if (isMarked) {
                        btnStyle = { background: "#7c3aed", color: "#fff", border: "none", borderRadius: "50%" };
                      } else if (isAnswered) {
                        btnStyle = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 3 };
                      } else if (isVisited) {
                        btnStyle = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 3 };
                      }
                      if (isCurrent) btnStyle = { ...btnStyle, outline: "2px solid #38bdf8", outlineOffset: 1 };

                      return (
                        <button key={absIdx} onClick={() => handleNextPrev(absIdx)}
                          style={{ ...btnStyle, width: "100%", aspectRatio: "1", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .1s" }}
                        >{absIdx + 1}</button>
                      );
                    })}
                  </div>

                  {/* Section Analysis table (always shown for active section) */}
                  <div className="mx-2 mb-2 border border-slate-300 rounded overflow-hidden" style={{ fontSize: 11 }}>
                    <div className="bg-slate-200 px-2 py-1 font-black text-slate-700 uppercase tracking-wide" style={{ fontSize: 10 }}>
                      {SSC_SECTIONS[activePart].part} Analysis
                    </div>
                    {[
                      { label: "Answered", count: sectionAnswered, color: "#16a34a" },
                      { label: "Not Answered", count: sectionNotAnswered, color: "#e05c00" },
                      { label: "Mark for Review", count: sectionMarked, color: "#7c3aed" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-2 py-1 border-t border-slate-200 bg-white">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-black" style={{ color: item.color }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Sidebar footer tools */}
          <div className="p-2 gap-1 grid grid-cols-2 bg-white border-t border-slate-200">
            <button className="h-8 text-[10px] font-black uppercase bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-all">Question Paper</button>
            <button onClick={() => setIsStarted(false)} className="h-8 text-[10px] font-black uppercase bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-all">Instructions</button>
            <button onClick={handleSubmit} className="col-span-2 h-9 text-[10px] font-black uppercase bg-sky-500 text-white rounded hover:bg-sky-600 transition-all shadow-md mt-1">Submit Test</button>
          </div>
        </aside>
      </div>

      {/* ── SUBMIT MODAL ─────────────────────────────────────── */}
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
                disabled={isSavingAttempt}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:translate-y-0 disabled:opacity-70 disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {isSavingAttempt ? (
                  <>
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Saving Results...
                  </>
                ) : (
                  <>View Detailed Analysis <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
