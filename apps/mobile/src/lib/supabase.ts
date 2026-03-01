import { createClient } from '@supabase/supabase-js';

// Hardcoded for hackathon — anon key is designed to be public
const SUPABASE_URL = 'https://ooynwcqtgbqdqekrnxhe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veW53Y3F0Z2JxZHFla3JueGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMTUyNjYsImV4cCI6MjA4Nzg5MTI2Nn0.WgXq2XjNj5RgkemWnzHPUMpzqQAarzKWVh_PHnvQZMU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
