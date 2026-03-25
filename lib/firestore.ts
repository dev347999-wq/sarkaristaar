import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where,
  limit,
  Timestamp,
  deleteDoc
} from "firebase/firestore";

// Types
export interface TestAttempt {
  id?: string;
  testId: string;
  testTitle: string;
  category: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  timeSpentStr: string;
  answers: Record<string, string>;
  language?: string;
  dateCompleted: Date;
}

export interface SavedQuestion {
  id?: string;
  questionId: string;
  subject: string;
  topic: string;
  questionText: string;
  questionHindi?: string;
  options: string[];
  optionsHindi?: string[];
  correctAnswer: string;
  answerHindi?: string;
  userNotes?: string;
  imageUrl?: string;
  savedAt: Date;
  explanation?: string;
  explanationHindi?: string;
}

export interface Note {
  id?: string;
  title: string;
  content: string;
  subject: string;
  topic: string;
  lastModified: Date;
}

// Subject Normalization Utility
export const normalizeSubject = (subject: string): string => {
  const s = subject.toLowerCase();
  if (s.includes("math") || s.includes("quant")) return "Maths";
  if (s.includes("english") || s.includes("vocab") || s.includes("grammar")) return "English";
  if (s.includes("reasoning") || s.includes("intelligence")) return "Reasoning";
  if (s.includes("awareness") || s.includes("gs") || s.includes("ga") || s.includes("science") || s.includes("history") || s.includes("polity")) return "GS";
  if (s.includes("computer")) return "Computer";
  return subject; // Fallback to original if no match
};

// -------------------------------------------------------------
// Test Attempts API
// -------------------------------------------------------------

export const saveTestAttempt = async (userId: string, attempt: Omit<TestAttempt, "id" | "dateCompleted">) => {
  if (!userId) throw new Error("User ID is required");
  
  const attemptsRef = collection(db, "users", userId, "test_attempts");
  const newAttemptData = {
    ...attempt,
    dateCompleted: Timestamp.now(),
  };

  const docRef = await addDoc(attemptsRef, newAttemptData);
  return docRef.id;
};

export const getUserTestAttempts = async (userId: string): Promise<TestAttempt[]> => {
  if (!userId) return [];

  const attemptsRef = collection(db, "users", userId, "test_attempts");
  const q = query(attemptsRef, orderBy("dateCompleted", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateCompleted: data.dateCompleted ? (data.dateCompleted.toDate ? data.dateCompleted.toDate() : new Date(data.dateCompleted)) : new Date(),
    } as TestAttempt;
  });
};

export const getTestAttempt = async (userId: string, testId: string): Promise<TestAttempt | null> => {
  if (!userId || !testId) return null;
  const attemptsRef = collection(db, "users", userId, "test_attempts");
  // Remove orderBy from query to avoid composite index requirement
  const q = query(attemptsRef, where("testId", "==", testId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) return null;
  
  // Sort in JS to find the latest
  const attempts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    let dateObj: Date;
    try {
      dateObj = data.dateCompleted ? (data.dateCompleted.toDate ? data.dateCompleted.toDate() : new Date(data.dateCompleted)) : new Date();
    } catch (e) {
      dateObj = new Date();
    }
    
    return {
      id: doc.id,
      ...data,
      dateCompleted: dateObj
    } as TestAttempt;
  }).sort((a, b) => b.dateCompleted.getTime() - a.dateCompleted.getTime());
  
  return attempts[0];
};

// -------------------------------------------------------------
// Saved Questions API
// -------------------------------------------------------------

export const saveQuestion = async (userId: string, question: Omit<SavedQuestion, "id" | "savedAt">) => {
  if (!userId) throw new Error("User ID is required");
  if (!question.questionId) throw new Error("Question ID is required");

  // Use the specific questionId as document ID so a user can't save the same question twice
  const questionRef = doc(db, "users", userId, "saved_questions", question.questionId);
  
  const questionData: any = {
    ...question,
    savedAt: Timestamp.now(),
  };

  // Firestore throws an error if you try to save 'undefined'. Remove undefined fields.
  Object.keys(questionData).forEach(key => {
    if (questionData[key] === undefined) {
      delete questionData[key];
    }
  });

  await setDoc(questionRef, questionData);
  return question.questionId;
};

export const getSavedQuestions = async (userId: string): Promise<SavedQuestion[]> => {
  if (!userId) return [];

  const questionsRef = collection(db, "users", userId, "saved_questions");
  const q = query(questionsRef, orderBy("savedAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      savedAt: data.savedAt.toDate(),
    } as SavedQuestion;
  });
};

export const deleteSavedQuestion = async (userId: string, questionId: string) => {
  if (!userId || !questionId) throw new Error("User ID and Question ID are required");
  
  const questionRef = doc(db, "users", userId, "saved_questions", questionId);
  await deleteDoc(questionRef);
};

// -------------------------------------------------------------
// Notes API
// -------------------------------------------------------------

export const saveNote = async (userId: string, note: Omit<Note, "id" | "lastModified">, noteId?: string) => {
  if (!userId) throw new Error("User ID is required");
  
  const notesRef = noteId 
    ? doc(db, "users", userId, "notes", noteId)
    : doc(collection(db, "users", userId, "notes"));
    
  const noteData = {
    ...note,
    lastModified: Timestamp.now(),
  };

  await setDoc(notesRef, noteData, { merge: true });
  return notesRef.id;
};

export const getUserNotes = async (userId: string): Promise<Note[]> => {
  if (!userId) return [];

  const notesRef = collection(db, "users", userId, "notes");
  const q = query(notesRef, orderBy("lastModified", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      lastModified: data.lastModified.toDate(),
    } as Note;
  });
};

export const deleteNote = async (userId: string, noteId: string) => {
  if (!userId || !noteId) throw new Error("User ID and Note ID are required");
  const noteRef = doc(db, "users", userId, "notes", noteId);
  await deleteDoc(noteRef);
};

// -------------------------------------------------------------
// Mock Tests API (Admin Uploads)
// -------------------------------------------------------------

export const getUploadedTestIds = async (): Promise<string[]> => {
  const testsRef = collection(db, "mock_tests");
  // We just need the document IDs to know which tests actually exist
  const querySnapshot = await getDocs(testsRef);
  return querySnapshot.docs.map(doc => doc.id);
};

export const getUploadedTestsMetadata = async (): Promise<{id: string, isLocked: boolean, paperName?: string}[]> => {
  const testsRef = collection(db, "mock_tests");
  const querySnapshot = await getDocs(testsRef);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      isLocked: data.isLocked !== undefined ? data.isLocked : false,
      paperName: data.paperName || data.testName || ""
    };
  });
};

export const updateMockTestLockStatus = async (testId: string, isLocked: boolean) => {
  const testRef = doc(db, "mock_tests", testId);
  await setDoc(testRef, { isLocked }, { merge: true });
};

export const getMockTest = async (testId: string) => {
  if (!testId) return null;
  const testRef = doc(db, "mock_tests", testId);
  const docSnap = await getDoc(testRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data();

  // New chunked format: questions stored in subcollection
  const chunksRef = collection(db, "mock_tests", testId, "questions");
  const chunksSnap = await getDocs(chunksRef);

  if (!chunksSnap.empty) {
    // Sort chunks by their numeric index and flatten
    const sortedChunks = chunksSnap.docs
      .sort((a, b) => {
        const aIdx = parseInt(a.id.replace('chunk-', '')) || 0;
        const bIdx = parseInt(b.id.replace('chunk-', '')) || 0;
        return aIdx - bIdx;
      });
    const questionsData = sortedChunks.flatMap(c => c.data().questions || []);
    return { id: docSnap.id, ...data, questionsData };
  }

  // Legacy flat format: questions embedded in main doc
  return { id: docSnap.id, ...data };
};

export const deleteMockTest = async (testId: string) => {
  if (!testId) throw new Error("Test ID is required");
  
  // Delete subcollection question chunks first
  const chunksRef = collection(db, "mock_tests", testId, "questions");
  const chunksSnap = await getDocs(chunksRef);
  await Promise.all(chunksSnap.docs.map(d => deleteDoc(d.ref)));
  
  // Then delete the main document
  const testRef = doc(db, "mock_tests", testId);
  await deleteDoc(testRef);
};

export const uploadPracticeQuestions = async (subjectSlug: string, topicSlug: string, questionsData: any[]) => {
  if (!subjectSlug || !topicSlug) throw new Error("Subject and Topic are required");
  const docId = `${subjectSlug}_${topicSlug}`;
  const docRef = doc(db, "practice_questions", docId);
  await setDoc(docRef, {
    subjectSlug,
    topicSlug,
    questionsData,
    updatedAt: new Date()
  }, { merge: true });
};

export const getPracticeQuestions = async (subjectSlug: string, topicSlug: string) => {
  if (!subjectSlug || !topicSlug) return null;
  const docId = `${subjectSlug}_${topicSlug}`;
  const docRef = doc(db, "practice_questions", docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().questionsData || [];
  }
  return [];
};

// -------------------------------------------------------------
// Purchases API
// -------------------------------------------------------------

export interface PurchaseRecord {
  id?: string;
  packageId: string; // e.g., "SSC CGL"
  orderId: string;
  paymentId: string;
  amount?: number;
  date: string;
}

export const recordPurchase = async (userId: string, packageId: string, paymentDetails: any) => {
  if (!userId || !packageId) throw new Error("User ID and Package ID are required");
  const purchaseRef = doc(collection(db, "users", userId, "purchases"));
  await setDoc(purchaseRef, {
    packageId,
    ...paymentDetails,
    createdAt: Timestamp.now()
  });
  return purchaseRef.id;
};

export const getUserPurchases = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const purchasesRef = collection(db, "users", userId, "purchases");
  const querySnapshot = await getDocs(purchasesRef);
  return querySnapshot.docs.map(doc => doc.data().packageId as string);
};
