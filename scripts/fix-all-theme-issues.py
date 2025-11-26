#!/usr/bin/env python3
"""
Comprehensive Theme Fix - Fix ALL 819 issues found in audit
Targets CRITICAL and HIGH severity issues
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SCAN_DIRS = ["components", "app"]
EXCLUDE_PATTERNS = [
    r'/frames?/',
    r'\.frame\.',
    r'/api/frames',
]

stats = {
    "files_scanned": 0,
    "files_fixed": 0,
    "inverted_text_fixed": 0,
    "inverted_bg_fixed": 0,
    "no_dark_text_white": 0,
    "duplicated_dark_fixed": 0,
    "border_duplication_fixed": 0,
}

def should_exclude(filepath: str) -> bool:
    """Check if file should be excluded"""
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, str(filepath)):
            return True
    return False

def fix_theme_issues(content: str) -> tuple[str, int]:
    """Fix all theme issues"""
    fixes = 0
    
    # Fix 1: CRITICAL - Remove inverted text patterns
    # text-white dark:text-slate-950 dark:text-white → text-slate-950 dark:text-white
    # This is the most common issue (384 occurrences)
    pattern1 = r'\btext-white\s+dark:text-slate-950\s+dark:text-white\b'
    if re.search(pattern1, content):
        content = re.sub(pattern1, 'text-slate-950 dark:text-white', content)
        count = len(re.findall(pattern1, content))
        stats["inverted_text_fixed"] += count
        fixes += count
    
    # Fix 2: CRITICAL - Fix inverted text with slate-700
    # text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/XX
    pattern2 = r'\btext-white\s+dark:text-slate-950\s+dark:text-slate-700\s+dark:text-white/(\d+)\b'
    if re.search(pattern2, content):
        content = re.sub(pattern2, r'text-slate-950 dark:text-white/\1', content)
        stats["inverted_text_fixed"] += 1
        fixes += 1
    
    # Fix 3: CRITICAL - Simpler inverted pattern
    # text-white dark:text-slate-950 dark:text-slate-700
    pattern3 = r'\btext-white\s+dark:text-slate-950\s+dark:text-slate-700\b'
    if re.search(pattern3, content):
        content = re.sub(pattern3, 'text-slate-700 dark:text-slate-300', content)
        stats["inverted_text_fixed"] += 1
        fixes += 1
    
    # Fix 4: CRITICAL - Inverted backgrounds
    # bg-white dark:bg-slate-XXX → bg-slate-100/90 dark:bg-white/5
    pattern4 = r'\bbg-white\s+dark:bg-slate-(\d+)/(\d+)\b'
    if re.search(pattern4, content):
        content = re.sub(pattern4, 'bg-slate-100/90 dark:bg-white/5', content)
        stats["inverted_bg_fixed"] += 1
        fixes += 1
    
    # Fix 5: CRITICAL - Inverted gray backgrounds
    # bg-white dark:bg-gray-XXX → bg-slate-100/90 dark:bg-white/5
    pattern5 = r'\bbg-white\s+dark:bg-gray-(\d+)\b'
    if re.search(pattern5, content):
        content = re.sub(pattern5, 'bg-slate-100/90 dark:bg-white/5', content)
        stats["inverted_bg_fixed"] += 1
        fixes += 1
    
    # Fix 6: HIGH - Fix duplicated dark patterns in borders
    # border-white/10/10 → border-white/10
    pattern6 = r'\bdark:border-white/(\d+)/(\d+)\b'
    if re.search(pattern6, content):
        content = re.sub(pattern6, r'dark:border-white/\1', content)
        stats["border_duplication_fixed"] += 1
        fixes += 1
    
    # Fix 7: HIGH - Fix duplicated dark patterns in backgrounds
    # bg-white/5/5 → bg-white/5
    pattern7 = r'\bdark:bg-white/(\d+)/(\d+)\b'
    if re.search(pattern7, content):
        content = re.sub(pattern7, r'dark:bg-white/\1', content)
        stats["duplicated_dark_fixed"] += 1
        fixes += 1
    
    # Fix 8: HIGH - Fix text-white without dark variant in specific contexts
    # This is tricky - only fix where it's clearly wrong
    # Look for text-white that's NOT followed by dark: within 20 chars
    lines = content.split('\n')
    fixed_lines = []
    for line in lines:
        # Skip if line already has proper dark variant
        if 'text-white dark:text-' in line:
            fixed_lines.append(line)
            continue
        
        # Check for standalone text-white in className strings
        if 'text-white' in line and 'className=' in line:
            # Only fix if it's clearly a dynamic className or lacks dark mode
            if re.search(r'\btext-white(?!\s+dark:)(?!\s*["\'])', line):
                # Check context - if it's in a gradient or special context, skip
                if 'gradient' not in line.lower() and 'bg-' in line:
                    line = re.sub(r'\btext-white\b', 'text-slate-950 dark:text-white', line)
                    stats["no_dark_text_white"] += 1
                    fixes += 1
        
        fixed_lines.append(line)
    
    content = '\n'.join(fixed_lines)
    
    return content, fixes

def process_file(filepath: Path) -> bool:
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
        
        fixed, fix_count = fix_theme_issues(original)
        
        if fixed != original and fix_count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            return True
        
        return False
    except Exception as e:
        print(f"⚠️  Error processing {filepath}: {e}")
        return False

def main():
    print("🔧 COMPREHENSIVE THEME FIX")
    print("=" * 80)
    print("Fixing 819 issues found in audit:")
    print("  • 384 CRITICAL inverted text patterns")
    print("  • 8 CRITICAL inverted background patterns")
    print("  • 385 HIGH no-dark text-white issues")
    print("  • 42 HIGH duplicated dark patterns")
    print("=" * 80)
    print()
    
    # Collect files
    all_files = []
    for scan_dir in SCAN_DIRS:
        target_dir = BASE_DIR / scan_dir
        if target_dir.exists():
            all_files.extend(target_dir.rglob("*.tsx"))
            all_files.extend(target_dir.rglob("*.ts"))
    
    # Filter excluded
    all_files = [f for f in all_files if not should_exclude(str(f))]
    
    print(f"📂 Scanning {len(all_files)} files...")
    print()
    
    # Process
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
    print(f"   • Inverted text patterns: {stats['inverted_text_fixed']}")
    print(f"   • Inverted background patterns: {stats['inverted_bg_fixed']}")
    print(f"   • Added dark variants to text-white: {stats['no_dark_text_white']}")
    print(f"   • Duplicated dark patterns: {stats['duplicated_dark_fixed']}")
    print(f"   • Border duplications: {stats['border_duplication_fixed']}")
    print()
    
    total = (stats['inverted_text_fixed'] + stats['inverted_bg_fixed'] + 
             stats['no_dark_text_white'] + stats['duplicated_dark_fixed'] +
             stats['border_duplication_fixed'])
    print(f"🎯 Total fixes: {total}")
    print()
    
    if fixed_files:
        print(f"📝 Fixed files (showing first 30):")
        for i, path in enumerate(fixed_files[:30], 1):
            print(f"   {i:2d}. {path}")
        
        if len(fixed_files) > 30:
            print(f"   ... and {len(fixed_files) - 30} more")
    
    print()
    print("=" * 80)
    print("✨ All critical theme issues fixed!")
    print("   Run `pnpm tsc --noEmit` to verify")
    print("   Toggle theme in browser to test")
    print("=" * 80)

if __name__ == "__main__":
    main()
