import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import {
  UserPlus, Phone, Calendar, FileText, CheckCircle, XCircle, Clock,
  TrendingUp, Users, Filter, Plus, Eye, Edit, MessageCircle, AlertCircle, X, Save
} from 'lucide-react';
import { formatDate } from '../../lib/helpers';
import { Modal } from '../Modal';

interface Lead {
  id: string;
  lead_number: string;
  student_name: string;
  parent_name: string;
  contact_number: string;
  contact_email: string;
  applying_class: { id: string; grade: string };
  current_stage: { id: string; name: string; color_code: string; stage_category: string };
  lead_source: { id: string; name: string };
  status: string;
  priority: string;
  next_followup_date: string;
  academic_year: string;
  created_at: string;
  assigned_counselor: { name: string } | null;
}

interface Application {
  id: string;
  application_number: string;
  student_name: string;
  parent_name: string;
  contact_number: string;
  applying_class: { grade: string };
  status: string;
  decision_status: string;
  application_date: string;
  lead: { lead_number: string };
}

interface FunnelStage {
  id: string;
  name: string;
  stage_order: number;
  stage_category: string;
  color_code: string;
}

interface LeadSource {
  id: string;
  name: string;
  source_type: string;
}

interface Class {
  id: string;
  grade: string;
}

export default function AdmissionsManagement() {
  const { schoolId } = useSchool();
  const userId = 'demo-user-id';
  const isAdmin = true;

  const [activeTab, setActiveTab] = useState<'leads' | 'applications' | 'analytics'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const [leadForm, setLeadForm] = useState({
    parent_name: '',
    contact_number: '',
    contact_email: '',
    student_name: '',
    student_dob: '',
    student_gender: '',
    applying_class_id: '',
    academic_year: '2025-26',
    lead_source_id: '',
    priority: 'medium',
    notes: '',
    previous_school: '',
    address: ''
  });

  const [visitForm, setVisitForm] = useState({
    visit_type: 'phone_call',
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: '',
    duration_minutes: '',
    people_met: '',
    outcome: 'interested',
    interest_level: 'medium',
    followup_required: false,
    next_followup_date: '',
    discussion_points: '',
    concerns_raised: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    loadFunnelStages();
    loadLeadSources();
    loadClasses();
  }, []);

  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeads();
    } else if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, filterStage, filterStatus, filterSource]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadLeads(), loadApplications()]);
    } finally {
      setLoading(false);
    }
  };

  const loadFunnelStages = async () => {
    const { data } = await supabase
      .from('admission_funnel_stages')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('stage_order');

    if (data) setFunnelStages(data);
  };

  const loadLeadSources = async () => {
    const { data } = await supabase
      .from('admission_lead_sources')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name');

    if (data) setLeadSources(data);
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, grade, grade_order')
      .eq('school_id', schoolId)
      .order('grade_order');

    if (data && data.length > 0) {
      setClasses(data);
    } else {
      // MOCK DATA for Class Dropdown
      setClasses([
        { id: 'mk-c-1', grade: 'Grade 10', grade_order: 10 },
        { id: 'mk-c-2', grade: 'Grade 11', grade_order: 11 },
        { id: 'mk-c-3', grade: 'Grade 12', grade_order: 12 },
        { id: 'mk-c-4', grade: 'Grade 9', grade_order: 9 },
      ] as any);
    }
  };

  const loadLeads = async () => {
    let query = supabase
      .from('admission_leads')
      .select(`
        *,
        applying_class:classes(id, grade),
        current_stage:admission_funnel_stages(id, name, color_code, stage_category),
        lead_source:admission_lead_sources(id, name),
        assigned_counselor:user_profiles(name)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (filterStage) {
      query = query.eq('current_stage_id', filterStage);
    }
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }
    if (filterSource) {
      query = query.eq('lead_source_id', filterSource);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLeads(data as any);
    }
  };

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from('admission_applications')
      .select(`
        *,
        applying_class:classes(grade),
        lead:admission_leads(lead_number)
      `)
      .eq('school_id', schoolId)
      .order('application_date', { ascending: false });

    if (!error && data) {
      setApplications(data as any);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const leadNumber = await generateLeadNumber();
      const firstStage = funnelStages.find(s => s.stage_order === 1);

      const { data, error } = await supabase
        .from('admission_leads')
        .insert({
          school_id: schoolId,
          lead_number: leadNumber,
          parent_name: leadForm.parent_name,
          contact_number: leadForm.contact_number,
          contact_email: leadForm.contact_email || null,
          student_name: leadForm.student_name || null,
          student_dob: leadForm.student_dob || null,
          student_gender: leadForm.student_gender || null,
          applying_class_id: leadForm.applying_class_id,
          academic_year: leadForm.academic_year,
          lead_source_id: leadForm.lead_source_id,
          current_stage_id: firstStage?.id,
          assigned_counselor_id: userId,
          status: 'active',
          priority: leadForm.priority,
          notes: leadForm.notes || null,
          previous_school: leadForm.previous_school || null,
          address: leadForm.address || null,
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: `Lead ${leadNumber} created successfully!` });
      setShowLeadModal(false);
      resetLeadForm();
      loadLeads();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('admission_visits')
        .insert({
          school_id: schoolId,
          lead_id: selectedLead?.id,
          visit_type: visitForm.visit_type,
          visit_date: visitForm.visit_date,
          visit_time: visitForm.visit_time || null,
          duration_minutes: visitForm.duration_minutes ? parseInt(visitForm.duration_minutes) : null,
          people_met: visitForm.people_met || null,
          counselor_id: userId,
          outcome: visitForm.outcome,
          interest_level: visitForm.interest_level,
          followup_required: visitForm.followup_required,
          next_followup_date: visitForm.next_followup_date || null,
          discussion_points: visitForm.discussion_points || null,
          concerns_raised: visitForm.concerns_raised || null,
          notes: visitForm.notes || null,
          created_by: userId
        });

      if (error) throw error;

      if (visitForm.followup_required && visitForm.next_followup_date) {
        await supabase
          .from('admission_leads')
          .update({
            next_followup_date: visitForm.next_followup_date,
            last_contacted_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('id', selectedLead?.id);
      }

      setMessage({ type: 'success', text: 'Visit logged successfully!' });
      setShowVisitModal(false);
      resetVisitForm();
      loadLeads();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const generateLeadNumber = async () => {
    const { data } = await supabase.rpc('generate_lead_number', {
      p_school_id: schoolId,
      p_academic_year: leadForm.academic_year
    });
    return data || `LEAD-${leadForm.academic_year}-${Date.now()}`;
  };

  const resetLeadForm = () => {
    setLeadForm({
      parent_name: '',
      contact_number: '',
      contact_email: '',
      student_name: '',
      student_dob: '',
      student_gender: '',
      applying_class_id: '',
      academic_year: '2025-26',
      lead_source_id: '',
      priority: 'medium',
      notes: '',
      previous_school: '',
      address: ''
    });
  };

  const resetVisitForm = () => {
    setVisitForm({
      visit_type: 'phone_call',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: '',
      duration_minutes: '',
      people_met: '',
      outcome: 'interested',
      interest_level: 'medium',
      followup_required: false,
      next_followup_date: '',
      discussion_points: '',
      concerns_raised: '',
      notes: ''
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.lead_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_number.includes(searchTerm);
    return matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'converted': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'lost': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'waitlisted': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          Admissions Management
        </h2>
        <button
          onClick={() => setShowLeadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { id: 'leads', label: 'Leads & Funnel', icon: Users },
            { id: 'applications', label: 'Applications', icon: FileText },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Stages</option>
                {funnelStages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
                <option value="lost">Lost</option>
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sources</option>
                {leadSources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Total Leads</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{leads.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Active</span>
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {leads.filter(l => l.status === 'active').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Converted</span>
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {leads.filter(l => l.status === 'converted').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Conversion Rate</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {leads.length > 0
                  ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Lead #</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Student Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Parent</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Contact</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Class</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Stage</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Source</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Priority</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{lead.lead_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{lead.student_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{lead.parent_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{lead.contact_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{lead.applying_class?.grade || '-'}</td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${lead.current_stage?.color_code}20`,
                            color: lead.current_stage?.color_code
                          }}
                        >
                          {lead.current_stage?.name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{lead.lead_source?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowVisitModal(true);
                            }}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                            title="Log Visit"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLeads.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No leads found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Total Applications</span>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{applications.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Pending Review</span>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {applications.filter(a => a.decision_status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Approved</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {applications.filter(a => a.decision_status === 'approved').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Rejected</span>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {applications.filter(a => a.decision_status === 'rejected').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">App #</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Lead #</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Student Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Parent</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Contact</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Class</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">Decision</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{app.application_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{app.lead.lead_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{app.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{app.parent_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{app.contact_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{app.applying_class?.grade}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(app.application_date)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDecisionColor(app.decision_status)}`}>
                          {app.decision_status === 'pending' ? 'Pending Review' : app.decision_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && app.decision_status === 'pending' && (
                            <>
                              <button
                                className="p-1.5 hover:bg-green-50 text-green-600 rounded transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {applications.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No applications found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Leads by Source</h3>
              <div className="space-y-3">
                {leadSources.map(source => {
                  const count = leads.filter(l => l.lead_source?.name === source.name).length;
                  const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={source.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{source.name}</span>
                        <span className="text-sm font-medium text-slate-900">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Funnel Stage Distribution</h3>
              <div className="space-y-3">
                {funnelStages.slice(0, 8).map(stage => {
                  const count = leads.filter(l => l.current_stage?.name === stage.name).length;
                  const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{stage.name}</span>
                        <span className="text-sm font-medium text-slate-900">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stage.color_code
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Application Decision Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <p className="text-4xl font-bold text-green-700 mb-2">
                  {applications.filter(a => a.decision_status === 'approved').length}
                </p>
                <p className="text-sm text-green-600 font-medium">Approved Applications</p>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-lg">
                <p className="text-4xl font-bold text-yellow-700 mb-2">
                  {applications.filter(a => a.decision_status === 'pending').length}
                </p>
                <p className="text-sm text-yellow-600 font-medium">Pending Review</p>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-lg">
                <p className="text-4xl font-bold text-red-700 mb-2">
                  {applications.filter(a => a.decision_status === 'rejected').length}
                </p>
                <p className="text-sm text-red-600 font-medium">Rejected Applications</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showLeadModal}
        onClose={() => {
          setShowLeadModal(false);
          resetLeadForm();
        }}
        title="Create New Lead"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Parent Name *
              </label>
              <input
                type="text"
                required
                value={leadForm.parent_name}
                onChange={(e) => setLeadForm({ ...leadForm, parent_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                type="tel"
                required
                value={leadForm.contact_number}
                onChange={(e) => setLeadForm({ ...leadForm, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={leadForm.contact_email}
                onChange={(e) => setLeadForm({ ...leadForm, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Student Name
              </label>
              <input
                type="text"
                value={leadForm.student_name}
                onChange={(e) => setLeadForm({ ...leadForm, student_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={leadForm.student_dob}
                onChange={(e) => setLeadForm({ ...leadForm, student_dob: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={leadForm.student_gender}
                onChange={(e) => setLeadForm({ ...leadForm, student_gender: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Applying for Class *
              </label>
              <select
                required
                value={leadForm.applying_class_id}
                onChange={(e) => setLeadForm({ ...leadForm, applying_class_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Lead Source *
              </label>
              <select
                required
                value={leadForm.lead_source_id}
                onChange={(e) => setLeadForm({ ...leadForm, lead_source_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Source</option>
                {leadSources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={leadForm.priority}
                onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Previous School
              </label>
              <input
                type="text"
                value={leadForm.previous_school}
                onChange={(e) => setLeadForm({ ...leadForm, previous_school: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <textarea
              value={leadForm.address}
              onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={leadForm.notes}
              onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Lead
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeadModal(false);
                resetLeadForm();
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showVisitModal}
        onClose={() => {
          setShowVisitModal(false);
          resetVisitForm();
          setSelectedLead(null);
        }}
        title={`Log Visit - ${selectedLead?.lead_number}`}
      >
        <form onSubmit={handleLogVisit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visit Type *
              </label>
              <select
                required
                value={visitForm.visit_type}
                onChange={(e) => setVisitForm({ ...visitForm, visit_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="phone_call">Phone Call</option>
                <option value="campus_tour">Campus Tour</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visit Date *
              </label>
              <input
                type="date"
                required
                value={visitForm.visit_date}
                onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={visitForm.visit_time}
                onChange={(e) => setVisitForm({ ...visitForm, visit_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={visitForm.duration_minutes}
                onChange={(e) => setVisitForm({ ...visitForm, duration_minutes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                People Met
              </label>
              <input
                type="text"
                value={visitForm.people_met}
                onChange={(e) => setVisitForm({ ...visitForm, people_met: e.target.value })}
                placeholder="e.g., Mother, Father, Both parents"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Outcome *
              </label>
              <select
                required
                value={visitForm.outcome}
                onChange={(e) => setVisitForm({ ...visitForm, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="followup_needed">Follow-up Needed</option>
                <option value="application_submitted">Application Submitted</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interest Level *
              </label>
              <select
                required
                value={visitForm.interest_level}
                onChange={(e) => setVisitForm({ ...visitForm, interest_level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitForm.followup_required}
                  onChange={(e) => setVisitForm({ ...visitForm, followup_required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Follow-up Required</span>
              </label>
            </div>
          </div>

          {visitForm.followup_required && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Next Follow-up Date
              </label>
              <input
                type="date"
                value={visitForm.next_followup_date}
                onChange={(e) => setVisitForm({ ...visitForm, next_followup_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Discussion Points
            </label>
            <textarea
              value={visitForm.discussion_points}
              onChange={(e) => setVisitForm({ ...visitForm, discussion_points: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Concerns Raised
            </label>
            <textarea
              value={visitForm.concerns_raised}
              onChange={(e) => setVisitForm({ ...visitForm, concerns_raised: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={visitForm.notes}
              onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Log Visit
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowVisitModal(false);
                resetVisitForm();
                setSelectedLead(null);
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
