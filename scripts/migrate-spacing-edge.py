#!/usr/bin/env python3
"""Edge case spacing migration"""
from pathlib import Path

EDGE_CASES = {
    'marginTop: 10,': 'marginTop: FRAME_SPACING.section.small,',
    'marginTop: 4': 'marginTop: FRAME_SPACING.section.minimal',
    "padding: '8px 12px',": "padding: FRAME_SPACING.padding.box,",
    'padding: 8,': 'padding: FRAME_SPACING.section.inline,',
    'gap: 4,': 'gap: FRAME_SPACING.section.minimal,',
    'gap: 6 }': 'gap: FRAME_SPACING.section.tight }',
}

route_file = Path(__file__).parent.parent / 'app' / 'api' / 'frame' / 'image' / 'route.tsx'
content = route_file.read_text()
count = 0

for old, new in EDGE_CASES.items():
    occurrences = content.count(old)
    content = content.replace(old, new)
    count += occurrences
    if occurrences > 0:
        print(f"  {old} → {new} ({occurrences}x)")

route_file.write_text(content)
print(f"\n✅ Total: {count} edge case replacements")
