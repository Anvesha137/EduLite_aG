import { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, ChevronRight, ChevronDown, BookOpen, Layers } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { ClassModal } from '../modals/ClassModal';
import { SectionModal } from '../modals/SectionModal';
import { SubjectModal } from '../modals/SubjectModal';

// Types
interface ClassData {
    id: string;
    name: string;
    sections: SectionData[];
    status: 'active' | 'archived';
    sort_order: number;
}

interface SectionData {
    id: string;
    name: string;
    class_id: string;
    status: 'active' | 'archived';
    student_count?: number;
}

interface SubjectData {
    id: string;
    name: string;
    code: string;
    type: 'academic' | 'activity';
    grading_type: 'marks' | 'grade';
    include_in_report_card: boolean;
    status: 'active' | 'archived';
}

export function AcademicStructureTab() {
    const { schoolId } = useSchool();
    const [activeSubTab, setActiveSubTab] = useState<'classes' | 'subjects'>('classes');

    // Data State
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

    // Modal State - Classes/Sections
    const [showClassModal, setShowClassModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassData | undefined>(undefined);

    const [showSectionModal, setShowSectionModal] = useState(false);
    const [selectedSection, setSelectedSection] = useState<SectionData | undefined>(undefined);
    const [targetClassId, setTargetClassId] = useState<string>('');

    // Modal State - Subjects
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<SubjectData | undefined>(undefined);

    useEffect(() => {
        if (schoolId) {
            fetchStructure();
        }
    }, [schoolId]);

    const fetchStructure = async () => {
        try {
            setLoading(true);
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .eq('school_id', schoolId)
                .order('sort_order', { ascending: true });

            if (classesError) throw classesError;

            // Fetch sections with student count
            // Note: 'students' is the relation name inferred from FK
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('sections')
                .select('*, students(count)')
                .eq('school_id', schoolId);

            if (sectionsError) throw sectionsError;

            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('school_id', schoolId)
                .order('name');

            if (subjectsError) throw subjectsError;

            // Combine
            const combined = classesData.map((cls: any) => ({
                ...cls,
                sections: sectionsData
                    .filter((sec: any) => sec.class_id === cls.id)
                    .map((sec: any) => ({
                        ...sec,
                        student_count: sec.students ? sec.students[0]?.count : 0
                    }))
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
            }));

            setClasses(combined);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Error fetching structure:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (classId: string) => {
        const newExpanded = new Set(expandedClasses);
        if (newExpanded.has(classId)) {
            newExpanded.delete(classId);
        } else {
            newExpanded.add(classId);
        }
        setExpandedClasses(newExpanded);
    };

    if (loading) return <div className="p-6">Loading structure...</div>;

    const academicSubjects = subjects.filter(s => s.type !== 'activity');
    const activitySubjects = subjects.filter(s => s.type === 'activity');

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Academic Structure</h3>
                    <p className="text-slate-500 text-sm">Manage Classes, Sections, and Subjects</p>
                </div>
                {activeSubTab === 'classes' ? (
                    <button
                        onClick={() => {
                            setSelectedClass(undefined);
                            setShowClassModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Class
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setSelectedSubject(undefined);
                            setShowSubjectModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Subject/Activity
                    </button>
                )}
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setActiveSubTab('classes')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeSubTab === 'classes'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-500 border-transparent hover:text-slate-700'
                        }`}
                >
                    Classes & Sections
                </button>
                <button
                    onClick={() => setActiveSubTab('subjects')}
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeSubTab === 'subjects'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-500 border-transparent hover:text-slate-700'
                        }`}
                >
                    Subjects & Activities
                </button>
            </div>

            {activeSubTab === 'classes' && (
                <div className="bg-white border rounded-lg shadow-sm">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-semibold text-slate-700">
                        <div className="col-span-6">Class Name</div>
                        <div className="col-span-2 text-center">Sections</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {classes.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No classes defined yet.
                        </div>
                    ) : (
                        <div className="divide-y text-slate-900">
                            {classes.map((cls) => (
                                <div key={cls.id} className="group">
                                    <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                                        <div className="col-span-6 flex items-center gap-3">
                                            <button
                                                onClick={() => toggleExpand(cls.id)}
                                                className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                            >
                                                {expandedClasses.has(cls.id) ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </button>
                                            <span className="font-medium">{cls.name}</span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            {cls.sections.length > 0 ? (
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {cls.sections.map(sec => (
                                                        <span key={sec.id} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200" title={`${sec.student_count || 0} Students`}>
                                                            {sec.name} <span className="text-slate-400">({sec.student_count || 0})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">No Sections</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {cls.status || 'Active'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setSelectedClass(cls);
                                                    setShowClassModal(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Class"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Archive">
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTargetClassId(cls.id);
                                                    setSelectedSection(undefined);
                                                    setShowSectionModal(true);
                                                }}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                title="Add Section"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sections List */}
                                    {expandedClasses.has(cls.id) && (
                                        <div className="bg-slate-50 pl-14 pr-4 py-2 border-t">
                                            {cls.sections.length > 0 ? (
                                                <div className="space-y-2">
                                                    {cls.sections.map(sec => (
                                                        <div key={sec.id} className="flex items-center justify-between p-2 bg-white border rounded">
                                                            <span className="text-sm font-medium text-slate-700">Section {sec.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500 uppercase">{sec.status || 'Active'}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetClassId(cls.id);
                                                                        setSelectedSection(sec);
                                                                        setShowSectionModal(true);
                                                                    }}
                                                                    className="text-slate-400 hover:text-blue-600"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic py-2">No sections added.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === 'subjects' && (
                <div className="space-y-6">
                    {/* Academic Subjects */}
                    <div>
                        <h4 className="flex items-center gap-2 text-md font-bold text-slate-800 mb-3">
                            <BookOpen className="w-4 h-4" />
                            Academic Subjects
                        </h4>
                        <div className="bg-white border rounded-lg shadow-sm">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-semibold text-slate-700">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-2">Code</div>
                                <div className="col-span-2">Grading</div>
                                <div className="col-span-2 text-center">Report Card</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="divide-y text-slate-900">
                                {academicSubjects.map((sub) => (
                                    <div key={sub.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-medium">{sub.name}</div>
                                        <div className="col-span-2 text-sm text-slate-600">{sub.code || '-'}</div>
                                        <div className="col-span-2">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
                                                {sub.grading_type}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            {sub.include_in_report_card ? (
                                                <span className="text-green-600 text-xs font-bold">Yes</span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">No</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedSubject(sub);
                                                    setShowSubjectModal(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {academicSubjects.length === 0 && (
                                    <div className="p-6 text-center text-slate-500 italic">No academic subjects defined.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activities */}
                    <div>
                        <h4 className="flex items-center gap-2 text-md font-bold text-slate-800 mb-3">
                            <Layers className="w-4 h-4" />
                            Co-Curricular / Activities
                        </h4>
                        <div className="bg-white border rounded-lg shadow-sm">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-semibold text-slate-700">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-2">Code</div>
                                <div className="col-span-2">Grading</div>
                                <div className="col-span-2 text-center">Report Card</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="divide-y text-slate-900">
                                {activitySubjects.map((sub) => (
                                    <div key={sub.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-medium">{sub.name}</div>
                                        <div className="col-span-2 text-sm text-slate-600">{sub.code || '-'}</div>
                                        <div className="col-span-2">
                                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full capitalize">
                                                {sub.grading_type}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            {sub.include_in_report_card ? (
                                                <span className="text-green-600 text-xs font-bold">Yes</span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">No</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedSubject(sub);
                                                    setShowSubjectModal(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {activitySubjects.length === 0 && (
                                    <div className="p-6 text-center text-slate-500 italic">No activities defined.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <ClassModal
                isOpen={showClassModal}
                onClose={() => setShowClassModal(false)}
                onSuccess={fetchStructure}
                initialData={selectedClass}
                schoolId={schoolId}
            />

            <SectionModal
                isOpen={showSectionModal}
                onClose={() => setShowSectionModal(false)}
                onSuccess={fetchStructure}
                classId={targetClassId}
                initialData={selectedSection}
                schoolId={schoolId}
            />

            <SubjectModal
                isOpen={showSubjectModal}
                onClose={() => setShowSubjectModal(false)}
                onSuccess={fetchStructure}
                initialData={selectedSubject}
                schoolId={schoolId}
            />
        </div>
    );
}
