#!/usr/bin/env python3
"""
Quick Fix for Remaining Theme Issues
Targets the 264 MEDIUM priority issues found in audit
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SCAN_DIRS = ["components", "app"]

stats = {
    "files_scanned": 0,
    "files_fixed": 0,
    "border_fixes": 0,
    "opacity_fixes": 0,
    "remaining_inverted": 0,
}

def fix_remaining_issues(content: str, filepath: str) -> tuple[str, int]:
    """Fix remaining MEDIUM priority issues"""
    fixes = 0
    original = content
    
    # Fix 1: Remaining inverted patterns that were missed
    # Pattern: bg-white dark:bg-slate-900/X (WRONG)
    inverted_patterns = [
        (r'\bbg-white\s+dark:bg-slate-900/5\b', 'bg-slate-100/90 dark:bg-white/5'),
        (r'\bbg-white\s+dark:bg-slate-900/10\b', 'bg-slate-100/80 dark:bg-white/10'),
        (r'\bbg-white\s+dark:bg-slate-900/3\b', 'bg-slate-100/95 dark:bg-white/3'),
    ]
    
    for pattern, replacement in inverted_patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            stats["remaining_inverted"] += 1
            fixes += 1
    
    # Fix 2: Border colors without proper dark mode
    # border-white should be border-slate-200 dark:border-white/10
    border_pattern = r'\bborder-white(?!\s+dark:border-)'
    if re.search(border_pattern, content):
        # Don't blindly replace, check context
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if re.search(border_pattern, line):
                # Replace border-white with proper pattern
                line = re.sub(r'\bborder-white\b', 'border-slate-200 dark:border-white/10', line)
                stats["border_fixes"] += 1
                fixes += 1
            new_lines.append(line)
        content = '\n'.join(new_lines)
    
    # Fix 3: Opacity issues - text-slate-700 without dark variant
    opacity_pattern = r'\btext-slate-700(?!\s+dark:)'
    if re.search(opacity_pattern, content):
        content = re.sub(opacity_pattern, 'text-slate-700 dark:text-slate-300', content)
        stats["opacity_fixes"] += 1
        fixes += 1
    
    # Fix 4: More opacity - text-slate-600 without dark variant
    opacity_pattern2 = r'\btext-slate-600(?!\s+dark:)'
    if re.search(opacity_pattern2, content):
        content = re.sub(opacity_pattern2, 'text-slate-600 dark:text-slate-400', content)
        stats["opacity_fixes"] += 1
        fixes += 1
    
    # Fix 5: bg-slate-100 without dark variant
    bg_pattern = r'\bbg-slate-100(?!/\d)(?!\s+dark:)'
    if re.search(bg_pattern, content):
        content = re.sub(bg_pattern, 'bg-slate-100 dark:bg-slate-900', content)
        fixes += 1
    
    return content, fixes

def process_file(filepath: Path) -> bool:
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        content, fixes = fix_remaining_issues(original_content, str(filepath))
        
        if content != original_content and fixes > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"⚠️  Error processing {filepath}: {e}")
        return False

def main():
    print("🔧 QUICK FIX FOR REMAINING THEME ISSUES")
    print("=" * 80)
    print("Targeting 264 MEDIUM priority issues:")
    print("  • Remaining inverted patterns")
    print("  • Border colors without dark mode")
    print("  • Text opacity without dark variants")
    print("=" * 80)
    print()
    
    # Collect all files
    all_files = []
    for scan_dir in SCAN_DIRS:
        target_dir = BASE_DIR / scan_dir
        if target_dir.exists():
            all_files.extend(target_dir.rglob("*.tsx"))
            all_files.extend(target_dir.rglob("*.ts"))
    
    print(f"📂 Found {len(all_files)} files to scan")
    print()
    
    # Process files
    fixed_files = []
    for filepath in all_files:
        stats["files_scanned"] += 1
        if process_file(filepath):
            stats["files_fixed"] += 1
            fixed_files.append(str(filepath.relative_to(BASE_DIR)))
    
    # Results
    print()
    print("=" * 80)
    print("✅ FIX COMPLETE!")
    print("=" * 80)
    print()
    print(f"📊 Statistics:")
    print(f"   • Files scanned: {stats['files_scanned']}")
    print(f"   • Files fixed: {stats['files_fixed']}")
    print()
    print(f"🔧 Fixes Applied:")
    print(f"   • Remaining inverted patterns: {stats['remaining_inverted']}")
    print(f"   • Border color fixes: {stats['border_fixes']}")
    print(f"   • Opacity variant fixes: {stats['opacity_fixes']}")
    print()
    
    total_fixes = stats['remaining_inverted'] + stats['border_fixes'] + stats['opacity_fixes']
    print(f"🎯 Total additional fixes: {total_fixes}")
    print()
    
    if fixed_files:
        print(f"📝 Fixed files (showing first 20):")
        for i, file_path in enumerate(fixed_files[:20], 1):
            print(f"   {i:2d}. {file_path}")
        
        if len(fixed_files) > 20:
            print(f"   ... and {len(fixed_files) - 20} more files")
    
    print()
    print("=" * 80)
    print("✨ Theme issues resolved! Toggle between light/dark to verify.")
    print("=" * 80)

if __name__ == "__main__":
    main()
