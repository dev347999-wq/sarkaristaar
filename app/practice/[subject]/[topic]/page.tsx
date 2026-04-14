"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, CheckCircle, BrainCircuit } from "lucide-react";
import { QuestionCard } from "@/components/question-card";
import { useAuth } from "@/context/AuthContext";
import { saveQuestion, deleteSavedQuestion, saveTestAttempt, getPracticeQuestions, normalizeSubject, getSavedQuestions } from "@/lib/database";
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
        console.error("Failed to sync saved question to Firestore:", error);
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
      
      // Calculate final score since React state might be one tick behind here
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
            answers: {} // Practice mode doesn't need to store granular answers yet
          });
        } catch (error) {
          console.error("Failed to save attempt to Firestore:", error);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => router.push('/practice')} className="mb-8 flex items-center text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Practice
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> {topicName}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize text-sm">{subjectName}</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-card border border-border px-4 py-2 rounded-lg text-center shadow-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Progress</p>
            <p className="font-bold text-lg">{currentIndex + 1} / {questions.length}</p>
          </div>
          <div className="bg-card border border-border px-4 py-2 rounded-lg text-center shadow-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Score</p>
            <p className="font-bold text-lg text-primary">{score}</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
