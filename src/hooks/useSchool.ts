import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSchool() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        // Use RPC to get the school ID directly from the user profile
        // This bypasses RLS on the 'schools' table and avoids hardcoded names
        const { data, error } = await supabase.rpc('get_user_school');

        if (error || !data) {
          if (error) console.error('Error fetching school ID via RPC:', error);

          // Fallback: Try fetching by name using Secure RPC (bypasses RLS)
          const { data: fallbackId } = await supabase.rpc('get_school_by_name', { p_name: 'Demo International School' });

          if (fallbackId) setSchoolId(fallbackId);
        } else {
          setSchoolId(data);
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
