import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://llvmuwgjsxuuloipwblw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsdm11d2dqc3h1dWxvaXB3Ymx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzMDgsImV4cCI6MjA5MTcyNTMwOH0.UABSHhRRLjk-HqyX1kVnXxSLry1iiC6isPAvYyzRGpo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
