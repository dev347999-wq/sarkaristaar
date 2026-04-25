// One-off script: delete SSC Previous 2023 Pre + Mains papers from Supabase
// Run with: node scripts/delete-2023-papers.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eyxxatvxvzomjtzgfaej.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AayHoaNyRr5xs7zstYfcKQ_QWJtTFR7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deletePapers() {
  console.log('🔍 Fetching all mock_tests to find 2023 papers...');
  
  const { data: allTests, error: fetchError } = await supabase
    .from('mock_tests')
    .select('id');

  if (fetchError) {
    console.error('❌ Failed to fetch tests:', fetchError.message);
    process.exit(1);
  }

  // Find all 2023 Pre and Mains IDs
  const toDelete = allTests
    .map(t => t.id)
    .filter(id => id.startsWith('SSC Previous 2023-') || id.startsWith('SSC Previous Tier 2 2023-'));

  if (toDelete.length === 0) {
    console.log('ℹ️  No SSC Previous 2023 papers found in the database.');
    process.exit(0);
  }

  console.log(`\n📋 Found ${toDelete.length} papers to delete:`);
  toDelete.forEach(id => console.log(`   - ${id}`));
  console.log('');

  // Delete from mock_tests (mock_test_questions will cascade automatically)
  const { error: deleteError } = await supabase
    .from('mock_tests')
    .delete()
    .in('id', toDelete);

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${toDelete.length} SSC Previous 2023 papers (Pre + Mains).`);
  console.log('   Associated mock_test_questions were cascade-deleted automatically.');
}

deletePapers();
