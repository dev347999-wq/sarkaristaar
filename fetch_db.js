const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: chunks, error } = await supabase
    .from("mock_test_questions")
    .select("questions")
    .eq("test_id", "SSC Previous 2025-Mock-1")
    .order("chunk_index", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (!chunks || chunks.length === 0) {
    console.log("No chunks found");
    return;
  }

  const questionsData = chunks.flatMap(c => c.questions || []);
  console.log(`Found ${questionsData.length} questions.`);
  
  const q91 = questionsData[90];
  console.log("Q91 keys:", Object.keys(q91));
  console.log("Q91 passage:", q91.passage);
  console.log("Q91 question:", q91.question);
  
  if (!q91.passage) {
      console.log("Q91 RAW:", JSON.stringify(q91, null, 2));
  }
}

run();
