-- Migration: Fix Announcements Schema
-- Description: Adds missing columns to announcements and creates relation tables.

-- 1. Add columns to 'announcements' if they don't exist
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS target_scope text DEFAULT 'school_wide' CHECK (target_scope IN ('school_wide', 'targeted')),
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT ARRAY['all'],
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

-- 2. Create 'announcement_target_classes'
CREATE TABLE IF NOT EXISTS announcement_target_classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(announcement_id, class_id)
);

-- 3. Create 'announcement_target_sections'
CREATE TABLE IF NOT EXISTS announcement_target_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(announcement_id, section_id)
);

-- 4. Create 'announcement_audiences' (for many-to-many audiences if needed, though 'target_audience' array on main table might be used too. The code uses BOTH depending on scope)
CREATE TABLE IF NOT EXISTS announcement_audiences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    audience_type text NOT NULL,
    UNIQUE(announcement_id, audience_type)
);

-- 5. RLS Policies (Basic)
ALTER TABLE announcement_target_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users only" ON announcement_target_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users only" ON announcement_target_classes FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users only" ON announcement_target_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users only" ON announcement_target_sections FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users only" ON announcement_audiences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users only" ON announcement_audiences FOR ALL TO authenticated USING (true);
