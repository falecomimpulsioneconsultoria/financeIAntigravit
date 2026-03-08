import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vjvdahidnapvuhalgtpl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmRhaGlkbmFwdnVoYWxndHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzgwMjksImV4cCI6MjA4MDYxNDAyOX0.xrRTfIpbzHqUS4_tpJsCH7VD5cLs2TMVGCFGE0qdG7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function renewAccess() {
  console.log('Fetching profiles...');
  const { data: profiles, error: fetchError } = await supabase.from('profiles').select('id');
  
  if (fetchError) {
    console.error('Error fetching profiles:', fetchError);
    return;
  }
  
  console.log(`Found ${profiles?.length || 0} profiles. Updating...`);
  
  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          expiration_date: '2026-12-31T23:59:59Z',
          payment_status: 'PAID',
          is_active: true
        })
        .eq('id', profile.id);
        
      if (updateError) {
        console.error(`Error updating profile ${profile.id}:`, updateError);
      } else {
        console.log(`Successfully updated profile ${profile.id}`);
      }
    }
  }
}

renewAccess();
