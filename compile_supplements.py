#!/usr/bin/env python3
"""
Compile Supplementary Materials for OppNDA Paper
- Supplementary Material A: docs/OppNDA_tutorial.tex -> docs/Supplementary Material A.pdf
- Supplementary Material B: plots/paper_figures/OppNDA_doc.tex -> docs/Supplementary Material B.pdf
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DOCS_DIR = PROJECT_ROOT / "docs"
PAPER_FIGS_DIR = PROJECT_ROOT / "plots" / "paper_figures"

def ensure_sphinx_texinputs():
    """Ensure Sphinx LaTeX styles exist."""
    try:
        from sphinx.highlighting import PygmentsBridge
        highlight_sty = PAPER_FIGS_DIR / "sphinxhighlight.sty"
        if not highlight_sty.exists():
            highlight_sty.write_text(PygmentsBridge('latex').get_stylesheet(), encoding='utf-8')
    except Exception as e:
        print(f"Warning: Could not generate sphinxhighlight.sty: {e}")

    messages_sty = PAPER_FIGS_DIR / "sphinxmessages.sty"
    if not messages_sty.exists():
        messages_sty.write_text("% sphinxmessages placeholder\n", encoding='utf-8')

def compile_supplement_a():
    """Compile Supplementary Material A (Tutorial Manual)."""
    print("\n" + "=" * 70)
    print(" COMPILING SUPPLEMENTARY MATERIAL A (TUTORIAL MANUAL)")
    print("=" * 70)
    tex_file = DOCS_DIR / "OppNDA_tutorial.tex"
    if not tex_file.exists():
        print(f"Error: {tex_file} not found")
        return False

    for pass_num in (1, 2):
        print(f"  [Pass {pass_num}/2] Running pdflatex...")
        cmd = ["pdflatex", "-interaction=nonstopmode", "-shell-escape", "OppNDA_tutorial.tex"]
        result = subprocess.run(cmd, cwd=str(DOCS_DIR), capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  Error compiling Supplementary Material A: {result.stderr[-500:]}")
            return False

    src_pdf = DOCS_DIR / "OppNDA_tutorial.pdf"
    dst_pdf = DOCS_DIR / "Supplementary Material A.pdf"
    if src_pdf.exists():
        shutil.copy2(src_pdf, dst_pdf)
        size_mb = dst_pdf.stat().st_size / (1024 * 1024)
        print(f"  [SUCCESS] Generated: {dst_pdf} ({size_mb:.2f} MB)")
        return True
    return False

def compile_supplement_b():
    """Compile Supplementary Material B (API & Configuration Reference)."""
    print("\n" + "=" * 70)
    print(" COMPILING SUPPLEMENTARY MATERIAL B (API & CONFIG REFERENCE)")
    print("=" * 70)
    ensure_sphinx_texinputs()
    tex_file = PAPER_FIGS_DIR / "OppNDA_doc.tex"
    if not tex_file.exists():
        print(f"Error: {tex_file} not found")
        return False

    env = os.environ.copy()
    try:
        import sphinx
        sphinx_texinputs = str(Path(sphinx.__file__).parent / "texinputs")
        current_texinputs = env.get("TEXINPUTS", "")
        env["TEXINPUTS"] = f"{sphinx_texinputs}//;{PAPER_FIGS_DIR}//;{current_texinputs}"
    except Exception as e:
        print(f"Warning: Could not locate Sphinx texinputs: {e}")

    for pass_num in (1, 2):
        print(f"  [Pass {pass_num}/2] Running xelatex...")
        cmd = ["xelatex", "-interaction=nonstopmode", "OppNDA_doc.tex"]
        result = subprocess.run(cmd, cwd=str(PAPER_FIGS_DIR), env=env, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  Error compiling Supplementary Material B: {result.stderr[-500:]}")
            return False

    src_pdf = PAPER_FIGS_DIR / "OppNDA_doc.pdf"
    dst_pdf = DOCS_DIR / "Supplementary Material B.pdf"
    if src_pdf.exists():
        shutil.copy2(src_pdf, dst_pdf)
        size_kb = dst_pdf.stat().st_size / 1024
        print(f"  [SUCCESS] Generated: {dst_pdf} ({size_kb:.1f} KB)")
        return True
    return False

if __name__ == "__main__":
    print("OppNDA Supplementary Materials Compiler")
    success_a = compile_supplement_a()
    success_b = compile_supplement_b()
    print("\n" + "=" * 70)
    if success_a and success_b:
        print(" ALL SUPPLEMENTARY MATERIALS COMPILED SUCCESSFULLY!")
    else:
        print(" COMPILATION COMPLETED WITH WARNINGS/ERRORS.")
    print("=" * 70)
