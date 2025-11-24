#!/usr/bin/env python3
"""
Fix Badge Collection & Badge Share Issues - Fast Patch v2

ISSUES TO FIX:
1. Badge Collection - Duplicate "Badge Collection" text (header + stats section)
2. Badge Collection - Overflow: badge names too small, need logic for >6 badges  
3. Badge Share - Old hardcoded fonts (line 304: fontSize: 80)

SOLUTIONS:
1. Remove duplicate title from stats section (keep header only)
2. Implement smart sizing logic: 
   - 1-6 badges: larger (70x90 cards with FRAME_FONTS_V2.micro names)
   - 7-12 badges: medium (60x80 cards with FRAME_FONTS_V2.micro names)
   - 13-18 badges: compact (50x70 cards, hide names to prevent overflow)
3. Replace fontSize: 80 with FRAME_FONTS_V2.h1 for tier letters
"""

import re

def fix_badge_collection_duplicate_title():
    """Remove duplicate 'Badge Collection' title from stats section"""
    file_path = 'app/api/frame/image/route.tsx'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and remove the title div inside stats section
    # The title appears after user info box and before stats grid
    pattern = r'(\{/\* Stats section \*/\}\s+<div\s+style=\{\{\s+flex: 1,\s+display: \'flex\',\s+flexDirection: \'column\',\s+gap: FRAME_SPACING\.section\.small,\s+\}\}\s+>\s+\{/\* Title \*/\}\s+<div\s+style=\{\{[^}]+\}\}\s+>\s+Badge Collection\s+</div>\s+)'
    
    # Simpler: just remove the Title div that says "Badge Collection"
    old_str = """                  {/* Title */}
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h2,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(badgePalette.start),
                    }}
                  >
                    Badge Collection
                  </div>

                  {/* Stats grid */}"""
    
    new_str = """                  {/* Stats grid */}"""
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Removed duplicate 'Badge Collection' title from stats section")
        return True
    else:
        print("⚠️ Could not find duplicate title pattern")
        return False


def fix_badge_collection_overflow_logic():
    """Add smart sizing logic for badge cards based on count"""
    file_path = 'app/api/frame/image/route.tsx'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the badge mapping section and add size logic
    old_badge_map = """                  {badgeIds.length > 0 ? (
                    // Show earned badges with images and names
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                      }}
                    >
                      {badgeIds.map((badgeId, i) => {
                        const badge = badgeRegistry[badgeId]
                        const tierColor = badge ? tierColors[badge.tier] : tierColors.common
                        
                        return (
                          <div
                            key={badgeId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: 70,
                              padding: 4,
                              border: `2px solid ${tierColor}`,
                              borderRadius: 8,
                              background: 'rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {badgeImages[i] && (
                              <img
                                src={badgeImages[i]}
                                alt={badge?.name || 'Badge'}
                                width="70"
                                height="70"
                                style={{
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <div
                              style={{
                                fontSize: FRAME_FONTS_V2.micro,
                                fontWeight: 600,
                                color: SHARED_COLORS.white,
                                textAlign: 'center',
                                marginTop: 4,
                                maxWidth: 70,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {badge?.name || 'Unknown'}
                            </div>
                          </div>
                        )
                      })}
                    </div>"""
    
    new_badge_map = """                  {badgeIds.length > 0 ? (
                    // Show earned badges with smart sizing based on count
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: badgeIds.length <= 6 ? 8 : badgeIds.length <= 12 ? 6 : 4,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                      }}
                    >
                      {badgeIds.map((badgeId, i) => {
                        const badge = badgeRegistry[badgeId]
                        const tierColor = badge ? tierColors[badge.tier] : tierColors.common
                        
                        // Smart sizing: 1-6=70px, 7-12=60px, 13-18=50px
                        const cardSize = badgeIds.length <= 6 ? 70 : badgeIds.length <= 12 ? 60 : 50
                        const showName = badgeIds.length <= 12 // Hide names for 13+ to prevent overflow
                        
                        return (
                          <div
                            key={badgeId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: cardSize,
                              padding: showName ? 4 : 2,
                              border: `2px solid ${tierColor}`,
                              borderRadius: 8,
                              background: 'rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {badgeImages[i] && (
                              <img
                                src={badgeImages[i]}
                                alt={badge?.name || 'Badge'}
                                width={cardSize.toString()}
                                height={cardSize.toString()}
                                style={{
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            {showName && (
                              <div
                                style={{
                                  fontSize: FRAME_FONTS_V2.micro,
                                  fontWeight: 600,
                                  color: SHARED_COLORS.white,
                                  textAlign: 'center',
                                  marginTop: 2,
                                  maxWidth: cardSize,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {badge?.name || 'Unknown'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>"""
    
    if old_badge_map in content:
        content = content.replace(old_badge_map, new_badge_map)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Added smart overflow logic: 1-6=70px, 7-12=60px, 13-18=50px (no names)")
        return True
    else:
        print("⚠️ Could not find badge map pattern")
        return False


def fix_badge_share_tier_font():
    """Replace hardcoded fontSize: 80 with FRAME_FONTS_V2 token for tier letters"""
    file_path = 'app/api/frame/badgeShare/image/route.tsx'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Line 304: Tier letter fallback
    old_tier = """                  ) : (
                    <div style={{
                      display: 'flex',
                      fontSize: 80,
                      fontWeight: 900,
                      color: '#ffffff',
                    }}>
                      {badge.tier === 'legendary' ? 'L' :
                       badge.tier === 'epic' ? 'E' :
                       badge.tier === 'rare' ? 'R' : 'C'}
                    </div>
                  )}"""
    
    new_tier = """                  ) : (
                    <div style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      color: '#ffffff',
                    }}>
                      {badge.tier === 'legendary' ? 'L' :
                       badge.tier === 'epic' ? 'E' :
                       badge.tier === 'rare' ? 'R' : 'C'}
                    </div>
                  )}"""
    
    if old_tier in content:
        content = content.replace(old_tier, new_tier)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Replaced tier letter fontSize: 80 → FRAME_FONTS_V2.h1")
        return True
    else:
        print("⚠️ Could not find tier font pattern")
        return False


if __name__ == '__main__':
    print("🔧 Badge Issues Fast Patch v2")
    print("=" * 50)
    
    success_count = 0
    
    # Fix 1: Remove duplicate title
    print("\n1️⃣ Removing duplicate 'Badge Collection' title...")
    if fix_badge_collection_duplicate_title():
        success_count += 1
    
    # Fix 2: Add overflow logic
    print("\n2️⃣ Adding smart overflow logic...")
    if fix_badge_collection_overflow_logic():
        success_count += 1
    
    # Fix 3: Fix badge share font
    print("\n3️⃣ Fixing badge share tier font...")
    if fix_badge_share_tier_font():
        success_count += 1
    
    print("\n" + "=" * 50)
    print(f"✅ Completed: {success_count}/3 fixes applied")
    print("\n🧪 Next: Test with screenshots (1, 6, 9, 12, 15, 18 badges)")
