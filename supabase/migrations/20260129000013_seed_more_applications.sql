-- Migration: Seed 15 More Applications
-- Description: Adds bulk mock data for Leads and Applications to populate the dashboard.

DO $$
DECLARE
  v_school_id uuid;
  v_class_id uuid;
  v_source_id uuid;
  v_stage_app uuid;
  v_lead_id uuid;
  v_user_id uuid;
  i integer;
  v_names text[] := ARRAY['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Reyansh', 'Muhammad', 'Rohan', 'Krishna', 'Ishaan', 'Diya', 'Ananya', 'Saanvi', 'Myra', 'Aadhya', 'Kiara', 'Pari', 'Fatima'];
  v_surnames text[] := ARRAY['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Khan', 'Singh', 'Gupta', 'Kumar', 'Das', 'Iyer', 'Mehta', 'Joshi', 'Chopra', 'Malhotra'];
  v_statuses text[] := ARRAY['pending', 'pending', 'pending', 'approved', 'approved', 'rejected', 'waitlisted'];
  v_random_name text;
  v_random_surname text;
  v_random_status text;
BEGIN
  -- 1. Get School, User, Class, Source
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_id LIMIT 1;
  SELECT id INTO v_source_id FROM admission_lead_sources WHERE name = 'Website' LIMIT 1;
  SELECT id INTO v_stage_app FROM admission_funnel_stages WHERE name = 'Application Received' LIMIT 1;

  IF v_school_id IS NOT NULL THEN
    
    FOR i IN 1..18 LOOP
      -- Generate Random Data
      v_random_name := v_names[1 + floor(random() * array_length(v_names, 1))];
      v_random_surname := v_surnames[1 + floor(random() * array_length(v_surnames, 1))];
      v_random_status := v_statuses[1 + floor(random() * array_length(v_statuses, 1))];

      -- 2. Create Lead
      INSERT INTO admission_leads (
        school_id, 
        lead_number, 
        parent_name, 
        student_name, 
        contact_number, 
        lead_source_id, 
        applying_class_id, 
        current_stage_id, 
        status, 
        assigned_counselor_id,
        created_at
      )
      VALUES (
        v_school_id, 
        'LD-MOCK-' || i || floor(random()*1000)::text, 
        'P-' || v_random_name || ' ' || v_random_surname, 
        v_random_name || ' ' || v_random_surname, 
        '98765' || LPAD(i::text, 5, '0'), 
        v_source_id, 
        v_class_id, 
        v_stage_app, 
        'active', 
        v_user_id,
        NOW() - (i || ' days')::interval
      )
      RETURNING id INTO v_lead_id;

      -- 3. Create Application
      INSERT INTO admission_applications (
        school_id, 
        application_number, 
        lead_id, 
        student_name, 
        parent_name, 
        contact_number, 
        applying_class_id, 
        status, 
        decision_status,
        application_date,
        created_at
      )
      VALUES (
        v_school_id, 
        'APP-MOCK-' || i || floor(random()*1000)::text, 
        v_lead_id, 
        v_random_name || ' ' || v_random_surname, 
        'P-' || v_random_name || ' ' || v_random_surname, 
        '98765' || LPAD(i::text, 5, '0'), 
        v_class_id, 
        'submitted', 
        v_random_status,
        CURRENT_DATE - (i || ' days')::interval,
        NOW() - (i || ' days')::interval
      );
    END LOOP;

  END IF;
END $$;
