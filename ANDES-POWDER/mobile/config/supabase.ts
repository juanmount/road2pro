import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syblfficocpoqetddcqs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmxmZmljb2Nwb3FldGRkY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM1MzIsImV4cCI6MjA4OTMyOTUzMn0.ziepRZ9nkgypRTxM4qZdiR8bOVPlUXi4l7PSHd6Nzag';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
