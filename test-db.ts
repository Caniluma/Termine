import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('settings').select('*');
  console.log('settings:', data, error);
  const { data: d2, error: e2 } = await supabase.from('Settings').select('*');
  console.log('Settings:', d2, e2);
}
run();
