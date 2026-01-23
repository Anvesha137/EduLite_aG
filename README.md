# School ERP - Production-Grade Multi-Tenant SaaS

A comprehensive, enterprise-ready School Management System with strict role-based access control, multi-tenancy, and subscription management.

## Overview

This is a complete, production-grade School ERP system designed as a SaaS platform with:

- **Multi-tenant architecture** with school-level data isolation
- **Strict role-based access control** (RBAC) enforced at database and UI levels
- **Subscription-based monetization** with hard limits and module toggles
- **Comprehensive school operations management** (academics, fees, attendance, etc.)
- **Data security** with Row Level Security (RLS) and audit logging
- **Scalable architecture** supporting thousands of schools and millions of students

## System Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with role-based profiles
- **Build Tool**: Vite
- **Type Safety**: Full TypeScript coverage

### Database Design

The system uses a comprehensive relational database schema with:

- **40+ tables** covering all aspects of school management
- **Row Level Security (RLS)** on every table
- **Multi-tenant isolation** enforced at database level
- **Audit logging** for all data modifications
- **Data locking** mechanism for historical records
- **Optimized indexes** for performance

## User Roles & Access Control

### 1. SUPERADMIN (Platform Owner)
**Purpose**: Manage the entire platform, onboard schools, enforce standards, and monetize.

**Capabilities**:
- School onboarding and activation
- Subscription plan management
- Module toggles per school
- Platform-wide analytics (DAU, revenue, churn)
- Support ticket management
- Read-only school impersonation for support

**Key Tables**:
- `schools` - School entities with subscription status
- `plans` - Subscription plans with pricing and limits
- `school_subscriptions` - Active subscriptions
- `modules` - Feature modules
- `school_modules` - Module enablement per school
- `support_tickets` - School support requests
- `platform_analytics` - Aggregated metrics

### 2. ADMIN (School Management)
**Purpose**: Operate the school completely.

**Capabilities**:
- Student and parent management
- Educator and staff management
- Class and section organization
- Attendance tracking (students & staff)
- Exam and marks management
- Fee collection and financial management
- Timetable management
- Announcements and communication
- Comprehensive reporting

**Key Tables**:
- `students` - Student records with parent linking
- `parents` - Parent/guardian information
- `educators` - Teacher and staff profiles
- `classes` & `sections` - Grade organization
- `attendance` - Daily student attendance
- `exams` & `marks` - Academic assessments
- `fee_heads`, `fee_transactions` - Financial records
- `announcements` - School-wide communications

### 3. EDUCATOR (Teacher)
**Purpose**: Teach and record student progress.

**Capabilities**:
- View assigned classes and students
- Mark daily attendance
- Enter exam marks
- Write daily diary entries
- Add student notes
- Request extra fees for events
- View teaching timetable

**Restrictions**:
- Can only access assigned classes
- Cannot edit locked/historical data
- No access to fees, payroll, or admin reports

**Key Tables**:
- `educator_class_assignments` - Class assignments
- `attendance` - Attendance marking
- `marks` - Exam scores entry
- `daily_diary` - Daily class logs
- `teacher_notes` - Student observations

### 4. PARENT / LEARNER
**Purpose**: Stay informed about student progress.

**Capabilities**:
- View student profile and information
- Check attendance records and percentage
- View exam results and report cards
- Check fee status and payment history
- Read daily diary and homework
- View school announcements
- Receive notifications

**Restrictions**:
- Read-only access
- Can only view own child's data
- No administrative capabilities

**Key Tables** (Read-only):
- `students` - Child profile
- `attendance` - Attendance history
- `marks` & `exams` - Academic results
- `fee_installments` & `fee_transactions` - Fee records
- `daily_diary` - Daily updates
- `announcements` - School notices

## Key Features

### Multi-Tenancy & Data Isolation

- **School-level data isolation** enforced by RLS policies
- **No cross-school data leakage** even with SQL injection
- **Role-based filtering** at database level
- **Scalable for thousands of schools**

### Security Features

1. **Row Level Security (RLS)**
   - Every table has RLS policies
   - Helper functions: `get_user_role()`, `get_user_school()`
   - School-based data filtering
   - Role-based access control

2. **Data Locking**
   - Lock historical data by date range
   - Prevent tampering with past records
   - Admin-controlled lock/unlock

3. **Audit Logging**
   - All modifications tracked
   - IP address and user agent captured
   - Old/new values stored
   - Compliance-ready

### Subscription Management

- **Subscription plans** with different pricing tiers
- **Hard limits** on student and educator counts
- **Module toggles** per school (enable/disable features)
- **Subscription enforcement** at application level
- **Automatic expiry** handling

### Academic Management

- **Multiple exam types** (unit tests, mid-terms, finals)
- **Subject-wise marks** entry and tracking
- **Grade calculation** and ranking
- **Report card generation**
- **Daily diary** for homework tracking
- **Teacher notes** for student observations

### Financial Management

- **Fee structures** by class and academic year
- **Multiple fee heads** (tuition, transport, etc.)
- **Installment management** with due dates
- **Payment tracking** with multiple modes
- **Fee defaulter reports**
- **Basic payroll** for staff

### Attendance System

- **Daily attendance** marking
- **Multiple status types** (present, absent, late, leave)
- **Staff attendance** tracking
- **Attendance reports** and statistics
- **Historical attendance** queries

### Communication

- **School-wide announcements**
- **Priority-based notifications**
- **Target audience selection**
- **Expiry management**
- **Parent notifications**

## Database Schema Highlights

### Performance Optimizations

- **Indexed foreign keys** for fast joins
- **Composite indexes** on frequently queried columns
- **Date-based partitioning** for large tables
- **Efficient query patterns**

### Data Integrity

- **Foreign key constraints** maintain relationships
- **Check constraints** enforce business rules
- **Unique constraints** prevent duplicates
- **Default values** for required fields
- **NOT NULL constraints** where appropriate

### Scalability

- **Horizontal scaling** via read replicas
- **Connection pooling** support
- **Query optimization** with EXPLAIN plans
- **Efficient pagination** support

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Environment variables configured

### Environment Setup

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Run migrations (already applied via Supabase)
# Migrations are in the database

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

### Demo Setup

See [DEMO_SETUP.md](./DEMO_SETUP.md) for detailed instructions on:
- Creating demo user accounts
- Linking users to roles
- Testing each role's features
- Sample data overview

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx                 # Reusable dashboard layout
│   ├── Login.tsx                  # Authentication page
│   └── dashboards/
│       ├── SuperAdminDashboard.tsx    # Platform management
│       ├── AdminDashboard.tsx         # School operations
│       ├── EducatorDashboard.tsx      # Teacher portal
│       └── ParentDashboard.tsx        # Parent/student view
├── contexts/
│   └── AuthContext.tsx            # Authentication state
├── lib/
│   └── supabase.ts               # Supabase client
├── types/
│   └── database.ts               # TypeScript type definitions
├── App.tsx                       # Main app router
└── main.tsx                      # Entry point
```

## Security Considerations

### Authentication

- **Supabase Auth** handles user authentication
- **JWT tokens** for session management
- **Role verification** on every request
- **Automatic session refresh**

### Authorization

- **Database-level RLS** enforces access control
- **UI-level role checks** prevent unauthorized views
- **API endpoint protection** via Supabase policies
- **No role leakage** between users

### Data Protection

- **School data isolation** prevents cross-tenant access
- **Encrypted connections** (HTTPS/SSL)
- **No sensitive data** in client-side code
- **Audit trails** for compliance

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] User roles and permissions configured
- [ ] Demo/test data removed (if applicable)
- [ ] Build optimization enabled
- [ ] Error tracking configured
- [ ] Performance monitoring setup

### Recommended Infrastructure

- **Frontend**: Vercel, Netlify, or similar
- **Database**: Supabase managed PostgreSQL
- **CDN**: Cloudflare or AWS CloudFront
- **Monitoring**: Sentry, LogRocket
- **Analytics**: Google Analytics, Mixpanel

### Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: > 90
- **Database Query Time**: < 100ms (p95)

## Scaling Considerations

### Database Scaling

- **Read replicas** for analytics queries
- **Connection pooling** (PgBouncer)
- **Query optimization** and indexing
- **Partitioning** large tables by date

### Application Scaling

- **CDN caching** for static assets
- **API rate limiting** per school/user
- **Lazy loading** for large datasets
- **Virtual scrolling** for long lists

### Cost Optimization

- **Efficient queries** reduce database load
- **Image optimization** reduces bandwidth
- **Code splitting** reduces bundle size
- **Caching strategy** reduces API calls

## Testing Strategy

### Unit Tests
- Component rendering
- Business logic functions
- Utility functions
- Type safety

### Integration Tests
- User authentication flow
- Role-based access control
- CRUD operations
- Data validation

### E2E Tests
- Complete user journeys
- Multi-user scenarios
- Payment flows
- Report generation

## Support & Maintenance

### Monitoring

- **Error tracking** for bugs
- **Performance monitoring** for slowdowns
- **User analytics** for behavior
- **Database monitoring** for queries

### Backup Strategy

- **Automated daily backups** via Supabase
- **Point-in-time recovery** available
- **Backup verification** monthly
- **Disaster recovery plan** documented

### Update Process

- **Database migrations** versioned
- **Feature flags** for gradual rollout
- **Backward compatibility** maintained
- **Rollback plan** prepared

## License

Proprietary - All rights reserved

## Contact

For support, contact your system administrator.
