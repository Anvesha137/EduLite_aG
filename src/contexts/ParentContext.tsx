import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ParentContextType {
    parent: any | null;
    allParents: any[];
    children: any[];
    selectedStudent: any | null;
    loading: boolean;
    switchParent: (parentId: string) => void;
    switchStudent: (studentId: string) => void;
    refreshData: () => Promise<void>;
}

const ParentContext = createContext<ParentContextType | undefined>(undefined);

const DEMO_PARENT_ID = '00000000-0000-0000-0000-000000000004';

export function ParentProvider({ children }: { children: React.ReactNode }) {
    const { user, role } = useAuth();
    const [parent, setParent] = useState<any | null>(null);
    const [allParents, setAllParents] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const loadParentData = async () => {
        if (!user || role !== 'PARENT') {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch Parent(s)
            let currentParent = null;
            let parentsList: any[] = [];

            if (user.id === DEMO_PARENT_ID) {
                // Fetch ALL parents for switching
                const { data: pList, error: pError } = await supabase
                    .from('parents')
                    .select('*')
                    .limit(20);

                if (pError) throw pError;
                parentsList = pList || [];
                setAllParents(parentsList);

                const savedParentId = localStorage.getItem('parent_selected_parent_id');
                currentParent = parentsList.find(p => p.id === savedParentId) || parentsList[0];
            } else {
                // Normal Auth: Use the linked user_id
                const { data: pData, error: pError } = await supabase
                    .from('parents')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (pError) throw pError;
                currentParent = pData;
            }

            if (!currentParent) {
                console.error('No parent record found');
                setLoading(false);
                return;
            }

            setParent(currentParent);
            if (currentParent.id) {
                localStorage.setItem('parent_selected_parent_id', currentParent.id);
            }

            // 2. Fetch Students for the SELECTED parent
            const { data: sList, error: sError } = await supabase
                .from('students')
                .select('*, class:classes(name), section:sections(name)')
                .eq('parent_id', currentParent.id);

            if (sError) throw sError;

            // Fallback: If no students linked via parent_id, check the pivot table (if any)
            let childrenList = sList || [];

            if (childrenList.length === 0) {
                const { data: mapData } = await supabase
                    .from('parent_children_map')
                    .select(`student:students(*, class:classes(name), section:sections(name))`)
                    .eq('parent_id', currentParent.id);

                childrenList = mapData?.map((item: any) => item.student).filter(Boolean) || [];
            }

            setStudents(childrenList);

            // 3. Set Default Selected Student
            const savedStudentId = localStorage.getItem('parent_selected_student_id');
            const initialStudent = childrenList.find((s: any) => s.id === savedStudentId) || childrenList[0];

            if (initialStudent) {
                setSelectedStudent(initialStudent);
                localStorage.setItem('parent_selected_student_id', initialStudent.id);
            } else {
                setSelectedStudent(null);
            }

        } catch (error) {
            console.error('Error loading parent context:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParentData();
    }, [user, role]);

    const switchParent = (parentId: string) => {
        localStorage.setItem('parent_selected_parent_id', parentId);
        // Reset student selection when parent changes
        localStorage.removeItem('parent_selected_student_id');
        loadParentData();
    };

    const switchStudent = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            setSelectedStudent(student);
            localStorage.setItem('parent_selected_student_id', studentId);
        }
    };

    return (
        <ParentContext.Provider
            value={{
                parent,
                allParents,
                children: students,
                selectedStudent,
                loading,
                switchParent,
                switchStudent,
                refreshData: loadParentData
            }}
        >
            {children}
        </ParentContext.Provider>
    );
}

export function useParent() {
    const context = useContext(ParentContext);
    if (context === undefined) {
        throw new Error('useParent must be used within a ParentProvider');
    }
    return context;
}
