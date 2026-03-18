import Link from "next/link";
import { BookOpen, Calculator, Brain, Globe2, Sparkles, Cpu } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Topic-wise Practice</h1>
        <p className="text-muted-foreground mt-2">Master individual subjects before taking full mock tests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SubjectCard 
          icon={<Calculator className="h-8 w-8 text-blue-500" />}
          title="Quantitative Aptitude"
          description="Number systems, algebra, geometry, mensuration, trigonometry, and statistics."
          topics={[
            "Number System", "Simplification", "Percentage", "Ratio and Proportion", 
            "Average", "Profit and Loss", "Simple Interest", "Compound Interest", 
            "Time and Work", "Pipes and Cistern", "Time Speed Distance", "Algebra", 
            "Geometry", "Mensuration", "Trigonometry", "Statistics"
          ]}
          color="border-blue-500/20 hover:border-blue-500/50"
        />
        <SubjectCard 
          icon={<Brain className="h-8 w-8 text-emerald-500" />}
          title="General Intelligence & Reasoning"
          description="Analogies, classification, series, coding-decoding, and non-verbal reasoning."
          topics={["Analogy", "Syllogism", "Blood Relations", "Coding-Decoding", "Number Series"]}
          color="border-emerald-500/20 hover:border-emerald-500/50"
        />
        <SubjectCard 
          icon={<BookOpen className="h-8 w-8 text-purple-500" />}
          title="English Comprehension"
          description="Vocabulary, grammar, sentence structure, synonyms, antonyms, and reading comprehension."
          topics={["Error Spotting", "Fill in the Blanks", "Synonyms/Antonyms", "Idioms & Phrases", "Comprehension"]}
          color="border-purple-500/20 hover:border-purple-500/50"
        />
        <SubjectCard 
          icon={<Globe2 className="h-8 w-8 text-amber-500" />}
          title="General Awareness"
          description="History, culture, geography, economy, general policy, and scientific research."
          topics={["Current Affairs", "History", "Polity", "Geography", "Science & Tech"]}
          color="border-amber-500/20 hover:border-amber-500/50"
        />
        <SubjectCard 
          icon={<Cpu className="h-8 w-8 text-indigo-500" />}
          title="Computer Knowledge"
          description="Basic computer organization, memory, software, Windows, Internet, and MS Office."
          topics={["Computer Basics", "MS Office", "Internet & Emails", "Networking", "Cyber Security"]}
          color="border-indigo-500/20 hover:border-indigo-500/50"
        />
      </div>
      
      <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex flex-col items-center text-center">
        <Sparkles className="h-10 w-10 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Ready for a challenge?</h3>
        <p className="text-muted-foreground mb-6 max-w-lg">Mix all topics and practice in a time-bound environment to test your speed and accuracy.</p>
        <Link href="/mock-tests" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Take a Mock Test
        </Link>
      </div>
    </div>
  );
}

function SubjectCard({ icon, title, description, topics, color }: { icon: React.ReactNode, title: string, description: string, topics: string[], color: string }) {
  return (
    <div className={`flex flex-col p-6 rounded-2xl border bg-card transition-all duration-300 hover:shadow-md ${color}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-muted rounded-xl">
          {icon}
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-6 flex-1">{description}</p>
      
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Popular Topics:</h4>
        <div className="flex flex-wrap gap-2">
          {topics.map(topic => (
            <Link 
              href={`/practice/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              key={topic} 
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground bg-muted/50 cursor-pointer hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
            >
              {topic}
            </Link>
          ))}
        </div>
      </div>
      
      <Link 
        href={`/practice/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${topics[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        className="mt-8 flex justify-center items-center w-full border border-border hover:bg-muted py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Start Practice
      </Link>
    </div>
  );
}
