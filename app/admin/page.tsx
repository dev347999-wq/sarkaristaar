"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Upload, FileJson, AlertCircle, CheckCircle2, Link as LinkIcon, FileSpreadsheet, Lock, Unlock, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getUploadedTestsMetadata, deleteMockTest, updateMockTestLockStatus, uploadPracticeQuestions, getAllPurchases } from "@/lib/database";
import Papa from "papaparse";
import ExcelJS from "exceljs";

const CATEGORIES = [
  "SSC CGL Tier 1",
  "SSC CGL Tier 2",
  "SSC Previous 2025",
  "SSC Previous Tier 2 2025",
  "SSC Previous 2024",
  "SSC Previous Tier 2 2024",
  "RRB NTPC CBT 1",
  "RRB NTPC CBT 2",
  "RRB Previous 2025",
  "RRB Previous 2024",
  "RRB Previous 2023",
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
  
  const [uploadTarget, setUploadTarget] = useState<"mock" | "practice" | "sales">("mock");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [selectedPracticeSubject, setSelectedPracticeSubject] = useState<string>(Object.keys(PRACTICE_SUBJECTS)[0]);
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<string>(PRACTICE_SUBJECTS[Object.keys(PRACTICE_SUBJECTS)[0] as keyof typeof PRACTICE_SUBJECTS][0]);
  
  
  const [uploadMode, setUploadMode] = useState<"json" | "csv-url" | "csv-file">("json");
  const [testName, setTestName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [csvUrl, setCsvUrl] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error" | "locking">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [processStep, setProcessStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const fetchAdminData = async () => {
    try {
      const [metadata, allPurchases] = await Promise.all([
        getUploadedTestsMetadata(),
        getAllPurchases()
      ]);
      const map: Record<string, {isLocked: boolean}> = {};
      metadata.forEach(m => map[m.id] = { isLocked: m.isLocked });
      setUploadedTests(map);
      setPurchases(allPurchases || []);
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (!loading && (!user || !adminEmail || user.email !== adminEmail)) {
      router.push("/login");
    }
  }, [user, loading, router, adminEmail]);

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
  if (!adminEmail || user.email !== adminEmail) {
    return null;
  }

  const handleUpload = async () => {
    if (uploadTarget === "mock" && !testNumber) return;
    if (uploadTarget === "practice" && (!selectedPracticeSubject || !selectedPracticeTopic)) return;
    
    try {
      setStatus("uploading");
      setErrorMessage("");
      setUploadProgress(null);
      
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
        setProcessStep("Reading Spreadsheet file...");
        if (!csvFile) throw new Error("Please select a CSV or Excel file to upload.");
        
        const isExcel = csvFile.name.endsWith(".xlsx") || csvFile.name.endsWith(".xls");

        if (isExcel) {
          setProcessStep("Parsing Excel file and Extracting Images...");
          const workbook = new ExcelJS.Workbook();
          const arrayBuffer = await csvFile.arrayBuffer();
          await workbook.xlsx.load(arrayBuffer);
          const worksheet = workbook.getWorksheet(1); // Get first sheet
          if (!worksheet) throw new Error("Sheet not found in Excel file.");

          // 1. Extract Images and their positions
          const imageMap: Record<string, string[]> = {}; // "row-col" -> [base64, ...]
          const images = worksheet.getImages();
          
          
          // Build blobs first, then upload ALL in parallel for speed
          const uploadTasks: { cellKey: string; blob: Blob; ext: string }[] = [];
          for (const img of images) {
            const image = workbook.getImage(Number(img.imageId));
            if (!image || !img.range) continue;
            
            // Convert buffer/base64 to Blob
            let blob: Blob;
            if (image.buffer) {
               blob = new Blob([image.buffer], { type: (image.extension === 'png' ? 'image/png' : 'image/jpeg') });
            } else if (image.base64) {
               const byteCharacters = atob(image.base64);
               const byteNumbers = new Array(byteCharacters.length);
               for (let i = 0; i < byteCharacters.length; i++) {
                 byteNumbers[i] = byteCharacters.charCodeAt(i);
               }
               blob = new Blob([new Uint8Array(byteNumbers)], { type: (image.extension === 'png' ? 'image/png' : 'image/jpeg') });
            } else continue;

            // Map to cell (1-indexed for row/col)
            const rowIdx = Math.floor(img.range.tl.row) + 1;
            const colIdx = Math.floor(img.range.tl.col) + 1;
            const cellKey = `${rowIdx}-${colIdx}`;
            uploadTasks.push({ cellKey, blob, ext: image.extension || 'png' });
          }

          // Upload all images in parallel with progress tracking
          let doneCount = 0;
          setUploadProgress({ done: 0, total: uploadTasks.length });
          await Promise.all(uploadTasks.map(async ({ cellKey, blob, ext }) => {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from("test-images").upload(fileName, blob, {
              contentType: blob.type
            });
            if (uploadErr) throw uploadErr;
            
            const { data: publicUrlData } = supabase.storage.from("test-images").getPublicUrl(fileName);
            const downloadUrl = publicUrlData.publicUrl;
            
            if (!imageMap[cellKey]) imageMap[cellKey] = [];
            imageMap[cellKey].push(downloadUrl);
            doneCount++;
            setUploadProgress({ done: doneCount, total: uploadTasks.length });
          }));

          // 2. Extract Data from rows
          const rows: any[] = [];
          const headerRow = worksheet.getRow(1);
          const headers: string[] = [];
          headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value || "").trim().toLowerCase();
          });

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            const rowData: any = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const header = headers[colNumber];
              if (header) {
                // If it's an image-potential cell, check the map
                const cellImages = imageMap[`${rowNumber}-${colNumber}`];
                if (cellImages && cellImages.length > 0) {
                  rowData[header] = cellImages[0]; // Take first image URL
                } else {
                  rowData[header] = cell.value;
                }
              }
            });
            rows.push(rowData);
          });
          parsedData = rows;
        } else {
          // Standard CSV parser
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
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error("No valid questions found in the provided data. Please ensure it has headers and rows.");
      }

      // Filter out empty rows — scan all keys for any 'question' column (but not image)
      parsedData = parsedData.filter((q: any) => {
        if (!q) return false;
        // dynamically find any key that looks like a question column
        // IMPORTANT: exclude 'passage', 'header', and 'paragraph' so columns like 'passage question header' or 'Paragraph Questions' are never picked
        const questionKey = Object.keys(q).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('question') && !lk.includes('image') && !lk.includes('passage') && !lk.includes('header') && !lk.includes('paragraph');
        });
        if (!questionKey) return false;
        return String(q[questionKey] || "").trim() !== "";
      });

      if (parsedData.length === 0) {
        throw new Error("No valid question columns found. Make sure your Excel has columns named: Question(english) or Question(hindi).");
      }

      // Helper to find a key in an object regardless of minor variations
      const findValue = (row: any, keywords: string[], exclude?: string[]) => {
        const keys = Object.keys(row);
        const foundKey = keys.find(k => {
          const lowerK = k.toLowerCase();
          const matches = keywords.every(kw => lowerK.includes(kw.toLowerCase()));
          const notExcluded = !exclude || !exclude.some(ex => lowerK.includes(ex.toLowerCase()));
          return matches && notExcluded;
        });
        return foundKey ? row[foundKey] : undefined;
      };

      setProcessStep("Mapping questions (fuzzy logic)...");

      // Helper to find a value by exact lowercased key (for Option A/B/C/D style headers)
      const findExact = (row: any, key: string) => {
        const found = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
        return found ? row[found] : undefined;
      };

      // Helper to convert Excel rich text cell objects to HTML strings
      const cellToString = (val: any): string => {
        if (val == null) return "";
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (Array.isArray(val)) {
          return val.map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              if (item.richText) return cellToString(item.richText);
              let text = item.text || item.t || item.v || '';
              if (item.font && text) {
                if (item.font.bold) text = `<b>${text}</b>`;
                if (item.font.italic) text = `<i>${text}</i>`;
                if (item.font.underline) text = `<u>${text}</u>`;
              }
              return text;
            }
            return String(item || '');
          }).join('');
        }
        if (typeof val === 'object') {
          if (val.richText) return cellToString(val.richText);
          let text = val.text || val.t || val.v || '';
          if (val.font && text) {
            if (val.font.bold) text = `<b>${text}</b>`;
            if (val.font.italic) text = `<i>${text}</i>`;
            if (val.font.underline) text = `<u>${text}</u>`;
          }
          return text;
        }
        return String(val);
      };

      // Helper: convert Google Drive share links to direct image URLs
      const toDirectImageUrl = (url: string): string => {
        if (!url) return '';
        const s = cellToString(url).trim();
        if (!s) return '';
        const driveMatch = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        const openMatch = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
        if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
        return s;
      };

      parsedData = parsedData.map((row: any) => {
        // ── English Question ─────────────────────────────────────────────
        // Supports: "Question(english)", "Question (english)", "Question(en)", "question"
        const question =
          findExact(row, 'question(english)') ||
          findExact(row, 'question (english)') ||
          findExact(row, 'question(en)') ||
          findValue(row, ['question'], ['hi', 'hindi', '(hi)', 'image']);

        // ── English Options ──────────────────────────────────────────────
        // Supports "Option A", "Option A (hindi)" excluded by exact match first
        const option1 =
          findExact(row, 'option a') ||
          findExact(row, 'option(a)') ||
          findValue(row, ['option', '1'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['option', 'a'], ['hi', 'hindi', '(hi)']);
        const option2 =
          findExact(row, 'option b') ||
          findExact(row, 'option(b)') ||
          findValue(row, ['option', '2'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['option', 'b'], ['hi', 'hindi', '(hi)']);
        const option3 =
          findExact(row, 'option c') ||
          findExact(row, 'option(c)') ||
          findValue(row, ['option', '3'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['option', 'c'], ['hi', 'hindi', '(hi)']);
        const option4 =
          findExact(row, 'option d') ||
          findExact(row, 'option(d)') ||
          findValue(row, ['option', '4'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['option', 'd'], ['hi', 'hindi', '(hi)']);

        // ── Answer & Explanation (English) ──────────────────────────────
        const answer =
          findValue(row, ['correct'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['answer'], ['hi', 'hindi', '(hi)', 'image']);
        const explanation =
          findExact(row, 'explanation') ||
          findValue(row, ['solution'], ['hi', 'hindi', '(hi)']) ||
          findValue(row, ['explanation'], ['hi', 'hindi', '(hi)']);

        // ── Hindi Question ───────────────────────────────────────────────
        // Supports: "Question(hindi)", "Question (hindi)", "Question(hi)"
        const questionHindi =
          findExact(row, 'question(hindi)') ||
          findExact(row, 'question (hindi)') ||
          findExact(row, 'question(hi)') ||
          findValue(row, ['question', 'hi']) ||
          findValue(row, ['question', 'hindi']) ||
          findValue(row, ['question', '(hi)']);

        // ── Hindi Options ────────────────────────────────────────────────
        // NEW headers: "Option A (hindi)", "Option B (hindi)", "Option C (hindi)", "Option D (hindi)"
        const option1Hindi =
          findExact(row, 'option a (hindi)') ||
          findExact(row, 'option a(hindi)') ||
          findExact(row, 'option a (hi)') ||
          findValue(row, ['option', 'a', 'hindi']) ||
          findValue(row, ['option', '1', 'hi']) ||
          findValue(row, ['option', '1', 'hindi']);
        const option2Hindi =
          findExact(row, 'option b (hindi)') ||
          findExact(row, 'option b(hindi)') ||
          findExact(row, 'option b (hi)') ||
          findValue(row, ['option', 'b', 'hindi']) ||
          findValue(row, ['option', '2', 'hi']) ||
          findValue(row, ['option', '2', 'hindi']);
        const option3Hindi =
          findExact(row, 'option c (hindi)') ||
          findExact(row, 'option c(hindi)') ||
          findExact(row, 'option c (hi)') ||
          findValue(row, ['option', 'c', 'hindi']) ||
          findValue(row, ['option', '3', 'hi']) ||
          findValue(row, ['option', '3', 'hindi']);
        const option4Hindi =
          findExact(row, 'option d (hindi)') ||
          findExact(row, 'option d(hindi)') ||
          findExact(row, 'option d (hi)') ||
          findValue(row, ['option', 'd', 'hindi']) ||
          findValue(row, ['option', '4', 'hi']) ||
          findValue(row, ['option', '4', 'hindi']);

        // ── Answer & Explanation (Hindi) ─────────────────────────────────
        const answerHindi =
          findValue(row, ['correct', 'hi']) ||
          findValue(row, ['correct', 'hindi']) ||
          findValue(row, ['answer', 'hi']) ||
          findValue(row, ['answer', 'hindi']);
        const explanationHindi =
          findExact(row, 'explanation (hindi)') ||
          findExact(row, 'explanation(hindi)') ||
          findExact(row, 'explanation (hi)') ||
          findValue(row, ['solution', 'hi']) ||
          findValue(row, ['solution', 'hindi']) ||
          findValue(row, ['explanation', 'hi']) ||
          findValue(row, ['explanation', 'hindi']);

        // ── Images ───────────────────────────────────────────────────────
        const questionImage =
          findExact(row, 'question(image)') ||
          findExact(row, 'question image') ||
          findExact(row, 'q10') ||
          findExact(row, 'image') ||
          findExact(row, 'img') ||
          findValue(row, ['question', 'image']);
        const answerImage =
          findExact(row, 'answer(image)') ||
          findExact(row, 'answer image') ||
          findExact(row, 'solution(image)') ||
          findExact(row, 'solution image') ||
          findExact(row, 'solution_image') ||
          findValue(row, ['answer', 'image']) ||
          findValue(row, ['solution', 'image']);

        // ── Comprehension / Passage ─────────────────────────────────────
        // Tries every known variant of the column name the user might use.
        // Falls back to scanning ALL row keys for any key containing 'passage'.
        const passage = (() => {
          // Exact match attempts (after CSV/Excel lowercasing)
          const exact =
            findExact(row, 'paragraph questions') ||
            findExact(row, 'paragraph question') ||
            findExact(row, 'paragraph') ||
            findExact(row, 'passage question header') ||
            findExact(row, 'passage question Header') ||
            findExact(row, 'passage') ||
            findExact(row, 'comprehension') ||
            findValue(row, ['paragraph', 'questions']) ||
            findValue(row, ['passage', 'header']) ||
            findValue(row, ['comprehension']);
          if (exact) return exact;
          // Last resort: scan ALL keys for anything containing 'passage' or 'paragraph'
          const passageKey = Object.keys(row).find(k => k.toLowerCase().includes('passage') || k.toLowerCase().includes('paragraph'));
          return passageKey ? row[passageKey] : undefined;
        })();

        // Always save BOTH English and Hindi — students see their chosen language at test time
        return {
          id: cellToString(row.id || row._id || row['questions id'] || ""),
          question: cellToString(question),
          question_hindi: cellToString(questionHindi),
          options: [cellToString(option1), cellToString(option2), cellToString(option3), cellToString(option4)],
          options_hindi: [cellToString(option1Hindi), cellToString(option2Hindi), cellToString(option3Hindi), cellToString(option4Hindi)],
          answer: cellToString(answer),
          answer_hindi: cellToString(answerHindi),
          topic: cellToString(row.topic || row.subject || ""),
          explanation: cellToString(explanation),
          explanation_hindi: cellToString(explanationHindi),
          imageUrl: toDirectImageUrl(questionImage),
          solutionImageUrl: toDirectImageUrl(answerImage),
          passage: cellToString(passage),  // comprehension passage text
        };
      });

      // DEBUG CHECK: Did we find any passages?
      const passagesFound = parsedData.filter((r: any) => r.passage && r.passage.trim().length > 0);
      if (passagesFound.length === 0 && parsedData.length > 50) {
        const headers = Object.keys(parsedData[0] || {}).join(", ");
        alert(`WARNING: No reading comprehension passages were found in this file!\n\nThe system could not find any column containing the passage text. The columns detected in your file were:\n${headers}\n\nPlease ensure your passage column is correctly filled out.`);
      }

      // Special check: if options_hindi are all empty but we have bilingual data, try to use English as fallback if needed or just keep empty
      // Actually the Player handles the fallback nicely.

      const prefixMap: Record<string, string> = {
        "SSC CGL Tier 1": "SSC CGL Tier 1",
        "SSC CGL Tier 2": "SSC CGL Tier 2",
        "SSC Previous 2025": "SSC Previous 2025",
        "SSC Previous Tier 2 2025": "SSC Previous Tier 2 2025",
        "SSC Previous 2024": "SSC Previous 2024",
        "SSC Previous Tier 2 2024": "SSC Previous Tier 2 2024",
        "RRB NTPC CBT 1": "RRB NTPC CBT 1",
        "RRB NTPC CBT 2": "RRB NTPC CBT 2",
        "RRB Previous 2025": "RRB Previous 2025",
        "RRB Previous 2024": "RRB Previous 2024",
        "RRB Previous 2023": "RRB Previous 2023",
      };

      const testId = `${prefixMap[selectedCategory]}-Mock-${testNumber}`;

      const sanitizedData = JSON.parse(JSON.stringify(parsedData));

      setProcessStep("Saving to database...");

      let savePromise: Promise<any>;
      if (uploadTarget === "practice") {
        const subjectSlug = selectedPracticeSubject.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const topicSlug = selectedPracticeTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        savePromise = uploadPracticeQuestions(subjectSlug, topicSlug, sanitizedData);
      } else {
        savePromise = (async () => {
          // Step A: Write metadata to main table
          const { error: testErr } = await supabase.from('mock_tests').upsert({
            id: testId,
            test_name: testName || `${prefixMap[selectedCategory]} Mock ${testNumber}`,
            paper_name: testName || `${prefixMap[selectedCategory]} Mock ${testNumber}`,
            last_uploaded_at: new Date().toISOString(),
            is_locked: false,
            metadata: {
              categoryId: selectedCategory,
              testNumber: testNumber,
              questionCount: sanitizedData.length,
            }
          }, { onConflict: 'id' });
          if (testErr) throw testErr;

          // Step B: Delete old question chunks (re-upload scenario)
          await supabase.from('mock_test_questions').delete().eq('test_id', testId);

          // Step C: Write new question chunks in parallel
          const CHUNK_SIZE = 50;
          const totalChunks = Math.ceil(sanitizedData.length / CHUNK_SIZE);
          const chunkWrites = Array.from({ length: totalChunks }, (_, i) => ({
             test_id: testId,
             chunk_index: i,
             questions: sanitizedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
          }));
          
          setProcessStep(`Saving ${totalChunks} question chunks...`);
          const { error: chunkErr } = await supabase.from('mock_test_questions').insert(chunkWrites);
          if (chunkErr) throw chunkErr;
        })();
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database save timed out.")), 60000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      setProcessStep("Finalizing...");
      setStatus("success");
      setJsonInput("");
      setTestName("");
      setUploadProgress(null);
      await fetchAdminData(); // Refresh the grid
      
      setTimeout(() => {
        setStatus("idle");
        setProcessStep("");
        if (uploadTarget === "mock") setTestNumber(null); // Close the panel
      }, 3000);
      
    } catch (error: any) {
      console.error("Upload failed with error payload:", error);
      setStatus("error");
      setUploadProgress(null);
      
      let msg = error.message || "Failed to upload test series questions.";
      
      // Specifically catch rules or quota errors
      if (error.code === '42501' || error.message?.includes('policy')) {
        msg = "Upload blocked by Supabase RLS Policies. Please go to your Supabase Console -> Auth -> Policies and ensure you have write access.";
      } else if (error.code === "quota-exceeded") {
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
      await fetchAdminData();
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
      await fetchAdminData();
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
    "SSC Previous 2025": "SSC Previous 2025",
    "SSC Previous Tier 2 2025": "SSC Previous Tier 2 2025",
    "SSC Previous 2024": "SSC Previous 2024",
    "SSC Previous Tier 2 2024": "SSC Previous Tier 2 2024",
    "RRB NTPC CBT 1": "RRB NTPC CBT 1",
    "RRB NTPC CBT 2": "RRB NTPC CBT 2",
    "RRB Previous 2025": "RRB Previous 2025",
    "RRB Previous 2024": "RRB Previous 2024",
    "RRB Previous 2023": "RRB Previous 2023",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Portal (v3 - Rich Text)</h1>
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
        <button
          onClick={() => setUploadTarget("sales")}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${uploadTarget === 'sales' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
        >
          Sales & Insights
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

      {uploadTarget === "sales" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-xl font-bold border-b border-border pb-4">Sales & Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/80 mb-2">Total Revenue</p>
                <p className="text-4xl font-black">₹{purchases.reduce((acc, p) => acc + (p.amount || 499), 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            </div>
            <div className="bg-blue-50 text-blue-800 p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600/80 mb-2">Students Enrolled</p>
                <p className="text-4xl font-black">{new Set(purchases.map(p => p.userId)).size}</p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            {purchases.length === 0 ? (
              <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-sm font-semibold text-muted-foreground">No purchases recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted-foreground uppercase tracking-widest font-black bg-muted/80 border-b border-border">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">User ID / Order ID</th>
                      <th className="px-5 py-4">Package</th>
                      <th className="px-5 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((p, i) => (
                      <tr key={p.id || i} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-muted-foreground">
                          {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : p.date || "Unknown"}
                        </td>
                        <td className="px-5 py-4">
                           <div className="font-bold text-foreground truncate max-w-[200px]" title={p.userId}>{p.userId || "Unknown User"}</div>
                           <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">{p.orderId || "Offline / Legacy"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-black">{p.packageId}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-black text-emerald-600 text-sm">₹{p.amount || 499}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            
            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold">Test Paper Name (Displayed to Users)</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. SSC CGL 2025 Shift 1 Previous Paper"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

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
                <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel / CSV Upload</div>
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
                  <p className="text-xs text-muted-foreground">Make sure the Google Sheet access is set to "Anyone with the link can view". The headers should be standard (question, option1, answer, etc.) or bilingual-ready if that format is chosen.</p>
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg flex items-start gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
               <div>
                 <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Bilingual Upload Mode</p>
                 <p className="text-xs text-muted-foreground mt-0.5">
                   All Excel files are treated as <strong>Bilingual</strong>. Both English and Hindi columns will be saved. Students will see their chosen language automatically during the test.
                 </p>
                 <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/40 px-2 py-1 rounded">
                   Required headers: <strong>ID · Question(hindi) · Question(english) · Option A · Option A (hindi) · Option B · Option B (hindi) · Option C · Option C (hindi) · Option D · Option D (hindi) · Answer · Explanation · Explanation (hindi) · Question(image) · Answer(image)</strong>
                 </p>
               </div>
            </div>

            {uploadMode === "csv-file" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="space-y-2">
                  <label className="text-sm font-semibold">Upload Excel / CSV File</label>
                  <p className="text-xs text-muted-foreground">Supports <strong>.xlsx</strong> (Excel) and <strong>.csv</strong>. Excel headers: <code>ID, Question(hindi), Question(english), Option A, Option B, Option C, Option D, Answer, Explanation, Question(image), Answer(image)</code>.</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
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

          {/* Upload Progress UI */}
          {status === "uploading" && uploadProgress && uploadProgress.total > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <span className="text-sm font-black tabular-nums text-primary">
                  {Math.round((uploadProgress.done / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-primary/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {uploadProgress.done} of {uploadProgress.total} images uploaded
              </p>
            </div>
          )}

          {status === "uploading" && !uploadProgress && processStep && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-sm font-semibold text-primary">{processStep}</span>
            </div>
          )}

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
                <><div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> {uploadProgress ? `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}% Done` : (processStep || "Processing...")}</>
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
