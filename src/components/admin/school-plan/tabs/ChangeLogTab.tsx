import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSchool } from '../../../../hooks/useSchool';
import { Clock, User as UserIcon, Activity } from 'lucide-react';

interface ChangeLog {
    id: string;
    entity_type: string;
    field_name: string;
    old_value: string;
    new_value: string;
    impact_summary: string | null;
    changed_at: string;
    changer: {
        full_name: string;
    } | null;
}

export function ChangeLogTab() {
    const { schoolId } = useSchool();
    const [logs, setLogs] = useState<ChangeLog[]>([]);
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
                .from('definition_change_logs')
                .select(`
                    *,
                    changer:changed_by(full_name)
                `)
                .eq('school_id', schoolId)
                .order('changed_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (val: string) => {
        if (!val) return <span className="text-slate-400 italic">Empty</span>;
        try {
            // Try to parse if it's JSON
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object') return <pre className="text-xs">{JSON.stringify(parsed, null, 1)}</pre>;
            return val;
        } catch {
            return val;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Audit Logs</h3>
                    <p className="text-slate-500 text-sm">Track changes to the academic structure and definitions.</p>
                </div>
                <button onClick={fetchLogs} className="text-blue-600 text-sm hover:underline">Refresh</button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading logs...</div>
            ) : (
                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
                            No changes recorded yet.
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 bg-blue-50 p-2 rounded-full text-blue-600">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-slate-800 capitalize">{log.entity_type}</span>
                                                <span className="text-slate-500 mx-2">•</span>
                                                <span className="font-medium text-slate-600">{log.field_name}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-slate-400 gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.changed_at).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded text-sm">
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Old Value</div>
                                                <div className="text-red-700 font-medium break-all">{formatValue(log.old_value)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">New Value</div>
                                                <div className="text-green-700 font-medium break-all">{formatValue(log.new_value)}</div>
                                            </div>
                                        </div>

                                        {log.impact_summary && (
                                            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                                Impact: {log.impact_summary}
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                            <UserIcon className="w-3 h-3" />
                                            Changed by <span className="font-medium text-slate-700">{log.changer?.full_name || 'System'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
