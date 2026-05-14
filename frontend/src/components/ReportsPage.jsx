import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Activity, Target, Shield, 
  Check, AlertOctagon, Zap, List, BrainCircuit,
  ArrowLeft, ChevronRight, Loader2, Share2, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { apiFetchJson } from '@/shared/api/client';
import { getAccessToken } from '@/shared/api/auth-storage';
import EmptyState from './EmptyState.jsx';

const SECTION_LABELS = [
  { id: 'summary', label: 'Executive Summary', icon: FileText },
  { id: 'findings', label: 'Key Findings', icon: Target },
  { id: 'categories', label: 'Risk Categories', icon: Shield },
  { id: 'clauses', label: 'Critical Clauses', icon: AlertOctagon },
  { id: 'compliance', label: 'Compliance Status', icon: Check },
  { id: 'action', label: 'Action Plan', icon: Zap },
];

export default function ReportsPage({ 
  analysisResult, 
  analysisJobId, 
  token 
}) {
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const reportRef = useRef(null);

  const riskScore = report?.report_metadata?.risk_score ?? analysisResult?.risk_score ?? 0;
  
  const getRiskColor = (score) => {
    if (score >= 60) return 'text-red-500';
    if (score >= 30) return 'text-amber-500';
    return 'text-emerald-500';
  };

  useEffect(() => {
    if (!analysisJobId || report || isGenerating) {
      return;
    }

    const activeToken = token || getAccessToken();
    apiFetchJson(`/report/${analysisJobId}`, { token: activeToken })
      .then(({ res, data }) => {
        if (res.ok && data?.status === 'complete' && data.report) {
          setReport(data.report);
        }
      })
      .catch(() => { });
  }, [analysisJobId, token, report, isGenerating]);

  const generateReport = async () => {
    if (!analysisJobId) return;
    setIsGenerating(true);
    const activeToken = token || getAccessToken();
    try {
      const { res, data } = await apiFetchJson(`/report/generate/${analysisJobId}`, {
        method: 'POST',
        token: activeToken
      });
      if (res.ok && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Report generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById('report-content');
        if (clonedEl) {
          clonedEl.style.color = '#000000';
          clonedEl.style.padding = '40px';
          // Ensure all text is black for PDF
          const allText = clonedEl.querySelectorAll('*');
          allText.forEach(el => {
             if (el.classList.contains('text-white/60')) el.style.color = '#666666';
             else if (el.classList.contains('text-white')) el.style.color = '#000000';
          });
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Jurist_Report_${report?.report_metadata?.report_id || 'analysis'}.pdf`);
  };

  if (!analysisResult && !report) {
    return <EmptyState title="No Analysis Found" description="Run an analysis first to generate a report." />;
  }

  if (!report && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Generate Risk Report</h2>
        <p className="text-white/60 max-w-md mb-8">
          Create a detailed, LLM-powered legal report summarizing critical risks, compliance status, and action plans.
        </p>
        <button 
          onClick={generateReport}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-zinc-50 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Generate Professional Report
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <h2 className="text-xl font-medium mb-2">Analyzing legal nuances...</h2>
        <p className="text-white/60">This usually takes about 20-30 seconds.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold font-serif italic text-white">Risk Analysis Report</h1>
          <p className="text-white/60 text-sm mt-1">ID: {report.report_metadata.report_id} • Generated {new Date(report.report_metadata.generated_at).toLocaleDateString()}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sticky Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
              <div className="text-sm text-white/40 mb-1">Document Risk Score</div>
              <div className={`text-4xl font-bold ${getRiskColor(riskScore)}`}>{riskScore}/100</div>
              <div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${riskScore >= 60 ? 'bg-red-500' : riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
            </div>

            {SECTION_LABELS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeSection === section.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.label}</span>
                {activeSection === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-12 pb-20" id="report-content" ref={reportRef}>
          
          {/* Summary Section */}
          <section id="summary" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-blue-400" /> Executive Summary
            </h2>
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 leading-relaxed text-white/80 text-lg italic font-serif">
              "{report.executive_summary}"
            </div>
          </section>

          {/* Key Findings */}
          <section id="findings" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-purple-400" /> Key Findings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.key_findings.map((finding, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-white/80">{finding}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Risk Categories */}
          <section id="categories" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-amber-400" /> Category Breakdown
            </h2>
            <div className="space-y-4">
              {Object.entries(report.category_analysis).map(([name, data]) => (
                <div key={name} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="font-semibold">{name}</h3>
                    <span className="text-xs px-2 py-1 bg-white/10 rounded text-white/60">Risk Category</span>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-white/70 mb-4 leading-relaxed">{data.assessment}</p>
                    <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Recommendation</div>
                        <p className="text-sm text-white/80">{data.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Critical Clauses */}
          <section id="clauses" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <AlertOctagon className="w-5 h-5 text-red-500" /> Top Critical Clauses
            </h2>
            <div className="space-y-6">
              {report.critical_clauses.map((clause) => (
                <div key={clause.rank} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 transition-all">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-red-500/20">
                    {clause.rank}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md font-bold uppercase tracking-tighter">
                        High Severity
                      </span>
                      <span className="text-xs text-white/40 uppercase tracking-widest">{clause.category}</span>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 mb-4 font-mono text-sm text-white/90 leading-relaxed italic border-l-2 border-l-red-500">
                      "{clause.text}"
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-xs font-bold text-white/40 uppercase mb-2">Why this is risky</div>
                        <p className="text-sm text-white/70">{clause.reason}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-500/60 uppercase mb-2">Mitigation Strategy</div>
                        <p className="text-sm text-white/70">{clause.mitigation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <section id="compliance" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Check className="w-5 h-5 text-emerald-400" /> Compliance Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(report.compliance_check).map(([reg, note]) => (
                <div key={reg} className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold text-white/40 uppercase mb-3 tracking-widest">{reg}</h3>
                  <p className="text-sm text-white/90">{note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Action Plan */}
          <section id="action" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-blue-400" /> Recommended Action Plan
            </h2>
            <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-widest">Immediate Actions</div>
                  <ul className="space-y-2">
                    {report.action_plan.immediate.map((item, i) => (
                      <li key={i} className="text-sm text-white/80 flex gap-2"><span className="text-red-400">•</span> {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Negotiation Points</div>
                  <ul className="space-y-2">
                    {report.action_plan.negotiate.map((item, i) => (
                      <li key={i} className="text-sm text-white/80 flex gap-2"><span className="text-amber-400">•</span> {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Final Verdict</div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-sm font-semibold text-emerald-400">{report.action_plan.final_verdict}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
