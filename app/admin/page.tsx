"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Upload, FileJson, AlertCircle, CheckCircle2, Link as LinkIcon, FileSpreadsheet, Lock, Unlock, Search } from "lucide-react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUploadedTestsMetadata, deleteMockTest, updateMockTestLockStatus, uploadPracticeQuestions } from "@/lib/firestore";
import Papa from "papaparse";

const CATEGORIES = [
  "SSC CGL Tier 1",
  "SSC CGL Tier 2",
  "RRB NTPC CBT 1",
  "RRB NTPC CBT 2",
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [testNumber, setTestNumber] = useState<number | null>(null);
  const [uploadedTests, setUploadedTests] = useState<Record<string, {isLocked: boolean}>>({});

  const PRACTICE_SUBJECTS = {
    "Quantitative Aptitude": ["Number System", "Simplification", "Percentage", "Ratio and Proportion", "Average", "Profit and Loss", "Simple Interest", "Compound Interest", "Time and Work", "Pipes and Cistern", "Time Speed Distance", "Algebra", "Geometry", "Mensuration", "Trigonometry", "Statistics"],
    "General Intelligence & Reasoning": ["Analogy", "Syllogism", "Blood Relations", "Coding-Decoding", "Number Series"],
    "English Comprehension": ["Error Spotting", "Fill in the Blanks", "Synonyms/Antonyms", "Idioms & Phrases", "Comprehension"],
    "General Awareness": ["Current Affairs", "History", "Polity", "Geography", "Science & Tech"],
    "Computer Knowledge": ["Computer Basics", "MS Office", "Internet & Emails", "Networking", "Cyber Security"]
  };
  
  const [uploadTarget, setUploadTarget] = useState<"mock" | "practice">("mock");
  const [selectedPracticeSubject, setSelectedPracticeSubject] = useState<string>(Object.keys(PRACTICE_SUBJECTS)[0]);
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<string>(PRACTICE_SUBJECTS[Object.keys(PRACTICE_SUBJECTS)[0] as keyof typeof PRACTICE_SUBJECTS][0]);
  
  
  const [uploadMode, setUploadMode] = useState<"json" | "csv-url" | "csv-file">("json");
  const [jsonInput, setJsonInput] = useState("");
  const [csvUrl, setCsvUrl] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error" | "locking">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [processStep, setProcessStep] = useState("");

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const fetchUploads = async () => {
    try {
      const metadata = await getUploadedTestsMetadata();
      const map: Record<string, {isLocked: boolean}> = {};
      metadata.forEach(m => map[m.id] = { isLocked: m.isLocked });
      setUploadedTests(map);
    } catch (e) {
      console.error("Failed to fetch upload status", e);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.email !== adminEmail)) {
      router.push("/login");
    }
  }, [user, loading, router, adminEmail]);

  // Show spinner while Firebase is initializing OR while not yet confirmed as admin.
  // This prevents ANY flash of admin content to unauthenticated users.
  if (loading || !user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // If logged in but not the admin, don't render anything (redirect is in progress)
  if (user.email !== adminEmail) {
    return null;
  }

  const handleUpload = async () => {
    if (uploadTarget === "mock" && !testNumber) return;
    if (uploadTarget === "practice" && (!selectedPracticeSubject || !selectedPracticeTopic)) return;
    
    try {
      setStatus("uploading");
      setErrorMessage("");
      
      let parsedData: any[] = [];
      
      if (uploadMode === "json") {
        setProcessStep("Parsing JSON...");
        if (!jsonInput.trim()) throw new Error("Please provide JSON data.");
        try {
          parsedData = JSON.parse(jsonInput);
        } catch (e) {
          throw new Error("Invalid JSON format. Please check your data structure.");
        }
        if (!Array.isArray(parsedData)) throw new Error("JSON data must be a valid array of questions.");
      } 
      else if (uploadMode === "csv-url") {
        setProcessStep("Fetching Google Sheet URL...");
        if (!csvUrl.trim()) throw new Error("Please provide a Google Sheets or CSV URL.");
        
        let targetUrl = csvUrl;
        // Auto-convert Google Sheets view URLs to CSV export URLs
        if (targetUrl.includes("docs.google.com/spreadsheets/d/")) {
           const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
           if (match && match[1]) {
             targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
           }
        }
        
        setProcessStep("Downloading Google Sheet data...");
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("Failed to fetch data from the provided URL. Ensure it is public.");
        
        const csvText = await response.text();
        setProcessStep("Parsing CSV Data...");
        const parseResult = Papa.parse(csvText, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().toLowerCase()
        });
        if (parseResult.errors.length > 0) {
           console.warn("CSV Url Parsing Warnings:", parseResult.errors);
        }
        parsedData = parseResult.data;
      }
      else if (uploadMode === "csv-file") {
        setProcessStep("Reading CSV file...");
        if (!csvFile) throw new Error("Please select a CSV file to upload.");
        
        // Use Papa's native File parsing for better browser compatibility
        parsedData = await new Promise((resolve, reject) => {
          Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase(),
            complete: (results) => {
              if (results.errors.length > 0) {
                console.warn("CSV File Parsing Warnings:", results.errors);
              }
              resolve(results.data);
            },
            error: (error) => reject(new Error(error.message))
          });
        });
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error("No valid questions found in the provided data. Please ensure it has headers and rows.");
      }

      // Filter out completely empty rows that might be at the bottom of a spreadsheet
      parsedData = parsedData.filter((q: any) => q && q.question && String(q.question).trim() !== "");

      if (parsedData.length === 0) {
        throw new Error("No valid 'question' properties found in rows. Check your headers.");
      }

      // Automatically map columns like "Option A" or "option1" into a clean standard format
      setProcessStep("Mapping and formatting questions...");
      parsedData = parsedData.map((row: any) => {
        // Since we lowercased headers earlier, we check for 'option a', 'option 1', etc.
        const optionsArray = [
          row['option1'] || row['option 1'] || row['option a'] || row['option_a'] || row['optionA'] || "",
          row['option2'] || row['option 2'] || row['option b'] || row['option_b'] || row['optionB'] || "",
          row['option3'] || row['option 3'] || row['option c'] || row['option_c'] || row['optionC'] || "",
          row['option4'] || row['option 4'] || row['option d'] || row['option_d'] || row['optionD'] || ""
        ];

        return {
          id: row.id || row._id || "",
          question: row.question,
          options: optionsArray,
          answer: row.answer || "",
          topic: row.topic || "",
          explanation: row.explanation || ""
        };
      });

      const prefixMap: Record<string, string> = {
        "SSC CGL Tier 1": "SSC CGL Tier 1",
        "SSC CGL Tier 2": "SSC CGL Tier 2",
        "RRB NTPC CBT 1": "RRB NTPC CBT 1",
        "RRB NTPC CBT 2": "RRB NTPC CBT 2",
      };

      const testId = `${prefixMap[selectedCategory]}-Mock-${testNumber}`;

      // Sanitize data for Firestore (removes any `undefined` properties that PapaParse might leak, which Firestore rejects)
      const sanitizedData = JSON.parse(JSON.stringify(parsedData));

      // 1. Save questions payload
      setProcessStep("Saving to Firestore database...");
      
      let savePromise;
      if (uploadTarget === "practice") {
        const subjectSlug = selectedPracticeSubject.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const topicSlug = selectedPracticeTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        savePromise = uploadPracticeQuestions(subjectSlug, topicSlug, sanitizedData);
      } else {
        const testRef = doc(db, "mock_tests", testId);
        savePromise = setDoc(testRef, {
          categoryId: selectedCategory,
          testNumber: testNumber,
          uploadedAt: Timestamp.now(),
          questionCount: sanitizedData.length,
          isLocked: true, // Upload as explicitly locked (Draft mode) by default
          questionsData: sanitizedData 
        });
      }
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore save timed out. Please check if your Firestore Database is created and enabled in your Firebase console.")), 15000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      setProcessStep("Finalizing...");
      setStatus("success");
      setJsonInput("");
      await fetchUploads(); // Refresh the grid
      
      setTimeout(() => {
        setStatus("idle");
        setProcessStep("");
        if (uploadTarget === "mock") setTestNumber(null); // Close the panel
      }, 3000);
      
    } catch (error: any) {
      console.error("Upload failed with error payload:", error);
      setStatus("error");
      
      let msg = error.message || "Failed to upload test series questions.";
      
      // Specifically catch Firestore rules or quota errors
      if (error.code === "permission-denied") {
        msg = "Upload blocked by Firestore Rules. Please go to your Firebase Console -> Firestore -> Rules and ensure you have write access.";
      } else if (error.code === "quota-exceeded") {
        msg = "Firebase quota exceeded. Check your usage.";
      } else if (error.message && error.message.includes("undefined")) {
        msg = "There was an invalid 'undefined' value in your CSV. Please check for empty columns.";
      }

      setErrorMessage(msg);
    }
  };

  const handleToggleLock = async (tNumber: number, lockStatus: boolean) => {
    try {
      setStatus("locking");
      const testId = `${prefixMap[selectedCategory]}-Mock-${tNumber}`;
      await updateMockTestLockStatus(testId, lockStatus);
      await fetchUploads();
      setStatus("idle");
    } catch (error: any) {
       console.error("Failed to toggle lock status", error);
       setStatus("error");
       setErrorMessage("Failed to update the lock status of the test.");
    }
  };

  const handleLockTest = async (tNumber: number) => {
    try {
      setStatus("locking");
      const testId = `${prefixMap[selectedCategory]}-Mock-${tNumber}`;
      await deleteMockTest(testId);
      await fetchUploads();
      setStatus("idle");
      setTestNumber(null);
    } catch (error: any) {
       console.error("Failed to delete test", error);
       setStatus("error");
       setErrorMessage("Failed to explicitly delete the test.");
    }
  };

  const prefixMap: Record<string, string> = {
    "SSC CGL Tier 1": "SSC CGL Tier 1",
    "SSC CGL Tier 2": "SSC CGL Tier 2",
    "RRB NTPC CBT 1": "RRB NTPC CBT 1",
    "RRB NTPC CBT 2": "RRB NTPC CBT 2",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground mt-2">Upload bulk questions for exactly {CATEGORIES.length} Mock Test Categories.</p>
        </div>
        <span className="flex h-6 items-center px-2 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
          Admin Verified
        </span>
      </div>

      <div className="flex justify-center border-b border-border/60">
        <button
          onClick={() => setUploadTarget("mock")}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${uploadTarget === 'mock' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
        >
          Mock Test Series
        </button>
        <button
          onClick={() => setUploadTarget("practice")}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${uploadTarget === 'practice' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
        >
          Topic Practice Questions
        </button>
      </div>

      {uploadTarget === "mock" && (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 animate-in slide-in-from-left-4 duration-300">
        <div className="space-y-4">
          <label className="text-sm font-semibold">Select Test Category Series</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setTestNumber(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === cat 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "bg-background border border-border hover:bg-muted text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold">Tests for {selectedCategory} (1-100)</label>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Unlocked ({
                Object.values(uploadedTests).filter(m => !m.isLocked).length
              })</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500" /> Locked Draft</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-muted border border-border" /> Empty</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
            {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
               const tId = `${prefixMap[selectedCategory]}-Mock-${num}`;
               const testMeta = uploadedTests[tId];
               const isUploaded = !!testMeta;
               const isUnlocked = testMeta && !testMeta.isLocked;
               const isActive = testNumber === num;
               
               let buttonStyle = "bg-muted text-muted-foreground border-border hover:bg-muted/80";
               let titleStatus = "Not Uploaded";
               
               if (isUploaded) {
                 if (isUnlocked) {
                   buttonStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20";
                   titleStatus = "Uploaded & Unlocked";
                 } else {
                   buttonStyle = "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 hover:bg-amber-200/50";
                   titleStatus = "Uploaded (Locked)";
                 }
               }
               
               return (
                 <button
                   key={num}
                   onClick={() => setTestNumber(isActive ? null : num)}
                   className={`relative h-12 rounded-md font-bold text-sm flex items-center justify-center transition-all border ${
                     isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
                   } ${buttonStyle}`}
                   title={`Test #${num} (${titleStatus})`}
                 >
                   {String(num).padStart(2, '0')}
                 </button>
               );
            })}
          </div>
        </div>
      </div>
      )}

      {uploadTarget === "practice" && (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="space-y-4">
          <label className="text-sm font-semibold">Select Master Subject</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRACTICE_SUBJECTS).map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedPracticeSubject(sub);
                  setSelectedPracticeTopic(PRACTICE_SUBJECTS[sub as keyof typeof PRACTICE_SUBJECTS][0]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedPracticeSubject === sub 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "bg-background border border-border hover:bg-muted text-foreground"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <label className="text-sm font-semibold">Select Topic for {selectedPracticeSubject}</label>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_SUBJECTS[selectedPracticeSubject as keyof typeof PRACTICE_SUBJECTS].map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedPracticeTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  selectedPracticeTopic === topic 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 ring-1 ring-emerald-500/50" 
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Editor Panel */}
      {(testNumber !== null || uploadTarget === "practice") && (
        <div className="bg-card border border-primary/20 rounded-xl p-6 shadow-lg shadow-primary/5 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex justify-between items-start">
            <div>
               <h2 className="text-xl font-bold flex items-center gap-2">
                 {uploadTarget === "mock" ? `Managing Test #${String(testNumber).padStart(2, '0')}` : `Uploading Practice Questions`}
                 {uploadTarget === "mock" && uploadedTests[`${prefixMap[selectedCategory]}-Mock-${testNumber}`] ? (
                   !uploadedTests[`${prefixMap[selectedCategory]}-Mock-${testNumber}`].isLocked ? (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                       <Unlock className="w-3 h-3" /> Published
                     </span>
                   ) : (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                       <Lock className="w-3 h-3" /> Draft (Locked)
                     </span>
                   )
                 ) : uploadTarget === "mock" ? (
                   <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border flex items-center gap-1">
                     Empty
                   </span>
                 ) : null}
               </h2>
               <p className="text-sm text-muted-foreground">{uploadTarget === "mock" ? selectedCategory : `${selectedPracticeSubject} > ${selectedPracticeTopic}`}</p>
            </div>
            
            {uploadTarget === "mock" && uploadedTests[`${prefixMap[selectedCategory]}-Mock-${testNumber}`] && (
              <div className="flex items-center gap-2">
                {uploadedTests[`${prefixMap[selectedCategory]}-Mock-${testNumber}`].isLocked ? (
                  <button 
                    onClick={() => handleToggleLock(testNumber!, false)}
                    disabled={status === "locking"}
                    className="text-xs flex items-center px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    {status === "locking" ? "Updating..." : <><Unlock className="w-3.5 h-3.5 mr-1" /> Publish (Unlock)</>}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleLock(testNumber!, true)}
                    disabled={status === "locking"}
                    className="text-xs flex items-center px-3 py-1.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold hover:bg-amber-200/50 transition-colors disabled:opacity-50"
                  >
                    {status === "locking" ? "Updating..." : <><Lock className="w-3.5 h-3.5 mr-1" /> Revert to Draft (Lock)</>}
                  </button>
                )}
                
                <button 
                  onClick={() => handleLockTest(testNumber!)}
                  disabled={status === "locking"}
                  className="text-xs flex items-center px-3 py-1.5 rounded-md bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  {status === "locking" ? "Deleting..." : "Delete Data"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            
            <div className="flex border-b border-border mb-4">
              <button 
                onClick={() => setUploadMode("json")}
                className={`pb-2 px-4 text-sm font-semibold transition-colors ${uploadMode === "json" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2"><FileJson className="w-4 h-4" /> JSON Payload</div>
              </button>
              <button 
                onClick={() => setUploadMode("csv-url")}
                className={`pb-2 px-4 text-sm font-semibold transition-colors ${uploadMode === "csv-url" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Google Sheets URL</div>
              </button>
              <button 
                onClick={() => setUploadMode("csv-file")}
                className={`pb-2 px-4 text-sm font-semibold transition-colors ${uploadMode === "csv-file" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> CSV File Upload</div>
              </button>
            </div>

            {uploadMode === "json" && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-sm font-semibold hidden">Bulk Questions JSON Payload</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='[ { "question": "What is the capital of France?", "options": ["Paris", "London", "Berlin", "Madrid"], "answer": "Paris" } ... ]'
                  className="w-full min-h-[300px] p-4 rounded-md border border-input bg-background text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y custom-scrollbar"
                />
              </div>
            )}

            {uploadMode === "csv-url" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Public Google Sheets Link</label>
                  <input
                    type="url"
                    value={csvUrl}
                    onChange={(e) => setCsvUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit?usp=sharing"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">Make sure the Google Sheet access is set to "Anyone with the link can view". The headers should be: question, option1, option2, option3, option4, answer, explanation (optional).</p>
                </div>
              </div>
            )}

            {uploadMode === "csv-file" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="space-y-2">
                  <label className="text-sm font-semibold">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>
            )}
          </div>

          {status === "error" && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {status === "success" && (
            <div className="p-4 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Upload Successful!</p>
                <p className="text-xs mt-1">Data saved. Test is currently a Draft (Locked). Click Publish to unlock it.</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button
               onClick={() => setTestNumber(null)}
               className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={status === "uploading"}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] justify-center h-10 px-6 rounded-md text-sm font-bold transition-colors disabled:opacity-70"
            >
              {status === "uploading" ? (
                <><div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> {processStep || "Processing..."}</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Data Only</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
