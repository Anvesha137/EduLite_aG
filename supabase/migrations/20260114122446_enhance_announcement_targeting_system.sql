/*
  # Enhanced Announcement Targeting System

  ## Overview
  This migration enhances the announcement system to support granular targeting by classes, sections, and specific audience types.
  It maintains full backward compatibility with existing school-wide announcements.

  ## Changes Made

  ### 1. Modified Tables
    - `announcements`
      - Added `target_scope` column: 'school_wide' (default) or 'targeted'
      - Kept existing `target_audience` array for backward compatibility

  ### 2. New Tables
    - `announcement_audiences`
      - Maps announcements to specific audience types (students, parents, educators, all)
      - Replaces array with proper relational structure for new announcements
      - Columns: id, announcement_id, audience_type, created_at

    - `announcement_target_classes`
      - Maps announcements to specific classes
      - Columns: id, announcement_id, class_id, created_at

    - `announcement_target_sections`
      - Maps announcements to specific sections
      - Enables granular section-level targeting
      - Columns: id, announcement_id, section_id, created_at

  ### 3. Helper Views
    - `announcement_targets_summary`
      - Provides human-readable summary of announcement targets
      - Shows which classes, sections, and audiences will receive each announcement

  ### 4. Security (RLS)
    - All new tables have RLS enabled
    - Authenticated users can read announcement targeting data for their school
    - Only admins can create/modify announcement targets
    - Policies ensure school-level data isolation

  ## Backward Compatibility
    - Existing announcements automatically get `target_scope = 'school_wide'`
    - Old `target_audience` array field remains functional
    - New announcements can use either simple (school-wide) or advanced (targeted) approach
    - Migration is non-destructive and data-safe

  ## Usage Notes
    - School-wide announcements: Set `target_scope = 'school_wide'`, use `target_audience` array
    - Targeted announcements: Set `target_scope = 'targeted'`, use mapping tables
    - Admin UI will provide easy toggle between modes
    - Preview logic calculates exact recipient count based on targets
*/

-- Add target_scope column to announcements table (backward compatible)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'target_scope'
  ) THEN
    ALTER TABLE announcements 
    ADD COLUMN target_scope text DEFAULT 'school_wide' NOT NULL 
    CHECK (target_scope IN ('school_wide', 'targeted'));
  END IF;
END $$;

-- Create announcement_audiences table
CREATE TABLE IF NOT EXISTS announcement_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  audience_type text NOT NULL CHECK (audience_type IN ('students', 'parents', 'educators', 'all')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, audience_type)
);

-- Create announcement_target_classes table
CREATE TABLE IF NOT EXISTS announcement_target_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, class_id)
);

-- Create announcement_target_sections table
CREATE TABLE IF NOT EXISTS announcement_target_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, section_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_audiences_announcement_id 
  ON announcement_audiences(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_classes_announcement_id 
  ON announcement_target_classes(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_sections_announcement_id 
  ON announcement_target_sections(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_classes_class_id 
  ON announcement_target_classes(class_id);

CREATE INDEX IF NOT EXISTS idx_announcement_target_sections_section_id 
  ON announcement_target_sections(section_id);

-- Enable RLS on all new tables
ALTER TABLE announcement_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_audiences
CREATE POLICY "Users can view announcement audiences for their school"
  ON announcement_audiences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement audiences"
  ON announcement_audiences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_audiences.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- RLS Policies for announcement_target_classes
CREATE POLICY "Users can view announcement target classes for their school"
  ON announcement_target_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement target classes"
  ON announcement_target_classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_classes.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- RLS Policies for announcement_target_sections
CREATE POLICY "Users can view announcement target sections for their school"
  ON announcement_target_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage announcement target sections"
  ON announcement_target_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN user_profiles up ON up.school_id = a.school_id
      JOIN roles r ON r.id = up.role_id
      WHERE a.id = announcement_target_sections.announcement_id
      AND up.id = auth.uid()
      AND r.name IN ('super_admin', 'school_admin')
    )
  );

-- Create a view to get announcement targeting summary
CREATE OR REPLACE VIEW announcement_targets_summary AS
SELECT 
  a.id as announcement_id,
  a.title,
  a.target_scope,
  a.school_id,
  
  -- Aggregate audiences
  COALESCE(
    array_agg(DISTINCT aa.audience_type) FILTER (WHERE aa.audience_type IS NOT NULL),
    a.target_audience
  ) as audiences,
  
  -- Aggregate target classes with their IDs
  json_agg(DISTINCT jsonb_build_object(
    'id', c.id,
    'grade', c.grade,
    'grade_order', c.grade_order
  )) FILTER (WHERE c.id IS NOT NULL) as target_classes,
  
  -- Aggregate target sections with details
  json_agg(DISTINCT jsonb_build_object(
    'section_id', s.id,
    'section_name', s.name,
    'class_id', sc.id,
    'class_grade', sc.grade,
    'grade_order', sc.grade_order
  )) FILTER (WHERE s.id IS NOT NULL) as target_sections,
  
  -- Count of target classes
  COUNT(DISTINCT atc.class_id) as class_count,
  
  -- Count of target sections
  COUNT(DISTINCT ats.section_id) as section_count

FROM announcements a
LEFT JOIN announcement_audiences aa ON aa.announcement_id = a.id
LEFT JOIN announcement_target_classes atc ON atc.announcement_id = a.id
LEFT JOIN announcement_target_sections ats ON ats.announcement_id = a.id
LEFT JOIN classes c ON c.id = atc.class_id
LEFT JOIN sections s ON s.id = ats.section_id
LEFT JOIN classes sc ON sc.id = s.class_id

GROUP BY a.id, a.title, a.target_scope, a.school_id, a.target_audience;
