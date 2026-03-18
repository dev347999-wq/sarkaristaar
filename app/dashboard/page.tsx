"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, Trophy, Target, BookMarked, X, BookOpen, Quote } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getUserTestAttempts, getSavedQuestions, TestAttempt, SavedQuestion, normalizeSubject } from "@/lib/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<SavedQuestion | null>(null);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState("English");
  const [loading, setLoading] = useState(true);

  const categories = ["Maths", "English", "Reasoning", "GS", "Computer"];

  useEffect(() => {
    if (user) {
      Promise.all([
        getUserTestAttempts(user.uid),
        getSavedQuestions(user.uid)
      ]).then(([fetchedAttempts, fetchedQuestions]) => {
        setAttempts(fetchedAttempts);
        setSavedQuestions(fetchedQuestions);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  // Derived Stats
  const testsAttempted = attempts.length;
  
  const avgScore = testsAttempted > 0 
    ? (attempts.reduce((acc, curr) => acc + curr.score, 0) / testsAttempted).toFixed(1)
    : "0";
    
  const overallAccuracy = testsAttempted > 0
    ? (attempts.reduce((acc, curr) => acc + curr.accuracy, 0) / testsAttempted).toFixed(0) + "%"
    : "0%";

  const filteredSaved = savedQuestions.filter(sq => normalizeSubject(sq.subject) === activeCategory);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.displayName || "Student"}! Here is your performance overview.</p>
        </div>
        <Link href="/practice" className="inline-flex justify-center items-center rounded-md bg-primary text-primary-foreground h-10 px-4 font-medium hover:bg-primary/90 transition-colors">
          Resume Practice
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Trophy className="h-6 w-6 text-yellow-500" />} title="Avg. Score" value={avgScore} trend={testsAttempted > 0 ? "+Active" : ""} trendUp />
        <StatCard icon={<Target className="h-6 w-6 text-emerald-500" />} title="Accuracy" value={overallAccuracy} />
        <StatCard icon={<BookMarked className="h-6 w-6 text-blue-500" />} title="Saved Qs" value={savedQuestions.length.toString()} />
        <StatCard icon={<BarChart3 className="h-6 w-6 text-purple-500" />} title="Tests Attempted" value={testsAttempted.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold">Subject Wise Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SubjectCard name="Quantitative Aptitude" score="38/50" color="bg-blue-500" />
            <SubjectCard name="Reasoning" score="45/50" color="bg-emerald-500" />
            <SubjectCard name="English" score="40/50" color="bg-purple-500" />
            <SubjectCard name="General Awareness" score="20/50" color="bg-amber-500" />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Saved Questions</h2>
            <span className="text-xs font-bold bg-muted px-2 py-1 rounded-full text-muted-foreground">{savedQuestions.length} Total</span>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col shadow-sm">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto bg-muted/30 border-b border-border hide-scrollbar">
              {categories.map((cat) => {
                const count = savedQuestions.filter(sq => normalizeSubject(sq.subject) === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setShowAllSaved(false); }}
                    className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                      activeCategory === cat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat}
                    {count > 0 && <span className="ml-1.5 opacity-50">({count})</span>}
                    {activeCategory === cat && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full mx-4" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {filteredSaved.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <BookMarked className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground font-medium">No saved questions in {activeCategory} yet.</p>
                </div>
              ) : (
                (showAllSaved ? filteredSaved : filteredSaved.slice(0, 5)).map(sq => (
                  <div key={sq.id} onClick={() => setSelectedQuestion(sq)} className="group cursor-pointer border-b border-border/50 pb-4 last:border-0 last:pb-0 hover:bg-muted/5 p-2 rounded-xl transition-all">
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{sq.questionText}</h4>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] uppercase font-black tracking-[0.15em] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200">{sq.topic}</span>
                      <p className="text-[10px] font-bold text-muted-foreground/60">{sq.savedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))
              )}
              {filteredSaved.length > 5 && (
                <button onClick={() => setShowAllSaved(!showAllSaved)} className="text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 py-3 rounded-xl block text-center w-full transition-all border border-dashed border-primary/20">
                  {showAllSaved ? "Show less" : `View all ${filteredSaved.length} questions`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{selectedQuestion.topic}</span>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <h2 className="text-3xl font-black text-foreground mb-4">{selectedQuestion.questionText}</h2>
              
              {selectedQuestion.imageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedQuestion.imageUrl} alt="Question figure" className="w-full max-h-[250px] object-contain bg-white p-4" />
                </div>
              )}
              
              <div className="bg-orange-50/50 rounded-2xl p-6 mb-6 border-2 border-orange-100 relative overflow-hidden">
                <Quote className="absolute -top-2 -right-2 w-16 h-16 text-orange-500/10 -rotate-12" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-3">Meaning / Answer</h4>
                <p className="text-xl font-bold text-slate-800 relative z-10 leading-relaxed">
                  {selectedQuestion.correctAnswer}
                </p>
              </div>

              {selectedQuestion.userNotes && (
                <div className="mb-6 flex items-start gap-4 bg-slate-50 p-5 rounded-2xl text-sm border-2 border-slate-100 shadow-sm">
                   <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                     <BookOpen className="w-4 h-4 text-primary" />
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context / Root</p>
                     <p className="text-slate-700 font-bold leading-relaxed">{selectedQuestion.userNotes}</p>
                   </div>
                </div>
              )}

              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Synonyms / Options</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedQuestion.options.map((opt, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 text-sm font-black px-4 py-2 rounded-xl border-2 border-emerald-100 shadow-sm hover:bg-emerald-100 transition-colors">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-end">
              <button onClick={() => setSelectedQuestion(null)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, trend, trendUp }: { icon: React.ReactNode, title: string, value: string, trend?: string, trendUp?: boolean }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-muted rounded-md">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold">{value}</h3>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function SubjectCard({ name, score, color }: { name: string, score: string, color: string }) {
  const [earned, total] = score.split('/').map(Number);
  const percentage = (earned / total) * 100;
  
  return (
    <div className="bg-card p-5 rounded-xl border border-border flex flex-col gap-3">
      <div className="flex justify-between font-medium text-sm">
        <span>{name}</span>
        <span className="text-muted-foreground">{score}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function NoteItem({ title, date }: { title: string, date: string }) {
  return (
    <div className="group cursor-pointer">
      <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{date}</p>
    </div>
  );
}
