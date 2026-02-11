import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Exam, Class, Subject, Student } from '../../types/database';
import { Modal } from '../Modal';
import { formatDate } from '../../lib/helpers';

export function ExamManagement() {
  const { schoolId, loading: schoolLoading } = useSchool();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  useEffect(() => {
    if (schoolId) {
      loadData();
    } else if (!schoolLoading && !schoolId) {
      setLoading(false);
    }
  }, [schoolId, schoolLoading]);

  const loadData = async () => {
    try {
      const [examsRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from('exams').select('*, class:classes(*)').eq('school_id', schoolId).order('start_date', { ascending: false }),
        supabase.from('classes').select('*').eq('school_id', schoolId).order('sort_order'),
        supabase.from('subjects').select('*').eq('school_id', schoolId).order('name'),
      ]);

      if (examsRes.data) setExams(examsRes.data as any);
      if (classesRes.data) setClasses(classesRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Are you sure you want to delete ${exam.name}?`)) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', exam.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam');
    }
  };

  const togglePublish = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating exam:', error);
      alert('Failed to update exam');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Exam Management</h2>
        <button
          onClick={() => { setEditingExam(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{exam.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${exam.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {exam.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {exam.exam_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-slate-600">Class</p>
                    <p className="font-medium text-slate-900">
                      {(exam as any).class?.name || 'All Classes'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Date Range</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(exam.start_date)} - {formatDate(exam.end_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Academic Year</p>
                    <p className="font-medium text-slate-900">{exam.academic_year}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedExam(exam); setShowMarksModal(true); }}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Enter Marks"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditingExam(exam); setShowAddModal(true); }}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => togglePublish(exam)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${exam.is_published
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                    : 'bg-green-50 hover:bg-green-100 text-green-700'
                    }`}
                >
                  {exam.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleDelete(exam)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {exams.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No exams created yet. Click "Create Exam" to add one.
          </div>
        )}
      </div>

      <ExamForm
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingExam(null); }}
        exam={editingExam}
        classes={classes}
        onSave={loadData}
        schoolId={schoolId!}
      />

      {selectedExam && (
        <MarksEntry
          isOpen={showMarksModal}
          onClose={() => { setShowMarksModal(false); setSelectedExam(null); }}
          exam={selectedExam}
          subjects={subjects}
          schoolId={schoolId!}
        />
      )}
    </div>
  );
}

interface ExamFormProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  classes: Class[];
  onSave: () => void;
  schoolId: string;
}

function ExamForm({ isOpen, onClose, exam, classes, onSave, schoolId }: ExamFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    exam_type: 'unit_test',
    academic_year: '2024-25',
    start_date: '',
    end_date: '',
    class_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exam) {
      setFormData({
        name: exam.name,
        exam_type: exam.exam_type,
        academic_year: exam.academic_year,
        start_date: exam.start_date,
        end_date: exam.end_date,
        class_id: exam.class_id || '',
      });
    } else {
      setFormData({
        name: '',
        exam_type: 'unit_test',
        academic_year: '2024-25',
        start_date: '',
        end_date: '',
        class_id: '',
      });
    }
  }, [exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const examData = {
        ...formData,
        school_id: schoolId,
        class_id: formData.class_id || null,
        is_published: false,
      };

      if (exam) {
        const { error } = await supabase.from('exams').update(examData).eq('id', exam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exams').insert(examData);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving exam:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exam ? 'Edit Exam' : 'Create Exam'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Exam Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Mid Term Examination"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exam Type *</label>
            <select
              required
              value={formData.exam_type}
              onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="unit_test">Unit Test</option>
              <option value="mid_term">Mid Term</option>
              <option value="final">Final</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year *</label>
            <input
              type="text"
              required
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              placeholder="2024-25"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Class (Optional)</label>
          <select
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : exam ? 'Update Exam' : 'Create Exam'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface MarksEntryProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  subjects: Subject[];
  schoolId: string;
}

function MarksEntry({ isOpen, onClose, exam, subjects, schoolId }: MarksEntryProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [marks, setMarks] = useState<Record<string, { obtained: number; max: number }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exam.class_id && selectedSubject) {
      loadMarks();
    }
  }, [exam.class_id, selectedSubject]);

  const loadMarks = async () => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', exam.class_id)
        .eq('status', 'active')
        .order('name');

      const { data: marksData } = await supabase
        .from('marks')
        .select('*')
        .eq('exam_id', exam.id)
        .eq('subject_id', selectedSubject);

      if (studentsData) setStudents(studentsData);

      const marksMap: Record<string, { obtained: number; max: number }> = {};
      marksData?.forEach(m => {
        marksMap[m.student_id] = { obtained: m.marks_obtained, max: m.max_marks };
      });

      studentsData?.forEach(s => {
        if (!marksMap[s.id]) {
          marksMap[s.id] = { obtained: 0, max: 100 };
        }
      });

      setMarks(marksMap);
    } catch (error) {
      console.error('Error loading marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('marks').delete()
        .eq('exam_id', exam.id)
        .eq('subject_id', selectedSubject);

      const marksRecords = students.map(student => ({
        school_id: schoolId,
        exam_id: exam.id,
        student_id: student.id,
        subject_id: selectedSubject,
        marks_obtained: marks[student.id]?.obtained || 0,
        max_marks: marks[student.id]?.max || 100,
      }));

      const { error } = await supabase.from('marks').insert(marksRecords);
      if (error) throw error;

      alert('Marks saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error saving marks:', error);
      alert('Failed to save marks: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enter Marks - ${exam.name}`} size="xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject *</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a subject</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading marks...</div>
        ) : (
          selectedSubject && students.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Student Name</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-900">Marks Obtained</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-900">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-sm text-slate-900">{student.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={marks[student.id]?.obtained || 0}
                            onChange={(e) => setMarks(prev => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], obtained: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-24 mx-auto px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={marks[student.id]?.max || 100}
                            onChange={(e) => setMarks(prev => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], max: parseFloat(e.target.value) || 100 }
                            }))}
                            className="w-24 mx-auto px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </Modal>
  );
}
