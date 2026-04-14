import { supabase } from "./supabase";

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
  dateCompleted: Date | string;
  testUploadedAt?: Date | string | any;
}

export interface SavedQuestion {
  id?: string; // used interchangeably with questionId in frontend
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
  savedAt: Date | string;
  explanation?: string;
  explanationHindi?: string;
}

export interface Note {
  id?: string;
  title: string;
  content: string;
  subject: string;
  topic: string;
  lastModified: Date | string;
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
  
  const { data, error } = await supabase.from("test_attempts").insert({
    user_id: userId,
    test_id: attempt.testId,
    test_title: attempt.testTitle,
    category: attempt.category,
    score: attempt.score,
    total_marks: attempt.totalMarks,
    accuracy: attempt.accuracy,
    time_spent_str: attempt.timeSpentStr,
    answers: attempt.answers,
    language: attempt.language,
    test_uploaded_at: attempt.testUploadedAt,
  }).select('id').single();

  if (error) throw error;
  return data.id;
};

export const getUserTestAttempts = async (userId: string): Promise<TestAttempt[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("date_completed", { ascending: false });

  if (error) return [];

  return data.map(dbRow => ({
    id: dbRow.id,
    testId: dbRow.test_id,
    testTitle: dbRow.test_title,
    category: dbRow.category,
    score: dbRow.score,
    totalMarks: dbRow.total_marks,
    accuracy: Number(dbRow.accuracy),
    timeSpentStr: dbRow.time_spent_str,
    answers: dbRow.answers,
    language: dbRow.language,
    dateCompleted: new Date(dbRow.date_completed),
    testUploadedAt: dbRow.test_uploaded_at ? { seconds: new Date(dbRow.test_uploaded_at).getTime() / 1000 } : null, // Mocking firestore timestamp to not break frontend
  })) as TestAttempt[];
};

export const getTestAttempt = async (userId: string, testId: string): Promise<TestAttempt | null> => {
  if (!userId || !testId) return null;
  
  const { data, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .order("date_completed", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    testId: data.test_id,
    testTitle: data.test_title,
    category: data.category,
    score: data.score,
    totalMarks: data.total_marks,
    accuracy: Number(data.accuracy),
    timeSpentStr: data.time_spent_str,
    answers: data.answers,
    language: data.language,
    dateCompleted: new Date(data.date_completed),
    testUploadedAt: data.test_uploaded_at ? { seconds: new Date(data.test_uploaded_at).getTime() / 1000 } : null,
  };
};

// -------------------------------------------------------------
// Saved Questions API
// -------------------------------------------------------------

export const saveQuestion = async (userId: string, question: Omit<SavedQuestion, "id" | "savedAt">) => {
  if (!userId) throw new Error("User ID is required");
  if (!question.questionId) throw new Error("Question ID is required");

  // Upsert using the specific questionId as the PK.
  const { data, error } = await supabase.from("saved_questions").upsert({
    question_id: question.questionId,
    user_id: userId,
    subject: question.subject,
    topic: question.topic,
    question_text: question.questionText,
    question_hindi: question.questionHindi,
    options: question.options || [],
    options_hindi: question.optionsHindi || [],
    correct_answer: question.correctAnswer,
    answer_hindi: question.answerHindi,
    user_notes: question.userNotes,
    image_url: question.imageUrl,
    explanation: question.explanation,
    explanation_hindi: question.explanationHindi,
    saved_at: new Date()
  }, { onConflict: 'question_id' });

  if (error) throw error;
  return question.questionId;
};

export const getSavedQuestions = async (userId: string): Promise<SavedQuestion[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("saved_questions")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) return [];

  return data.map(dbRow => ({
    id: dbRow.question_id, // map question_id to id for backwards compat
    questionId: dbRow.question_id,
    subject: dbRow.subject,
    topic: dbRow.topic,
    questionText: dbRow.question_text,
    questionHindi: dbRow.question_hindi,
    options: dbRow.options,
    optionsHindi: dbRow.options_hindi,
    correctAnswer: dbRow.correct_answer,
    answerHindi: dbRow.answer_hindi,
    userNotes: dbRow.user_notes,
    imageUrl: dbRow.image_url,
    explanation: dbRow.explanation,
    explanationHindi: dbRow.explanation_hindi,
    savedAt: new Date(dbRow.saved_at),
  })) as SavedQuestion[];
};

export const deleteSavedQuestion = async (userId: string, questionId: string) => {
  if (!userId || !questionId) throw new Error("User ID and Question ID are required");
  
  const { error } = await supabase
    .from("saved_questions")
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (error) throw error;
};

// -------------------------------------------------------------
// Notes API
// -------------------------------------------------------------

export const saveNote = async (userId: string, note: Omit<Note, "id" | "lastModified">, noteId?: string) => {
  if (!userId) throw new Error("User ID is required");
  
  const payload = {
    user_id: userId,
    title: note.title,
    content: note.content,
    subject: note.subject,
    topic: note.topic,
    last_modified: new Date()
  };

  let query = supabase.from("notes").insert(payload).select('id').single();

  if (noteId) {
    query = supabase.from("notes").update(payload).eq("id", noteId).select('id').single();
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.id;
};

export const getUserNotes = async (userId: string): Promise<Note[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("last_modified", { ascending: false });

  if (error) return [];

  return data.map(dbRow => ({
    id: dbRow.id,
    title: dbRow.title,
    content: dbRow.content,
    subject: dbRow.subject,
    topic: dbRow.topic,
    lastModified: new Date(dbRow.last_modified),
  })) as Note[];
};

export const deleteNote = async (userId: string, noteId: string) => {
  if (!userId || !noteId) throw new Error("User ID and Note ID are required");
  
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("user_id", userId)
    .eq("id", noteId);

  if (error) throw error;
};

// -------------------------------------------------------------
// Mock Tests API (Admin Uploads)
// -------------------------------------------------------------

export const getUploadedTestIds = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("mock_tests").select("id");
  if (error) return [];
  return data.map(row => row.id);
};

export const getUploadedTestsMetadata = async (): Promise<{id: string, isLocked: boolean, paperName?: string, lastUploadedAt?: any}[]> => {
  const { data, error } = await supabase.from("mock_tests").select("*");
  if (error) return [];

  return data.map(dbRow => ({
    id: dbRow.id,
    isLocked: dbRow.is_locked,
    paperName: dbRow.paper_name || dbRow.test_name || "",
    // format as firestore-like timestamp object
    lastUploadedAt: dbRow.last_uploaded_at ? { seconds: new Date(dbRow.last_uploaded_at).getTime() / 1000 } : null
  }));
};

export const updateMockTestLockStatus = async (testId: string, isLocked: boolean) => {
  const { error } = await supabase
    .from("mock_tests")
    .update({ is_locked: isLocked })
    .eq("id", testId);
  if (error) throw error;
};

export const getMockTest = async (testId: string): Promise<any> => {
  if (!testId) return null;
  
  // Get main document
  const { data: testDoc, error: testError } = await supabase
    .from("mock_tests")
    .select("*")
    .eq("id", testId)
    .single();

  if (testError || !testDoc) return null;

  // Get chunks
  const { data: chunks, error: chunksError } = await supabase
    .from("mock_test_questions")
    .select("*")
    .eq("test_id", testId)
    .order("chunk_index", { ascending: true });

  let questionsData = [];
  if (!chunksError && chunks && chunks.length > 0) {
    questionsData = chunks.flatMap(c => c.questions || []);
  }

  return {
    id: testDoc.id,
    testName: testDoc.test_name,
    paperName: testDoc.paper_name,
    isLocked: testDoc.is_locked,
    lastUploadedAt: testDoc.last_uploaded_at,
    questionsData,
    ...testDoc.metadata
  };
};

export const deleteMockTest = async (testId: string) => {
  if (!testId) throw new Error("Test ID is required");
  // Assuming ON DELETE CASCADE in db
  const { error } = await supabase.from("mock_tests").delete().eq("id", testId);
  if (error) throw error;
};

export const uploadPracticeQuestions = async (subjectSlug: string, topicSlug: string, questionsData: any[]) => {
  if (!subjectSlug || !topicSlug) throw new Error("Subject and Topic are required");
  const docId = `${subjectSlug}_${topicSlug}`;
  
  const { error } = await supabase.from("practice_questions").upsert({
    id: docId,
    subject_slug: subjectSlug,
    topic_slug: topicSlug,
    questions_data: questionsData,
    updated_at: new Date()
  }, { onConflict: 'id' });

  if (error) throw error;
};

export const getPracticeQuestions = async (subjectSlug: string, topicSlug: string) => {
  if (!subjectSlug || !topicSlug) return null;
  const docId = `${subjectSlug}_${topicSlug}`;
  
  const { data, error } = await supabase
    .from("practice_questions")
    .select("questions_data")
    .eq("id", docId)
    .single();

  if (error || !data) return [];
  return data.questions_data;
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
  
  const { data, error } = await supabase.from("purchases").insert({
    user_id: userId,
    package_id: packageId,
    order_id: paymentDetails.orderId || paymentDetails.razorpay_order_id,
    payment_id: paymentDetails.paymentId || paymentDetails.razorpay_payment_id,
    amount: paymentDetails.amount,
    date: new Date().toISOString(),
    created_at: new Date()
  }).select('id').single();

  if (error) throw error;
  return data.id;
};

export const getUserPurchases = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("purchases")
    .select("package_id")
    .eq("user_id", userId);

  if (error) return [];
  return data.map(dbRow => dbRow.package_id as string);
};

export const getDetailedPurchases = async (userId: string): Promise<any[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data.map(dbRow => ({
    id: dbRow.id,
    packageId: dbRow.package_id,
    orderId: dbRow.order_id,
    paymentId: dbRow.payment_id,
    amount: dbRow.amount,
    date: dbRow.date,
    createdAt: { toDate: () => new Date(dbRow.created_at) } // Mock firestore timestamp format
  }));
};

export const getAllPurchases = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data.map(dbRow => ({
    id: dbRow.id,
    userId: dbRow.user_id,
    packageId: dbRow.package_id,
    orderId: dbRow.order_id,
    paymentId: dbRow.payment_id,
    amount: dbRow.amount,
    date: dbRow.date,
    createdAt: { toDate: () => new Date(dbRow.created_at) }
  }));
};
