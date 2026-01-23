import { useState, useEffect } from 'react';
import { Plus, Search, Upload, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Educator } from '../../types/database';
import { Modal } from '../Modal';
import { CSVUpload } from '../CSVUpload';

export function EducatorManagement() {
  const { schoolId } = useSchool();
  const [educators, setEducators] = useState<Educator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingEducator, setEditingEducator] = useState<Educator | null>(null);

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('educators')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;
      if (data) setEducators(data);
    } catch (error) {
      console.error('Error loading educators:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEducators = educators.filter(educator => {
    const matchesSearch = educator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         educator.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || educator.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleBulkUpload = async (data: any[]) => {
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.employee_id || !row.name || !row.phone) {
          errors.push(`Row ${i + 2}: Missing required fields (employee_id, name, phone)`);
          continue;
        }

        const educatorData = {
          school_id: schoolId,
          employee_id: row.employee_id,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          designation: row.designation || 'teacher',
          qualification: row.qualification || null,
          experience_years: parseInt(row.experience_years) || 0,
          joining_date: row.joining_date || new Date().toISOString().split('T')[0],
          status: 'active',
          address: row.address || null,
        };

        const { error } = await supabase.from('educators').insert(educatorData);
        if (error) {
          if (error.code === '23505') {
            errors.push(`Row ${i + 2}: Employee ID ${row.employee_id} already exists`);
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

  const handleDelete = async (educator: Educator) => {
    if (!confirm(`Are you sure you want to delete ${educator.name}?`)) return;

    try {
      const { error } = await supabase.from('educators').delete().eq('id', educator.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting educator:', error);
      alert('Failed to delete educator');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Educator Management</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => { setEditingEducator(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Educator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="resigned">Resigned</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Employee ID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Designation</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Experience</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEducators.map((educator) => (
                <tr key={educator.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">{educator.employee_id}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{educator.name}</p>
                    <p className="text-sm text-slate-600">{educator.email || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{educator.designation}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{educator.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{educator.experience_years} years</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      educator.status === 'active' ? 'bg-green-100 text-green-700' :
                      educator.status === 'inactive' ? 'bg-slate-100 text-slate-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {educator.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingEducator(educator); setShowAddModal(true); }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(educator)}
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

      {filteredEducators.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No educators found matching your criteria
        </div>
      )}

      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Educators"
        size="lg"
      >
        <CSVUpload
          onDataParsed={handleBulkUpload}
          templateHeaders={['employee_id', 'name', 'phone', 'email', 'designation', 'qualification', 'experience_years', 'joining_date', 'address']}
          entityName="Educator"
        />
      </Modal>

      <EducatorForm
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingEducator(null); }}
        educator={editingEducator}
        onSave={loadData}
        schoolId={schoolId!}
      />
    </div>
  );
}

interface EducatorFormProps {
  isOpen: boolean;
  onClose: () => void;
  educator: Educator | null;
  onSave: () => void;
  schoolId: string;
}

function EducatorForm({ isOpen, onClose, educator, onSave, schoolId }: EducatorFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    phone: '',
    email: '',
    designation: 'teacher',
    qualification: '',
    experience_years: 0,
    joining_date: new Date().toISOString().split('T')[0],
    address: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (educator) {
      setFormData({
        employee_id: educator.employee_id,
        name: educator.name,
        phone: educator.phone,
        email: educator.email || '',
        designation: educator.designation,
        qualification: educator.qualification || '',
        experience_years: educator.experience_years,
        joining_date: educator.joining_date,
        address: educator.address || '',
        status: educator.status,
      });
    } else {
      setFormData({
        employee_id: '',
        name: '',
        phone: '',
        email: '',
        designation: 'teacher',
        qualification: '',
        experience_years: 0,
        joining_date: new Date().toISOString().split('T')[0],
        address: '',
        status: 'active',
      });
    }
  }, [educator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const educatorData = {
        ...formData,
        school_id: schoolId,
      };

      if (educator) {
        const { error } = await supabase.from('educators').update(educatorData).eq('id', educator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('educators').insert(educatorData);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving educator:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={educator ? 'Edit Educator' : 'Add Educator'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Employee ID *
            </label>
            <input
              type="text"
              required
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
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
              Phone *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Designation *
            </label>
            <select
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="teacher">Teacher</option>
              <option value="senior teacher">Senior Teacher</option>
              <option value="head teacher">Head Teacher</option>
              <option value="principal">Principal</option>
              <option value="vice principal">Vice Principal</option>
              <option value="coordinator">Coordinator</option>
              <option value="lab assistant">Lab Assistant</option>
              <option value="librarian">Librarian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Qualification
            </label>
            <input
              type="text"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="e.g., M.Sc Physics"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Experience (Years)
            </label>
            <input
              type="number"
              min="0"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Joining Date *
            </label>
            <input
              type="date"
              required
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
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
              <option value="resigned">Resigned</option>
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
            {saving ? 'Saving...' : educator ? 'Update Educator' : 'Add Educator'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
