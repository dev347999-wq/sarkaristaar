"use client";

import { useState } from "react";
import { 
  Globe2, BookOpen, Clock, Calendar, Bookmark, 
  Map, Scale, Microscope, Search, TrendingUp, AlertCircle 
} from "lucide-react";
import Link from "next/link";

export default function CurrentAffairsPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "gs">("daily");

  const gsTopics = [
    { title: "Indian History", icon: <BookOpen className="w-6 h-6" />, color: "text-amber-500", bg: "bg-amber-500/10", count: "14 Topics", desc: "Ancient, Medieval & Modern India" },
    { title: "Geography", icon: <Map className="w-6 h-6" />, color: "text-emerald-500", bg: "bg-emerald-500/10", count: "12 Topics", desc: "World Geography & Indian Geography" },
    { title: "Indian Polity", icon: <Scale className="w-6 h-6" />, color: "text-blue-500", bg: "bg-blue-500/10", count: "18 Topics", desc: "Constitution, Governance & Rights" },
    { title: "General Science", icon: <Microscope className="w-6 h-6" />, color: "text-purple-500", bg: "bg-purple-500/10", count: "21 Topics", desc: "Physics, Chemistry & Biology" },
    { title: "Economics", icon: <TrendingUp className="w-6 h-6" />, color: "text-rose-500", bg: "bg-rose-500/10", count: "10 Topics", desc: "Indian Economy, Banking & Finance" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0,100 C20,0 50,100 100,0 L100,100 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground backdrop-blur-sm mb-6 border border-primary-foreground/20 text-sm font-medium tracking-wide">
              <Globe2 className="w-4 h-4" /> Comprehensive Coverage
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Current Affairs & General Studies
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mb-8 leading-relaxed">
              Stay updated with daily national and international events, and master General Studies topics with our structured, exam-oriented study material for SSC & RRB.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-20">
        
        {/* Toggle Tabs */}
        <div className="flex bg-card p-1 rounded-xl shadow-lg shadow-black/5 border border-border w-fit mb-12 mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
              activeTab === "daily" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="w-4 h-4" /> Daily Current Affairs
          </button>
          <button
            onClick={() => setActiveTab("gs")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
              activeTab === "gs" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="w-4 h-4" /> General Studies (GS)
          </button>
        </div>

        {activeTab === "daily" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
              <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" /> Today's Highlights
              </h2>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search current affairs..." 
                  className="w-full md:w-64 pl-9 pr-4 py-2 text-sm bg-muted border-transparent rounded-lg focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Empty State placeholder since backend data isn't provided yet */}
                <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Globe2 className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Updates Available</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Check back soon. Daily current affairs and major headlines will appear here once published by the editor.
                  </p>
                  <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors">
                     Notify Me
                  </button>
                </div>

              </div>
              
              <div className="space-y-6">
                {/* Sidebar Widget */}
                <div className="bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 mb-4 text-primary">
                    <Bookmark className="w-5 h-5" /> Saved Articles
                  </h3>
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Log in to save important news articles for quick revision before exams.</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-amber-500" /> Exam Updates
                  </h3>
                  <ul className="space-y-4 text-sm">
                     <li className="flex gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                       <div className="text-muted-foreground"><span className="font-semibold text-foreground">SSC CGL 2024</span> notification expected next month.</div>
                     </li>
                     <li className="flex gap-3">
                       <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                       <div className="text-muted-foreground"><span className="font-semibold text-foreground">RRB NTPC</span> exam dates revised for CBT 2.</div>
                     </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "gs" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h2 className="text-2xl font-bold font-heading mb-2 text-foreground">Subject-wise General Studies</h2>
              <p className="text-muted-foreground">Select a subject to dive into chapter-wise static GK and concepts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gsTopics.map((topic, i) => (
                <div key={i} className="group bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${topic.bg} ${topic.color} group-hover:scale-110 transition-transform duration-300`}>
                    {topic.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 flex-1">{topic.desc}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {topic.count}
                    </span>
                    <span className="text-sm font-semibold text-primary group-hover:underline">
                      View Chapters &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
