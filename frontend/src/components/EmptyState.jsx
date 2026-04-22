import React from 'react';
import { FileSearch, Zap, Plus, ArrowRight } from 'lucide-react';

export default function EmptyState({ view, onNewAnalysis }) {
    const configs = {
        overview: {
            icon: <FileSearch size={48} className="text-[#007AFF]" />,
            title: 'No Analysis Overview',
            description: 'You haven\'t analyzed any documents yet, or the data is still loading. Start a new audit to see your executive summary.',
        },
        clauses: {
            icon: <Zap size={48} className="text-[#007AFF]" />,
            title: 'No Clauses Flagged',
            description: 'Run an analysis to see a detailed breakdown of risky clauses and AI-powered explanations.',
        },
        reports: {
            icon: <FileSearch size={48} className="text-[#007AFF]" />,
            title: 'No Report Generated',
            description: 'Once you analyze a document, you can generate and export a professional risk assessment report here.',
        }
    };

    const { icon, title, description } = configs[view] || configs.overview;

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-6 animate-pulse">
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
            <p className="text-white/50 max-w-md mb-8">
                {description}
            </p>

            <div className="flex gap-4">
                <button
                    onClick={onNewAnalysis}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-semibold hover:shadow-lg hover:shadow-[#007AFF]/30 transition-all"
                >
                    <Plus size={18} />
                    <span>New Analysis</span>
                </button>

                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                >
                    Refresh Page
                </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-2xl">
                {[
                    { label: 'Step 1', text: 'Upload PDF or URL' },
                    { label: 'Step 2', text: 'AI extracts clauses' },
                    { label: 'Step 3', text: 'Review risk report' },
                ].map((step, i) => (
                    <div key={i} className="glass-card p-4 text-left">
                        <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wider">{step.label}</span>
                        <p className="text-sm text-white/80 mt-1">{step.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
