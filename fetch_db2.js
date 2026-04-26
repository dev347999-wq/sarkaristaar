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
  
  const questionsData = chunks.flatMap(c => c.questions || []);
  
  const passageQs = questionsData.filter(q => q.passage);
  console.log(`Found ${passageQs.length} questions with a passage field.`);
  
  if (passageQs.length > 0) {
      console.log("First question with passage has ID:", passageQs[0].id);
      console.log("Passage text snippet:", passageQs[0].passage.substring(0, 50));
  }
}

run();
