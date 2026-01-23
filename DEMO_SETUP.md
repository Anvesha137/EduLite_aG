# School ERP - Demo Setup Guide

## Overview

This is a production-grade, multi-tenant School ERP system with strict role-based access control and data isolation.

## Architecture

- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Authentication**: Supabase Auth with role-based profiles
- **Multi-tenancy**: School-level data isolation enforced at database level

## User Roles

1. **SUPERADMIN** - Platform owner with full system access
2. **ADMIN** - School administrator with full school access
3. **EDUCATOR** - Teacher with teaching and marking capabilities
4. **LEARNER** - Student with read access to own data
5. **PARENT** - Parent/guardian with read access to children's data

## Demo Accounts Setup

The database has been seeded with a demo school "Demo International School" and sample data. To test the system, you need to create user accounts via Supabase Auth and link them to profiles.

### Step 1: Create Auth Users

Go to Supabase Dashboard → Authentication → Users and create the following accounts:

1. **SUPERADMIN Account**
   - Email: `superadmin@erp.com`
   - Password: `demo123456`

2. **ADMIN Account**
   - Email: `admin@demoschool.edu`
   - Password: `demo123456`

3. **EDUCATOR Account**
   - Email: `rajesh@demoschool.edu`
   - Password: `demo123456`

4. **PARENT Account**
   - Email: `ramesh@gmail.com`
   - Password: `demo123456`

### Step 2: Link Users to Profiles

After creating users, run this SQL in Supabase SQL Editor to link them:

```sql
-- Get IDs
DO $$
DECLARE
  v_school_id uuid;
  v_superadmin_role_id uuid;
  v_admin_role_id uuid;
  v_educator_role_id uuid;
  v_parent_role_id uuid;
  v_superadmin_user_id uuid;
  v_admin_user_id uuid;
  v_educator_user_id uuid;
  v_parent_user_id uuid;
  v_educator_id uuid;
  v_parent_id uuid;
BEGIN
  -- Get school and role IDs
  SELECT id INTO v_school_id FROM schools WHERE email = 'admin@demoschool.edu';
  SELECT id INTO v_superadmin_role_id FROM roles WHERE name = 'SUPERADMIN';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_educator_role_id FROM roles WHERE name = 'EDUCATOR';
  SELECT id INTO v_parent_role_id FROM roles WHERE name = 'PARENT';

  -- Get user IDs from auth.users
  SELECT id INTO v_superadmin_user_id FROM auth.users WHERE email = 'superadmin@erp.com';
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@demoschool.edu';
  SELECT id INTO v_educator_user_id FROM auth.users WHERE email = 'rajesh@demoschool.edu';
  SELECT id INTO v_parent_user_id FROM auth.users WHERE email = 'ramesh@gmail.com';

  -- Get educator and parent IDs
  SELECT id INTO v_educator_id FROM educators WHERE school_id = v_school_id AND employee_id = 'EMP001';
  SELECT id INTO v_parent_id FROM parents WHERE school_id = v_school_id AND phone = '+91-9876000001';

  -- Create user profiles
  INSERT INTO user_profiles (id, school_id, role_id, full_name, phone, is_active)
  VALUES
    (v_superadmin_user_id, NULL, v_superadmin_role_id, 'Platform Administrator', '+91-9999999999', true),
    (v_admin_user_id, v_school_id, v_admin_role_id, 'Principal Sharma', '+91-9876543210', true),
    (v_educator_user_id, v_school_id, v_educator_role_id, 'Rajesh Kumar', '+91-9876543211', true),
    (v_parent_user_id, v_school_id, v_parent_role_id, 'Ramesh Gupta', '+91-9876000001', true)
  ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    role_id = EXCLUDED.role_id,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- Link educator user to educator record
  UPDATE educators SET user_id = v_educator_user_id WHERE id = v_educator_id;

  -- Link parent user to parent record
  UPDATE parents SET user_id = v_parent_user_id WHERE id = v_parent_id;
END $$;
```

## Testing Each Role

### SUPERADMIN Dashboard
Login with: `superadmin@erp.com`

Features to test:
- View platform analytics (total schools, revenue, students)
- Manage schools (view list, status, subscriptions)
- View subscription plans
- Access support tickets
- Platform-wide analytics

### ADMIN Dashboard
Login with: `admin@demoschool.edu`

Features to test:
- View school dashboard with student/educator counts
- Manage students (view list, search, filter)
- Manage educators
- Mark attendance
- Manage exams and marks
- Collect fees
- Send announcements
- Generate reports

### EDUCATOR Dashboard
Login with: `rajesh@demoschool.edu`

Features to test:
- View assigned classes (Class 9A, 10A - Science)
- Mark student attendance
- Enter exam marks
- Write daily diary entries
- Add student notes
- View timetable

### PARENT Dashboard
Login with: `ramesh@gmail.com`

Features to test:
- View child profile (Aarav Gupta - Class 9A)
- View attendance records (30 days)
- View exam results
- Check fee status
- Read daily diary
- View school announcements

## Database Features

### Multi-Tenancy
- All school data is isolated by `school_id`
- RLS policies enforce data access rules
- No cross-school data leakage

### Security
- Row Level Security enabled on all tables
- Helper functions: `get_user_role()`, `get_user_school()`
- Role-based policies for all operations
- Audit logging for data changes

### Data Locking
- Historical data can be locked by date range
- Prevents tampering with past records
- Lock system for fees, marks, attendance

### Subscription Enforcement
- Hard limits on student/educator counts
- Module toggles per school
- Subscription expiry checks

## Key Tables

### Platform Level
- `schools` - School entities
- `plans` - Subscription plans
- `school_subscriptions` - Active subscriptions
- `modules` - Feature modules
- `school_modules` - Module enablement

### School Level
- `students` - Student records
- `educators` - Teacher profiles
- `parents` - Parent/guardian info
- `classes` & `sections` - Grade organization
- `subjects` - Subject master

### Academic
- `attendance` - Daily attendance
- `exams` - Exam definitions
- `marks` - Student scores
- `daily_diary` - Teacher logs
- `report_cards` - Generated reports

### Financial
- `fee_heads` - Fee categories
- `fee_structures` - Fee amounts by class
- `fee_installments` - Payment schedules
- `fee_transactions` - Payment records
- `payroll_records` - Staff payroll

### Communication
- `announcements` - School notices
- `notifications` - User notifications
- `support_tickets` - Support requests

## Production Considerations

1. **Scalability**: Designed for thousands of schools and millions of students
2. **Security**: Multi-layer security with RLS, audit logs, and role validation
3. **Performance**: Indexed queries, optimized joins, efficient data retrieval
4. **Maintainability**: Clean code structure, type safety, modular design
5. **Extensibility**: Easy to add new modules and features

## Support

For issues or questions, contact the platform administrator.
