const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('last_uploaded_at')
    .eq('id', 'SSC Previous 2025-Mock-1')
    .single();

  if (error) {
    console.error(error);
    return;
  }
  console.log("Last uploaded at:", data.last_uploaded_at);
}

check();
