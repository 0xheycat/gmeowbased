#!/usr/bin/env python3
"""
FOUNDATION AUDIT - Complete Dark/Light Mode Color Scanner
Scans EVERY component and page for color issues
Reports ALL problems with precise locations and fixes
"""

import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict

BASE_PATH = Path(__file__).parent.parent

class ColorIssue:
    def __init__(self, filepath: str, line_num: int, issue_type: str, pattern: str, suggestion: str):
        self.filepath = filepath
        self.line_num = line_num
        self.issue_type = issue_type
        self.pattern = pattern
        self.suggestion = suggestion

def scan_file_for_issues(filepath: Path) -> List[ColorIssue]:
    """Scan a single file for ALL color issues"""
    
    # Skip these
    if any(skip in str(filepath) for skip in ['node_modules', '.next', 'legacy', 'archived', '__test']):
        return []
    
    issues = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        rel_path = str(filepath.relative_to(BASE_PATH))
        
        for i, line in enumerate(lines, 1):
            # Skip comments and imports
            if line.strip().startswith('//') or line.strip().startswith('import'):
                continue
            
            # === ISSUE 1: text-white without dark: variant ===
            if re.search(r'\btext-white\b(?!\s*dark:)', line) and 'dark:text-white' not in line:
                # Exclude hover/focus states
                if not re.search(r'(hover|focus|active):text-white', line):
                    issues.append(ColorIssue(
                        rel_path, i, 
                        "❌ CRITICAL: text-white (invisible in light mode)",
                        line.strip(),
                        "Add: dark:text-white and change to text-slate-900 for light mode"
                    ))
            
            # === ISSUE 2: text-white/XX without dark: variant ===
            if re.search(r'\btext-white/\d+(?!\s*dark:)', line):
                issues.append(ColorIssue(
                    rel_path, i,
                    "❌ CRITICAL: text-white/opacity (invisible in light)",
                    line.strip(),
                    "Change to: text-slate-700/XX dark:text-white/XX"
                ))
            
            # === ISSUE 3: bg-white without dark: variant ===
            if re.search(r'\bbg-white\b(?!\s*dark:)', line) and 'dark:bg-' not in line:
                if not re.search(r'(hover|focus):bg-white', line):
                    issues.append(ColorIssue(
                        rel_path, i,
                        "⚠️  HIGH: bg-white (needs dark variant)",
                        line.strip(),
                        "Add: dark:bg-slate-900"
                    ))
            
            # === ISSUE 4: text-black without dark: variant ===
            if re.search(r'\btext-black\b(?!\s*dark:)', line):
                issues.append(ColorIssue(
                    rel_path, i,
                    "⚠️  HIGH: text-black (needs dark variant)",
                    line.strip(),
                    "Add: dark:text-white"
                ))
            
            # === ISSUE 5: text-gray-900/800/700 without dark: variant ===
            for shade in ['900', '800', '700']:
                if re.search(rf'\btext-gray-{shade}\b(?!\s*dark:)', line):
                    issues.append(ColorIssue(
                        rel_path, i,
                        "⚠️  HIGH: text-gray-{} (too dark for light mode)".format(shade),
                        line.strip(),
                        f"Add: dark:text-gray-{int(shade)-200}"
                    ))
            
            # === ISSUE 6: text-slate-900/800/700 without dark: variant ===
            for shade in ['900', '800', '700', '600']:
                if re.search(rf'\btext-slate-{shade}\b(?!\s*dark:)', line):
                    issues.append(ColorIssue(
                        rel_path, i,
                        "⚠️  MEDIUM: text-slate-{} (needs dark variant)".format(shade),
                        line.strip(),
                        f"Add: dark:text-slate-{min(int(shade)+200, 500)}"
                    ))
            
            # === ISSUE 7: border-white without dark: variant ===
            if re.search(r'\bborder-white\b(?!\s*dark:)', line) and 'dark:border-' not in line:
                issues.append(ColorIssue(
                    rel_path, i,
                    "⚠️  MEDIUM: border-white (needs dark variant)",
                    line.strip(),
                    "Add: dark:border-slate-700"
                ))
            
            # === ISSUE 8: bg-slate-50/100 without dark: variant ===
            for shade in ['50', '100']:
                if re.search(rf'\bbg-slate-{shade}\b(?!\s*dark:)', line):
                    issues.append(ColorIssue(
                        rel_path, i,
                        "⚠️  MEDIUM: bg-slate-{} (needs dark variant)".format(shade),
                        line.strip(),
                        "Add: dark:bg-slate-900"
                    ))
            
            # === ISSUE 9: Inverted patterns ===
            if re.search(r'text-white\s+dark:text-slate-\d+', line):
                issues.append(ColorIssue(
                    rel_path, i,
                    "🔴 ERROR: Inverted pattern (backwards!)",
                    line.strip(),
                    "Should be: text-slate-XXX dark:text-white"
                ))
            
            if re.search(r'bg-white\s+dark:bg-slate-900/\d+', line):
                issues.append(ColorIssue(
                    rel_path, i,
                    "🔴 ERROR: Inverted background pattern",
                    line.strip(),
                    "Should be: bg-slate-XXX dark:bg-white/5"
                ))
            
            # === ISSUE 10: Hex colors (should use design tokens) ===
            hex_pattern = r'#[0-9A-Fa-f]{6}'
            if re.search(hex_pattern, line):
                # Exclude common exceptions
                if not any(exc in line for exc in ['gradient', 'rgba', 'color:', 'background:']):
                    issues.append(ColorIssue(
                        rel_path, i,
                        "📌 LOW: Hex color (use design token)",
                        line.strip(),
                        "Replace with Tailwind color class or CSS variable"
                    ))
            
            # === ISSUE 11: Fixed color without contrast check ===
            if re.search(r'\btext-\w+-\d+\b', line) and re.search(r'\bbg-\w+-\d+\b', line):
                # Check if they might have poor contrast
                if not 'dark:' in line:
                    issues.append(ColorIssue(
                        rel_path, i,
                        "⚠️  MEDIUM: Fixed colors (check contrast)",
                        line.strip(),
                        "Verify WCAG contrast ratio in both themes"
                    ))
    
    except Exception as e:
        print(f"⚠️  Error scanning {filepath}: {e}")
    
    return issues

def generate_report(all_issues: List[ColorIssue]) -> None:
    """Generate comprehensive report"""
    
    print("=" * 80)
    print("🔍 FOUNDATION AUDIT - DARK/LIGHT MODE COLOR ISSUES")
    print("=" * 80)
    print(f"\nTotal files scanned: {len(set(issue.filepath for issue in all_issues))}")
    print(f"Total issues found: {len(all_issues)}")
    
    # Group by severity
    critical = [i for i in all_issues if "CRITICAL" in i.issue_type]
    high = [i for i in all_issues if "HIGH" in i.issue_type]
    medium = [i for i in all_issues if "MEDIUM" in i.issue_type]
    errors = [i for i in all_issues if "ERROR" in i.issue_type]
    low = [i for i in all_issues if "LOW" in i.issue_type]
    
    print("\n" + "=" * 80)
    print("📊 SEVERITY BREAKDOWN")
    print("=" * 80)
    print(f"🔴 CRITICAL (must fix): {len(critical)}")
    print(f"🔴 ERRORS (inverted): {len(errors)}")
    print(f"⚠️  HIGH (important): {len(high)}")
    print(f"⚠️  MEDIUM (should fix): {len(medium)}")
    print(f"📌 LOW (nice to have): {len(low)}")
    
    # Group by file
    by_file = defaultdict(list)
    for issue in all_issues:
        by_file[issue.filepath].append(issue)
    
    # Show top 30 files with most issues
    sorted_files = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)
    
    print("\n" + "=" * 80)
    print("📁 TOP 30 FILES WITH MOST ISSUES")
    print("=" * 80)
    
    for i, (filepath, file_issues) in enumerate(sorted_files[:30], 1):
        critical_count = len([i for i in file_issues if "CRITICAL" in i.issue_type])
        error_count = len([i for i in file_issues if "ERROR" in i.issue_type])
        high_count = len([i for i in file_issues if "HIGH" in i.issue_type])
        
        print(f"\n{i}. {filepath}")
        print(f"   Total: {len(file_issues)} issues")
        if critical_count:
            print(f"   🔴 {critical_count} CRITICAL")
        if error_count:
            print(f"   🔴 {error_count} ERRORS")
        if high_count:
            print(f"   ⚠️  {high_count} HIGH")
        
        # Show first 3 issues from this file
        for issue in file_issues[:3]:
            print(f"   • Line {issue.line_num}: {issue.issue_type}")
            print(f"     Fix: {issue.suggestion}")
    
    if len(sorted_files) > 30:
        print(f"\n   ... and {len(sorted_files) - 30} more files")
    
    # Show critical issues in detail
    if critical:
        print("\n" + "=" * 80)
        print("🔴 CRITICAL ISSUES (TOP 20) - MUST FIX FOR LIGHT MODE")
        print("=" * 80)
        
        for i, issue in enumerate(critical[:20], 1):
            print(f"\n{i}. {issue.filepath}:{issue.line_num}")
            print(f"   Issue: {issue.issue_type}")
            print(f"   Code: {issue.pattern[:100]}...")
            print(f"   Fix: {issue.suggestion}")
    
    # Show inverted patterns
    if errors:
        print("\n" + "=" * 80)
        print("🔴 INVERTED PATTERNS (ALL) - FIX IMMEDIATELY")
        print("=" * 80)
        
        for i, issue in enumerate(errors, 1):
            print(f"\n{i}. {issue.filepath}:{issue.line_num}")
            print(f"   Code: {issue.pattern[:100]}")
            print(f"   Fix: {issue.suggestion}")
    
    print("\n" + "=" * 80)
    print("📝 RECOMMENDED ACTION PLAN")
    print("=" * 80)
    
    if critical or errors:
        print("\n🚨 IMMEDIATE (Do now):")
        print(f"   • Fix {len(critical)} CRITICAL issues (text-white without dark:)")
        print(f"   • Fix {len(errors)} INVERTED patterns")
        print("   • Run: python3 scripts/fix-critical-colors.py")
    
    if high:
        print("\n⚠️  HIGH PRIORITY (This sprint):")
        print(f"   • Fix {len(high)} HIGH issues (bg-white, text-black)")
        print("   • Add dark: variants to all backgrounds/text")
    
    if medium:
        print("\n📋 MEDIUM PRIORITY (Next sprint):")
        print(f"   • Fix {len(medium)} MEDIUM issues (borders, slates)")
        print("   • Improve contrast ratios")
    
    if low:
        print("\n📌 LOW PRIORITY (Future):")
        print(f"   • Fix {len(low)} LOW issues (hex colors)")
        print("   • Replace with design tokens")
    
    print("\n" + "=" * 80)
    print("✅ NEXT STEPS")
    print("=" * 80)
    print("\n1. Review critical issues above")
    print("2. Run automated fix script (if available)")
    print("3. Test in both light and dark modes")
    print("4. Verify WCAG contrast compliance")
    print("5. Check cross-tab synchronization")
    
    # Export detailed report
    print("\n💾 Exporting detailed report...")
    report_file = BASE_PATH / 'COLOR_AUDIT_REPORT.txt'
    with open(report_file, 'w') as f:
        f.write("COMPLETE COLOR AUDIT REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        for filepath, file_issues in sorted_files:
            f.write(f"\n{'=' * 80}\n")
            f.write(f"FILE: {filepath}\n")
            f.write(f"Issues: {len(file_issues)}\n")
            f.write(f"{'=' * 80}\n")
            
            for issue in file_issues:
                f.write(f"\nLine {issue.line_num}: {issue.issue_type}\n")
                f.write(f"Code: {issue.pattern}\n")
                f.write(f"Fix: {issue.suggestion}\n")
    
    print(f"✅ Report saved to: {report_file}")

def main():
    """Main scanner function"""
    
    print("\n🚀 Starting Foundation Audit...")
    print("Scanning all components and pages...\n")
    
    # Scan directories
    dirs_to_scan = [
        BASE_PATH / 'components',
        BASE_PATH / 'app',
    ]
    
    all_files = []
    for directory in dirs_to_scan:
        if directory.exists():
            all_files.extend(directory.rglob('*.tsx'))
            all_files.extend(directory.rglob('*.ts'))
    
    print(f"📂 Found {len(all_files)} files to scan")
    
    all_issues = []
    for filepath in all_files:
        issues = scan_file_for_issues(filepath)
        all_issues.extend(issues)
    
    print(f"✅ Scan complete!\n")
    
    generate_report(all_issues)
    
    print("\n" + "=" * 80)
    print("🎯 AUDIT COMPLETE!")
    print("=" * 80)

if __name__ == '__main__':
    main()
