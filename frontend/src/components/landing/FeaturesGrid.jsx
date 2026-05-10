import React from 'react';
import { BrainCircuit, Zap, Shield, MessageSquare, ArrowUpRight } from 'lucide-react';

const features = [
    {
        icon: BrainCircuit,
        title: 'Hybrid NLP + LLM',
        description: 'NLP pre-filters 70% of clauses, sending only flagged ones to LLMs. Maximum accuracy at minimum cost.',
        metric: '70%',
        metricLabel: 'filtered by NLP',
        span: 'col-span-2',
        accent: '#007AFF',
    },
    {
        icon: Zap,
        title: 'Multi-Provider Inference',
        description: 'Cerebras + Groq with automatic round-robin. Local Ollama fallback for air-gapped environments.',
        metric: '75%',
        metricLabel: 'cheaper',
        span: 'col-span-1',
        accent: '#22c55e',
    },
    {
        icon: Shield,
        title: 'Privacy-First',
        description: 'Run analysis on your own infrastructure with Ollama. Your data stays on your machine.',
        metric: '0',
        metricLabel: 'data sent',
        span: 'col-span-1',
        accent: '#f59e0b',
    },
    {
        icon: MessageSquare,
        title: 'RAG-Powered Legal Chat',
        description: 'pgvector embeddings enable precise clause retrieval. Ask questions about any provision and get contextual answers.',
        metric: 'pgvector',
        metricLabel: 'embeddings',
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
                        Engineered for production.
                    </h2>
                    <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                        A heavily optimized pipeline — not a ChatGPT wrapper.
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
