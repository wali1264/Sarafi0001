import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://hxmrtpdxupursmjpocpi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4bXJ0cGR4dXB1cnNtanBvY3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODE5MjUsImV4cCI6MjA3NzA1NzkyNX0.CDSk0Y-IY9TFrtdvcNmrHT9z9nugPK4sNNY6OtcUfBU';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);