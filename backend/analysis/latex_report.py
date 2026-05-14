import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any


class LatexBuildError(RuntimeError):
    """Raised when a report PDF cannot be built from LaTeX."""


LATEX_SPECIAL_CHARS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def latex_escape(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(ch for ch in text if ch == "\n" or ch == "\t" or ord(ch) >= 32)
    return "".join(LATEX_SPECIAL_CHARS.get(ch, ch) for ch in text)


def _items(values: Any) -> str:
    if not values:
        return r"\item No items provided."
    return "\n".join(fr"\item {latex_escape(item)}" for item in values)


def _risk_label(score: int | float) -> str:
    if score >= 60:
        return "High"
    if score >= 30:
        return "Medium"
    return "Low"


def _format_date(value: str | None) -> str:
    if not value:
        return datetime.utcnow().strftime("%Y-%m-%d")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except ValueError:
        return value[:10]


def build_report_tex(report: dict) -> str:
    metadata = report.get("report_metadata") or {}
    action_plan = report.get("action_plan") or {}
    risk_score = metadata.get("risk_score", 0)

    category_sections = []
    for name, data in (report.get("category_analysis") or {}).items():
        data = data or {}
        category_sections.append(
            rf"""
\subsection*{{{latex_escape(name)}}}
\textbf{{Assessment.}} {latex_escape(data.get("assessment", "No assessment provided."))}

\textbf{{Recommendation.}} {latex_escape(data.get("recommendation", "No recommendation provided."))}
"""
        )
    if not category_sections:
        category_sections.append(r"\emph{No category analysis provided.}")

    compliance_items = "\n".join(
        fr"\item \textbf{{{latex_escape(name.replace('_', ' ').title())}.}} {latex_escape(note)}"
        for name, note in (report.get("compliance_check") or {}).items()
    ) or r"\item No compliance notes provided."

    clause_sections = []
    for clause in report.get("critical_clauses") or []:
        clause_sections.append(
            rf"""
\subsection*{{Clause {latex_escape(clause.get("rank", ""))}: {latex_escape(clause.get("category", "General"))}}}
\textbf{{Text.}} {latex_escape(clause.get("text", ""))}

\textbf{{Reason.}} {latex_escape(clause.get("reason", ""))}

\textbf{{Impact.}} {latex_escape(clause.get("impact", ""))}

\textbf{{Mitigation.}} {latex_escape(clause.get("mitigation", ""))}
"""
        )
    if not clause_sections:
        clause_sections.append(r"\emph{No critical clauses were included in this report.}")

    return rf"""
\documentclass[11pt]{{article}}
\usepackage[a4paper,margin=0.75in]{{geometry}}
\usepackage{{fontspec}}

\IfFontExistsTF{{Helvetica Neue}}{{\setmainfont{{Helvetica Neue}}}}{{\setmainfont{{Latin Modern Roman}}}}
\IfFontExistsTF{{Arial}}{{\setsansfont{{Arial}}}}{{\setsansfont{{Latin Modern Sans}}}}
\setlength{{\parindent}}{{0pt}}
\setlength{{\parskip}}{{0.55em}}
\sloppy

\begin{{document}}

{{\Huge\bfseries Risk Analysis Report}}

\vspace{{0.25em}}
Report ID: {latex_escape(metadata.get("report_id", "REPORT"))} \quad Generated: {_format_date(metadata.get("generated_at"))}

\vspace{{1em}}
\hrule
\vspace{{1em}}

\textbf{{Document Source.}} {latex_escape(metadata.get("document_source", "Unknown"))}

\textbf{{Risk Score.}} {latex_escape(risk_score)}/100 ({latex_escape(_risk_label(float(risk_score or 0)))})

\section*{{Executive Summary}}
{latex_escape(report.get("executive_summary", "Detailed risk analysis is complete."))}

\section*{{Key Findings}}
\begin{{itemize}}
{_items(report.get("key_findings"))}
\end{{itemize}}

\section*{{Category Breakdown}}
{''.join(category_sections)}

\section*{{Critical Clauses}}
{''.join(clause_sections)}

\section*{{Compliance Status}}
\begin{{itemize}}
{compliance_items}
\end{{itemize}}

\section*{{Action Plan}}
\subsection*{{Immediate}}
\begin{{itemize}}
{_items(action_plan.get("immediate"))}
\end{{itemize}}

\subsection*{{Negotiate}}
\begin{{itemize}}
{_items(action_plan.get("negotiate"))}
\end{{itemize}}

\subsection*{{Monitor}}
\begin{{itemize}}
{_items(action_plan.get("monitor"))}
\end{{itemize}}

\subsection*{{Final Verdict}}
{latex_escape(action_plan.get("final_verdict", "No final verdict provided."))}

\end{{document}}
"""


def find_latex_compiler() -> str | None:
    return shutil.which("xelatex")


def build_report_pdf(report: dict) -> tuple[Path, Path]:
    compiler = find_latex_compiler()
    if not compiler:
        raise LatexBuildError("xelatex is not installed on this server.")

    output_dir = Path(tempfile.mkdtemp(prefix="tos-report-pdf-"))
    tex_path = output_dir / "report.tex"
    pdf_path = output_dir / "report.pdf"
    tex_path.write_text(build_report_tex(report), encoding="utf-8")

    result = subprocess.run(
        [
            compiler,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-output-directory",
            str(output_dir),
            str(tex_path),
        ],
        cwd=output_dir,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if result.returncode != 0 or not pdf_path.exists():
        raise LatexBuildError(result.stdout[-2000:] or result.stderr[-2000:] or "LaTeX compilation failed.")

    return pdf_path, output_dir
