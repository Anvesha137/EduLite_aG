import { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Shield, AlertCircle, CheckCircle2, Save, ArrowLeft } from 'lucide-react';
import { useParent } from '../../contexts/ParentContext';
import { supabase } from '../../lib/supabase';

export function ParentProfile() {
    const { selectedStudent, parent, refreshData } = useParent();
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressReq, setAddressReq] = useState({
        new_address: '',
        new_city: '',
        new_state: '',
        new_pincode: ''
    });
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (parent) {
            loadRequests();
        }
    }, [parent]);

    const loadRequests = async () => {
        const { data } = await supabase
            .from('address_update_requests')
            .select('*')
            .eq('parent_id', parent.id)
            .order('created_at', { ascending: false });
        setPendingRequests(data || []);
    };

    const handleAddressRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await supabase
                .from('address_update_requests')
                .insert([{
                    ...addressReq,
                    school_id: selectedStudent.school_id,
                    parent_id: parent.id,
                    status: 'Pending'
                }]);

            if (error) throw error;
            setIsEditingAddress(false);
            await loadRequests();
        } catch (error) {
            console.error('Error requesting address update:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Child Information (Read Only) */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <User className="w-6 h-6 text-blue-600" />
                        Student Information
                    </h3>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoField label="Full Name" value={selectedStudent.name} />
                            <InfoField label="Admission Number" value={selectedStudent.admission_number} />
                            <InfoField label="Class & Section" value={`${selectedStudent.class?.name} - ${selectedStudent.section?.name}`} />
                            <InfoField label="Roll Number" value={selectedStudent.roll_no || '08'} />
                            <InfoField label="Date of Birth" value={selectedStudent.dob || '12-05-2012'} />
                            <InfoField label="Blood Group" value={selectedStudent.blood_group || 'O+'} />
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 pt-4">
                        <Shield className="w-6 h-6 text-emerald-600" />
                        Security & Access
                    </h3>
                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Verified Account</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Shared Parent Access</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                            Your account is linked to the primary mobile number recorded in our school database. Updates to core identity data require physical verification at the school office.
                        </p>
                    </div>
                </div>

                {/* Contact & Address (Updatable by Request) */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-slate-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-rose-500" />
                                Residential Address
                            </h4>
                            {!isEditingAddress && (
                                <button
                                    onClick={() => setIsEditingAddress(true)}
                                    className="text-xs font-black text-rose-600 uppercase tracking-widest hover:underline"
                                >
                                    Update
                                </button>
                            )}
                        </div>

                        {isEditingAddress ? (
                            <form onSubmit={handleAddressRequest} className="space-y-4">
                                <textarea
                                    required
                                    placeholder="Street Address"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                                    value={addressReq.new_address}
                                    onChange={(e) => setAddressReq({ ...addressReq, new_address: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="City" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={addressReq.new_city} onChange={(e) => setAddressReq({ ...addressReq, new_city: e.target.value })} />
                                    <input placeholder="Pincode" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={addressReq.new_pincode} onChange={(e) => setAddressReq({ ...addressReq, new_pincode: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs" disabled={loading}>
                                        Submit Request
                                    </button>
                                    <button type="button" onClick={() => setIsEditingAddress(false)} className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4 text-slate-600">
                                <p className="text-sm font-medium leading-relaxed">
                                    {parent?.profiles?.primary_address || 'No address on file'}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tighter">
                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {parent?.primary_mobile}</span>
                                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {parent?.primary_email}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pending Requests Column */}
                    {pendingRequests.length > 0 && (
                        <div className="space-y-4">
                            <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-4">Pending Requests</h5>
                            {pendingRequests.map((req) => (
                                <div key={req.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                            }`}>{req.status}</span>
                                        <span className="text-[9px] font-bold text-slate-400">{formatDate(req.created_at)}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{req.new_address}</p>
                                    {req.admin_remarks && (
                                        <p className="mt-2 text-[10px] text-rose-500 font-medium italic">Note: {req.admin_remarks}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoField({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</p>
            <p className="px-5 py-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border border-slate-100">{value || '-'}</p>
        </div>
    );
}
