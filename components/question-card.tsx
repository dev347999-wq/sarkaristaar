import { Bookmark, Clock, CheckCircle } from "lucide-react";

export interface QuestionCardProps {
  number: number;
  question: string;
  options: string[];
  selectedOption?: number | null;
  onSelectOption?: (index: number) => void;
  isCorrect?: boolean;
  showAnswer?: boolean;
  correctOption?: number;
  explanation?: string;
  timeSpent?: string;
  isSaved?: boolean;
  onSave?: () => void;
  imageUrl?: string;
}

export function QuestionCard({ 
  number, 
  question, 
  options, 
  selectedOption, 
  onSelectOption,
  isCorrect,
  showAnswer,
  correctOption,
  explanation,
  timeSpent,
  isSaved,
  onSave,
  imageUrl
}: QuestionCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-start mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {number}
          </span>
          <h3 className="font-semibold text-lg text-foreground leading-relaxed">{question}</h3>
        </div>
        <button 
          onClick={onSave}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${isSaved ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
          aria-label="Save Question"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
      
      {imageUrl && (
        <div className="mb-6 rounded-lg overflow-hidden border border-border">
          {/* Using a regular img tag to avoid Next.js domain config requirements for dynamically generated user content */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Question figure" className="w-full max-h-[300px] object-contain bg-muted/30" />
        </div>
      )}

      <div className="space-y-3 mb-6">
        {options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isActuallyCorrect = showAnswer && correctOption === index;
          const isWrongSelection = showAnswer && isSelected && correctOption !== index;
          
          let styling = "border-border hover:border-primary/50 hover:bg-primary/5";
          
          if (showAnswer) {
            if (isActuallyCorrect) styling = "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold shadow-sm shadow-emerald-500/10";
            else if (isWrongSelection) styling = "border-destructive bg-destructive/10 text-destructive dark:text-rose-400 font-bold opacity-100";
            else styling = "border-border opacity-50";
          } else if (isSelected) {
            styling = "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/20";
          }

          return (
            <button
              key={index}
              onClick={() => !showAnswer && onSelectOption?.(index)}
              disabled={showAnswer}
              className={`w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 shadow-sm ${styling}`}
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 mr-4 shrink-0 text-xs font-black
                ${isSelected && !showAnswer ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-400"}
                ${isActuallyCorrect ? "border-emerald-500 bg-emerald-500 text-white" : ""}
                ${isWrongSelection ? "border-destructive bg-destructive text-white" : ""}
              `}>
                {String.fromCharCode(65 + index)}
              </div>
              <span className="text-sm md:text-base">{option}</span>
              
              {showAnswer && isActuallyCorrect && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 ml-auto" />}
            </button>
          );
        })}
      </div>

      {showAnswer && explanation && (
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50 text-sm">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className={isCorrect ? "text-secondary" : "text-destructive"}>
              {isCorrect ? "Correct!" : "Incorrect."}
            </span>
            Explanation
          </h4>
          <p className="text-muted-foreground leading-relaxed">{explanation}</p>
        </div>
      )}

      {timeSpent && (
        <div className="mt-4 flex items-center justify-end text-xs text-muted-foreground font-medium">
          <Clock className="w-3.5 h-3.5 mr-1" />
          Time spent: {timeSpent}
        </div>
      )}
    </div>
  );
}
