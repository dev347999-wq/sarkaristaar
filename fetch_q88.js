const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('mock_test_questions')
    .select('questions')
    .eq('test_id', 'SSC Previous 2025-Mock-1');

  if (error) {
    console.error(error);
    return;
  }

  let foundQ = null;
  for (const chunk of data) {
    const q = chunk.questions.find(q => String(q.serial_no).includes('88') || String(q.id) === '88');
    if (q) { foundQ = q; break; }
  }
  console.log("Found Question:");
  console.log(JSON.stringify(foundQ, null, 2));
}

check();
