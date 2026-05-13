import React from 'react';
import { BrainCircuit, Zap, Shield, MessageSquare, ArrowUpRight } from 'lucide-react';

const features = [
    {
        icon: BrainCircuit,
        title: 'Rules + model review',
        description: 'The pipeline first filters clauses with rule-based checks, then sends the remaining clauses for model review.',
        metric: '2-step',
        metricLabel: 'pipeline',
        span: 'col-span-2',
        accent: '#007AFF',
    },
    {
        icon: Zap,
        title: 'Multiple model backends',
        description: 'The app can call Cerebras, Groq, or a local Ollama setup depending on your configuration.',
        metric: '3',
        metricLabel: 'backends',
        span: 'col-span-1',
        accent: '#22c55e',
    },
    {
        icon: Shield,
        title: 'Local option',
        description: 'If you run the app with Ollama, model calls can stay on your own machine.',
        metric: 'Ollama',
        metricLabel: 'supported',
        span: 'col-span-1',
        accent: '#f59e0b',
    },
    {
        icon: MessageSquare,
        title: 'Document chat',
        description: 'After analysis, the chat can answer questions using the indexed document text and flagged clauses.',
        metric: 'pgvector',
        metricLabel: 'index',
        span: 'col-span-2',
        accent: '#8b5cf6',
    },
];

export default function FeaturesGrid() {
    return (
        <section id="features" className="relative py-32 px-6">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#007AFF]/[0.02] to-transparent pointer-events-none" />

            <div className="relative max-w-5xl mx-auto">
                {/* Section header — centered */}
                <div className="text-center mb-20">
                    <p className="text-[#007AFF] text-xs font-bold uppercase tracking-[0.3em] mb-4">Architecture</p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
                        How the app works.
                    </h2>
                    <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                        These are the main parts of the current pipeline.
                    </p>
                </div>

                {/* Bento grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={i}
                                className={`group relative p-7 rounded-2xl bg-[#0a0f1f]/80 border border-zinc-800/60 hover:border-zinc-700 transition-all duration-500 ${feature.span === 'col-span-2' ? 'md:col-span-2' : ''
                                    }`}
                            >
                                {/* Hover corner glow */}
                                <div
                                    className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                    style={{ background: `radial-gradient(circle at top right, ${feature.accent}10, transparent 70%)` }}
                                />

                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="flex-1">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                                            style={{ background: `${feature.accent}15` }}
                                        >
                                            <Icon size={20} style={{ color: feature.accent }} />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                        <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
                                    </div>

                                    {/* Metric badge */}
                                    <div className="text-right ml-6 shrink-0">
                                        <p className="text-2xl font-black text-white">{feature.metric}</p>
                                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{feature.metricLabel}</p>
                                    </div>
                                </div>

                                {/* Hover arrow */}
                                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowUpRight size={16} className="text-zinc-600" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
