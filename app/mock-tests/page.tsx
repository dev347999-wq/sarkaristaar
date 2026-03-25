"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TestCard } from "@/components/test-card";
import { useAuth } from "@/context/AuthContext";
import { getUserTestAttempts, getUploadedTestsMetadata, getUserPurchases, TestAttempt } from "@/lib/firestore";
import { RazorpayCheckoutButton } from "@/components/payments/razorpay-checkout";

// Generator for mock tests
const generateTests = (prefixKey: string, count: number, config: any, userAttempts: Record<string, TestAttempt>, uploadedTestsMetadata: Map<string, {isLocked: boolean, paperName?: string}>, isCategoryUnlocked: boolean) => {
  const prefixMap: Record<string, string> = {
    "SSC CGL Tier 1": "SSC CGL Pre",
    "SSC CGL Tier 2": "SSC CGL Mains",
    "SSC Previous 2025": "SSC 2025 PYP",
    "SSC Previous 2024": "SSC 2024 PYP",
    "SSC Previous 2023": "SSC 2023 PYP",
    "RRB NTPC CBT 1": "RRB NTPC CBT 1",
    "RRB NTPC CBT 2": "RRB NTPC CBT 2",
    "RRB Previous 2025": "RRB 2025 PYP",
    "RRB Previous 2024": "RRB 2024 PYP",
    "RRB Previous 2023": "RRB 2023 PYP",
    "Agniveer Army GD": "Agniveer GD",
    "Agniveer Army Clerk": "Agniveer Clerk",
  };
  
  const displayPrefix = prefixMap[prefixKey] || prefixKey;

  return Array.from({ length: count }, (_, i) => {
    const testId = `${prefixKey}-Mock-${i + 1}`;
    const testMeta = uploadedTestsMetadata.get(testId);
    const isUploaded = !!testMeta;
    const title = testMeta?.paperName || `${prefixMap[prefixKey] || prefixKey} Full Mock - ${String(i + 1).padStart(2, '0')}`;
    const attempt = userAttempts[testId];
    
    // First 3 tests are free.
    const isFree = i < 3;
    let status: "Available" | "Completed" | "Locked" | "Live Soon";
    let score = undefined;
    
    if (attempt) {
      status = "Completed";
      score = `${attempt.score}/${attempt.totalMarks}`;
    } else if (isFree || isCategoryUnlocked) {
      // User has access (it's free or they bought it)
      status = isUploaded ? "Available" : "Live Soon";
    } else {
      // User doesn't have access -> show "Locked" which renders the checkout button
      status = "Locked";
    }

    return {
      id: testId,
      title,
      duration: config.duration,
      questions: config.questions,
      marks: config.marks,
      isFree,
      status,
      score,
    };
  });
};

const TEST_CATEGORIES = {
  "SSC CGL Tier 1": {
    config: { duration: "60 Mins", questions: "100", marks: "200", demoScore: "142.5/200" },
    pattern: [
      { subject: "General Intelligence", questions: 25, marks: 50 },
      { subject: "General Awareness", questions: 25, marks: 50 },
      { subject: "Quantitative Aptitude", questions: 25, marks: 50 },
      { subject: "English Comprehension", questions: 25, marks: 50 },
    ],
    totalQs: 100,
    totalMarks: 200,
    negative: "-0.50 Marks"
  },
  "SSC CGL Tier 2": {
    config: { duration: "135 Mins", questions: "130", marks: "390", demoScore: "310/390" },
    pattern: [
      { subject: "Mathematical Abilities", questions: 30, marks: 90 },
      { subject: "Reasoning & Gen. Intelligence", questions: 30, marks: 90 },
      { subject: "English Language & Comprehension", questions: 45, marks: 135 },
      { subject: "General Awareness", questions: 25, marks: 75 },
    ],
    totalQs: 130,
    totalMarks: 390,
    negative: "-1.00 Marks"
  },
  "RRB NTPC CBT 1": {
    config: { duration: "90 Mins", questions: "100", marks: "100", demoScore: "78.3/100" },
    pattern: [
      { subject: "General Awareness", questions: 40, marks: 40 },
      { subject: "Mathematics", questions: 30, marks: 30 },
      { subject: "General Intelligence & Reasoning", questions: 30, marks: 30 },
    ],
    totalQs: 100,
    totalMarks: 100,
    negative: "-0.33 Marks (1/3rd)"
  },
  "RRB NTPC CBT 2": {
    config: { duration: "90 Mins", questions: "120", marks: "120", demoScore: "92/120" },
    pattern: [
      { subject: "General Awareness", questions: 50, marks: 50 },
      { subject: "Mathematics", questions: 35, marks: 35 },
      { subject: "General Intelligence & Reasoning", questions: 35, marks: 35 },
    ],
    totalQs: 120,
    totalMarks: 120,
    negative: "-0.33 Marks (1/3rd)"
  },
  "Agniveer Army GD": {
    config: { duration: "60 Mins", questions: "50", marks: "100", demoScore: "72/100" },
    pattern: [
      { subject: "General Knowledge", questions: 15, marks: 30 },
      { subject: "General Science", questions: 15, marks: 30 },
      { subject: "Mathematics", questions: 15, marks: 30 },
      { subject: "Logical Reasoning", questions: 5, marks: 10 },
    ],
    totalQs: 50,
    totalMarks: 100,
    negative: "-0.50 Marks"
  },
  "Agniveer Army Clerk": {
    config: { duration: "60 Mins", questions: "50", marks: "200", demoScore: "156/200" },
    pattern: [
      { subject: "General Science", questions: 5, marks: 20 },
      { subject: "Mathematics", questions: 10, marks: 40 },
      { subject: "Computer Science", questions: 5, marks: 20 },
      { subject: "General Knowledge", questions: 5, marks: 20 },
      { subject: "General English", questions: 25, marks: 100 },
    ],
    totalQs: 50,
    totalMarks: 200,
    negative: "-1.00 Marks"
  },
  "SSC Previous 2025": {
    config: { duration: "60 Mins", questions: "100", marks: "200", demoScore: "142.5/200" },
    pattern: [
      { subject: "General Intelligence", questions: 25, marks: 50 },
      { subject: "General Awareness", questions: 25, marks: 50 },
      { subject: "Quantitative Aptitude", questions: 25, marks: 50 },
      { subject: "English Comprehension", questions: 25, marks: 50 },
    ],
    totalQs: 100,
    totalMarks: 200,
    negative: "-0.50 Marks"
  },
  "SSC Previous 2024": {
    config: { duration: "60 Mins", questions: "100", marks: "200", demoScore: "142.5/200" },
    pattern: [
      { subject: "General Intelligence", questions: 25, marks: 50 },
      { subject: "General Awareness", questions: 25, marks: 50 },
      { subject: "Quantitative Aptitude", questions: 25, marks: 50 },
      { subject: "English Comprehension", questions: 25, marks: 50 },
    ],
    totalQs: 100,
    totalMarks: 200,
    negative: "-0.50 Marks"
  },
  "SSC Previous 2023": {
    config: { duration: "60 Mins", questions: "100", marks: "200", demoScore: "142.5/200" },
    pattern: [
      { subject: "General Intelligence", questions: 25, marks: 50 },
      { subject: "General Awareness", questions: 25, marks: 50 },
      { subject: "Quantitative Aptitude", questions: 25, marks: 50 },
      { subject: "English Comprehension", questions: 25, marks: 50 },
    ],
    totalQs: 100,
    totalMarks: 200,
    negative: "-0.50 Marks"
  },
  "RRB Previous 2025": {
    config: { duration: "90 Mins", questions: "100", marks: "100", demoScore: "78.3/100" },
    pattern: [
      { subject: "General Awareness", questions: 40, marks: 40 },
      { subject: "Mathematics", questions: 30, marks: 30 },
      { subject: "General Intelligence & Reasoning", questions: 30, marks: 30 },
    ],
    totalQs: 100,
    totalMarks: 100,
    negative: "-0.33 Marks (1/3rd)"
  },
  "RRB Previous 2024": {
    config: { duration: "90 Mins", questions: "100", marks: "100", demoScore: "78.3/100" },
    pattern: [
      { subject: "General Awareness", questions: 40, marks: 40 },
      { subject: "Mathematics", questions: 30, marks: 30 },
      { subject: "General Intelligence & Reasoning", questions: 30, marks: 30 },
    ],
    totalQs: 100,
    totalMarks: 100,
    negative: "-0.33 Marks (1/3rd)"
  },
  "RRB Previous 2023": {
    config: { duration: "90 Mins", questions: "100", marks: "100", demoScore: "78.3/100" },
    pattern: [
      { subject: "General Awareness", questions: 40, marks: 40 },
      { subject: "Mathematics", questions: 30, marks: 30 },
      { subject: "General Intelligence & Reasoning", questions: 30, marks: 30 },
    ],
    totalQs: 100,
    totalMarks: 100,
    negative: "-0.33 Marks (1/3rd)"
  }
};

const CATEGORY_STRUCTURE = {
  "SSC CGL": [
    { label: "Tier 1 (Pre)", key: "SSC CGL Tier 1" },
    { label: "Tier 2 (Mains)", key: "SSC CGL Tier 2" },
    { label: "Prev. 2025", key: "SSC Previous 2025" },
    { label: "Prev. 2024", key: "SSC Previous 2024" },
    { label: "Prev. 2023", key: "SSC Previous 2023" }
  ],
  "RRB NTPC": [
    { label: "CBT 1", key: "RRB NTPC CBT 1" },
    { label: "CBT 2", key: "RRB NTPC CBT 2" },
    { label: "Prev. 2025", key: "RRB Previous 2025" },
    { label: "Prev. 2024", key: "RRB Previous 2024" },
    { label: "Prev. 2023", key: "RRB Previous 2023" }
  ],
  "Agniveer": [
    { label: "Army GD", key: "Agniveer Army GD" },
    { label: "Army Clerk", key: "Agniveer Army Clerk" }
  ]
} as const;

const PACKAGE_PRICING = {
  "SSC CGL": { price: 250, name: "SSC CGL Pro (Pre + Mains)", features: ["200+ Full Mocks", "Detailed AI Analytics", "All India Rank", "Unlimited Retakes"] },
  "RRB NTPC": { price: 10, name: "RRB NTPC Pro (CBT 1 + CBT 2)", features: ["200+ Full Mocks", "Detailed AI Analytics", "All India Rank", "Unlimited Retakes"] },
  "Agniveer": { price: 149, name: "Agniveer Pro (Army GD + Clerk)", features: ["100+ Full Mocks", "Detailed AI Analytics", "All India Rank", "Unlimited Retakes"] }
};

type MainCategory = keyof typeof CATEGORY_STRUCTURE;
type Category = keyof typeof TEST_CATEGORIES;

export default function MockTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mainCategory, setMainCategory] = useState<MainCategory>("SSC CGL");
  const [activeCategory, setActiveCategory] = useState<Category>("SSC CGL Tier 1");
  const [userAttemptsMap, setUserAttemptsMap] = useState<Record<string, TestAttempt>>({});
  const [uploadedTestsMetadata, setUploadedTestsMetadata] = useState<Map<string, {isLocked: boolean, paperName?: string}>>(new Map());
  const [userPurchases, setUserPurchases] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 1. Fetch which tests actually exist in the database and are UNLOCKED
    getUploadedTestsMetadata().then((metadata) => {
      const allMetadata = new Map();
      metadata.forEach(m => {
        allMetadata.set(m.id, m);
      });
      setUploadedTestsMetadata(allMetadata);
    }).catch(console.error);

    // 2. Fetch the user's personal attempts and purchases
    if (user) {
      Promise.all([
        getUserTestAttempts(user.uid),
        getUserPurchases(user.uid)
      ]).then(([attempts, purchases]) => {
        // Create a dictionary for O(1) lookups by testId
        const map: Record<string, TestAttempt> = {};
        attempts.forEach(a => {
          map[a.testId] = a;
        });
        setUserAttemptsMap(map);
        setUserPurchases(new Set(purchases));
      });
    } else {
      setUserAttemptsMap({});
      setUserPurchases(new Set());
    }
  }, [user]);

  const handleMainCategoryChange = (main: MainCategory) => {
    setMainCategory(main);
    setActiveCategory(CATEGORY_STRUCTURE[main][0].key as Category);
  };
  
  const isCategoryUnlocked = userPurchases.has(PACKAGE_PRICING[mainCategory].name);

  // Memoize generation so it only recalculates when activeCategory, attempts, or uploads change
  const tests = useMemo(
    () => generateTests(
      activeCategory, 
      (TEST_CATEGORIES[activeCategory] as any).testCount || 60, 
      TEST_CATEGORIES[activeCategory].config, 
      userAttemptsMap, 
      uploadedTestsMetadata, 
      isCategoryUnlocked
    ),
    [activeCategory, userAttemptsMap, uploadedTestsMetadata, isCategoryUnlocked]
  );
  
  const activePattern = TEST_CATEGORIES[activeCategory];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mock Tests Series</h1>
          <p className="text-muted-foreground mt-2">Access hundreds of full-length mock tests based on latest exam patterns.</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border/50 mb-6 w-full justify-start items-center overflow-x-auto hide-scrollbar">
        {(Object.keys(CATEGORY_STRUCTURE) as MainCategory[]).map((main) => (
          <button
            key={main}
            onClick={() => handleMainCategoryChange(main)}
            className={`px-8 py-3 font-bold text-lg border-b-2 transition-all whitespace-nowrap ${
              mainCategory === main 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {main}
          </button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-2 mb-2">
        {CATEGORY_STRUCTURE[mainCategory].map((sub) => (
          <button
            key={sub.key}
            onClick={() => setActiveCategory(sub.key as Category)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeCategory === sub.key 
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
              : "bg-card text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border">
            <h2 className="font-bold text-lg">{activeCategory} Tests</h2>
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">{(TEST_CATEGORIES[activeCategory] as any).testCount || 100} Tests Available</span>
          </div>
          
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {tests.map((test, index) => (
              <TestCard 
                key={index}
                title={test.title} 
                duration={test.duration} 
                questions={test.questions} 
                marks={test.marks} 
                isFree={test.isFree} 
                status={test.status as "Available" | "Completed" | "Locked" | "Live Soon"} 
                score={test.score}
                packagePrice={!test.isFree && !isCategoryUnlocked ? PACKAGE_PRICING[mainCategory].price : undefined}
                packageName={PACKAGE_PRICING[mainCategory].name}
                onStart={() => router.push(`/mock-tests/${encodeURIComponent(test.id)}`)}
                onAnalysis={() => router.push(`/mock-tests/${encodeURIComponent(test.id)}/analysis`)}

                onPaymentSuccess={() => {
                  const newSet = new Set(userPurchases);
                  newSet.add(PACKAGE_PRICING[mainCategory].name);
                  setUserPurchases(newSet);
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="space-y-6 sticky top-24 self-start">
          
          {/* Premium Package Card / Welcome Box */}
          {isCategoryUnlocked ? (
            <div className="p-6 rounded-xl relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 text-center">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div className="relative z-10 flex flex-col items-center justify-center py-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-black text-2xl mb-2">Pro Unlocked!</h3>
                <p className="font-medium text-emerald-50 mb-6">Welcome to the Pro Test Series. You now have unlimited access to all premium mocks.</p>
                <button disabled className="w-full bg-white/20 text-white font-bold py-3 px-4 rounded-lg backdrop-blur-sm">
                  Happy Learning!
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-xl mb-1">{PACKAGE_PRICING[mainCategory].name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-black">₹{PACKAGE_PRICING[mainCategory].price}</span>
                  <span className="text-sm opacity-80 line-through">₹999</span>
                </div>
                
                <ul className="space-y-2 mb-6 text-sm font-medium">
                  {PACKAGE_PRICING[mainCategory].features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <RazorpayCheckoutButton 
                  amount={PACKAGE_PRICING[mainCategory].price}
                  itemName={PACKAGE_PRICING[mainCategory].name}
                  buttonText="Unlock Now"
                  className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-70"
                  onPaymentSuccess={() => {
                    const newSet = new Set(userPurchases);
                    newSet.add(PACKAGE_PRICING[mainCategory].name);
                    setUserPurchases(newSet);
                  }}
                />
              </div>
            </div>
          )}

          {/* Exam Pattern Card */}
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-primary">Exam Pattern ({activeCategory})</h3>
            <ul className="space-y-4 text-sm">
              {activePattern.pattern.map((p, i) => (
                <li key={i} className="flex justify-between items-start gap-4">
                  <span className="text-muted-foreground leading-tight">{p.subject}</span>
                  <span className="font-medium whitespace-nowrap text-right">{p.questions} Qs / {p.marks} M</span>
                </li>
              ))}
              
              <div className="h-px bg-border my-4" />
              
              <li className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-foreground">{activePattern.totalQs} Qs / {activePattern.totalMarks} M</span>
              </li>
              <li className="flex justify-between text-xs items-center p-3 mt-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <span className="font-bold">Negative Marking:</span>
                <span className="font-bold">{activePattern.negative}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
