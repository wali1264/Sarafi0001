
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://qszsnsudbmfjlngsjosl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzenNuc3VkYm1mamxuZ3Nqb3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTczMDMsImV4cCI6MjA4MDQzMzMwM30.U4M64yViSqeTbN0zgEVfvYNlkq8pzz8bd3VAnTfSgzI';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
