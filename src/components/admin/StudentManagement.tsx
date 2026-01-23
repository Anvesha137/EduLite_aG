import { useState, useEffect } from 'react';
import { Plus, Search, Upload, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Student, Class, Section, Parent } from '../../types/database';
import { Modal } from '../Modal';
import { CSVUpload } from '../CSVUpload';
import { formatDate } from '../../lib/helpers';

export function StudentManagement() {
  const { schoolId } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const loadData = async () => {
    try {
      const [studentsRes, classesRes, sectionsRes, parentsRes] = await Promise.all([
        supabase.from('students').select('*, class:classes(*), section:sections(*), parent:parents(*)').eq('school_id', schoolId).order('admission_number'),
        supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order'),
        supabase.from('sections').select('*').eq('school_id', schoolId),
        supabase.from('parents').select('*').eq('school_id', schoolId).order('name'),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as any);
      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (parentsRes.data) setParents(parentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || student.class_id === filterClass;
    const matchesStatus = !filterStatus || student.status === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleBulkUpload = async (data: any[]) => {
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const classData = classes.find(c => c.grade.toLowerCase() === row.class?.toLowerCase());
        const sectionData = classData ? sections.find(s => s.class_id === classData.id && s.name.toLowerCase() === row.section?.toLowerCase()) : null;
        const parentData = parents.find(p => p.phone === row.parent_phone);

        if (!row.admission_number || !row.name || !row.dob || !row.gender) {
          errors.push(`Row ${i + 2}: Missing required fields (admission_number, name, dob, gender)`);
          continue;
        }

        const studentData = {
          school_id: schoolId,
          admission_number: row.admission_number,
          name: row.name,
          dob: row.dob,
          gender: row.gender.toLowerCase(),
          blood_group: row.blood_group || null,
          class_id: classData?.id || null,
          section_id: sectionData?.id || null,
          parent_id: parentData?.id || null,
          status: 'active',
          admission_date: row.admission_date || new Date().toISOString().split('T')[0],
          address: row.address || null,
        };

        const { error } = await supabase.from('students').insert(studentData);
        if (error) {
          if (error.code === '23505') {
            errors.push(`Row ${i + 2}: Admission number ${row.admission_number} already exists`);
          } else {
            errors.push(`Row ${i + 2}: ${error.message}`);
          }
        } else {
          successCount++;
        }
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    await loadData();
    return { success: successCount, errors };
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;

    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Student Management</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => { setEditingStudent(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.grade}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Admission No.</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Student Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Class</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">DOB</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Parent</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">{student.admission_number}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-600">{student.gender}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {(student as any).class?.grade || '-'} {(student as any).section?.name || ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(student.dob)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {(student as any).parent?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'inactive' ? 'bg-slate-100 text-slate-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingStudent(student); setShowAddModal(true); }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No students found matching your criteria
        </div>
      )}

      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Students"
        size="lg"
      >
        <CSVUpload
          onDataParsed={handleBulkUpload}
          templateHeaders={['admission_number', 'name', 'dob', 'gender', 'blood_group', 'class', 'section', 'parent_phone', 'address', 'admission_date']}
          entityName="Student"
        />
      </Modal>

      <StudentForm
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
        student={editingStudent}
        classes={classes}
        sections={sections}
        parents={parents}
        onSave={loadData}
        schoolId={schoolId!}
      />
    </div>
  );
}

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: Class[];
  sections: Section[];
  parents: Parent[];
  onSave: () => void;
  schoolId: string;
}

function StudentForm({ isOpen, onClose, student, classes, sections, parents, onSave, schoolId }: StudentFormProps) {
  const [formData, setFormData] = useState({
    admission_number: '',
    name: '',
    dob: '',
    gender: 'male',
    blood_group: '',
    class_id: '',
    section_id: '',
    parent_id: '',
    address: '',
    admission_date: new Date().toISOString().split('T')[0],
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        admission_number: student.admission_number,
        name: student.name,
        dob: student.dob,
        gender: student.gender,
        blood_group: student.blood_group || '',
        class_id: student.class_id || '',
        section_id: student.section_id || '',
        parent_id: student.parent_id || '',
        address: student.address || '',
        admission_date: student.admission_date,
        status: student.status,
      });
    } else {
      setFormData({
        admission_number: '',
        name: '',
        dob: '',
        gender: 'male',
        blood_group: '',
        class_id: '',
        section_id: '',
        parent_id: '',
        address: '',
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const studentData = {
        ...formData,
        school_id: schoolId,
        class_id: formData.class_id || null,
        section_id: formData.section_id || null,
        parent_id: formData.parent_id || null,
      };

      if (student) {
        const { error } = await supabase.from('students').update(studentData).eq('id', student.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert(studentData);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving student:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const classSections = sections.filter(s => s.class_id === formData.class_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={student ? 'Edit Student' : 'Add Student'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admission Number *
            </label>
            <input
              type="text"
              required
              value={formData.admission_number}
              onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              required
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gender *
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Blood Group
            </label>
            <select
              value={formData.blood_group}
              onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Class
            </label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value, section_id: '' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Section
            </label>
            <select
              value={formData.section_id}
              onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
              disabled={!formData.class_id}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
            >
              <option value="">Select Section</option>
              {classSections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Parent/Guardian
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Parent</option>
              {parents.map(parent => (
                <option key={parent.id} value={parent.id}>{parent.name} - {parent.phone}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admission Date *
            </label>
            <input
              type="date"
              required
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
            {saving ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
