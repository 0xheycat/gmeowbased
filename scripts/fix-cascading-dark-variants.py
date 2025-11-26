#!/usr/bin/env python3
"""
Critical Fix: Remove cascading duplicate dark: variants
These make text completely unreadable in both modes
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SCAN_DIRS = ["components", "app"]
EXCLUDE_PATTERNS = [r'/frames?/', r'\.frame\.', r'/api/frames']

stats = {
    "files_scanned": 0,
    "files_fixed": 0,
    "cascading_fixed": 0,
}

def should_exclude(filepath: str) -> bool:
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, str(filepath)):
            return True
    return False

def clean_cascading_dark_variants(content: str) -> tuple[str, int]:
    """Remove cascading dark: variants - keep only the LAST one"""
    fixes = 0
    
    # Pattern 1: Multiple dark:text-XXX in sequence
    # Match: dark:text-XXX dark:text-YYY dark:text-ZZZ
    # Keep only: dark:text-ZZZ (the last one)
    pattern1 = r'(dark:text-[\w/-]+\s+)+(dark:text-[\w/-]+)'
    def keep_last_text(match):
        # Extract all dark:text variants
        full_match = match.group(0)
        parts = re.findall(r'dark:text-[\w/-]+', full_match)
        if len(parts) > 1:
            nonlocal fixes
            fixes += 1
            return parts[-1]  # Keep only the last one
        return full_match
    
    content = re.sub(pattern1, keep_last_text, content)
    
    # Pattern 2: Multiple dark:bg-XXX in sequence
    pattern2 = r'(dark:bg-[\w/-]+\s+)+(dark:bg-[\w/-]+)'
    def keep_last_bg(match):
        full_match = match.group(0)
        parts = re.findall(r'dark:bg-[\w/-]+', full_match)
        if len(parts) > 1:
            nonlocal fixes
            fixes += 1
            return parts[-1]
        return full_match
    
    content = re.sub(pattern2, keep_last_bg, content)
    
    # Pattern 3: Multiple dark:border-XXX in sequence
    pattern3 = r'(dark:border-[\w/-]+\s+)+(dark:border-[\w/-]+)'
    def keep_last_border(match):
        full_match = match.group(0)
        parts = re.findall(r'dark:border-[\w/-]+', full_match)
        if len(parts) > 1:
            nonlocal fixes
            fixes += 1
            return parts[-1]
        return full_match
    
    content = re.sub(pattern3, keep_last_border, content)
    
    # Pattern 4: Multiple dark:hover:XXX in sequence
    pattern4 = r'(dark:hover:text-[\w/-]+\s+)+(dark:hover:text-[\w/-]+)'
    def keep_last_hover(match):
        full_match = match.group(0)
        parts = re.findall(r'dark:hover:text-[\w/-]+', full_match)
        if len(parts) > 1:
            nonlocal fixes
            fixes += 1
            return parts[-1]
        return full_match
    
    content = re.sub(pattern4, keep_last_hover, content)
    
    return content, fixes

def process_file(filepath: Path) -> bool:
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
        
        fixed, fix_count = clean_cascading_dark_variants(original)
        
        if fixed != original and fix_count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            stats["cascading_fixed"] += fix_count
            return True
        
        return False
    except Exception as e:
        print(f"⚠️  Error: {filepath}: {e}")
        return False

def main():
    print("🚨 CRITICAL FIX: Remove Cascading Dark Variants")
    print("=" * 80)
    print("Fixing duplicate dark: variants that make text unreadable")
    print("Example: dark:text-slate-900 dark:text-slate-950 dark:text-white")
    print("         → dark:text-white (keep last)")
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
    print("✅ CASCADING VARIANTS CLEANED!")
    print("=" * 80)
    print()
    print(f"📊 Statistics:")
    print(f"   • Files scanned: {stats['files_scanned']}")
    print(f"   • Files fixed: {stats['files_fixed']}")
    print(f"   • Cascading variants removed: {stats['cascading_fixed']}")
    print()
    
    if fixed_files:
        print(f"📝 Fixed files:")
        for i, path in enumerate(fixed_files[:50], 1):
            print(f"   {i:2d}. {path}")
        
        if len(fixed_files) > 50:
            print(f"   ... and {len(fixed_files) - 50} more")
    
    print()
    print("=" * 80)
    print("✨ Text should now be readable in both light and dark modes!")
    print("=" * 80)

if __name__ == "__main__":
    main()
