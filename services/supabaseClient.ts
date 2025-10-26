import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://hstfdsdbdcfijilvsnvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdGZkc2RiZGNmaWppbHZzbnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NTYwNDksImV4cCI6MjA3NzAzMjA0OX0.guUeAaHdxnYGVtHVqZDIn6ihDI7R9n6C_tCeG2EFlss';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);