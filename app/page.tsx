import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, FileSignature, LineChart, PenTool } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-muted/50 to-primary/5">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            SarkariStaar – Your Path to <span className="text-primary block mt-2">Government Jobs</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground">
            Practice smarter with mock tests, notes, and performance analytics.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link 
              href="/practice" 
              className="inline-flex items-center justify-center gap-2 rounded-xl text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-xl shadow-primary/20 h-14 px-8"
            >  Start Learning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/practice" className="inline-flex items-center justify-center rounded-lg text-base font-semibold transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-12 px-8 w-full sm:w-auto border border-border">
              Explore Practice Questions
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-24">
          <FeatureCard 
            icon={<BookOpen className="h-8 w-8 text-primary" />}
            title="Mock Test Series"
            description="Simulate the real exam environment with our full-length SSC CGL mock tests."
          />
          <FeatureCard 
            icon={<BrainCircuit className="h-8 w-8 text-primary" />}
            title="Topic-wise Practice"
            description="Focus on Quant, Reasoning, English, or GA with targeted question banks."
          />
          <FeatureCard 
            icon={<LineChart className="h-8 w-8 text-primary" />}
            title="Performance Dashboard"
            description="Track your progress with detailed analytics and pinpoint your weak areas."
          />
          <FeatureCard 
            icon={<PenTool className="h-8 w-8 text-primary" />}
            title="Custom Notes"
            description="Save important formulas, vocabulary, and shortcuts directly on the platform."
          />
          <FeatureCard 
            icon={<FileSignature className="h-8 w-8 text-primary" />}
            title="Previous Year Papers"
            description="Practice with authentic previous year questions to understand the exam pattern."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex-col items-start p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="mb-4 bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-card-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
