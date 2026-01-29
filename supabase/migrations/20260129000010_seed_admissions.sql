-- Migration: Seed Admissions Data
-- Description: Populates initial configuration and mock data for admissions.

DO $$
DECLARE
  v_school_id uuid;
  v_class_id uuid;
  v_stage_inquiry uuid;
  v_stage_contacted uuid;
  v_stage_visit uuid;
  v_stage_app uuid;
  v_stage_converted uuid;
  v_source_walkin uuid;
  v_source_web uuid;
  v_lead_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Get School ID
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users LIMIT 1; -- Just grab any user for 'assigned_counselor'

  IF v_school_id IS NOT NULL THEN
    
    -- 2. Seed Lead Sources
    INSERT INTO admission_lead_sources (school_id, name, type) VALUES
    (v_school_id, 'Walk-in', 'offline'),
    (v_school_id, 'Website', 'online'),
    (v_school_id, 'Social Media', 'online'),
    (v_school_id, 'Referral', 'other')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_source_walkin FROM admission_lead_sources WHERE name = 'Walk-in' LIMIT 1;
    SELECT id INTO v_source_web FROM admission_lead_sources WHERE name = 'Website' LIMIT 1;

    -- 3. Seed Funnel Stages
    INSERT INTO admission_funnel_stages (school_id, name, stage_order, stage_category, color_code) VALUES
    (v_school_id, 'New Inquiry', 1, 'open', '#3b82f6'), -- Blue
    (v_school_id, 'Contacted', 2, 'open', '#f59e0b'), -- Amber
    (v_school_id, 'Visit Scheduled', 3, 'open', '#8b5cf6'), -- Purple
    (v_school_id, 'Application Received', 4, 'open', '#10b981'), -- Green
    (v_school_id, 'Converted', 5, 'closed_won', '#059669') -- Dark Green
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_stage_inquiry FROM admission_funnel_stages WHERE name = 'New Inquiry' LIMIT 1;
    SELECT id INTO v_stage_contacted FROM admission_funnel_stages WHERE name = 'Contacted' LIMIT 1;
    SELECT id INTO v_stage_converted FROM admission_funnel_stages WHERE name = 'Converted' LIMIT 1;

    -- 4. Seed Leads (Mock)
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id LIMIT 1;

    -- Lead 1
    INSERT INTO admission_leads (school_id, lead_number, parent_name, student_name, contact_number, lead_source_id, applying_class_id, current_stage_id, status, assigned_counselor_id)
    VALUES (v_school_id, 'LD-1001', 'Amit Patel', 'Arav Patel', '9876543210', v_source_walkin, v_class_id, v_stage_inquiry, 'active', v_user_id)
    RETURNING id INTO v_lead_id;

    -- Lead 2
    INSERT INTO admission_leads (school_id, lead_number, parent_name, student_name, contact_number, lead_source_id, applying_class_id, current_stage_id, status, priority, assigned_counselor_id)
    VALUES (v_school_id, 'LD-1002', 'Sara Khan', 'Zoya Khan', '9876543211', v_source_web, v_class_id, v_stage_contacted, 'active', 'high', v_user_id);

    -- Lead 3 (Converted)
    INSERT INTO admission_leads (school_id, lead_number, parent_name, student_name, contact_number, lead_source_id, applying_class_id, current_stage_id, status, assigned_counselor_id)
    VALUES (v_school_id, 'LD-1003', 'John Doe', 'Johnny Doe', '9876543212', v_source_walkin, v_class_id, v_stage_converted, 'converted', v_user_id);

    -- 5. Seed Applications
    INSERT INTO admission_applications (school_id, application_number, lead_id, student_name, parent_name, contact_number, applying_class_id, status, decision_status)
    VALUES (v_school_id, 'APP-2025-001', v_lead_id, 'Arav Patel', 'Amit Patel', '9876543210', v_class_id, 'submitted', 'pending');

  END IF;
END $$;
