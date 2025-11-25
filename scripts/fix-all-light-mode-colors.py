#!/usr/bin/env python3
"""
Complete light mode color fix: Replace all inverted color patterns
PATTERN: bg-white (light mode) → bg-slate-900/5 (light glass)
PATTERN: text-white (light mode) → text-slate-900 (light text)
"""

import re
from pathlib import Path

BASE_PATH = Path(__file__).parent.parent

# Patterns to fix:
# 1. border-white dark:border-X → border-slate-900/10 dark:border-white/10
# 2. bg-white dark:bg-X → bg-slate-50/90 dark:bg-slate-900/90 (for cards)
# 3. bg-white dark:bg-X → bg-slate-900/5 dark:bg-white/5 (for small elements)
# 4. text-white dark:text-X → text-slate-900 dark:text-white
# 5. hover:bg-white dark:bg-X → hover:bg-slate-900/10 dark:hover:bg-white/10

def fix_profile_dropdown():
    """Fix ProfileDropdown.tsx comprehensively"""
    filepath = BASE_PATH / 'components/layout/ProfileDropdown.tsx'
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix ALL border-white patterns
    content = re.sub(
        r'border-white dark:border-slate-700/10',
        'border-slate-900/10 dark:border-white/10',
        content
    )
    
    # Fix ALL bg-white patterns for small elements (buttons, badges)
    content = re.sub(
        r'bg-white dark:bg-slate-900/5\b',
        'bg-slate-900/5 dark:bg-white/5',
        content
    )
    
    # Fix bg-white patterns for larger cards
    content = re.sub(
        r'bg-white dark:bg-slate-900/10\b',
        'bg-slate-50/90 dark:bg-slate-900/90',
        content
    )
    
    # Fix ALL text-white to be dark in light mode (except for hover states on accent colors)
    # But be careful not to change text-white when it's truly meant to be white always
    content = re.sub(
        r'text-white dark:text-white/(\d+)',
        r'text-slate-900 dark:text-white/\1',
        content
    )
    
    content = re.sub(
        r'text-white dark:text-white\b',
        'text-slate-900 dark:text-white',
        content
    )
    
    # Fix standalone text-white (be selective - keep in hover states)
    content = re.sub(
        r'(\bfont-[a-z]+) text-white(?! dark:)(?!\))',
        r'\1 text-slate-900 dark:text-white',
        content
    )
    
    # Fix hover:bg-white patterns
    content = re.sub(
        r'hover:bg-white dark:bg-slate-900/10',
        'hover:bg-slate-900/10 dark:hover:bg-white/10',
        content
    )
    
    # Fix hover:text-white patterns (keep white on accent hovers)
    content = re.sub(
        r'hover:text-white dark:text-white\b',
        'hover:text-slate-900 dark:hover:text-white',
        content
    )
    
    # Fix bg-dark-bg/95 to use proper light mode background
    content = re.sub(
        r'bg-dark-bg/95\b',
        'bg-slate-50/95 dark:bg-slate-900/95',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    return filepath

def fix_gmeow_header():
    """Fix GmeowHeader.tsx"""
    filepath = BASE_PATH / 'components/layout/gmeow/GmeowHeader.tsx'
    
    if not filepath.exists():
        return None
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix backgrounds
    content = re.sub(
        r'bg-dark-bg/90\b',
        'bg-slate-50/90 dark:bg-slate-900/90',
        content
    )
    
    # Fix borders
    content = re.sub(
        r'border-white/10\b(?! dark:)',
        'border-slate-900/10 dark:border-white/10',
        content
    )
    
    # Fix text colors
    content = re.sub(
        r'text-white/(\d+)(?! dark:)',
        r'text-slate-900/\1 dark:text-white/\1',
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return filepath
    
    return None

def fix_quest_card():
    """Fix QuestCard.tsx"""
    filepath = BASE_PATH / 'components/Quest/QuestCard.tsx'
    
    if not filepath.exists():
        return None
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Add dark: variants to common colors
    replacements = [
        (r'\bbg-white\b(?! dark:)', 'bg-white dark:bg-slate-900'),
        (r'\btext-black\b(?! dark:)', 'text-black dark:text-white'),
        (r'\btext-gray-900\b(?! dark:)', 'text-gray-900 dark:text-gray-100'),
        (r'\btext-gray-600\b(?! dark:)', 'text-gray-600 dark:text-gray-400'),
        (r'\bborder-gray-200\b(?! dark:)', 'border-gray-200 dark:border-slate-700'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return filepath
    
    return None

def main():
    print("🎨 Fixing ALL Light Mode Color Issues")
    print("=" * 70)
    
    fixed_files = []
    
    print("\n1️⃣  Fixing ProfileDropdown.tsx...")
    file1 = fix_profile_dropdown()
    if file1:
        fixed_files.append(str(file1.relative_to(BASE_PATH)))
        print(f"   ✅ Fixed: {file1.relative_to(BASE_PATH)}")
    
    print("\n2️⃣  Fixing GmeowHeader.tsx...")
    file2 = fix_gmeow_header()
    if file2:
        fixed_files.append(str(file2.relative_to(BASE_PATH)))
        print(f"   ✅ Fixed: {file2.relative_to(BASE_PATH)}")
    else:
        print("   ⚠️  No changes needed or file not found")
    
    print("\n3️⃣  Fixing QuestCard.tsx...")
    file3 = fix_quest_card()
    if file3:
        fixed_files.append(str(file3.relative_to(BASE_PATH)))
        print(f"   ✅ Fixed: {file3.relative_to(BASE_PATH)}")
    else:
        print("   ⚠️  No changes needed or file not found")
    
    print("\n" + "=" * 70)
    print(f"✅ Fixed {len(fixed_files)} files:")
    for f in fixed_files:
        print(f"   • {f}")
    
    print("\n💡 Key changes:")
    print("   • Light mode: Dark text on glass transparent backgrounds")
    print("   • Dark mode: White text on dark backgrounds")
    print("   • Borders: Subtle dark in light mode, subtle light in dark mode")
    print("   • Glass effect: backdrop-blur + translucent backgrounds")
    
    print("\n📝 Next: Test with `npm run dev` and toggle theme")

if __name__ == '__main__':
    main()
