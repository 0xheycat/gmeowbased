#!/usr/bin/env python3
"""
Aggressive Theme Fix - Fix remaining 449 HIGH priority issues
Focus on text-white without dark variants
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
    "text_white_fixed": 0,
    "bg_white_fixed": 0,
    "border_white_fixed": 0,
}

def should_exclude(filepath: str) -> bool:
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, str(filepath)):
            return True
    return False

def fix_remaining_issues(content: str) -> tuple[str, int]:
    """Aggressively fix remaining HIGH priority issues"""
    fixes = 0
    
    # Strategy: Process line by line to handle className contexts carefully
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        original_line = line
        
        # Skip imports, comments, and non-className lines
        if (line.strip().startswith('import ') or 
            line.strip().startswith('//') or
            line.strip().startswith('/*') or
            line.strip().startswith('*') or
            'className' not in line):
            fixed_lines.append(line)
            continue
        
        # Fix 1: text-white without dark: variant
        # Look for text-white that's NOT already followed by dark:
        if 'text-white' in line and 'dark:text-white' not in line:
            # Check if it's a standalone text-white (not part of hover:text-white etc)
            # Pattern: text-white followed by space, closing quote, or other class
            pattern = r'\btext-white(?!\s+dark:)(?=\s|"|\'|$)'
            if re.search(pattern, line):
                # Skip if in gradient context
                if 'gradient' not in line.lower() and 'from-' not in line and 'to-' not in line:
                    line = re.sub(pattern, 'text-slate-950 dark:text-white', line)
                    if line != original_line:
                        stats["text_white_fixed"] += 1
                        fixes += 1
        
        # Fix 2: bg-white without dark: variant (but not bg-white/XX which has opacity)
        if 'bg-white' in line and 'dark:bg-white' not in line and 'dark:bg-' not in line:
            # Match bg-white not followed by /digits
            pattern = r'\bbg-white(?!/\d+)(?!\s+dark:)(?=\s|"|\'|$)'
            if re.search(pattern, line):
                line = re.sub(pattern, 'bg-slate-100/90 dark:bg-white/5', line)
                if line != original_line:
                    stats["bg_white_fixed"] += 1
                    fixes += 1
        
        # Fix 3: border-white without dark: variant
        if 'border-white' in line and 'dark:border-white' not in line and 'dark:border-' not in line:
            pattern = r'\bborder-white(?!/\d+)(?!\s+dark:)(?=\s|"|\'|$)'
            if re.search(pattern, line):
                line = re.sub(pattern, 'border-slate-200 dark:border-white/10', line)
                if line != original_line:
                    stats["border_white_fixed"] += 1
                    fixes += 1
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines), fixes

def process_file(filepath: Path) -> bool:
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
        
        fixed, fix_count = fix_remaining_issues(original)
        
        if fixed != original and fix_count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            return True
        
        return False
    except Exception as e:
        print(f"⚠️  Error: {filepath}: {e}")
        return False

def main():
    print("🔧 AGGRESSIVE THEME FIX - ROUND 2")
    print("=" * 80)
    print("Fixing remaining 565 issues:")
    print("  • 449 HIGH: text-white without dark variant")
    print("  • 62 HIGH: border-white without dark variant")
    print("  • 4 HIGH: bg-white without dark variant")
    print("=" * 80)
    print()
    
    # Collect files
    all_files = []
    for scan_dir in SCAN_DIRS:
        target_dir = BASE_DIR / scan_dir
        if target_dir.exists():
            all_files.extend(target_dir.rglob("*.tsx"))
            all_files.extend(target_dir.rglob("*.ts"))
    
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
    print("✅ ROUND 2 COMPLETE!")
    print("=" * 80)
    print()
    print(f"📊 Statistics:")
    print(f"   • Files scanned: {stats['files_scanned']}")
    print(f"   • Files fixed: {stats['files_fixed']}")
    print()
    print(f"🔧 Fixes Applied:")
    print(f"   • text-white → text-slate-950 dark:text-white: {stats['text_white_fixed']}")
    print(f"   • bg-white → bg-slate-100/90 dark:bg-white/5: {stats['bg_white_fixed']}")
    print(f"   • border-white → border-slate-200 dark:border-white/10: {stats['border_white_fixed']}")
    print()
    
    total = stats['text_white_fixed'] + stats['bg_white_fixed'] + stats['border_white_fixed']
    print(f"🎯 Total fixes this round: {total}")
    print()
    
    if fixed_files:
        print(f"📝 Fixed files:")
        for i, path in enumerate(fixed_files[:40], 1):
            print(f"   {i:2d}. {path}")
        
        if len(fixed_files) > 40:
            print(f"   ... and {len(fixed_files) - 40} more")
    
    print()
    print("=" * 80)
    print("✨ Round 2 fixes complete! Run audit again to verify.")
    print("=" * 80)

if __name__ == "__main__":
    main()
