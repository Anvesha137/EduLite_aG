export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'EDUCATOR' | 'LEARNER' | 'PARENT' | 'COUNSELOR';

export interface UserProfile {
  id: string;
  school_id: string | null;
  role_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  role?: Role;
  school?: School;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  board_id: string | null;
  state_id: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  contact_person: string;
  phone: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  school_id: string;
  user_id: string | null;
  name: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  user_id: string | null;
  admission_number: string;
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  blood_group: string | null;
  class_id: string | null;
  section_id: string | null;
  parent_id: string | null;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  admission_date: string;
  photo_url: string | null;
  address: string | null;
  medical_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  sort_order: number;
  description: string | null;
  created_at: string;
}

export interface Section {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
  capacity: number;
  created_at: string;
}

export interface Educator {
  id: string;
  school_id: string;
  user_id: string | null;
  employee_id: string;
  name: string;
  phone: string;
  email: string | null;
  designation: string;
  qualification: string | null;
  experience_years: number;
  joining_date: string;
  status: 'active' | 'inactive' | 'resigned';
  photo_url: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  school_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  marked_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  school_id: string;
  name: string;
  exam_type: 'unit_test' | 'mid_term' | 'final' | 'quarterly' | 'half_yearly' | 'annual';
  academic_year: string;
  start_date: string;
  end_date: string;
  class_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Mark {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  remarks: string | null;
  entered_by: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeTransaction {
  id: string;
  school_id: string;
  student_id: string;
  installment_id: string | null;
  amount: number;
  payment_mode: 'cash' | 'cheque' | 'online' | 'card' | 'upi';
  transaction_ref: string | null;
  payment_date: string;
  received_by: string | null;
  remarks: string | null;
  is_locked: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  content: string;
  target_audience: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published_by: string | null;
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  student_limit: number;
  educator_limit: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface SchoolSubscription {
  id: string;
  school_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  key: string;
  description: string | null;
  icon: string | null;
  is_core: boolean;
  created_at: string;
}

export interface SchoolModule {
  id: string;
  school_id: string;
  module_id: string;
  enabled: boolean;
  enabled_at: string;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface PlatformAnalytics {
  id: string;
  date: string;
  total_schools: number;
  active_schools: number;
  total_students: number;
  total_educators: number;
  revenue: number;
  new_schools: number;
  churned_schools: number;
  dau: number;
  created_at: string;
}
