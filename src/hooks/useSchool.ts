import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSchool() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const { data } = await supabase
          .from('schools')
          .select('id')
          .eq('name', 'Demo International School')
          .maybeSingle();
        if (data) {
          setSchoolId(data.id);
        }
      } catch (error) {
        console.error('Error fetching school:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, []);

  return { schoolId, loading };
}
