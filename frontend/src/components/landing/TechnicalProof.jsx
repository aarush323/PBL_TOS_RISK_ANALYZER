import React from 'react';

const jsonExample = `{
  "clause_id": 47,
  "is_risky": true,
  "risk_categories": ["Financial Risk"],
  "confidence": "High",
  "severity_score": 8.2,
  "explanation": "Waives user's right to 
    refund after 24 hours, including 
    accidental purchases and renewals.",
  "applicable_laws": [
    "Consumer Rights Act 2015",
    "FTC Act §5"
  ]
}`;

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

                    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            <span className="ml-3 text-xs text-zinc-600 font-mono">analysis_output.json</span>
                        </div>
                        <pre className="p-6 text-sm font-mono overflow-x-auto">
                            <code className="text-zinc-300">
                                {jsonExample.split('\n').map((line, i) => (
                                    <span key={i} className="block">
                                        <span className="text-zinc-700 select-none mr-4 inline-block w-4 text-right">{i + 1}</span>
                                        {line
                                            .replace(/"([^"]+)":/g, '<key>"$1"</key>:')
                                            .split(/(<key>.*?<\/key>)/)
                                            .map((part, j) => {
                                                if (part.startsWith('<key>')) {
                                                    const key = part.replace(/<\/?key>/g, '');
                                                    return <span key={j} className="text-[#007AFF]">{key}</span>;
                                                }
                                                // Highlight values
                                                const colored = part
                                                    .replace(/true/g, '§TRUE§')
                                                    .replace(/false/g, '§FALSE§')
                                                    .replace(/(\d+\.?\d*)/g, '§NUM§$1§/NUM§');
                                                return colored.split(/(§\w+§[^§]*§\/\w+§|§\w+§)/).map((seg, k) => {
                                                    if (seg === '§TRUE§') return <span key={k} className="text-green-400">true</span>;
                                                    if (seg === '§FALSE§') return <span key={k} className="text-red-400">false</span>;
                                                    if (seg.startsWith('§NUM§')) {
                                                        const num = seg.replace(/§\/?NUM§/g, '');
                                                        return <span key={k} className="text-amber-400">{num}</span>;
                                                    }
                                                    return <span key={k}>{seg}</span>;
                                                });
                                            })
                                        }
                                    </span>
                                ))}
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        </section>
    );
}
