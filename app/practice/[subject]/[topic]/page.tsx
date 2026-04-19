"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, CheckCircle, BrainCircuit, BookOpen, Flag, Bookmark } from "lucide-react";
import { QuestionCard } from "@/components/question-card";
import { useAuth } from "@/context/AuthContext";
import { saveQuestion, deleteSavedQuestion, saveTestAttempt, getPracticeQuestions, normalizeSubject, getSavedQuestions } from "@/lib/database";
import { safeText, toDirectFileUrl as toDirectImageUrl } from "@/lib/utils";

export default function TopicPracticePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const subjectSlug = params.subject as string;
  const topicSlug = params.topic as string;
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const topicName = topicSlug ? decodeURIComponent(topicSlug).replace(/-/g, " ") : "Topic";
  const subjectName = subjectSlug ? decodeURIComponent(subjectSlug).replace(/-/g, " ") : "Subject";

  useEffect(() => {
    const fetchQuestions = async () => {
      if (topicSlug && subjectSlug) {
        setLoading(true);
        try {
          const [fetchedData, savedQuestions] = await Promise.all([
            getPracticeQuestions(subjectSlug, topicSlug),
            user ? getSavedQuestions(user.uid) : Promise.resolve([])
          ]);
          
          const savedIds = new Set(savedQuestions.map(q => q.questionId));
          const questionsWithSaved = (fetchedData || []).map((q: any) => ({
            ...q,
            saved: savedIds.has(q.id)
          }));

          setQuestions(questionsWithSaved);
        } catch(e) {
          console.error("Error fetching practice questions", e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuestions();
  }, [topicSlug, subjectSlug]);

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    setShowAnswer(true);
    
    if (index === questions[currentIndex].correctOption) {
      setScore(prev => prev + 1);
    }
  };

  const handleSaveQuestion = async () => {
    const currentQ = questions[currentIndex];
    const newSavedState = !currentQ.saved;

    setQuestions(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], saved: newSavedState };
      return updated;
    });

    if (user) {
      try {
        const questionId = currentQ.id || `practice-${subjectSlug}-${topicSlug}-${currentIndex}`;
        if (newSavedState) {
          await saveQuestion(user.uid, {
            questionId,
            subject: normalizeSubject(subjectName),
            topic: topicName,
            questionText: currentQ.question,
            options: currentQ.options,
            correctAnswer: currentQ.options[currentQ.correctOption],
            imageUrl: currentQ.imageUrl,
          });
        } else {
          await deleteSavedQuestion(user.uid, questionId);
        }
      } catch (error) {
      }
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    } else {
      setIsFinished(true);
      
      const finalScore = selectedOption === questions[currentIndex].correctOption ? score + 1 : score;
      
      if (user) {
        try {
          await saveTestAttempt(user.uid, {
            testId: `practice-${subjectSlug}-${topicSlug}-${Date.now()}`,
            testTitle: `${topicName} Practice`,
            category: subjectName,
            score: finalScore,
            totalMarks: questions.length,
            accuracy: (finalScore / questions.length) * 100,
            timeSpentStr: "Practice Session",
            answers: {}
          });
        } catch (error) {
        }
      }
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
    setIsFinished(false);
  };

  if (loading) return <div className="p-20 text-center flex flex-col items-center justify-center animate-pulse"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" /> Loading practice questions...</div>;
  
  if (questions.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <BrainCircuit className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-30" />
      <h2 className="text-2xl font-bold mb-2">No Questions Available Yet</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        The admin hasn't uploaded any practice questions for <b className="text-foreground">{topicName}</b> just yet. Please check back later!
      </p>
      <button onClick={() => router.push('/practice')} className="inline-flex items-center text-primary font-semibold hover:underline">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Practice
      </button>
    </div>
  );

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 animate-in zoom-in-95 duration-500">
        <button onClick={() => router.push('/practice')} className="mb-8 flex items-center text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Practice
        </button>
        
        <div className="text-center space-y-8 bg-card border-2 border-border p-10 rounded-3xl shadow-xl">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 text-primary mb-2">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-extrabold capitalize text-foreground">Practice Completed!</h2>
          <p className="text-xl text-muted-foreground capitalize">Topic: {topicName}</p>
          
          <div className="p-8 rounded-2xl bg-muted/50 inline-block mt-4 border border-border">
            <p className="text-lg font-medium mb-1">Your Score</p>
            <p className="text-5xl font-black text-primary">{score} <span className="text-2xl text-muted-foreground">/ {questions.length}</span></p>
          </div>
          
          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleRetry} className="h-12 px-8 bg-secondary text-secondary-foreground rounded-xl font-bold shadow-sm hover:bg-secondary/90 transition-all flex items-center justify-center">
              <RefreshCw className="w-5 h-5 mr-2" /> Practice Again
            </button>
            <button onClick={() => router.push('/practice')} className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all">
              Choose Another Topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  // Detect if question has a comprehension passage
  const passageText: string = safeText(currentQ.passage || currentQ.comprehension || currentQ.passage_text || "");
  const hasPassage = passageText.trim().length > 0;

  // Options to render (fall back gracefully)
  const optionList: string[] = currentQ.options || [];
  const correctOptIdx: number = currentQ.correctOption ?? 0;

  // Find the group of questions that share the same passage (for Que range label)
  const passageGroupStart = (() => {
    if (!hasPassage) return currentIndex;
    let i = currentIndex;
    while (i > 0 && safeText(questions[i - 1]?.passage || questions[i - 1]?.comprehension || "") === passageText) i--;
    return i;
  })();
  const passageGroupEnd = (() => {
    if (!hasPassage) return currentIndex;
    let i = currentIndex;
    while (i < questions.length - 1 && safeText(questions[i + 1]?.passage || questions[i + 1]?.comprehension || "") === passageText) i++;
    return i;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back + header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/practice')} className="flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold capitalize flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> {topicName}
          </h1>
          <span className="text-xs text-muted-foreground capitalize">({subjectName})</span>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Progress</p>
            <p className="font-bold text-base">{currentIndex + 1} / {questions.length}</p>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Score</p>
            <p className="font-bold text-base text-primary">{score}</p>
          </div>
        </div>
      </div>

      {hasPassage ? (
        /* ════════════════════════════════════════════════════
           COMPREHENSION SPLIT-PANEL LAYOUT  (like mock test)
           ════════════════════════════════════════════════════ */
        <div className="flex flex-col" style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>
          {/* Question No. + meta strip */}
          <div
            className="flex items-center justify-between px-4 py-2 border border-slate-300 rounded-t bg-white"
            style={{ borderBottom: "none" }}
          >
            <span className="font-bold text-slate-800">Question No. {currentIndex + 1}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveQuestion}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded border transition-colors ${
                  currentQ.saved
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${currentQ.saved ? "fill-primary" : ""}`} />
                {currentQ.saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* Two-panel body */}
          <div
            className="flex border border-slate-300 rounded-b bg-white"
            style={{ minHeight: 480 }}
          >
            {/* LEFT: Passage */}
            <div
              className="overflow-y-auto p-5"
              style={{
                width: "45%",
                borderRight: "4px solid #b0c4d8",
                background: "#fafafa",
              }}
            >
              {/* Comprehension label */}
              <div className="mb-3">
                <span className="font-bold text-slate-700 underline" style={{ fontSize: 13 }}>
                  Comprehension:
                </span>
                <span className="ml-2 text-slate-500" style={{ fontSize: 12 }}>
                  (Que No. {passageGroupStart + 1} - {passageGroupEnd + 1})
                </span>
              </div>

              <p className="font-bold text-slate-800 mb-3" style={{ fontSize: 13 }}>
                Read the comprehension and answer below:
              </p>

              <div
                className="text-slate-800 leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: 13 }}
              >
                {passageText}
              </div>

              {/* Passage image */}
              {currentQ.passageImageUrl &&
                toDirectImageUrl(safeText(currentQ.passageImageUrl)).startsWith("http") && (
                  <div className="mt-4 rounded overflow-hidden border border-slate-200 bg-white p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toDirectImageUrl(safeText(currentQ.passageImageUrl))}
                      alt="Passage figure"
                      className="max-h-[280px] object-contain mx-auto"
                    />
                  </div>
                )}
            </div>

            {/* RIGHT: Question + Options */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col">
              {/* Select Language selector (display only, practice is English-only) */}
              <div className="flex items-center justify-end mb-3 gap-3">
                <span className="text-xs text-slate-500 font-semibold">Select Language</span>
                <span
                  className="border border-slate-300 rounded px-2 py-0.5 bg-white text-slate-700 font-bold"
                  style={{ fontSize: 11 }}
                >
                  English
                </span>
                <button className="flex items-center gap-1 text-slate-400 hover:text-rose-500 text-xs font-semibold">
                  <Flag className="w-3 h-3" /> Report
                </button>
              </div>

              {/* Question */}
              <p className="font-bold text-slate-800 underline mb-2" style={{ fontSize: 13 }}>
                Question:
              </p>
              <p
                className="text-slate-800 leading-snug whitespace-pre-wrap mb-4"
                style={{ fontSize: 13 }}
              >
                {safeText(currentQ.question)}
              </p>

              {/* Question image */}
              {currentQ.imageUrl &&
                toDirectImageUrl(safeText(currentQ.imageUrl)).startsWith("http") && (
                  <div className="rounded overflow-hidden border border-slate-100 shadow-sm bg-slate-50 p-2 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toDirectImageUrl(safeText(currentQ.imageUrl))}
                      alt="Question figure"
                      className="max-h-[200px] object-contain mx-auto"
                    />
                  </div>
                )}

              {/* Options */}
              <div className="space-y-2 flex-1">
                {optionList.map((option, i) => {
                  const isSelected = selectedOption === i;
                  const isCorrect = showAnswer && i === correctOptIdx;
                  const isWrong = showAnswer && isSelected && i !== correctOptIdx;

                  let borderCls = "border-slate-200 hover:border-slate-400 hover:bg-slate-50";
                  let radioCls = "border-slate-400";
                  let textCls = "text-slate-700";

                  if (showAnswer) {
                    if (isCorrect) {
                      borderCls = "border-emerald-500 bg-emerald-50";
                      radioCls = "border-emerald-500 bg-emerald-500";
                      textCls = "text-emerald-900 font-medium";
                    } else if (isWrong) {
                      borderCls = "border-red-400 bg-red-50";
                      radioCls = "border-red-400 bg-red-400";
                      textCls = "text-red-800 font-medium";
                    } else {
                      borderCls = "border-slate-100 opacity-60";
                    }
                  } else if (isSelected) {
                    borderCls = "border-[#5b9bd5] bg-[#e8f4fb]";
                    radioCls = "border-[#5b9bd5] bg-[#5b9bd5]";
                    textCls = "text-[#1a4571] font-medium";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !showAnswer && handleSelectOption(i)}
                      disabled={showAnswer}
                      className={`w-full flex items-start p-3 rounded border transition-all text-left ${borderCls}`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 mr-3 transition-all ${radioCls}`}
                      />
                      <span className={`text-sm leading-snug ${textCls}`}>
                        {safeText(option)}
                      </span>
                      {showAnswer && isCorrect && (
                        <span className="ml-auto text-emerald-600 text-xs font-black pl-2">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after answer revealed) */}
              {showAnswer && currentQ.explanation && (
                <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="flex items-center gap-2 text-sky-700">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">
                      Explanation
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                    {safeText(currentQ.explanation)}
                  </p>
                </div>
              )}

              {/* Next button */}
              {showAnswer && (
                <div className="mt-4 flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={handleNext}
                    className="h-10 px-6 bg-primary text-primary-foreground rounded-lg font-bold shadow hover:shadow-md hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                  >
                    {currentIndex < questions.length - 1 ? "Next Question" : "Finish Practice"}
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════
           NORMAL LAYOUT  (no passage)
           ════════════════════════════════════════════════════ */
        <div className="space-y-6">
          <QuestionCard
            number={currentIndex + 1}
            question={currentQ.question}
            options={currentQ.options}
            selectedOption={selectedOption}
            onSelectOption={handleSelectOption}
            showAnswer={showAnswer}
            isCorrect={selectedOption === currentQ.correctOption}
            correctOption={currentQ.correctOption}
            explanation={currentQ.explanation}
            isSaved={currentQ.saved}
            onSave={handleSaveQuestion}
            imageUrl={currentQ.imageUrl}
          />

          {showAnswer && (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={handleNext}
                className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-lg flex items-center gap-2"
              >
                {currentIndex < questions.length - 1 ? "Next Question" : "Finish Practice"}
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
