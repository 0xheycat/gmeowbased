#!/usr/bin/env python3
"""
Task 3: Semantic Font Scale Migration
Migrate hardcoded fontSize to FRAME_FONTS_V2 semantic tokens

Mapping:
  32px → FRAME_FONTS_V2.display
  28px → FRAME_FONTS_V2.h1
  24px → FRAME_FONTS_V2.h2
  20px → FRAME_FONTS_V2.h3
  18px → FRAME_FONTS_V2.h2 (or h3 depending on context)
  16px → FRAME_FONTS_V2.body or h3 (context dependent)
  14px → FRAME_FONTS_V2.body
  12px → FRAME_FONTS_V2.label
  11px → FRAME_FONTS_V2.caption (or label)
  10px → FRAME_FONTS_V2.caption
  9px → FRAME_FONTS_V2.micro
  
Icon sizes (60px, 70px, 80px, 100px) stay hardcoded
"""

import re
import sys
from pathlib import Path

# Font size mappings with context awareness
FONT_MAPPINGS = {
    # Clear mappings
    '32': 'FRAME_FONTS_V2.display',
    '28': 'FRAME_FONTS_V2.h1',
    '24': 'FRAME_FONTS_V2.h2',
    '20': 'FRAME_FONTS_V2.h3',
    '14': 'FRAME_FONTS_V2.body',
    '12': 'FRAME_FONTS_V2.label',
    '10': 'FRAME_FONTS_V2.caption',
    '9': 'FRAME_FONTS_V2.micro',
    
    # Context-dependent (need manual review)
    '18': 'FRAME_FONTS_V2.h2',  # Could be h2 or h3
    '16': 'FRAME_FONTS_V2.body',  # Could be body or h3
    '11': 'FRAME_FONTS_V2.caption',  # Could be caption or label
    
    # Icon sizes - SKIP (keep hardcoded)
    # '60', '70', '80', '100'
}

SKIP_SIZES = {'60', '70', '80', '100', '180', '200'}

def is_icon_context(line: str) -> bool:
    """Check if fontSize is for an icon/emoji"""
    icon_markers = ['emoji', 'icon', '🔥', '☀️', '👑', '⚡', '🎯', '💯', '📊', '✅', '🎯', '💰', '🏆']
    return any(marker in line for marker in icon_markers)

def migrate_font_sizes(file_path: Path) -> tuple[str, int, list[str]]:
    """
    Migrate fontSize from hardcoded numbers to FRAME_FONTS_V2
    Returns: (new_content, replacements_count, skipped_list)
    """
    content = file_path.read_text()
    lines = content.split('\n')
    replacements = 0
    skipped = []
    
    # Pattern: fontSize: 12, or fontSize: 12 }
    pattern = re.compile(r'fontSize:\s*(\d+)([,\s\}])')
    
    new_lines = []
    for i, line in enumerate(lines):
        matches = pattern.findall(line)
        if matches:
            new_line = line
            for size, suffix in matches:
                # Skip icon sizes
                if size in SKIP_SIZES:
                    skipped.append(f"Line {i+1}: fontSize {size} (icon size)")
                    continue
                
                # Skip if in icon context
                if is_icon_context(line):
                    skipped.append(f"Line {i+1}: fontSize {size} (icon context)")
                    continue
                
                # Apply mapping
                if size in FONT_MAPPINGS:
                    old_pattern = f'fontSize: {size}{suffix}'
                    new_pattern = f'fontSize: {FONT_MAPPINGS[size]}{suffix}'
                    new_line = new_line.replace(old_pattern, new_pattern)
                    replacements += 1
                else:
                    skipped.append(f"Line {i+1}: fontSize {size} (no mapping)")
            
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    
    return '\n'.join(new_lines), replacements, skipped

def main():
    # File to migrate
    route_file = Path(__file__).parent.parent / 'app' / 'api' / 'frame' / 'image' / 'route.tsx'
    
    if not route_file.exists():
        print(f"❌ Error: {route_file} not found")
        sys.exit(1)
    
    print("🔄 Starting semantic font migration...")
    print(f"📁 File: {route_file}")
    
    # Backup original
    backup_file = route_file.with_suffix('.tsx.backup-task3')
    backup_file.write_text(route_file.read_text())
    print(f"💾 Backup created: {backup_file}")
    
    # Migrate
    new_content, replacements, skipped = migrate_font_sizes(route_file)
    
    # Write result
    route_file.write_text(new_content)
    
    # Report
    print(f"\n✅ Migration complete!")
    print(f"📊 Replacements: {replacements}")
    print(f"⏭️  Skipped: {len(skipped)}")
    
    if skipped:
        print("\n⚠️  Skipped items (manual review recommended):")
        for item in skipped[:10]:  # Show first 10
            print(f"   {item}")
        if len(skipped) > 10:
            print(f"   ... and {len(skipped) - 10} more")
    
    print(f"\n💡 Next steps:")
    print(f"   1. Run: npx tsc --noEmit to check for errors")
    print(f"   2. Review skipped items above")
    print(f"   3. Test frames on localhost")

if __name__ == '__main__':
    main()
