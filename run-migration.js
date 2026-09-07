const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://yvwcgljzcnbekzjkgmia.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d2NnbGp6Y25iZWt6amtnbWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMwMDczMiwiZXhwIjoyMDc4ODc2NzMyfQ.RSV1xGBexKpaSMazUW1n-xLCkZQ-Sct2hKoY5ltcE9I';

const supabase = createClient(url, key);

async function run() {
    const sql = fs.readFileSync('supabase/migrations/20260907_create_reports_table.sql', 'utf8');
    console.log('Attempting to execute migration on Supabase...');

    // Try rpc 'exec_sql' or similar if defined
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.log('RPC exec_sql error:', error.message);
    } else {
        console.log('Migration executed successfully:', data);
    }
}

run();
