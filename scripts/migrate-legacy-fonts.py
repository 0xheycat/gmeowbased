#!/usr/bin/env python3
"""
Task 3 Phase 2: Migrate FRAME_FONTS (legacy) to FRAME_FONTS_V2

Legacy → V2 Mapping:
  FRAME_FONTS.identity (20) → FRAME_FONTS_V2.h3 (20)
  FRAME_FONTS.title (18) → FRAME_FONTS_V2.h2 (24) or h3 (20) - context dependent
  FRAME_FONTS.subtitle (16) → FRAME_FONTS_V2.body (14) or h3 (20) - context dependent
  FRAME_FONTS.body (14) → FRAME_FONTS_V2.body (14)
  FRAME_FONTS.label (12) → FRAME_FONTS_V2.label (12)
  FRAME_FONTS.caption (10) → FRAME_FONTS_V2.caption (10)
  FRAME_FONTS.micro (9) → FRAME_FONTS_V2.micro (9)
"""

import re
from pathlib import Path

# Direct mappings (same size)
DIRECT_MAPPINGS = {
    'FRAME_FONTS.identity': 'FRAME_FONTS_V2.h3',  # 20 → 20
    'FRAME_FONTS.body': 'FRAME_FONTS_V2.body',    # 14 → 14
    'FRAME_FONTS.label': 'FRAME_FONTS_V2.label',  # 12 → 12
    'FRAME_FONTS.caption': 'FRAME_FONTS_V2.caption',  # 10 → 10
    'FRAME_FONTS.micro': 'FRAME_FONTS_V2.micro',  # 9 → 9
}

# Context-dependent mappings (need analysis)
# FRAME_FONTS.title (18) could be h2(24) or h3(20)
# FRAME_FONTS.subtitle (16) could be body(14) or h3(20)

def migrate_legacy_fonts(file_path: Path) -> tuple[str, int]:
    """Migrate FRAME_FONTS to FRAME_FONTS_V2"""
    content = file_path.read_text()
    replacements = 0
    
    # Apply direct mappings
    for old, new in DIRECT_MAPPINGS.items():
        old_pattern = re.escape(old)
        count = len(re.findall(old_pattern, content))
        content = re.sub(old_pattern, new, content)
        replacements += count
    
    return content, replacements

def main():
    route_file = Path(__file__).parent.parent / 'app' / 'api' / 'frame' / 'image' / 'route.tsx'
    
    print("🔄 Migrating FRAME_FONTS → FRAME_FONTS_V2...")
    
    # Backup
    backup_file = route_file.with_suffix('.tsx.backup-task3-legacy')
    backup_file.write_text(route_file.read_text())
    print(f"💾 Backup: {backup_file.name}")
    
    # Migrate
    new_content, replacements = migrate_legacy_fonts(route_file)
    route_file.write_text(new_content)
    
    print(f"✅ Complete! {replacements} replacements")
    print("\n⚠️  Manual review needed for:")
    print("   - FRAME_FONTS.title (18px) → choose h2(24) or h3(20)")
    print("   - FRAME_FONTS.subtitle (16px) → choose body(14) or h3(20)")

if __name__ == '__main__':
    main()
