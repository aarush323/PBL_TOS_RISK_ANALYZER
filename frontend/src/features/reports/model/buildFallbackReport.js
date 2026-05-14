export const buildFallbackReport = ({ analysisResult, sourceInfo }) => {
  const riskyClauses = (analysisResult?.clauses || []).filter(c => c.is_risky)
    .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0));

  const categoryMap = {};
  riskyClauses.forEach((clause, idx) => {
    const cats = clause.risk_categories || ['General'];
    cats.forEach(cat => {
      if (!categoryMap[cat]) categoryMap[cat] = { clauses: [], totalSeverity: 0 };
      categoryMap[cat].clauses.push({ ...clause, originalIndex: idx });
      categoryMap[cat].totalSeverity += (clause.severity_score || 0);
    });
  });

  const category_deep_dives = {};
  Object.entries(categoryMap).forEach(([cat, data]) => {
    const count = data.clauses.length;
    const avgSev = count > 0 ? (data.totalSeverity / count).toFixed(1) : 0;
    const topClauses = data.clauses
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 3);

    const sevLevel = avgSev >= 7 ? 'critically high' : avgSev >= 5 ? 'elevated' : avgSev >= 3 ? 'moderate' : 'low';
    const assessment = `${count} clause${count > 1 ? 's' : ''} flagged under ${cat} with an average severity of ${avgSev}/10 (${sevLevel} risk). ` +
      (count > 5 ? `This represents a significant concentration of ${cat.toLowerCase()} issues that demands immediate legal review.` :
        count > 2 ? `Multiple ${cat.toLowerCase()} concerns identified that should be reviewed before signing.` :
          `Limited ${cat.toLowerCase()} concerns found, but individual clause severity warrants attention.`);

    const specific_concerns = topClauses.map(c => {
      const explanation = c.explanation || 'No explanation available';
      return `Clause #${(c.id || c.originalIndex) + 1} (Severity ${(c.severity_score || 0).toFixed(1)}): ${explanation.slice(0, 200)}`;
    });

    let recommendation;
    if (avgSev >= 7) recommendation = `Strongly recommend legal counsel review all ${count} ${cat} clauses before proceeding. Consider requesting amendments to the highest-severity terms.`;
    else if (avgSev >= 4) recommendation = `Review ${cat} clauses with legal advisor. Negotiate modifications to clauses with severity above 5.0.`;
    else recommendation = `${cat} risk is within acceptable range. Monitor for changes in future revisions.`;

    category_deep_dives[cat] = { assessment, specific_concerns, recommendation, clause_count: count, avg_severity: parseFloat(avgSev) };
  });

  const totalFlagged = analysisResult?.risky_clause_count || 0;
  const totalClauses = analysisResult?.total_clauses || 0;
  const riskLevel = analysisResult?.overall_risk || 'Low';
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1].clauses.length - a[1].clauses.length)
    .slice(0, 3)
    .map(([cat]) => cat);
  const generatedSummary = analysisResult?.executive_summary ||
    `Analysis of ${totalClauses} clauses identified ${totalFlagged} flagged provisions across ${Object.keys(categoryMap).length} risk categories. ` +
    `The overall risk assessment is **${riskLevel}**. ` +
    (topCategories.length > 0 ? `Primary risk concentrations are in ${topCategories.join(', ')}. ` : '') +
    (riskLevel === 'High' ? 'Immediate legal review is strongly recommended before signing this agreement.' :
      riskLevel === 'Medium' ? 'Legal review is recommended for flagged clauses before proceeding.' :
        'The document presents manageable risk levels, though flagged clauses should still be reviewed.');

  return {
    report_metadata: {
      report_id: `R${Date.now().toString(36)}`,
      generated_at: new Date().toISOString(),
      document_source: sourceInfo?.value || 'Unknown',
      analysis_engine: 'Jurist AI',
    },
    executive_dashboard: {
      risk_score: analysisResult?.risk_score ?? 0,
      overall_risk_level: riskLevel,
      total_clauses_analyzed: totalClauses,
      total_flagged: totalFlagged,
      ai_deep_scan_coverage: `${Math.round(((totalClauses - (analysisResult?.skipped_llm_count || 0)) / Math.max(1, totalClauses)) * 100)}%`,
      quick_verdict: analysisResult?.professional_summary || '',
    },
    executive_summary: generatedSummary,
    key_findings: analysisResult?.key_findings || [],
    category_deep_dives,
    compliance_assessment: {
      gdpr: { data_collection_transparency: '⚠️', right_to_deletion: '⚠️', data_portability: '⚠️', consent_mechanisms: '⚠️', notes: 'Automated assessment — manual review recommended' },
      ccpa: { right_to_know: '⚠️', right_to_opt_out: '⚠️', non_discrimination: '✅', notes: 'Automated assessment — manual review recommended' },
      best_practices: { plain_language: '⚠️', change_notification: '⚠️', dispute_resolution_clarity: '⚠️', notes: 'Standard review recommended' },
    },
    critical_clauses: riskyClauses.slice(0, 10).map((c, i) => {
      const cat = (c.risk_categories || ['General'])[0];
      const sev = c.severity_score || 0;
      return {
        rank: i + 1,
        severity_score: sev,
        category: cat,
        text: c.text || '',
        explanation: c.explanation || '',
        why_it_matters: sev >= 8
          ? 'This clause poses a significant legal or financial risk that could result in loss of user rights or unexpected obligations.'
          : sev >= 5
            ? 'This clause contains terms that may limit your rights or impose unexpected conditions.'
            : 'This clause has minor risk indicators worth reviewing.',
        negotiation_suggestion: sev >= 8
          ? `Request removal or substantial amendment of this ${cat.replace(' Risk', '').toLowerCase()} clause. Consider it a deal-breaker if unchanged.`
          : sev >= 5
            ? `Negotiate to limit the scope of this clause or add protective exceptions for the user.`
            : `Acceptable risk — monitor for future changes in this ${cat.replace(' Risk', '').toLowerCase()} provision.`,
      };
    }),
    risk_distribution_analysis: {
      severity_distribution: analysisResult?.aggregated_signals?.severity_distribution || {},
      risk_concentration: analysisResult?.aggregated_signals?.risk_concentration || {},
      confidence_distribution: analysisResult?.aggregated_signals?.confidence_distribution || {},
      category_cross_correlation: analysisResult?.aggregated_signals?.category_cross_correlation || {},
    },
    action_plan: {
      immediate_actions: riskLevel === 'High'
        ? [`Review all ${totalFlagged} flagged clauses with legal counsel`, 'Do not sign until high-severity clauses are amended', ...topCategories.slice(0, 2).map(c => `Prioritize ${c} clauses for negotiation`)]
        : riskLevel === 'Medium'
          ? ['Review clauses with severity > 5.0 with legal counsel', ...topCategories.slice(0, 1).map(c => `Focus on ${c} provisions`)]
          : ['No immediate critical actions required'],
      negotiate_before_signing: riskyClauses.filter(c => (c.severity_score || 0) >= 5).length > 0
        ? [`${riskyClauses.filter(c => (c.severity_score || 0) >= 5).length} clauses with severity ≥ 5.0 should be negotiated`, 'Request written amendments for high-severity provisions', 'Consider adding protective addendum clauses']
        : ['No high-severity clauses requiring negotiation'],
      monitor_and_accept: [`${riskyClauses.filter(c => (c.severity_score || 0) < 5).length} low-severity clauses can be accepted with awareness`, 'Set calendar reminders for ToS revision dates', 'Re-analyze if the provider updates their terms'],
      overall_recommendation: riskLevel === 'High' ? 'Do Not Sign Without Amendment' : riskLevel === 'Medium' ? 'Negotiate Key Clauses' : 'Acceptable — Sign with Awareness',
    },
    analysis_transparency: {
      total_clauses: totalClauses,
      nlp_pre_filtered: analysisResult?.skipped_llm_count || 0,
      llm_deep_scanned: totalClauses - (analysisResult?.skipped_llm_count || 0),
      high_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.High || 0,
      medium_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.Medium || 0,
      low_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.Low || 0,
    },
    appendix_all_flagged: riskyClauses.map(c => ({
      id: c.id,
      text: c.text || '',
      categories: c.risk_categories || [],
      severity_score: c.severity_score || 0,
      confidence: c.confidence || 'Low',
      explanation: c.explanation || '',
    })),
  };
};
