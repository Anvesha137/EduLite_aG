import { useState } from 'react';
import { Calendar, Settings } from 'lucide-react';
import { ExamConfiguration } from '../results/ExamConfiguration';
import { ExamScheduling } from '../results/ExamScheduling';

export function ExamsModule() {
    const [activeTab, setActiveTab] = useState<'exams' | 'config'>('exams');

    const tabs = [
        { id: 'exams', label: 'Exam Schedule', icon: Calendar },
        { id: 'config', label: 'Configuration', icon: Settings },
    ] as const;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Exams Management</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'config' && <ExamConfiguration />}
                    {activeTab === 'exams' && <ExamScheduling />}
                </div>
            </div>
        </div>
    );
}
