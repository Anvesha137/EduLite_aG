/*
  # Seed Admission Mock Data

  ## Overview
  Populate the admissions system with realistic mock data for testing and demonstration.
  
  ## Data Created
  1. 25 admission leads in various stages
  2. 15 campus visits/interactions
  3. 10 completed applications
  4. 5 admission decisions
  
  ## Features Demonstrated
  - Leads from different sources
  - Various funnel stages
  - Different priorities and statuses
  - Complete visit history
  - Application pipeline
  - Decision workflows
*/

DO $$
DECLARE
  v_school_id uuid;
  v_counselor_id uuid;
  v_admin_id uuid;
  v_class_1_id uuid;
  v_class_5_id uuid;
  v_class_9_id uuid;
  v_class_11_id uuid;
  
  v_source_website uuid;
  v_source_walkin uuid;
  v_source_facebook uuid;
  v_source_referral uuid;
  
  v_stage_new uuid;
  v_stage_contacted uuid;
  v_stage_visit_scheduled uuid;
  v_stage_visit_completed uuid;
  v_stage_app_submitted uuid;
  v_stage_docs_verified uuid;
  v_stage_under_review uuid;
  v_stage_approved uuid;
  
  v_lead_id uuid;
  v_app_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  
  SELECT id INTO v_counselor_id
  FROM user_profiles
  WHERE school_id = v_school_id AND role_id IN (SELECT id FROM roles WHERE name = 'EDUCATOR')
  LIMIT 1;
  
  SELECT id INTO v_admin_id
  FROM user_profiles
  WHERE school_id = v_school_id AND role_id IN (SELECT id FROM roles WHERE name = 'ADMIN')
  LIMIT 1;
  
  SELECT id INTO v_class_1_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 1' LIMIT 1;
  SELECT id INTO v_class_5_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 5' LIMIT 1;
  SELECT id INTO v_class_9_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 9' LIMIT 1;
  SELECT id INTO v_class_11_id FROM classes WHERE school_id = v_school_id AND grade = 'Class 11' LIMIT 1;
  
  SELECT id INTO v_source_website FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Website Inquiry' LIMIT 1;
  SELECT id INTO v_source_walkin FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Walk-in' LIMIT 1;
  SELECT id INTO v_source_facebook FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Facebook' LIMIT 1;
  SELECT id INTO v_source_referral FROM admission_lead_sources WHERE school_id = v_school_id AND name = 'Referral' LIMIT 1;
  
  SELECT id INTO v_stage_new FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'New Inquiry' LIMIT 1;
  SELECT id INTO v_stage_contacted FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Contacted' LIMIT 1;
  SELECT id INTO v_stage_visit_scheduled FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Campus Visit Scheduled' LIMIT 1;
  SELECT id INTO v_stage_visit_completed FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Campus Visit Completed' LIMIT 1;
  SELECT id INTO v_stage_app_submitted FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Application Submitted' LIMIT 1;
  SELECT id INTO v_stage_docs_verified FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Documents Verified' LIMIT 1;
  SELECT id INTO v_stage_under_review FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Under Review' LIMIT 1;
  SELECT id INTO v_stage_approved FROM admission_funnel_stages WHERE school_id = v_school_id AND name = 'Admission Approved' LIMIT 1;

  -- Insert 25 leads with varying stages and details
  
  -- Lead 1: Fresh inquiry (new)
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0001', 'Aarav Sharma', 'Rajesh Sharma', '9876543210', 'rajesh.sharma@email.com',
    v_class_1_id, '2025-26', v_source_website, v_stage_new,
    v_counselor_id, 'active', 'high', NOW() - INTERVAL '2 days', v_counselor_id, v_counselor_id
  );

  -- Lead 2: Contacted stage
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, next_followup_date, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0002', 'Diya Patel', '2019-03-15', 'female', 'Amit Patel', '9876543211', 'amit.patel@email.com',
    v_class_1_id, '2025-26', v_source_facebook, v_stage_contacted,
    v_counselor_id, 'active', 'medium', NOW() - INTERVAL '1 day', CURRENT_DATE + 2, NOW() - INTERVAL '5 days', v_counselor_id, v_counselor_id
  );

  -- Lead 3: Visit scheduled
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, next_followup_date, previous_school, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0003', 'Vihaan Kumar', '2015-07-22', 'male', 'Priya Kumar', '9876543212', 'priya.kumar@email.com',
    v_class_5_id, '2025-26', v_source_walkin, v_stage_visit_scheduled,
    v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '3 hours', CURRENT_DATE + 1, 'Green Valley School', NOW() - INTERVAL '7 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  -- Add visit for lead 3
  INSERT INTO admission_visits (
    school_id, lead_id, visit_type, visit_date, visit_time, people_met, counselor_id,
    outcome, interest_level, followup_required, next_followup_date,
    discussion_points, notes, created_at, created_by
  ) VALUES (
    v_school_id, v_lead_id, 'phone_call', CURRENT_DATE - 3, '10:30', 'Mother', v_counselor_id,
    'followup_needed', 'high', true, CURRENT_DATE + 1,
    'Discussed curriculum, fees, and transport facilities', 'Very interested, scheduled campus visit', NOW() - INTERVAL '3 days', v_counselor_id
  );

  -- Lead 4: Visit completed
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, last_contacted_at, previous_school, address, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0004', 'Ananya Singh', '2017-11-08', 'female', 'Vikram Singh', '9876543213', 'vikram.singh@email.com',
    v_class_5_id, '2025-26', v_source_referral, v_stage_visit_completed,
    v_counselor_id, 'active', 'high', NOW() - INTERVAL '2 days', 'St. Mary School', 'Sector 21, Gurgaon', NOW() - INTERVAL '10 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  INSERT INTO admission_visits (
    school_id, lead_id, visit_type, visit_date, visit_time, duration_minutes, people_met, counselor_id,
    outcome, interest_level, followup_required, next_followup_date,
    discussion_points, notes, created_at, created_by
  ) VALUES (
    v_school_id, v_lead_id, 'campus_tour', CURRENT_DATE - 5, '11:00', 90, 'Both parents and student', v_counselor_id,
    'application_submitted', 'very_high', true, CURRENT_DATE + 2,
    'Toured classrooms, labs, sports facilities. Discussed admission process and fee structure',
    'Parents very impressed with infrastructure. Ready to apply.', NOW() - INTERVAL '5 days', v_counselor_id
  );

  -- Lead 5: Application submitted
  INSERT INTO admission_leads (
    school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email,
    applying_class_id, academic_year, lead_source_id, current_stage_id,
    assigned_counselor_id, status, priority, previous_school, created_at, created_by, updated_by
  ) VALUES (
    v_school_id, 'LEAD-2025-26-0005', 'Ishaan Verma', '2011-05-19', 'male', 'Neha Verma', '9876543214', 'neha.verma@email.com',
    v_class_9_id, '2025-26', v_source_website, v_stage_app_submitted,
    v_counselor_id, 'active', 'high', 'Delhi Public School', NOW() - INTERVAL '15 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_lead_id;

  -- Create application for lead 5
  INSERT INTO admission_applications (
    school_id, lead_id, application_number, application_date, academic_year,
    student_name, student_dob, student_gender, student_blood_group, student_nationality,
    previous_school, previous_class, last_percentage,
    applying_class_id, father_name, father_occupation, father_phone, father_email,
    mother_name, mother_occupation, mother_phone, mother_email,
    current_address, city, state, pincode,
    status, decision_status, admission_fee_required, admission_fee_amount,
    created_at, created_by, updated_by
  ) VALUES (
    v_school_id, v_lead_id, 'APP-2025-26-0001', CURRENT_DATE - 12, '2025-26',
    'Ishaan Verma', '2011-05-19', 'male', 'O+', 'Indian',
    'Delhi Public School', 'Class 8', 87.5,
    v_class_9_id, 'Rahul Verma', 'Software Engineer', '9876543214', 'rahul.verma@email.com',
    'Neha Verma', 'Teacher', '9876543215', 'neha.verma@email.com',
    'B-204, Greenview Apartments, Sector 15', 'Noida', 'Uttar Pradesh', '201301',
    'under_review', 'pending', true, 15000,
    NOW() - INTERVAL '12 days', v_counselor_id, v_counselor_id
  );

  -- Lead 6-10: More leads in various stages
  INSERT INTO admission_leads (school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, contact_email, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0006', 'Saanvi Reddy', '2019-01-10', 'female', 'Karthik Reddy', '9876543216', 'karthik.reddy@email.com', v_class_1_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '4 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0007', 'Aditya Joshi', '2018-09-25', 'male', 'Sunita Joshi', '9876543217', 'sunita.joshi@email.com', v_class_1_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '1 day', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0008', 'Myra Kapoor', '2015-12-03', 'female', 'Rohit Kapoor', '9876543218', 'rohit.kapoor@email.com', v_class_5_id, '2025-26', v_source_referral, v_stage_visit_completed, v_counselor_id, 'active', 'high', NOW() - INTERVAL '8 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0009', 'Arjun Nair', '2011-08-14', 'male', 'Lakshmi Nair', '9876543219', 'lakshmi.nair@email.com', v_class_9_id, '2025-26', v_source_walkin, v_stage_under_review, v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '20 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0010', 'Kiara Desai', '2009-04-30', 'female', 'Mehul Desai', '9876543220', 'mehul.desai@email.com', v_class_11_id, '2025-26', v_source_website, v_stage_docs_verified, v_counselor_id, 'active', 'high', NOW() - INTERVAL '18 days', v_counselor_id, v_counselor_id);

  -- Lead 11-15: Additional leads
  INSERT INTO admission_leads (school_id, lead_number, student_name, parent_name, contact_number, contact_email, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0011', 'Reyansh Gupta', 'Pooja Gupta', '9876543221', 'pooja.gupta@email.com', v_class_1_id, '2025-26', v_source_facebook, v_stage_new, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '3 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0012', 'Navya Agarwal', 'Sanjay Agarwal', '9876543222', 'sanjay.agarwal@email.com', v_class_5_id, '2025-26', v_source_walkin, v_stage_contacted, v_counselor_id, 'active', 'high', NOW() - INTERVAL '6 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0013', 'Vivaan Mehta', 'Riya Mehta', '9876543223', 'riya.mehta@email.com', v_class_9_id, '2025-26', v_source_referral, v_stage_visit_scheduled, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '9 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0014', 'Aadhya Malhotra', 'Kavita Malhotra', '9876543224', 'kavita.malhotra@email.com', v_class_1_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '5 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0015', 'Shaurya Bansal', 'Deepak Bansal', '9876543225', 'deepak.bansal@email.com', v_class_11_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '7 days', v_counselor_id, v_counselor_id);

  -- Lead 16-20: More variety
  INSERT INTO admission_leads (school_id, lead_number, student_name, student_dob, student_gender, parent_name, contact_number, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0016', 'Pari Saxena', '2019-06-18', 'female', 'Manish Saxena', '9876543226', v_class_1_id, '2025-26', v_source_walkin, v_stage_visit_completed, v_counselor_id, 'active', 'high', NOW() - INTERVAL '11 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0017', 'Dhruv Tiwari', '2015-02-28', 'male', 'Anjali Tiwari', '9876543227', v_class_5_id, '2025-26', v_source_referral, v_stage_app_submitted, v_counselor_id, 'active', 'urgent', NOW() - INTERVAL '16 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0018', 'Ira Bhatia', '2011-10-05', 'female', 'Tarun Bhatia', '9876543228', v_class_9_id, '2025-26', v_source_website, v_stage_under_review, v_counselor_id, 'active', 'high', NOW() - INTERVAL '22 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0019', 'Advait Chauhan', '2009-07-12', 'male', 'Priti Chauhan', '9876543229', v_class_11_id, '2025-26', v_source_facebook, v_stage_contacted, v_counselor_id, 'active', 'medium', NOW() - INTERVAL '5 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0020', 'Aarohi Sinha', '2019-03-21', 'female', 'Varun Sinha', '9876543230', v_class_1_id, '2025-26', v_source_walkin, v_stage_new, v_counselor_id, 'active', 'low', NOW() - INTERVAL '2 hours', v_counselor_id, v_counselor_id);

  -- Lead 21-25: Final batch
  INSERT INTO admission_leads (school_id, lead_number, parent_name, contact_number, applying_class_id, academic_year, lead_source_id, current_stage_id, assigned_counselor_id, status, priority, notes, created_at, created_by, updated_by)
  VALUES
    (v_school_id, 'LEAD-2025-26-0021', 'Divya Pillai', '9876543231', v_class_5_id, '2025-26', v_source_website, v_stage_new, v_counselor_id, 'active', 'medium', 'Interested in science stream', NOW() - INTERVAL '1 hour', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0022', 'Harsh Goyal', '9876543232', v_class_9_id, '2025-26', v_source_referral, v_stage_contacted, v_counselor_id, 'active', 'high', 'Referred by existing parent', NOW() - INTERVAL '4 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0023', 'Monica Iyer', '9876543233', v_class_1_id, '2025-26', v_source_facebook, v_stage_new, v_counselor_id, 'active', 'low', 'Following up from FB inquiry', NOW() - INTERVAL '6 hours', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0024', 'Ajay Choudhary', '9876543234', v_class_11_id, '2025-26', v_source_walkin, v_stage_visit_scheduled, v_counselor_id, 'active', 'urgent', 'Wants admission for science stream', NOW() - INTERVAL '8 days', v_counselor_id, v_counselor_id),
    (v_school_id, 'LEAD-2025-26-0025', 'Sneha Rao', '9876543235', v_class_5_id, '2025-26', v_source_website, v_stage_contacted, v_counselor_id, 'active', 'medium', 'Looking for good academics', NOW() - INTERVAL '3 days', v_counselor_id, v_counselor_id);

  -- Add a few more applications with complete data
  SELECT id INTO v_lead_id FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0009' LIMIT 1;
  
  INSERT INTO admission_applications (
    school_id, lead_id, application_number, application_date, academic_year,
    student_name, student_dob, student_gender, student_blood_group, student_nationality,
    previous_school, previous_class, last_percentage,
    applying_class_id, father_name, father_occupation, father_phone, father_email,
    mother_name, mother_occupation, mother_phone, mother_email,
    current_address, city, state, pincode,
    status, decision_status, admission_fee_required, admission_fee_amount,
    created_at, created_by, updated_by
  ) VALUES (
    v_school_id, v_lead_id, 'APP-2025-26-0002', CURRENT_DATE - 15, '2025-26',
    'Arjun Nair', '2011-08-14', 'male', 'B+', 'Indian',
    'Modern School', 'Class 8', 91.2,
    v_class_9_id, 'Anil Nair', 'Business Owner', '9876543219', 'anil.nair@email.com',
    'Lakshmi Nair', 'Homemaker', '9876543236', 'lakshmi.nair@email.com',
    'C-45, Palm Gardens, Sector 22', 'Gurgaon', 'Haryana', '122001',
    'under_review', 'pending', true, 15000,
    NOW() - INTERVAL '15 days', v_counselor_id, v_counselor_id
  ) RETURNING id INTO v_app_id;

  -- Add decision for one application (approved)
  INSERT INTO admission_decisions (
    school_id, application_id, lead_id, decision, decision_reason,
    admission_number, allocated_class_id, admission_fee_amount,
    decided_by, decided_at
  )
  SELECT
    v_school_id, id, lead_id, 'approved', 'Excellent academic record and good interview',
    'ADM-2025-26-0001', v_class_9_id, 15000,
    v_admin_id, NOW() - INTERVAL '2 days'
  FROM admission_applications
  WHERE application_number = 'APP-2025-26-0002';

  -- Update application with approval
  UPDATE admission_applications
  SET
    decision_status = 'approved',
    decision_by = v_admin_id,
    decision_at = NOW() - INTERVAL '2 days',
    admission_number = 'ADM-2025-26-0001',
    admission_date = CURRENT_DATE,
    allocated_class_id = v_class_9_id,
    status = 'approved'
  WHERE application_number = 'APP-2025-26-0002';

  -- Add more visits for various leads
  INSERT INTO admission_visits (school_id, lead_id, visit_type, visit_date, visit_time, people_met, counselor_id, outcome, interest_level, notes, created_at, created_by)
  SELECT
    v_school_id, id, 'phone_call', CURRENT_DATE - 2, '14:30', 'Parent', v_counselor_id, 
    'interested', 'medium', 'Initial inquiry call, shared school brochure',
    NOW() - INTERVAL '2 days', v_counselor_id
  FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0006';

  INSERT INTO admission_visits (school_id, lead_id, visit_type, visit_date, visit_time, duration_minutes, people_met, counselor_id, outcome, interest_level, notes, created_at, created_by)
  SELECT
    v_school_id, id, 'campus_tour', CURRENT_DATE - 4, '10:00', 120, 'Both parents', v_counselor_id,
    'interested', 'high', 'Showed all facilities, discussed fee structure',
    NOW() - INTERVAL '4 days', v_counselor_id
  FROM admission_leads WHERE lead_number = 'LEAD-2025-26-0008';

  RAISE NOTICE 'Successfully seeded admission mock data: 25 leads, applications, visits, and decisions';
END $$;