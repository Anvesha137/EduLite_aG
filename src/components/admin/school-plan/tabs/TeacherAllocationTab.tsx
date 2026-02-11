import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { logChange } from '../../../../lib/audit';
import { Save, User, RefreshCw } from 'lucide-react';

interface Teacher {
    id: string;
    name: string;
    employee_id: string;
}

export function TeacherAllocationTab() {
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [academicYearId, setAcademicYearId] = useState<string | null>(null);

    // Filter State
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // Matrix Data
    const [sections, setSections] = useState<any[]>([]);
    const [mappedSubjects, setMappedSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allocations, setAllocations] = useState<Record<string, string>>({}); // Key: sectionId_subjectId (or 'CLASS_TEACHER'), Value: teacherId

    useEffect(() => {
        if (schoolId) {
            fetchInitialData();
        }
    }, [schoolId]);

    useEffect(() => {
        if (selectedClassId && academicYearId) {
            fetchMatrixData();
        }
    }, [selectedClassId, academicYearId]);

    const fetchInitialData = async () => {
        try {
            // 1. Fetch Academic Year (Active)
            const { data: years } = await supabase
                .from('academic_years')
                .select('id')
                .eq('school_id', schoolId)
                .eq('is_active', true)
                .limit(1);

            if (years && years.length > 0) {
                setAcademicYearId(years[0].id);
            } else {
                // Fallback: Fetch any year or handle error
                // For now, let's try to fetch THE year even if not marked active if only one exists
                const { data: anyYear } = await supabase
                    .from('academic_years')
                    .select('id')
                    .eq('school_id', schoolId)
                    .limit(1);
                if (anyYear && anyYear.length > 0) setAcademicYearId(anyYear[0].id);
            }

            // 2. Fetch Classes
            const { data: cls } = await supabase
                .from('classes')
                .select('id, name')
                .eq('school_id', schoolId)
                .order('sort_order');

            setClasses(cls || []);
            if (cls && cls.length > 0) setSelectedClassId(cls[0].id);

            // 3. Fetch Teachers
            const { data: tch } = await supabase
                .from('educators')
                .select('id, name, employee_id')
                .eq('school_id', schoolId)
                .eq('status', 'active')
                .order('name');
            setTeachers(tch || []);

        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchMatrixData = async () => {
        if (!selectedClassId || !academicYearId) return;
        setLoading(true);
        try {
            // 1. Fetch Sections
            const { data: sec } = await supabase
                .from('sections')
                .select('*')
                .eq('class_id', selectedClassId)
                .order('name');
            setSections(sec || []);

            // 2. Fetch Mapped Subjects
            const { data: subMap } = await supabase
                .from('class_subjects')
                .select('subject:subjects(id, name, code, type)')
                .eq('class_id', selectedClassId);

            const subs = subMap?.map((m: any) => m.subject) || [];
            // Sort: Academic first, then Activity
            subs.sort((a: any, b: any) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'academic' ? -1 : 1;
            });
            setMappedSubjects(subs);

            // 3. Fetch Existing Allocations
            const { data: allocs } = await supabase
                .from('teacher_allocations')
                .select('*')
                .eq('class_id', selectedClassId)
                .eq('academic_year_id', academicYearId);

            const allocMap: Record<string, string> = {};
            allocs?.forEach((a: any) => {
                if (a.is_class_teacher) {
                    allocMap[`${a.section_id}_CT`] = a.teacher_id;
                } else if (a.subject_id) {
                    allocMap[`${a.section_id}_${a.subject_id}`] = a.teacher_id;
                }
            });
            setAllocations(allocMap);

        } catch (error) {
            console.error('Error fetching matrix data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (sectionId: string, subjectId: string | 'CT', teacherId: string) => {
        setAllocations(prev => ({
            ...prev,
            [`${sectionId}_${subjectId}`]: teacherId
        }));
    };

    const handleSave = async () => {
        if (!academicYearId || !schoolId) {
            alert('No active academic year or school found.');
            return;
        }
        setSaving(true);
        try {
            const changes: any[] = [];

            // For logging purposes, we'll collect log entries and send them after success
            const logsToCommit: (() => Promise<void>)[] = [];

            const promises: Promise<any>[] = [];

            // 1. Class Teachers
            for (const sec of sections) {
                const key = `${sec.id}_CT`;
                const teacherId = allocations[key];

                // Get old value from allocations? No, allocations is current UI state.
                // We don't have purely "old" state unless we fetched it.
                // But we can just log "Updated allocation".
                // Ideally we diff, but for now we log what we are saving.

                if (teacherId) {
                    changes.push({
                        school_id: schoolId,
                        class_id: selectedClassId,
                        section_id: sec.id,
                        teacher_id: teacherId,
                        subject_id: null,
                        is_class_teacher: true,
                        academic_year_id: academicYearId
                    });

                    const tName = teachers.find(t => t.id === teacherId)?.name || teacherId;
                    const cName = classes.find(c => c.id === selectedClassId)?.name;

                    logsToCommit.push(() => logChange(schoolId, 'teacher_allocation', `${sec.id}_CT`, 'assigned', 'unknown', teacherId, `Assigned Class Teacher: ${tName} to ${cName} - ${sec.name}`));

                } else {
                    // Delete
                    promises.push(
                        supabase.from('teacher_allocations').delete()
                            .eq('class_id', selectedClassId)
                            .eq('section_id', sec.id)
                            .eq('is_class_teacher', true)
                            .eq('academic_year_id', academicYearId) as unknown as Promise<any>
                    );
                    logsToCommit.push(() => logChange(schoolId, 'teacher_allocation', `${sec.id}_CT`, 'removed', 'unknown', null, `Removed Class Teacher from Section ${sec.name}`));
                }

                // 2. Subject Teachers
                for (const sub of mappedSubjects) {
                    const subKey = `${sec.id}_${sub.id}`;
                    const subTeacherId = allocations[subKey];

                    if (subTeacherId) {
                        changes.push({
                            school_id: schoolId,
                            class_id: selectedClassId,
                            section_id: sec.id,
                            teacher_id: subTeacherId,
                            subject_id: sub.id,
                            is_class_teacher: false,
                            academic_year_id: academicYearId
                        });

                        const tName = teachers.find(t => t.id === subTeacherId)?.name || subTeacherId;

                        logsToCommit.push(() => logChange(schoolId, 'teacher_allocation', `${sec.id}_${sub.id}`, 'assigned', 'unknown', subTeacherId, `Assigned ${tName} to ${sub.name} (${sec.name})`));
                    } else {
                        promises.push(
                            supabase.from('teacher_allocations').delete()
                                .eq('class_id', selectedClassId)
                                .eq('section_id', sec.id)
                                .eq('subject_id', sub.id)
                                .eq('academic_year_id', academicYearId) as unknown as Promise<any>
                        );
                        // We only log removal if we think there probably was one? 
                        // Or just log "Ensure removed". 
                        // To avoid spamming logs for already empty slots, we might skip logging removals unless we track dirty state.
                        // But let's log it for completeness if the user explicitly cleared it (which we can't distinguish easily without dirty tracking).
                        // Actually, 'allocations' is the current desired state.
                        // If we want to be precise, we should track what changed.
                        // For now, let's skip logging "removals" of empty slots to avoid noise.
                    }
                }
            }

            // Execute deletions
            await Promise.all(promises);

            // Execute upserts
            if (changes.length > 0) {
                const { error } = await supabase.from('teacher_allocations').upsert(changes, {
                    onConflict: 'class_id,section_id,subject_id,academic_year_id'
                });
                if (error) throw error;
            }

            // Execute logs
            if (logsToCommit.length > 0) {
                // Execute in parallel
                await Promise.all(logsToCommit.map(fn => fn()));
            }

            // Bulk log as a fallback or high-level summary if needed, but detailed logs are better.
            // We can keep specific bulk log or just rely on detailed.
            // Let's remove the generic bulk log to avoid noise if we have detailed logs.
            if (logsToCommit.length === 0) {
                await logChange(schoolId, 'teacher_allocation', selectedClassId, 'bulk_update', null, null, `Updated Teacher Allocations for Class (No specific changes logged)`);
            }

            alert('Teacher allocations saved successfully.');
            fetchMatrixData(); // Refresh
        } catch (error: any) {
            console.error('Error saving allocations:', error);
            alert('Failed to save: ' + (error.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    if (!academicYearId) {
        return <div className="p-6 text-center text-red-500">No active academic year found. Please configure Master Settings first.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Teacher Allocation Matrix</h3>
                    <p className="text-slate-500 text-sm">Assign Class Teachers and Subject Teachers</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        className="border rounded-lg px-3 py-2 bg-white min-w-[200px]"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                    >
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Allocations
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading matrix...</div>
            ) : sections.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-500 border border-dashed">
                    No sections found for this class. Add sections in Academic Structure first.
                </div>
            ) : (
                <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b font-medium text-slate-700">
                            <tr>
                                <th className="p-4 w-[200px] border-r">Subject / Role</th>
                                {sections.map(sec => (
                                    <th key={sec.id} className="p-4 min-w-[250px] border-r last:border-r-0">
                                        Section {sec.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {/* Class Teacher Row */}
                            <tr className="bg-blue-50/50">
                                <td className="p-4 font-bold text-slate-800 border-r flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-600" />
                                    Class Teacher
                                </td>
                                {sections.map(sec => (
                                    <td key={sec.id} className="p-3 border-r last:border-r-0">
                                        <select
                                            className="w-full border rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={allocations[`${sec.id}_CT`] || ''}
                                            onChange={e => handleAllocationChange(sec.id, 'CT', e.target.value)}
                                        >
                                            <option value="">-- Select Class Teacher --</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.employee_id})</option>
                                            ))}
                                        </select>
                                    </td>
                                ))}
                            </tr>

                            {/* Subject Rows */}
                            {mappedSubjects.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 border-r">
                                        <div className="font-medium">{sub.name}</div>
                                        <div className="text-xs text-slate-500">{sub.code} <span className="capitalize">({sub.type})</span></div>
                                    </td>
                                    {sections.map(sec => (
                                        <td key={sec.id} className="p-3 border-r last:border-r-0">
                                            <select
                                                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none ${allocations[`${sec.id}_${sub.id}`] ? 'bg-white' : 'bg-slate-50 text-slate-500'
                                                    }`}
                                                value={allocations[`${sec.id}_${sub.id}`] || ''}
                                                onChange={e => handleAllocationChange(sec.id, sub.id, e.target.value)}
                                            >
                                                <option value="">-- Assign Teacher --</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {mappedSubjects.length === 0 && (
                                <tr>
                                    <td colSpan={sections.length + 1} className="p-8 text-center text-slate-500">
                                        No subjects mapped to this class. <br />
                                        <span className="text-sm">Go to Academic Structure &gt; Manage Subjects to add subjects.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
