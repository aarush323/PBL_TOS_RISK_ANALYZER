import React from 'react';
import { 
  Scale, Plus, MessageSquare, ArrowLeft,
  Trophy, Hash, ChevronRight, Zap
} from 'lucide-react';

export default function ComparePage({
  comparisonData,
  historyItems,
  isComparing,
  compareHistory,
  onOpenCompareHistory,
  onSelectDocuments,
  onNewComparison,
  onDiscussInChat,
}) {
  const getRiskColor = (score) => {
    if (score >= 60) return 'text-red-500';
    if (score >= 30) return 'text-amber-500';
    return 'text-emerald-500';
  };

  if (isComparing) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-medium mb-2">Cross-referencing legal terms...</h2>
        <p className="text-white/60">This takes about 15-20 seconds.</p>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="glass-card p-12 text-center border-dashed border-2 border-white/10 rounded-[2rem]">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale size={40} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Document Comparison</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">Select two analyzed documents to generate a side-by-side risk assessment and identify critical differences.</p>
          
          {historyItems.length < 2 ? (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl inline-block">
              <p className="text-amber-500 text-sm font-medium">You need at least 2 analyzed documents to compare.</p>
            </div>
          ) : (
            <button
              onClick={onSelectDocuments}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20"
            >
              <Plus size={20} className="inline mr-2" />
              Select Documents
            </button>
          )}
        </div>

        {compareHistory?.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-white/40">Recent Comparisons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compareHistory.map(c => (
                <button 
                  key={c.compare_id} 
                  onClick={() => onOpenCompareHistory(c.compare_id)}
                  className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold truncate max-w-[200px]">{c.source_a} vs {c.source_b}</span>
                    <span className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <ChevronRight size={18} className="text-white/20" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const { doc_a, doc_b, categories, overall_winner, verdict } = comparisonData;
  const winner = overall_winner === 'a' ? 'A' : overall_winner === 'b' ? 'B' : 'tie';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={onNewComparison}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-2 text-sm"
          >
            <ArrowLeft size={14} /> New Comparison
          </button>
          <h1 className="text-3xl font-bold font-serif italic">Legal Differential</h1>
        </div>
        <button
          onClick={onDiscussInChat}
          className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all flex items-center gap-2"
        >
          <MessageSquare size={18} />
          Discuss Findings
        </button>
      </div>

      {/* Summary Banner */}
      <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${winner === 'tie' ? 'bg-white/5 border-white/10' : 'bg-blue-600/10 border-blue-500/20'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${winner === 'tie' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
              {winner === 'tie' ? <Scale size={28} /> : <Trophy size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {winner === 'tie' ? "Inconclusive Difference" : `${winner === 'A' ? doc_a.label : doc_b.label} is the safer choice`}
              </h2>
              <p className="text-white/60 leading-relaxed max-w-2xl">{verdict}</p>
            </div>
          </div>
          {winner !== 'tie' && (
            <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-black uppercase tracking-[0.2em]">
              Recommended
            </div>
          )}
        </div>
      </div>

      {/* Head-to-Head Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[doc_a, doc_b].map((doc, idx) => {
          const isDocA = idx === 0;
          const isWinner = (isDocA && winner === 'A') || (!isDocA && winner === 'B');
          const score = doc.score || 0;
          
          return (
            <div key={idx} className={`p-8 rounded-[2.5rem] border transition-all ${isWinner ? 'bg-white/5 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isWinner ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
                  <span className="text-sm font-bold uppercase tracking-widest text-white/40">{isDocA ? 'Document A' : 'Document B'}</span>
                </div>
                {isWinner && <span className="text-[10px] font-black bg-emerald-500 text-black px-2 py-1 rounded">WINNER</span>}
              </div>

              <h3 className="text-2xl font-bold mb-2 truncate">{doc.label}</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className={`text-6xl font-black font-serif ${getRiskColor(score)}`}>{score}</span>
                <span className="text-white/20 font-bold">/ 100 RISK</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Risky Clauses</div>
                  <div className="text-xl font-bold">{doc.risky_count || doc.risky_clause_count}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                  <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Total Clauses</div>
                  <div className="text-xl font-bold">{doc.total_clauses}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Hash size={14} /> Sectional Differential
        </h3>
        <div className="space-y-4">
          {categories?.map((cat, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:bg-white/[0.07] transition-all">
              <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between">
                <h4 className="font-bold text-lg">{cat.category}</h4>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-tighter">
                  <span className={cat.winner === 'a' ? 'text-emerald-500' : 'text-white/40'}>Doc A: {cat.a_count}</span>
                  <span className={cat.winner === 'b' ? 'text-emerald-500' : 'text-white/40'}>Doc B: {cat.b_count}</span>
                </div>
              </div>
              <div className="p-8">
                {/* Visual diff bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 flex overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${cat.winner === 'a' ? 'bg-emerald-500' : 'bg-white/20'}`}
                    style={{ width: `${(cat.a_count / (cat.a_count + cat.b_count || 1)) * 100}%` }}
                  />
                  <div 
                    className={`h-full transition-all duration-1000 ${cat.winner === 'b' ? 'bg-emerald-500' : 'bg-white/20'}`}
                    style={{ width: `${(cat.b_count / (cat.a_count + cat.b_count || 1)) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-white/30 uppercase">Clause A Summary</div>
                    <p className="text-sm text-white/70 italic leading-relaxed">"{cat.clause_a_summary || 'No significant risks identified in this category.'}"</p>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-white/30 uppercase">Clause B Summary</div>
                    <p className="text-sm text-white/70 italic leading-relaxed">"{cat.clause_b_summary || 'No significant risks identified in this category.'}"</p>
                  </div>
                </div>

                <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
                  <Zap size={20} className="text-blue-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Key Difference</div>
                    <p className="text-sm text-white/90 font-medium">{cat.key_difference}</p>
                    <p className="text-xs text-white/40 mt-2 leading-relaxed">{cat.reasoning}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
