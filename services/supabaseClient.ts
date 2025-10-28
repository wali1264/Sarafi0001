import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://fpvizquoldivgralkrrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdml6cXVvbGRpdmdyYWxrcnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDc4NTQsImV4cCI6MjA3NzIyMzg1NH0.QDEYJ_PFHMV8hdoXoVIJihX1mYMHc0ZrzJDuvDnKlCM';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);