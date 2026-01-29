import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSchool() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        // CALL THE AUTO-LINK RPC
        // This function finds a valid school AND updates the user's profile in the DB to point to it.
        // This is critical for RLS to work.
        const { data: linkedSchoolId, error } = await supabase.rpc('link_user_to_demo_school');

        if (linkedSchoolId) {
          setSchoolId(linkedSchoolId);
        } else {
          console.error('Auto-link RPC failed:', error);

          // Fallbacks should be unnecessary now, but keeping for safety
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('user_profiles')
              .select('school_id')
              .eq('id', user.id)
              .single();
            if (data?.school_id) setSchoolId(data.school_id);
          }
        }
      } catch (error) {
        console.error('Error in useSchool:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, []);

  return { schoolId, loading };
}
