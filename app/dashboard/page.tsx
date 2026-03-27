"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, Trophy, Target, BookMarked, X, BookOpen, Quote, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getUserTestAttempts, getSavedQuestions, getUserNotes, getDetailedPurchases, TestAttempt, SavedQuestion, Note, normalizeSubject } from "@/lib/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recentPurchase, setRecentPurchase] = useState<any>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<SavedQuestion | null>(null);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState("English");
  const [loading, setLoading] = useState(true);

  const categories = ["Maths", "English", "Reasoning", "GS", "Computer"];

  useEffect(() => {
    if (user) {
      Promise.all([
        getUserTestAttempts(user.uid),
        getSavedQuestions(user.uid),
        getUserNotes(user.uid),
        getDetailedPurchases(user.uid)
      ]).then(([fetchedAttempts, fetchedQuestions, fetchedNotes, fetchedPurchases]) => {
        setAttempts(fetchedAttempts);
        setSavedQuestions(fetchedQuestions);
        setNotes(fetchedNotes);
        if (fetchedPurchases && fetchedPurchases.length > 0) {
          setRecentPurchase(fetchedPurchases[0]);
          setPurchaseHistory(fetchedPurchases);
        }
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
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
          {recentPurchase && (
            <div className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm cursor-default">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">{recentPurchase.packageId || "Premium"}</span>
            </div>
          )}
          <Link href="/practice" className="inline-flex justify-center items-center rounded-lg bg-primary text-primary-foreground shadow-sm h-10 px-5 text-sm font-medium hover:bg-primary/90 transition-all">
            Resume Practice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} title="Avg. Score" value={avgScore} trend={testsAttempted > 0 ? "+Active" : ""} trendUp />
        <StatCard icon={<Target className="h-5 w-5 text-emerald-500" />} title="Accuracy" value={overallAccuracy} />
        <StatCard icon={<BookMarked className="h-5 w-5 text-blue-500" />} title="Saved Qs" value={savedQuestions.length.toString()} />
        <StatCard icon={<BarChart3 className="h-5 w-5 text-purple-500" />} title="Tests Attempted" value={testsAttempted.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center -mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Recent Notes
            </h2>
            <Link href="/notes" className="text-xs font-medium text-primary hover:underline px-3 py-1.5 rounded-full transition-colors hover:bg-primary/5">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {notes.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 bg-muted/20 p-8 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center space-y-3">
                 <div className="p-3 bg-card rounded-full shadow-sm border border-border/40">
                   <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                 </div>
                 <div>
                   <h3 className="text-sm font-semibold text-foreground">No notes added yet</h3>
                   <p className="text-xs text-muted-foreground mt-1">Start taking notes during your practice sessions.</p>
                 </div>
                 <Link href="/practice" className="mt-2 text-xs font-medium text-primary hover:underline underline-offset-4">Go to Practice</Link>
              </div>
            ) : (
              notes.slice(0, 4).map(note => (
                <Link key={note.id} href="/notes" className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm flex flex-col gap-3 group hover:border-border hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors pr-2 leading-tight">{note.title || "Untitled Note"}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-grow">{note.content.replace(/<[^>]*>?/gm, '') || "No content available."}</p>
                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{note.subject || "General"}</span>
                    <span className="text-[10px] text-muted-foreground/60">{note.lastModified.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Saved Questions</h2>
            <span className="text-xs font-bold bg-muted px-2 py-1 rounded-full text-muted-foreground">{savedQuestions.length} Total</span>
          </div>

          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden flex flex-col shadow-sm">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto bg-muted/20 border-b border-border/40 hide-scrollbar p-1.5 gap-1">
              {categories.map((cat) => {
                const count = savedQuestions.filter(sq => normalizeSubject(sq.subject) === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setShowAllSaved(false); }}
                    className={`flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeCategory === cat ? 'bg-background text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent'
                    }`}
                  >
                    {cat}
                    {count > 0 && <span className="ml-1.5 opacity-60 text-[10px]">({count})</span>}
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
                  <div key={sq.id} onClick={() => setSelectedQuestion(sq)} className="group cursor-pointer border-b border-border/40 pb-4 last:border-0 last:pb-0 hover:bg-muted/30 p-2.5 rounded-xl transition-all">
                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{sq.questionText}</h4>
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{sq.topic}</span>
                      <p className="text-[10px] text-muted-foreground/60">{sq.savedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
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

      <div className="space-y-4 pt-4 border-t border-border/40">
        <h2 className="text-lg font-semibold">Purchase History</h2>
        {purchaseHistory.length === 0 ? (
          <div className="bg-muted/20 p-8 rounded-2xl border border-dashed border-border/60 text-center">
            <p className="text-sm text-muted-foreground">No purchases found on this account.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Package Content</th>
                  <th className="px-5 py-3">Order ID / Ref</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {purchaseHistory.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : p.date || "Unknown"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
                      {p.packageId}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground/70 whitespace-nowrap">
                      {p.orderId || "N/A"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap text-emerald-600">
                      ₹{p.amount || 499}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col justify-between h-32 lg:h-36 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-muted/40 rounded-xl text-muted-foreground">{icon}</div>
      </div>
      <div className="flex items-baseline gap-3 mt-4">
        <h3 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{value}</h3>
        {trend && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 dark:bg-red-500/10'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
