import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, School } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { Announcement } from '../../types/database';
import { Modal } from '../Modal';
import { formatDateTime } from '../../lib/helpers';

interface ClassData {
  id: string;
  grade: string;
  grade_order: number;
}

interface SectionData {
  id: string;
  name: string;
  class_id: string;
}

interface AnnouncementWithTargets extends Announcement {
  target_classes?: ClassData[];
  target_sections?: SectionData[];
  audiences?: string[];
}

export function AnnouncementManagement() {
  const { schoolId } = useSchool();
  const [announcements, setAnnouncements] = useState<AnnouncementWithTargets[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithTargets | null>(null);

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const loadData = async () => {
    try {
      const { data: announcementsData, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('published_at', { ascending: false });

      if (error) throw error;

      if (announcementsData) {
        const enrichedAnnouncements = await Promise.all(
          announcementsData.map(async (announcement) => {
            if (announcement.target_scope === 'targeted') {
              const [classesResult, sectionsResult, audiencesResult] = await Promise.all([
                supabase
                  .from('announcement_target_classes')
                  .select('class_id, classes(id, grade, grade_order)')
                  .eq('announcement_id', announcement.id),
                supabase
                  .from('announcement_target_sections')
                  .select('section_id, sections(id, name, class_id)')
                  .eq('announcement_id', announcement.id),
                supabase
                  .from('announcement_audiences')
                  .select('audience_type')
                  .eq('announcement_id', announcement.id),
              ]);

              return {
                ...announcement,
                target_classes: classesResult.data?.map((c: any) => c.classes).filter(Boolean) || [],
                target_sections: sectionsResult.data?.map((s: any) => s.sections).filter(Boolean) || [],
                audiences: audiencesResult.data?.map((a: any) => a.audience_type) || [],
              };
            }
            return announcement;
          })
        );

        setAnnouncements(enrichedAnnouncements);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm(`Are you sure you want to delete this announcement?`)) return;

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating announcement:', error);
    }
  };

  const getTargetSummary = (announcement: AnnouncementWithTargets): string => {
    if (announcement.target_scope === 'school_wide') {
      return 'Entire School';
    }

    const parts: string[] = [];

    if (announcement.target_classes && announcement.target_classes.length > 0) {
      const classNames = announcement.target_classes
        .sort((a, b) => a.grade_order - b.grade_order)
        .map(c => c.grade)
        .join(', ');
      parts.push(`Classes: ${classNames}`);
    }

    if (announcement.target_sections && announcement.target_sections.length > 0) {
      const sectionNames = announcement.target_sections.map(s => s.name).join(', ');
      parts.push(`Sections: ${sectionNames}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No targets selected';
  };

  const getAudienceSummary = (announcement: AnnouncementWithTargets): string => {
    const audiences = announcement.target_scope === 'targeted' && announcement.audiences
      ? announcement.audiences
      : announcement.target_audience;

    return audiences.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
        <button
          onClick={() => { setEditingAnnouncement(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`bg-white rounded-xl shadow-sm border ${
              announcement.priority === 'urgent'
                ? 'border-red-300'
                : announcement.priority === 'high'
                ? 'border-amber-300'
                : 'border-slate-200'
            } p-6`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      announcement.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : announcement.priority === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {announcement.priority.toUpperCase()}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      announcement.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {announcement.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-slate-700 mb-3">{announcement.content}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {announcement.target_scope === 'school_wide' ? (
                      <School className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Users className="w-4 h-4 text-green-600" />
                    )}
                    <span className="font-medium text-slate-900">Target:</span>
                    <span className="text-slate-700">{getTargetSummary(announcement)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-900">Audience:</span>
                    <span className="text-slate-700">{getAudienceSummary(announcement)}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>Published: {formatDateTime(announcement.published_at)}</span>
                    {announcement.expires_at && (
                      <>
                        <span>•</span>
                        <span>Expires: {formatDateTime(announcement.expires_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => { setEditingAnnouncement(announcement); setShowAddModal(true); }}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(announcement)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    announcement.is_active
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                  }`}
                >
                  {announcement.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(announcement)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No announcements yet. Click "Create Announcement" to add one.
          </div>
        )}
      </div>

      <AnnouncementForm
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingAnnouncement(null); }}
        announcement={editingAnnouncement}
        onSave={loadData}
        schoolId={schoolId!}
      />
    </div>
  );
}

interface AnnouncementFormProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: AnnouncementWithTargets | null;
  onSave: () => void;
  schoolId: string;
}

function AnnouncementForm({ isOpen, onClose, announcement, onSave, schoolId }: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_scope: 'school_wide',
    target_audience: ['all'],
    audiences: ['all'],
    priority: 'normal',
    expires_at: '',
  });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schoolId) {
      loadClassesAndSections();
    }
  }, [schoolId]);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        target_scope: announcement.target_scope || 'school_wide',
        target_audience: announcement.target_audience,
        audiences: announcement.audiences || announcement.target_audience,
        priority: announcement.priority,
        expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
      });
      setSelectedClasses(announcement.target_classes?.map(c => c.id) || []);
      setSelectedSections(announcement.target_sections?.map(s => s.id) || []);
    } else {
      setFormData({
        title: '',
        content: '',
        target_scope: 'school_wide',
        target_audience: ['all'],
        audiences: ['all'],
        priority: 'normal',
        expires_at: '',
      });
      setSelectedClasses([]);
      setSelectedSections([]);
    }
  }, [announcement]);

  const loadClassesAndSections = async () => {
    try {
      const [classesResult, sectionsResult] = await Promise.all([
        supabase
          .from('classes')
          .select('id, grade, grade_order')
          .eq('school_id', schoolId)
          .order('grade_order'),
        supabase
          .from('sections')
          .select('id, name, class_id')
          .order('name'),
      ]);

      if (classesResult.data) setClasses(classesResult.data);
      if (sectionsResult.data) setSections(sectionsResult.data);
    } catch (error) {
      console.error('Error loading classes and sections:', error);
    }
  };

  const toggleClass = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const toggleAllSectionsForClass = (classId: string) => {
    const classSections = sections.filter(s => s.class_id === classId);
    const allSelected = classSections.every(s => selectedSections.includes(s.id));

    if (allSelected) {
      setSelectedSections(prev => prev.filter(id => !classSections.map(s => s.id).includes(id)));
    } else {
      setSelectedSections(prev => [...new Set([...prev, ...classSections.map(s => s.id)])]);
    }
  };

  const toggleAudience = (audience: string) => {
    const currentAudiences = formData.target_scope === 'school_wide'
      ? formData.target_audience
      : formData.audiences;

    let newAudiences: string[];
    if (currentAudiences.includes(audience)) {
      newAudiences = currentAudiences.filter(a => a !== audience);
      if (newAudiences.length === 0) newAudiences = ['all'];
    } else {
      newAudiences = [...currentAudiences, audience];
    }

    if (formData.target_scope === 'school_wide') {
      setFormData({ ...formData, target_audience: newAudiences });
    } else {
      setFormData({ ...formData, audiences: newAudiences });
    }
  };

  const getTargetPreview = (): string => {
    if (formData.target_scope === 'school_wide') {
      return 'Entire School';
    }

    const parts: string[] = [];

    if (selectedClasses.length > 0) {
      const classNames = classes
        .filter(c => selectedClasses.includes(c.id))
        .sort((a, b) => a.grade_order - b.grade_order)
        .map(c => c.grade)
        .join(', ');
      parts.push(`Classes: ${classNames}`);
    }

    if (selectedSections.length > 0) {
      const sectionDetails = sections
        .filter(s => selectedSections.includes(s.id))
        .map(s => {
          const cls = classes.find(c => c.id === s.class_id);
          return cls ? `${cls.grade}-${s.name}` : s.name;
        })
        .join(', ');
      parts.push(`Sections: ${sectionDetails}`);
    }

    if (parts.length === 0) {
      return 'No targets selected';
    }

    return parts.join(' | ');
  };

  const getAudiencePreview = (): string => {
    const audiences = formData.target_scope === 'school_wide'
      ? formData.target_audience
      : formData.audiences;
    return audiences.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.target_scope === 'targeted' && selectedClasses.length === 0 && selectedSections.length === 0) {
      alert('Please select at least one class or section for targeted announcements.');
      return;
    }

    setSaving(true);

    try {
      const announcementData = {
        title: formData.title,
        content: formData.content,
        target_scope: formData.target_scope,
        target_audience: formData.target_scope === 'school_wide' ? formData.target_audience : ['all'],
        priority: formData.priority,
        school_id: schoolId,
        expires_at: formData.expires_at || null,
        is_active: true,
        published_at: new Date().toISOString(),
      };

      let announcementId: string;

      if (announcement) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', announcement.id);
        if (error) throw error;
        announcementId = announcement.id;

        await Promise.all([
          supabase.from('announcement_target_classes').delete().eq('announcement_id', announcementId),
          supabase.from('announcement_target_sections').delete().eq('announcement_id', announcementId),
          supabase.from('announcement_audiences').delete().eq('announcement_id', announcementId),
        ]);
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert(announcementData)
          .select()
          .single();
        if (error) throw error;
        announcementId = data.id;
      }

      if (formData.target_scope === 'targeted') {
        const operations = [];

        if (selectedClasses.length > 0) {
          operations.push(
            supabase.from('announcement_target_classes').insert(
              selectedClasses.map(classId => ({
                announcement_id: announcementId,
                class_id: classId,
              }))
            )
          );
        }

        if (selectedSections.length > 0) {
          operations.push(
            supabase.from('announcement_target_sections').insert(
              selectedSections.map(sectionId => ({
                announcement_id: announcementId,
                section_id: sectionId,
              }))
            )
          );
        }

        operations.push(
          supabase.from('announcement_audiences').insert(
            formData.audiences.map(audience => ({
              announcement_id: announcementId,
              audience_type: audience,
            }))
          )
        );

        await Promise.all(operations);
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={announcement ? 'Edit Announcement' : 'Create Announcement'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
            <select
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Expires On</label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Target Scope *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target_scope"
                value="school_wide"
                checked={formData.target_scope === 'school_wide'}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">Entire School</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target_scope"
                value="targeted"
                checked={formData.target_scope === 'targeted'}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">Specific Classes/Sections</span>
            </label>
          </div>
        </div>

        {formData.target_scope === 'targeted' && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Classes (Optional - leave empty to target only sections)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded border border-slate-200">
                {classes.map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => toggleClass(cls.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">{cls.grade}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Sections (Optional - for granular targeting)
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto p-2 bg-white rounded border border-slate-200">
                {classes.map(cls => {
                  const classSections = sections.filter(s => s.class_id === cls.id);
                  if (classSections.length === 0) return null;

                  const allSelected = classSections.every(s => selectedSections.includes(s.id));

                  return (
                    <div key={cls.id} className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm font-medium text-slate-900">{cls.grade}</span>
                        <button
                          type="button"
                          onClick={() => toggleAllSectionsForClass(cls.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-4">
                        {classSections.map(section => (
                          <label key={section.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.id)}
                              onChange={() => toggleSection(section.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-slate-700">{section.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience *</label>
          <div className="grid grid-cols-2 gap-2">
            {['all', 'students', 'parents', 'educators'].map(audience => (
              <label key={audience} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={
                    formData.target_scope === 'school_wide'
                      ? formData.target_audience.includes(audience)
                      : formData.audiences.includes(audience)
                  }
                  onChange={() => toggleAudience(audience)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700 capitalize">{audience}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Preview: Who will see this announcement?</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Target:</strong> {getTargetPreview()}</p>
            <p><strong>Audience:</strong> {getAudiencePreview()}</p>
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
            {saving ? 'Saving...' : announcement ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
