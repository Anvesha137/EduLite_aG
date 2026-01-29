-- Migration: Disable Announcement RLS
-- Description: Disables RLS completely on announcements and related tables to unblock the user.

ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_target_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_audiences DISABLE ROW LEVEL SECURITY;
