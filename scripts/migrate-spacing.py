#!/usr/bin/env python3
"""
Task 4: Layout Constants Migration
Migrate hardcoded padding/gap/margin to FRAME_SPACING constants

Mappings:
  padding: 14 → FRAME_SPACING.container
  padding: 12 → FRAME_SPACING.section.medium (or use literal 12)
  padding: 10 → FRAME_SPACING.section.small (or use literal 10)
  padding: '12px 20px' → FRAME_SPACING.padding.large
  padding: '8px 16px' → FRAME_SPACING.padding.medium
  padding: '5px 12px' → FRAME_SPACING.padding.small
  padding: '4px 10px' → FRAME_SPACING.padding.minimal
  padding: '10px 12px' → FRAME_SPACING.padding.box
  padding: '8px 10px' → FRAME_SPACING.padding.stat
  
  gap: 16 → FRAME_SPACING.section.large
  gap: 12 → FRAME_SPACING.section.medium
  gap: 10 → FRAME_SPACING.section.small
  gap: 8 → FRAME_SPACING.section.inline
  gap: 6 → FRAME_SPACING.section.tight
  gap: 2 → FRAME_SPACING.section.minimal
  
  marginTop/marginBottom: 12 → FRAME_SPACING.margin.footer/header
  marginBottom: 14 → FRAME_SPACING.margin.section
"""

import re
from pathlib import Path

# Padding mappings (string patterns)
PADDING_STRING_MAPPINGS = {
    "'12px 20px'": "FRAME_SPACING.padding.large",
    "'8px 16px'": "FRAME_SPACING.padding.medium",
    "'5px 12px'": "FRAME_SPACING.padding.small",
    "'4px 10px'": "FRAME_SPACING.padding.minimal",
    "'10px 12px'": "FRAME_SPACING.padding.box",
    "'8px 10px'": "FRAME_SPACING.padding.stat",
}

# Padding mappings (numeric)
PADDING_NUMERIC_MAPPINGS = {
    'padding: 14,': 'padding: FRAME_SPACING.container,',
    'padding: 12,': 'padding: FRAME_SPACING.section.medium,',
    'padding: 10,': 'padding: FRAME_SPACING.section.small,',
}

# Gap mappings
GAP_MAPPINGS = {
    'gap: 16,': 'gap: FRAME_SPACING.section.large,',
    'gap: 12,': 'gap: FRAME_SPACING.section.medium,',
    'gap: 10,': 'gap: FRAME_SPACING.section.small,',
    'gap: 8,': 'gap: FRAME_SPACING.section.inline,',
    'gap: 6,': 'gap: FRAME_SPACING.section.tight,',
    'gap: 2,': 'gap: FRAME_SPACING.section.minimal,',
    'gap: 8 }': 'gap: FRAME_SPACING.section.inline }',
    'gap: 10 }': 'gap: FRAME_SPACING.section.small }',
    'gap: 2 }': 'gap: FRAME_SPACING.section.minimal }',
}

# Margin mappings
MARGIN_MAPPINGS = {
    'marginTop: 12,': 'marginTop: FRAME_SPACING.margin.footer,',
    'marginBottom: 12,': 'marginBottom: FRAME_SPACING.margin.header,',
    'marginBottom: 14,': 'marginBottom: FRAME_SPACING.margin.section,',
    'marginBottom: 8,': 'marginBottom: FRAME_SPACING.section.inline,',
    'marginBottom: 6,': 'marginBottom: FRAME_SPACING.section.tight,',
    'marginBottom: 4,': 'marginBottom: FRAME_SPACING.section.minimal,',
}

def migrate_spacing(file_path: Path) -> tuple[str, dict]:
    """Migrate spacing values to FRAME_SPACING constants"""
    content = file_path.read_text()
    stats = {
        'padding_string': 0,
        'padding_numeric': 0,
        'gap': 0,
        'margin': 0,
    }
    
    # Migrate string padding
    for old, new in PADDING_STRING_MAPPINGS.items():
        count = content.count(f'padding: {old}')
        content = content.replace(f'padding: {old}', f'padding: {new}')
        stats['padding_string'] += count
    
    # Migrate numeric padding
    for old, new in PADDING_NUMERIC_MAPPINGS.items():
        count = content.count(old)
        content = content.replace(old, new)
        stats['padding_numeric'] += count
    
    # Migrate gap
    for old, new in GAP_MAPPINGS.items():
        count = content.count(old)
        content = content.replace(old, new)
        stats['gap'] += count
    
    # Migrate margin
    for old, new in MARGIN_MAPPINGS.items():
        count = content.count(old)
        content = content.replace(old, new)
        stats['margin'] += count
    
    return content, stats

def main():
    route_file = Path(__file__).parent.parent / 'app' / 'api' / 'frame' / 'image' / 'route.tsx'
    
    print("🔄 Starting spacing migration...")
    print(f"📁 File: {route_file}")
    
    # Backup
    backup_file = route_file.with_suffix('.tsx.backup-task4')
    backup_file.write_text(route_file.read_text())
    print(f"💾 Backup: {backup_file.name}")
    
    # Migrate
    new_content, stats = migrate_spacing(route_file)
    route_file.write_text(new_content)
    
    # Report
    total = sum(stats.values())
    print(f"\n✅ Migration complete!")
    print(f"📊 Total replacements: {total}")
    print(f"   - String padding: {stats['padding_string']}")
    print(f"   - Numeric padding: {stats['padding_numeric']}")
    print(f"   - Gap values: {stats['gap']}")
    print(f"   - Margin values: {stats['margin']}")
    
    print(f"\n💡 Next: Run npx tsc --noEmit to verify")

if __name__ == '__main__':
    main()

# Additional edge case mappings
EDGE_CASE_MAPPINGS = {
    'marginTop: 10,': 'marginTop: FRAME_SPACING.section.small,',
    'marginTop: 4': 'marginTop: FRAME_SPACING.section.minimal',
    "padding: '8px 12px',": "padding: FRAME_SPACING.padding.box,",
    'padding: 8,': 'padding: FRAME_SPACING.section.inline,',
    'gap: 4,': 'gap: FRAME_SPACING.section.minimal,',
    'gap: 6 }': 'gap: FRAME_SPACING.section.tight }',
}

print("\n🔄 Applying edge cases...")
content = Path(__file__).parent.parent / 'app' / 'api' / 'frame' / 'image' / 'route.tsx'
text = content.read_text()
edge_count = 0

for old, new in EDGE_CASE_MAPPINGS.items():
    count = text.count(old)
    text = text.replace(old, new)
    edge_count += count

content.write_text(text)
print(f"✅ Edge cases: {edge_count} replacements")
