import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syblfficocpoqetddcqs.supabase.co';
// Anon key from Supabase project settings
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NTI5MzUsImV4cCI6MjA1MjUyODkzNX0.sb_publishable_1b_meTtUZubtJcPBWsIZYQ_defk6bya';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
