import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    options: {
      data: {
        full_name: 'Test Temp',
        company_name: 'Test Inc Temp',
        role: 'hr',
      }
    }
  });
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
