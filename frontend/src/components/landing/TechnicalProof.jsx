import React from 'react';
import { ArrowDown, FileText, Link, MessageSquare, ScanText, ShieldAlert, Upload } from 'lucide-react';

export default function TechnicalProof() {
    return (
        <section id="technical" className="py-24 px-6 border-t border-zinc-900">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            How it works.
                            <br />
                            <span className="text-zinc-500">Three steps from input to review.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                            Start with a URL, PDF, or pasted text.
                            The app extracts clauses, scores risk, and shows you the exact language behind each flag.
                        </p>
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Step 1</p>
                                <p className="text-white font-semibold mb-1">Add the document</p>
                                <p className="text-sm text-zinc-400">Paste a Terms URL, upload a PDF, or add raw text.</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Step 2</p>
                                <p className="text-white font-semibold mb-1">Review the analysis</p>
                                <p className="text-sm text-zinc-400">The app extracts clauses, flags risky ones, and assigns categories and confidence labels.</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Step 3</p>
                                <p className="text-white font-semibold mb-1">Inspect the flagged clauses</p>
                                <p className="text-sm text-zinc-400">Open the clause view, read the source text, and ask follow-up questions in chat.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800/60 p-6 sm:p-8">
                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Block Diagram</p>
                            <h3 className="text-2xl font-bold text-white">Input to clause review</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-800/70 bg-[#0d1324] p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center shrink-0">
                                        <Upload size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Step 1</p>
                                        <p className="text-white font-semibold mb-2">Add a document</p>
                                        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black/20 px-3 py-1"><Link size={12} /> URL</span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black/20 px-3 py-1"><Upload size={12} /> PDF</span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black/20 px-3 py-1"><FileText size={12} /> Text</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full border border-zinc-800 bg-black/30 flex items-center justify-center text-zinc-500">
                                    <ArrowDown size={18} />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800/70 bg-[#111523] p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                                        <ScanText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 mb-2">Step 2</p>
                                        <p className="text-white font-semibold mb-2">Extract and score clauses</p>
                                        <p className="text-sm text-zinc-400">The app pulls out clauses, checks them, and assigns risk categories, severity, and confidence.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full border border-zinc-800 bg-black/30 flex items-center justify-center text-zinc-500">
                                    <ArrowDown size={18} />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800/70 bg-[#101a17] p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-2">Step 3</p>
                                        <p className="text-white font-semibold mb-2">Review flagged clauses</p>
                                        <p className="text-sm text-zinc-400">Open the clause view, inspect the source text, and ask follow-up questions in chat.</p>
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/20 px-3 py-1 text-xs text-zinc-400">
                                            <MessageSquare size={12} />
                                            Ask in chat
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
