import { useState } from 'react';
import { Layers, BookOpen, GraduationCap, Coins, FileSpreadsheet, History } from 'lucide-react';

// Tabs
import { AcademicStructureTab } from './tabs/AcademicStructureTab';
import { AssessmentConfigTab } from './tabs/AssessmentConfigTab';
import { FeeDefinitionTab } from './tabs/FeeDefinitionTab';
import { FeeMatrixTab } from './tabs/FeeMatrixTab';
import { ChangeLogTab } from './tabs/ChangeLogTab';

type Tab = 'structure' | 'assessment' | 'fees' | 'matrix' | 'audit';

export function SchoolPlanModule() {
    const [activeTab, setActiveTab] = useState<Tab>('structure');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">School Plan & Definitions</h1>
                    <p className="text-slate-500">Master configuration for the academic year 2025-26</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'structure'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Academic Structure
                </button>
                <button
                    onClick={() => setActiveTab('assessment')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'assessment'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    Assessments
                </button>
                <button
                    onClick={() => setActiveTab('fees')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'fees'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Coins className="w-4 h-4" />
                    Fee Definitions
                </button>
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'matrix'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Fee Matrix
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'audit'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <History className="w-4 h-4" />
                    Audit Logs
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
                {activeTab === 'structure' && <AcademicStructureTab />}
                {activeTab === 'assessment' && <AssessmentConfigTab />}
                {activeTab === 'fees' && <FeeDefinitionTab />}
                {activeTab === 'matrix' && <FeeMatrixTab />}
                {activeTab === 'audit' && <ChangeLogTab />}
            </div>
        </div>
    );
}
