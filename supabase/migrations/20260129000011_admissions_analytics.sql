-- Migration: Admission Analytics & Counsellors
-- Description: RPCs for fetching counselor performance and detailed analytics.

-- 1. Get Counselor Performance Metrics
CREATE OR REPLACE FUNCTION get_admission_counsellors_analytics(p_school_id uuid)
RETURNS TABLE (
  counselor_id uuid,
  counselor_name text,
  total_leads integer,
  active_leads integer,
  converted_leads integer,
  conversion_rate numeric,
  avg_response_time_minutes integer
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as counselor_id,
    COALESCE(up.full_name, u.email) as counselor_name,
    COUNT(l.id)::integer as total_leads,
    COUNT(CASE WHEN l.status = 'active' THEN 1 END)::integer as active_leads,
    COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::integer as converted_leads,
    CASE 
      WHEN COUNT(l.id) > 0 THEN ROUND((COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::numeric / COUNT(l.id)::numeric) * 100, 1)
      ELSE 0 
    END as conversion_rate,
    0 as avg_response_time_minutes -- Placeholder for future logic
  FROM admission_leads l
  JOIN auth.users u ON l.assigned_counselor_id = u.id
  LEFT JOIN user_profiles up ON u.id = up.id
  WHERE l.school_id = p_school_id
  GROUP BY u.id, up.full_name, u.email
  ORDER BY converted_leads DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admission_counsellors_analytics TO authenticated;

-- 2. Validate Referral Code (Ensure it exists if not already)
-- (Already added in previous migration, skipping duplicate)

-- 3. Get Pipeline Stages (Helper for Analytics)
CREATE OR REPLACE FUNCTION get_pipeline_analytics(p_school_id uuid)
RETURNS TABLE (
  stage_name text,
  lead_count integer,
  total_value numeric -- Placeholder if we had fees linked
)
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.name as stage_name,
    COUNT(l.id)::integer as lead_count,
    0::numeric as total_value
  FROM admission_funnel_stages fs
  LEFT JOIN admission_leads l ON fs.id = l.current_stage_id
  WHERE fs.school_id = p_school_id
  GROUP BY fs.id, fs.name, fs.stage_order
  ORDER BY fs.stage_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pipeline_analytics TO authenticated;
