import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Award, Plus, Check, X, Download, Eye, FileText, AlertCircle, CheckCircle, Layout } from 'lucide-react';
import { Modal } from '../Modal';

interface AwardType {
  id: string;
  name: string;
  description?: string;
  is_global: boolean;
  is_active: boolean;
}

interface Student {
  id: string;
  name: string;
  admission_number: string;
  class: { name: string };
  section: { name: string };
}

interface StudentAward {
  id: string;
  student: { name: string; admission_number: string };
  award_type?: { name: string; category?: string };
  award_name: string;
  event_name: string;
  event_date: string;
  position?: string;
  issued_by?: string;
  issued_at?: string;
  created_at: string;
  status?: string;
  nominated_by_profile?: { name: string };
}

interface CertificateTemplate {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  preview_url?: string;
}

export default function CertificateManagement() {
  const { schoolId } = useSchool();
  const userId = 'demo-user-id';
  const isAdmin = true;
  const isTeacher = false;

  const [activeTab, setActiveTab] = useState<'nominate' | 'issued' | 'templates' | 'pending' | 'approved'>('nominate');
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [awards, setAwards] = useState<StudentAward[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAward, setPreviewAward] = useState<StudentAward | null>(null);

  // Template states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState('classic');

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [nominationForm, setNominationForm] = useState({
    award_type_name: '', // Changed to allow free text
    award_type_id: '',   // Optional ID if selected from list
    event_name: '',
    event_date: '',
    position: '',
    achievement_description: '',
    presenter_name: '',
    presenter_designation: '',
    selected_students: [] as string[]
  });

  useEffect(() => {
    loadAwardTypes();
    loadClasses();
    loadTemplates();
    if (activeTab !== 'nominate') {
      loadAwards();
    }
  }, [activeTab]);

  useEffect(() => {
    if (filterClass) {
      loadSections(filterClass);
      loadStudents();
    } else {
      setSections([]);
      setStudents([]);
    }
  }, [filterClass, filterSection]);

  const loadAwardTypes = async () => {
    const { data } = await supabase
      .from('award_types')
      .select('*')
      .or(`school_id.eq.${schoolId},is_global.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setAwardTypes(data);
    }
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order');

    if (data) {
      setClasses(data);
    }
  };

  const loadSections = async (classId: string) => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (data) {
      setSections(data);
    }
  };

  const loadStudents = async () => {
    if (!filterClass) return;

    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        admission_number,
        class:classes(name),
        section:sections(name)
      `)
      .eq('school_id', schoolId)
      .eq('class_id', filterClass)
      .eq('status', 'active')
      .order('name');

    if (filterSection) {
      query = query.eq('section_id', filterSection);
    }

    const { data } = await query;
    if (data) {
      setStudents(data as any);
    } else {
      setStudents([]);
    }
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (data) {
      setTemplates(data);
    }
  };

  const loadAwards = async () => {
    const { data } = await supabase
      .from('student_awards')
      .select(`
        *,
        student:students(name, admission_number),
        award_type:award_types(name)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (data) {
      setAwards(data as any);
    }
  };

  const handleNominate = async () => {
    // Check for award_type_name instead of id
    if (!nominationForm.award_type_name || !nominationForm.event_name || !nominationForm.event_date) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (nominationForm.selected_students.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one student' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Use free text name if no ID found (which is likely if user typed it)
      const selectedAwardType = awardTypes.find(at => at.id === nominationForm.award_type_id);
      const finalAwardName = selectedAwardType ? selectedAwardType.name : nominationForm.award_type_name;

      const nominations = nominationForm.selected_students.map(studentId => ({
        school_id: schoolId,
        student_id: studentId,
        award_type_id: nominationForm.award_type_id || null, // Can be null if custom type
        award_name: finalAwardName,
        event_name: nominationForm.event_name,
        event_date: nominationForm.event_date,
        position: nominationForm.position || null,
        remarks: nominationForm.achievement_description || null,
        issued_by: userId
      }));

      const { error } = await supabase
        .from('student_awards')
        .insert(nominations);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Successfully awarded ${nominationForm.selected_students.length} student(s) with ${finalAwardName}`
      });

      setNominationForm({
        award_type_id: '',
        award_type_name: '',
        event_name: '',
        event_date: '',
        position: '',
        achievement_description: '',
        presenter_name: '',
        presenter_designation: '',
        selected_students: []
      });
      setFilterClass('');
      setStudents([]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (awardId: string, approved: boolean, comments?: string) => {
    setLoading(true);
    try {
      if (awardId.startsWith('aw-')) {
        // Handle mock data approval
        const updatedAwards = awards.filter(a => a.id !== awardId);
        setAwards(updatedAwards);
        setMessage({
          type: 'success',
          text: `Award ${approved ? 'approved' : 'rejected'} successfully (Mock Action)`
        });
      } else {
        const { error } = await supabase
          .from('student_awards')
          .update({
            status: approved ? 'approved' : 'rejected',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            approval_comments: comments || null
          })
          .eq('id', awardId);
        if (error) throw error;
        setMessage({
          type: 'success',
          text: `Award ${approved ? 'approved' : 'rejected'} successfully`
        });
        loadAwards();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificates = async (awardIds: string[]) => {
    if (awardIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select awards to generate certificates' });
      return;
    }

    setLoading(true);
    try {
      // Check for mock IDs
      const hasMockIds = awardIds.some(id => id.startsWith('aw-'));

      if (hasMockIds) {
        setMessage({
          type: 'success',
          text: `Successfully generated certificates for ${awardIds.length} award(s). (Mock Action)`
        });
      } else {
        const defaultTemplate = templates.find(t => t.is_default);
        if (!defaultTemplate) {
          throw new Error('No default template found');
        }

        const { error } = await supabase
          .from('student_awards')
          .update({
            certificate_issued: true,
            certificate_template_id: defaultTemplate.id,
            certificate_issued_at: new Date().toISOString(),
            certificate_issued_by: userId,
            status: 'issued'
          })
          .in('id', awardIds);

        if (error) throw error;

        setMessage({
          type: 'success',
          text: `Successfully generated certificates for ${awardIds.length} award(s). In production, PDF files would be available for download.`
        });
        loadAwards();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    // Mock creation
    const newTemplate: CertificateTemplate = {
      id: `t-${Date.now()}`,
      name: newTemplateName,
      is_default: false,
      is_active: true
    };
    setTemplates([...templates, newTemplate]);
    setNewTemplateName('');
    setShowTemplateModal(false);
    setMessage({ type: 'success', text: 'Template created successfully (Mock)' });
  };

  const toggleStudentSelection = (studentId: string) => {
    setNominationForm(prev => ({
      ...prev,
      selected_students: prev.selected_students.includes(studentId)
        ? prev.selected_students.filter(id => id !== studentId)
        : [...prev.selected_students, studentId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Award className="w-7 h-7 text-yellow-600" />
          Certificate Management
        </h2>
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
            { id: 'nominate', label: 'Award Students', icon: Plus },
            { id: 'issued', label: 'View Certificates', icon: Award },
            { id: 'templates', label: 'Templates', icon: Layout }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-yellow-600 text-yellow-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'nominate' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Nominate Students for Awards</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Award Type *</label>
              <div className="relative">
                <input
                  type="text"
                  list="award-types-list"
                  value={nominationForm.award_type_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const existing = awardTypes.find(at => at.name === val);
                    setNominationForm({
                      ...nominationForm,
                      award_type_name: val,
                      award_type_id: existing ? existing.id : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Select or type award name..."
                />
                <datalist id="award-types-list">
                  {awardTypes.map(type => (
                    <option key={type.id} value={type.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Event Name *</label>
              <input
                type="text"
                value={nominationForm.event_name}
                onChange={(e) => setNominationForm({ ...nominationForm, event_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="e.g., Annual Sports Day 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Event Date *</label>
              <input
                type="date"
                value={nominationForm.event_date}
                onChange={(e) => setNominationForm({ ...nominationForm, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Position
              </label>
              <input
                type="text"
                value={nominationForm.position}
                onChange={(e) => setNominationForm({ ...nominationForm, position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="e.g., 1st Place, Gold Medal"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Achievement Description</label>
              <textarea
                value={nominationForm.achievement_description}
                onChange={(e) => setNominationForm({ ...nominationForm, achievement_description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                rows={2}
                placeholder="Brief description of the achievement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Presenter Name</label>
              <input
                type="text"
                value={nominationForm.presenter_name}
                onChange={(e) => setNominationForm({ ...nominationForm, presenter_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Name of the person presenting"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Presenter Designation</label>
              <input
                type="text"
                value={nominationForm.presenter_designation}
                onChange={(e) => setNominationForm({ ...nominationForm, presenter_designation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="e.g., Chief Guest, Sports Coordinator"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium text-slate-800 mb-4">Select Students</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Class *</label>
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  disabled={!filterClass}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-slate-100"
                >
                  <option value="">All Sections</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {students.length > 0 && (
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-slate-700">Select</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-700">Name</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-700">Admission No</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-700">Class</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-700">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={nominationForm.selected_students.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                          />
                        </td>
                        <td className="p-3 text-sm">{student.name}</td>
                        <td className="p-3 text-sm">{student.admission_number}</td>
                        <td className="p-3 text-sm">{student.class?.name}</td>
                        <td className="p-3 text-sm">{student.section?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleNominate}
              disabled={loading || nominationForm.selected_students.length === 0}
              className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Nominating...' : `Nominate ${nominationForm.selected_students.length} Student(s)`}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'pending' && isAdmin && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Pending Approvals</h3>
          {awards.length === 0 ? (
            <p className="text-slate-600">No pending awards to approve</p>
          ) : (
            <div className="space-y-4">
              {awards.map(award => (
                <div key={award.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-800">{award.student.name}</h4>
                      <p className="text-sm text-slate-600">{award.award_type?.name}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded capitalize">
                      {award.award_type?.category}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-slate-600">Event:</span> {award.event_name}</div>
                    <div><span className="text-slate-600">Date:</span> {new Date(award.event_date).toLocaleDateString()}</div>
                    {award.position && <div><span className="text-slate-600">Position:</span> {award.position}</div>}
                    <div><span className="text-slate-600">Nominated by:</span> {award.nominated_by_profile?.name}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(award.id, true)}
                      disabled={loading}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-300 text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(award.id, false)}
                      disabled={loading}
                      className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-slate-300 text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Generate Certificates</h3>
          {awards.length === 0 ? (
            <p className="text-slate-600">No approved awards pending certificate generation</p>
          ) : (
            <>
              <div className="mb-4">
                <button
                  onClick={() => handleGenerateCertificates(awards.map(a => a.id))}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-slate-300 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  {loading ? 'Generating...' : `Generate All (${awards.length})`}
                </button>
              </div>
              <div className="space-y-3">
                {awards.map(award => (
                  <div key={award.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800">{award.student.name}</h4>
                      <p className="text-sm text-slate-600">{award.award_type?.name} - {award.event_name}</p>
                    </div>
                    <button
                      onClick={() => handleGenerateCertificates([award.id])}
                      disabled={loading}
                      className="flex items-center gap-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-slate-300 text-sm font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Generate
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'issued' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Issued Certificates</h3>
          {awards.length === 0 ? (
            <p className="text-slate-600">No certificates issued yet</p>
          ) : (
            <div className="space-y-3">
              {awards.map(award => (
                <div key={award.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800">{award.student.name}</h4>
                    <p className="text-sm text-slate-600">{award.award_type?.name} - {award.event_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Issued on {new Date(award.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPreviewAward(award);
                        setShowPreview(true);
                      }}
                      className="flex items-center gap-1 px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewAward(null);
        }}
        title="Certificate Preview"
        size="lg"
      >
        {previewAward && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 p-8 rounded-lg border-4 border-yellow-600">
              <div className="bg-white rounded-lg p-8 shadow-2xl">
                <div className="text-center border-b-4 border-yellow-600 pb-4 mb-6">
                  <div className="w-20 h-20 mx-auto mb-3 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Award className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Certificate of Achievement</h2>
                  <p className="text-sm text-slate-600">Demo International School</p>
                </div>

                <div className="text-center space-y-4 py-6">
                  <p className="text-lg text-slate-700">This certifies that</p>
                  <h3 className="text-4xl font-bold text-yellow-700">{previewAward.student.name}</h3>
                  <p className="text-sm text-slate-600">({previewAward.student.admission_number})</p>

                  <p className="text-lg text-slate-700 pt-4">Has been awarded</p>
                  <h4 className="text-2xl font-bold text-slate-800">{previewAward.award_type?.name}</h4>

                  <div className="pt-4 pb-2">
                    <p className="text-slate-700">For the event</p>
                    <p className="text-xl font-semibold text-slate-800">{previewAward.event_name}</p>
                  </div>

                  {previewAward.position && (
                    <div className="bg-yellow-50 rounded-lg p-3 inline-block">
                      <p className="text-lg font-bold text-yellow-700">{previewAward.position}</p>
                    </div>
                  )}

                  <p className="text-sm text-slate-600 pt-4">
                    Event Date: {new Date(previewAward.event_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="border-t-2 border-slate-200 pt-6 mt-6 flex justify-around text-center">
                  <div>
                    <div className="h-16 border-b-2 border-slate-800 mb-2"></div>
                    <p className="text-sm font-medium text-slate-700">Principal</p>
                    <p className="text-xs text-slate-600">Demo International School</p>
                  </div>
                  <div>
                    <div className="h-16 border-b-2 border-slate-800 mb-2"></div>
                    <p className="text-sm font-medium text-slate-700">Class Teacher</p>
                    <p className="text-xs text-slate-600">Academic Year 2025-26</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <p className="text-center text-xs text-slate-500 italic">
                    This is a preview. Actual certificate may vary.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewAward(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  alert('Certificate download would start here in production');
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download Certificate
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Create Certificate Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Template Name *</label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="e.g. Sports Merit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Layout Base</label>
            <div className="grid grid-cols-2 gap-3">
              {['classic', 'modern', 'minimal', 'ornate'].map(layout => (
                <button
                  key={layout}
                  onClick={() => setSelectedLayout(layout)}
                  className={`p-3 border rounded-lg text-center capitalize text-sm font-medium transition-colors ${selectedLayout === layout
                    ? 'border-yellow-600 bg-yellow-50 text-yellow-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              Create Template
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
