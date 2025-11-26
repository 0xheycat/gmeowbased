#!/usr/bin/env python3
"""
Comprehensive Theme Audit - Find ALL remaining color issues
Excludes frame routes as requested
"""

import os
import re
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent.parent
SCAN_DIRS = ["components", "app"]
EXCLUDE_PATTERNS = [
    r'/frames?/',  # Exclude frame routes
    r'\.frame\.',
    r'/api/frames',
]

issues = defaultdict(list)
stats = {
    "files_scanned": 0,
    "files_with_issues": 0,
    "total_issues": 0,
}

# Problem patterns to detect
PATTERNS = {
    "CRITICAL_INVERTED_BG": [
        r'\bbg-white\s+dark:bg-slate-',
        r'\bbg-white\s+dark:bg-gray-',
    ],
    "CRITICAL_INVERTED_TEXT": [
        r'\btext-white\s+dark:text-slate-9',
        r'\btext-white\s+dark:text-gray-9',
    ],
    "HIGH_NO_DARK_TEXT_WHITE": [
        r'\btext-white(?!\s+dark:)',
    ],
    "HIGH_NO_DARK_BG_WHITE": [
        r'\bbg-white(?!/\d)(?!\s+dark:)(?!-)',
    ],
    "HIGH_NO_DARK_BORDER_WHITE": [
        r'\bborder-white(?!\s+dark:)',
    ],
    "MEDIUM_NO_DARK_TEXT_BLACK": [
        r'\btext-black(?!\s+dark:)',
    ],
    "MEDIUM_NO_DARK_TEXT_SLATE_900": [
        r'\btext-slate-900(?!\s+dark:)',
    ],
    "MEDIUM_NO_DARK_TEXT_GRAY_900": [
        r'\btext-gray-900(?!\s+dark:)',
    ],
    "MEDIUM_NO_DARK_BG_SLATE_100": [
        r'\bbg-slate-100(?!/\d)(?!\s+dark:)',
    ],
    "MEDIUM_NO_DARK_BG_GRAY_100": [
        r'\bbg-gray-100(?!/\d)(?!\s+dark:)',
    ],
    "LOW_TEXT_SLATE_CONTRAST": [
        r'\btext-slate-700(?!\s+dark:)',
        r'\btext-slate-600(?!\s+dark:)',
        r'\btext-slate-500(?!\s+dark:)',
    ],
    "LOW_TEXT_GRAY_CONTRAST": [
        r'\btext-gray-700(?!\s+dark:)',
        r'\btext-gray-600(?!\s+dark:)',
        r'\btext-gray-500(?!\s+dark:)',
    ],
}

def should_exclude(filepath: str) -> bool:
    """Check if file should be excluded"""
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, str(filepath)):
            return True
    return False

def scan_file(filepath: Path) -> list:
    """Scan a file for theme issues"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        file_issues = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comments and imports
            if line.strip().startswith('//') or line.strip().startswith('import'):
                continue
            
            for severity, patterns in PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, line):
                        # Extract the problematic className section
                        match = re.search(r'className=["\']([^"\']+)["\']', line)
                        if match:
                            classes = match.group(1)
                        else:
                            classes = line.strip()[:100]
                        
                        file_issues.append({
                            "line": line_num,
                            "severity": severity,
                            "pattern": pattern,
                            "code": classes,
                        })
                        stats["total_issues"] += 1
        
        return file_issues
    except Exception as e:
        return []

def main():
    print("🔍 COMPREHENSIVE THEME AUDIT")
    print("=" * 100)
    print("Scanning entire codebase for theme inconsistencies (excluding frame routes)")
    print("=" * 100)
    print()
    
    # Collect all files
    all_files = []
    for scan_dir in SCAN_DIRS:
        target_dir = BASE_DIR / scan_dir
        if target_dir.exists():
            for ext in ["*.tsx", "*.ts", "*.jsx", "*.js"]:
                all_files.extend(target_dir.rglob(ext))
    
    # Filter out excluded paths
    all_files = [f for f in all_files if not should_exclude(str(f))]
    
    print(f"📂 Scanning {len(all_files)} files...")
    print()
    
    # Scan files
    for filepath in sorted(all_files):
        stats["files_scanned"] += 1
        file_issues = scan_file(filepath)
        
        if file_issues:
            stats["files_with_issues"] += 1
            issues[str(filepath.relative_to(BASE_DIR))] = file_issues
    
    # Sort issues by severity
    severity_order = [
        "CRITICAL_INVERTED_BG",
        "CRITICAL_INVERTED_TEXT",
        "HIGH_NO_DARK_TEXT_WHITE",
        "HIGH_NO_DARK_BG_WHITE",
        "HIGH_NO_DARK_BORDER_WHITE",
        "MEDIUM_NO_DARK_TEXT_BLACK",
        "MEDIUM_NO_DARK_TEXT_SLATE_900",
        "MEDIUM_NO_DARK_TEXT_GRAY_900",
        "MEDIUM_NO_DARK_BG_SLATE_100",
        "MEDIUM_NO_DARK_BG_GRAY_100",
        "LOW_TEXT_SLATE_CONTRAST",
        "LOW_TEXT_GRAY_CONTRAST",
    ]
    
    # Count by severity
    severity_counts = defaultdict(int)
    for file_issues in issues.values():
        for issue in file_issues:
            severity_counts[issue["severity"]] += 1
    
    # Print results
    print("=" * 100)
    print("📊 AUDIT RESULTS")
    print("=" * 100)
    print()
    print(f"Files scanned: {stats['files_scanned']}")
    print(f"Files with issues: {stats['files_with_issues']}")
    print(f"Total issues found: {stats['total_issues']}")
    print()
    
    print("Issues by severity:")
    print("-" * 100)
    for severity in severity_order:
        count = severity_counts.get(severity, 0)
        if count > 0:
            emoji = "🔴" if "CRITICAL" in severity else "🟡" if "HIGH" in severity else "🟠" if "MEDIUM" in severity else "🔵"
            print(f"{emoji} {severity.replace('_', ' ')}: {count}")
    print()
    
    # Print detailed issues
    if issues:
        print("=" * 100)
        print("📝 DETAILED ISSUES (showing files with most issues first)")
        print("=" * 100)
        print()
        
        # Sort files by issue count
        sorted_files = sorted(issues.items(), key=lambda x: len(x[1]), reverse=True)
        
        for filepath, file_issues in sorted_files[:30]:  # Show top 30 files
            print(f"\n📄 {filepath}")
            print(f"   Issues: {len(file_issues)}")
            print()
            
            # Group by severity
            by_severity = defaultdict(list)
            for issue in file_issues:
                by_severity[issue["severity"]].append(issue)
            
            # Show first few of each severity
            for severity in severity_order:
                if severity in by_severity:
                    emoji = "🔴" if "CRITICAL" in severity else "🟡" if "HIGH" in severity else "🟠" if "MEDIUM" in severity else "🔵"
                    issues_of_type = by_severity[severity][:5]  # Show first 5
                    
                    for issue in issues_of_type:
                        print(f"   {emoji} Line {issue['line']}: {severity.replace('_', ' ')}")
                        print(f"      Code: {issue['code'][:80]}")
                    
                    if len(by_severity[severity]) > 5:
                        print(f"      ... and {len(by_severity[severity]) - 5} more of this type")
        
        if len(sorted_files) > 30:
            print(f"\n... and {len(sorted_files) - 30} more files with issues")
    
    print()
    print("=" * 100)
    print("💡 RECOMMENDATIONS")
    print("=" * 100)
    print()
    
    if stats["total_issues"] == 0:
        print("✅ No theme issues found! Theme is consistent across light and dark modes.")
    elif stats["total_issues"] < 50:
        print("✅ Few issues found. Manual fixes recommended.")
        print("   Use the detailed report above to fix specific instances.")
    elif stats["total_issues"] < 200:
        print("⚠️  Moderate issues found. Consider targeted automated fix script.")
        print("   Focus on CRITICAL and HIGH severity issues first.")
    else:
        print("🔴 Many issues found. Comprehensive automated fix script needed.")
        print("   Run fix script targeting patterns identified above.")
    
    print()
    print("=" * 100)

if __name__ == "__main__":
    main()
