import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { Clock, User as UserIcon, ArrowRight } from 'lucide-react';

interface AuditLog {
    id: string;
    table_name: string;
    action: string;
    created_at: string;
    old_values: any;
    new_values: any;
    user: {
        full_name: string;
        email?: string;
    };
}

export function ChangeLogTab() {
    const { schoolId } = useSchool();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (schoolId) {
            fetchLogs();
        }
    }, [schoolId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    user:user_profiles!user_id(full_name)
                `)
                .eq('school_id', schoolId)
                .in('table_name', ['classes', 'sections', 'subjects', 'grade_scales', 'fee_heads', 'fee_structures'])
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatAction = (action: string) => {
        switch (action) {
            case 'INSERT': return <span className="text-green-600 font-medium">Created</span>;
            case 'UPDATE': return <span className="text-blue-600 font-medium">Updated</span>;
            case 'DELETE': return <span className="text-red-600 font-medium">Deleted</span>;
            default: return action;
        }
    };

    const formatTableName = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Capitalize
    };

    const formatChanges = (log: AuditLog) => {
        const oldVal = log.old_values;
        const newVal = log.new_values;
        const name = newVal?.name || oldVal?.name || log.table_name;

        return (
            <div>
                <span className="font-medium text-slate-800">{formatTableName(log.table_name)}: {name}</span>
                {log.action === 'UPDATE' && (
                    <div className="text-xs text-slate-500 mt-1">
                        {/* Simple diff visualization - could be expanded */}
                        Check details for changes.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Plan Change Log</h3>
                    <p className="text-slate-500 text-sm">Recent activity monitoring for School Plan changes.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading activity...</div>
            ) : (
                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-400">
                            No changes recorded yet. <br />
                            <span className="text-xs">Changes to classes, fees, subjects etc. will appear here.</span>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm flex items-start gap-4">
                                <div className="mt-1 bg-slate-100 p-2 rounded-full text-slate-500">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            {formatChanges(log)}
                                        </div>
                                        <div className="text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                                        {formatAction(log.action)} by
                                        <span className="flex items-center gap-1 font-medium text-slate-800">
                                            <UserIcon className="w-3 h-3" />
                                            {log.user?.full_name || 'Unknown User'}
                                        </span>
                                    </div>

                                    {/* Detailed Diff (Optional - basic version) */}
                                    {log.action === 'UPDATE' && (
                                        <div className="mt-3 bg-slate-50 p-2 rounded text-xs grid grid-cols-2 gap-2">
                                            {/* We could implement deep object diff here if needed */}
                                            <div className="text-red-500 overflow-hidden text-ellipsis">
                                                <div className="font-semibold text-slate-500">Old</div>
                                                <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                                            </div>
                                            <div className="text-green-600 overflow-hidden text-ellipsis">
                                                <div className="font-semibold text-slate-500">New</div>
                                                <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
