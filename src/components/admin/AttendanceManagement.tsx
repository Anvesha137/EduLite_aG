import { useState, useEffect } from 'react';
import { Save, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Student, Class, Section } from '../../types/database';
import { Modal } from '../Modal';
import { CSVUpload } from '../CSVUpload';

export function AttendanceManagement() {
  const { schoolId } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    if (schoolId) {
      loadClasses();
    }
  }, [schoolId]);

  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      loadStudentsAndAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  const loadClasses = async () => {
    try {
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', schoolId).order('grade_order'),
        supabase.from('sections').select('*').eq('school_id', schoolId),
      ]);

      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', selectedClass)
        .eq('section_id', selectedSection)
        .eq('status', 'active')
        .order('name');

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', schoolId)
        .eq('date', selectedDate)
        .in('student_id', studentsData?.map(s => s.id) || []);

      if (studentsData) setStudents(studentsData);

      const attendanceMap: Record<string, string> = {};
      attendanceData?.forEach(a => {
        attendanceMap[a.student_id] = a.status;
      });

      studentsData?.forEach(s => {
        if (!attendanceMap[s.id]) {
          attendanceMap[s.id] = 'present';
        }
      });

      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const attendanceRecords = students.map(student => ({
        school_id: schoolId,
        student_id: student.id,
        date: selectedDate,
        status: attendance[student.id] || 'present',
      }));

      await supabase.from('attendance').delete()
        .eq('school_id', schoolId)
        .eq('date', selectedDate)
        .in('student_id', students.map(s => s.id));

      const { error } = await supabase.from('attendance').insert(attendanceRecords);
      if (error) throw error;

      alert('Attendance saved successfully!');
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    const errors: string[] = [];
    let successCount = 0;

    try {
      await supabase.from('attendance').delete()
        .eq('school_id', schoolId)
        .eq('date', selectedDate);

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const student = students.find(s =>
            s.admission_number === row.admission_number ||
            s.name.toLowerCase() === row.name?.toLowerCase()
          );

          if (!student) {
            errors.push(`Row ${i + 2}: Student not found`);
            continue;
          }

          if (!row.status || !['present', 'absent'].includes(row.status)) {
            errors.push(`Row ${i + 2}: Invalid status (must be present or absent)`);
            continue;
          }

          const attendanceData = {
            school_id: schoolId,
            student_id: student.id,
            date: selectedDate,
            status: row.status,
            remarks: row.remarks || null,
          };

          const { error } = await supabase.from('attendance').insert(attendanceData);
          if (error) throw error;
          successCount++;
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      await loadStudentsAndAttendance();
    } catch (error: any) {
      errors.push(`System error: ${error.message}`);
    }

    return { success: successCount, errors };
  };

  const classSections = sections.filter(s => s.class_id === selectedClass);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Attendance Management</h2>
        <div className="flex items-center gap-3">
          {students.length > 0 && (
            <>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Class *
            </label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
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
              Section *
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
            >
              <option value="">Select Section</option>
              {classSections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading students...</div>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Roll No.</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Student Name</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Present</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-sm text-slate-600">{student.admission_number}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendance[student.id] === 'present'}
                        onChange={() => handleAttendanceChange(student.id, 'present')}
                        className="w-4 h-4 text-green-600"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendance[student.id] === 'absent'}
                        onChange={() => handleAttendanceChange(student.id, 'absent')}
                        className="w-4 h-4 text-red-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedClass && selectedSection ? (
        <div className="text-center py-12 text-slate-500">
          No students found in this class/section
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          Select date, class, and section to mark attendance
        </div>
      )}

      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Attendance"
        size="lg"
      >
        <CSVUpload
          onDataParsed={handleBulkUpload}
          templateHeaders={['admission_number', 'name', 'status', 'remarks']}
          entityName="Attendance"
        />
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Status values: present, absent
          </p>
        </div>
      </Modal>
    </div>
  );
}
