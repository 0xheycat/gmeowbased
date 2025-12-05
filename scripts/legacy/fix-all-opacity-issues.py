#!/usr/bin/env python3
"""
Fix All Opacity Issues - Automated Mass Replace
Date: 2025-11-23
Purpose: Replace all opacity values with explicit rgba colors in frame rendering code
"""

import re
import sys
from pathlib import Path

# File to fix
FILE_PATH = "app/api/frame/image/route.tsx"

# Patterns to fix (line numbers from audit)
# Format: (line_approx, pattern_to_find, replacement, description)
FIXES = [
    # GM Frame (3 fixes) - Lines 545, 563, 600
    {
        "line": 545,
        "find": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>30+ day streak!</span>',
        "replace": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: \'rgba(255, 255, 255, 0.7)\' }}>30+ day streak!</span>',
        "desc": "GM: Legendary badge text"
    },
    {
        "line": 563,
        "find": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>{30 - parseInt(streak)} to Legend</span>',
        "replace": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: \'rgba(255, 255, 255, 0.7)\' }}>{30 - parseInt(streak)} to Legend</span>',
        "desc": "GM: Week Warrior text"
    },
    {
        "line": 600,
        "find": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>100+ GMs!</span>',
        "replace": 'style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: \'rgba(255, 255, 255, 0.7)\' }}>100+ GMs!</span>',
        "desc": "GM: Century Club text"
    },
    
    # Guild Frame (2 fixes) - Lines 883, 892
    {
        "line": 883,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>MEMBERS:</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>MEMBERS:</span>',
        "desc": "Guild: MEMBERS label"
    },
    {
        "line": 892,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{level}</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.9)\' }}>{level}</span>',
        "desc": "Guild: Level value"
    },
    
    # Quest Frame (4 fixes) - Lines 1156, 1162, 1441, 1467
    {
        "line": 1156,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>STATUS:</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>STATUS:</span>',
        "desc": "Quest: STATUS label"
    },
    {
        "line": 1162,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>#{questId}</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.9)\' }}>#{questId}</span>',
        "desc": "Quest: Quest ID"
    },
    {
        "line": 1441,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.9 }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.9)\' }}>',
        "desc": "Quest: Dates display"
    },
    {
        "line": 1467,
        "find": 'style={{ display: \'flex\', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{expires}</div>',
        "replace": 'style={{ display: \'flex\', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.9)\' }}>{expires}</div>',
        "desc": "Quest: Expires value"
    },
    
    # Leaderboard Frame (3 fixes) - Lines 2086, 2090, 2093
    {
        "line": 2086,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>SEASON:</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>SEASON:</span>',
        "desc": "Leaderboard: SEASON label"
    },
    {
        "line": 2090,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>SHOWING:</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>SHOWING:</span>',
        "desc": "Leaderboard: SHOWING label"
    },
    {
        "line": 2093,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7, marginTop: FRAME_SPACING.section.minimal }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: \'rgba(255, 255, 255, 0.7)\', marginTop: FRAME_SPACING.section.minimal }}>',
        "desc": "Leaderboard: Description text"
    },
    
    # Badge Collection Frame (3 fixes) - Lines 2452, 2484, 2515
    # NOTE: Line 2360 (placeholder emoji opacity: 0.3) is intentional, skip it
    {
        "line": 2452,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>',
        "desc": "Badge Collection: Badge count text"
    },
    {
        "line": 2484,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>',
        "desc": "Badge Collection: Eligible count text"
    },
    {
        "line": 2515,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.8, textAlign: \'center\' }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.8)\', textAlign: \'center\' }}>',
        "desc": "Badge Collection: Empty state text"
    },
    
    # Profile Frame (4 fixes) - Lines 2804, 2836, 2891, 2914
    {
        "line": 2804,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>',
        "desc": "Profile: Stats label 1"
    },
    {
        "line": 2836,
        "find": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>',
        "replace": 'style={{ display: \'flex\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>',
        "desc": "Profile: Stats label 2"
    },
    {
        "line": 2891,
        "find": 'style={{ display: \'flex\', justifyContent: \'space-between\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.7 }}>',
        "replace": 'style={{ display: \'flex\', justifyContent: \'space-between\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.7)\' }}>',
        "desc": "Profile: Stats detail 1"
    },
    {
        "line": 2914,
        "find": 'style={{ display: \'flex\', justifyContent: \'space-between\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.8 }}>',
        "replace": 'style={{ display: \'flex\', justifyContent: \'space-between\', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.8)\' }}>',
        "desc": "Profile: Stats detail 2"
    },
    
    # Agent Frame (3 fixes) - Lines 3487, 3494, 3500
    {
        "line": 3487,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>TXS:</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: \'rgba(255, 255, 255, 0.7)\' }}>TXS:</span>',
        "desc": "Agent: TXS label"
    },
    {
        "line": 3494,
        "find": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{volume}</span>',
        "replace": 'style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: \'rgba(255, 255, 255, 0.9)\' }}>{volume}</span>',
        "desc": "Agent: Volume value"
    },
    {
        "line": 3500,
        "find": "style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{balance_val !== '—' ? balance_val : age}</span>",
        "replace": "style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.9)' }}>{balance_val !== '—' ? balance_val : age}</span>",
        "desc": "Agent: Balance/Age value"
    },
]

def main():
    file_path = Path(FILE_PATH)
    
    if not file_path.exists():
        print(f"❌ Error: File not found: {file_path}")
        return 1
    
    # Read file
    print(f"📖 Reading: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes_applied = 0
    fixes_failed = []
    
    # Apply fixes
    print(f"\n🔧 Applying {len(FIXES)} fixes...\n")
    
    for i, fix in enumerate(FIXES, 1):
        print(f"[{i}/{len(FIXES)}] Line ~{fix['line']}: {fix['desc']}")
        
        if fix['find'] in content:
            content = content.replace(fix['find'], fix['replace'], 1)
            fixes_applied += 1
            print(f"  ✅ Applied")
        else:
            fixes_failed.append((i, fix))
            print(f"  ⚠️  Pattern not found (might be already fixed)")
    
    # Write back
    if fixes_applied > 0:
        print(f"\n💾 Writing changes to {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ File updated successfully!")
    else:
        print(f"\n⚠️  No changes made")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Total fixes attempted: {len(FIXES)}")
    print(f"Successfully applied:  {fixes_applied}")
    print(f"Already fixed/skipped: {len(fixes_failed)}")
    
    if fixes_failed:
        print(f"\n⚠️  Patterns not found (may need manual check):")
        for idx, fix in fixes_failed:
            print(f"  [{idx}] Line {fix['line']}: {fix['desc']}")
    
    print(f"\n{'='*60}")
    print(f"✨ Phase 1 Complete!")
    print(f"{'='*60}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
