import { Clock, CheckCircle2, FileText, PlayCircle } from "lucide-react";

export interface TestCardProps {
  title: string;
  duration: string;
  questions: number | string;
  marks: number | string;
  status: "Available" | "Completed" | "Locked";
  isFree?: boolean;
  score?: string;
  packagePrice?: number;
  packageName?: string;
  onStart?: () => void;
  onAnalysis?: () => void;
}

export function TestCard({ title, duration, questions, marks, status, isFree, score, packagePrice, packageName, onStart, onAnalysis }: TestCardProps) {
  const isCompleted = status === "Completed";
  const isLocked = status === "Locked";
  const isAvailable = status === "Available";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all duration-300 gap-4">
      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          {isFree && <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary/20 text-secondary-foreground dark:bg-secondary/40 px-2 py-0.5 rounded-full">Free</span>}
          {isLocked && <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-full">Pro</span>}
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {duration}</div>
          <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {questions} Qs</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {marks} Marks</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-2 sm:mt-0">
        {isCompleted && score && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="font-bold text-secondary">{score}</p>
          </div>
        )}
        <button 
          disabled={isLocked && !packagePrice}
          onClick={isCompleted ? onAnalysis : onStart}
          className={`flex items-center justify-center gap-2 h-10 px-6 rounded-lg font-medium text-sm transition-all duration-300 flex-shrink-0 ${
            isAvailable 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow shadow-primary/20 hover:scale-105' 
              : isCompleted 
                ? 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5'
          }`}
        >
          {isAvailable && <><PlayCircle className="w-4 h-4" /> Start Test</>}
          {isCompleted && "View Analysis"}
          {isLocked && <>{packagePrice ? `Unlock ${packageName?.split(" ")[0]} Package (₹${packagePrice})` : "Locked"}</>}
        </button>
      </div>
    </div>
  );
}
