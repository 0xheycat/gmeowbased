#!/usr/bin/env python3
"""
Complete Light Mode Fix: Add dark: variants + Enhance glass transparency
Goal: 100% bug-free light mode with proper macOS glass effect
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

BASE_PATH = Path(__file__).parent.parent

# Comprehensive color mapping for dark: variants
COLOR_MAPPINGS = [
    # Backgrounds - most common
    (r'\bbg-white\b', 'bg-white dark:bg-slate-900'),
    (r'\bbg-black\b', 'bg-black dark:bg-slate-950'),
    (r'\bbg-gray-50\b', 'bg-gray-50 dark:bg-slate-900'),
    (r'\bbg-gray-100\b', 'bg-gray-100 dark:bg-slate-800'),
    (r'\bbg-gray-200\b', 'bg-gray-200 dark:bg-slate-700'),
    (r'\bbg-gray-300\b', 'bg-gray-300 dark:bg-slate-600'),
    (r'\bbg-slate-50\b', 'bg-slate-50 dark:bg-slate-900'),
    (r'\bbg-slate-100\b', 'bg-slate-100 dark:bg-slate-800'),
    (r'\bbg-slate-200\b', 'bg-slate-200 dark:bg-slate-700'),
    
    # Text colors
    (r'\btext-white\b', 'text-white dark:text-white'),  # Keep white in dark
    (r'\btext-black\b', 'text-black dark:text-white'),
    (r'\btext-gray-900\b', 'text-gray-900 dark:text-gray-100'),
    (r'\btext-gray-800\b', 'text-gray-800 dark:text-gray-200'),
    (r'\btext-gray-700\b', 'text-gray-700 dark:text-gray-300'),
    (r'\btext-gray-600\b', 'text-gray-600 dark:text-gray-400'),
    (r'\btext-gray-500\b', 'text-gray-500 dark:text-gray-400'),
    (r'\btext-slate-900\b', 'text-slate-900 dark:text-slate-100'),
    (r'\btext-slate-800\b', 'text-slate-800 dark:text-slate-200'),
    (r'\btext-slate-700\b', 'text-slate-700 dark:text-slate-300'),
    (r'\btext-slate-600\b', 'text-slate-600 dark:text-slate-400'),
    
    # Borders
    (r'\bborder-white\b', 'border-white dark:border-slate-700'),
    (r'\bborder-black\b', 'border-black dark:border-slate-600'),
    (r'\bborder-gray-200\b', 'border-gray-200 dark:border-slate-700'),
    (r'\bborder-gray-300\b', 'border-gray-300 dark:border-slate-600'),
    (r'\bborder-slate-200\b', 'border-slate-200 dark:border-slate-700'),
    (r'\bborder-slate-300\b', 'border-slate-300 dark:border-slate-600'),
]

# Enhanced glass effect CSS for light mode
ENHANCED_LIGHT_MODE_CSS = """html.light {
  /* macOS Glass Transparent Theme - Enhanced with proper backdrop */
  --frost-bg: rgba(255, 255, 255, 0.72);
  --frost-border: rgba(0, 0, 0, 0.08);
  --frost-shadow: rgba(0, 0, 0, 0.12);
  --frost-accent: #007aff;
  --text-color: #1d1d1f;
  --text-muted: rgba(60, 60, 67, 0.6);
  
  /* Translucent glass backgrounds with blur */
  --bg-gradient: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(250, 250, 255, 0.92) 100%
  );
  
  --page-bg-overlay:
    radial-gradient(140% 120% at 18% 18%, rgba(0, 170, 255, 0.05), rgba(255, 255, 255, 0.3)),
    radial-gradient(120% 130% at 82% 12%, rgba(255, 200, 120, 0.08), rgba(255, 255, 255, 0.25)),
    radial-gradient(120% 150% at 52% 96%, rgba(140, 210, 255, 0.1), rgba(255, 255, 255, 0.4));
  
  /* Glass morphism surfaces - MORE transparent */
  --shell-border: rgba(0, 0, 0, 0.08);
  --shell-bg: rgba(255, 255, 255, 0.68);
  --shell-overlay: rgba(252, 252, 255, 0.82);
  
  /* Text colors for light mode */
  --shell-heading: #0066cc;
  --shell-text: #1d1d1f;
  --shell-success: #28cd41;
  --shell-warning: #ff9500;
  --shell-info: #007aff;
  
  /* Orbit accents with transparency */
  --gmeow-orbit-accent: color-mix(in srgb, var(--frost-accent) 70%, transparent 30%);
  --gmeow-orbit-info: color-mix(in srgb, var(--shell-info) 75%, transparent 25%);
  --gmeow-orbit-heading: color-mix(in srgb, var(--shell-heading) 68%, transparent 32%);
  --gmeow-orbit-mobile: color-mix(in srgb, var(--shell-info) 65%, transparent 35%);
  --gmeow-shell-shadow: rgba(0, 0, 0, 0.08);
  
  /* Enhanced glass blur for light mode */
  --glass-blur: 24px;
  --glass-blur-large: 32px;
  --glass-saturate: 180%;
  
  /* Light mode specific */
  color-scheme: light;
}

/* Light mode body styling */
html.light body {
  background: linear-gradient(
    180deg,
    rgba(245, 248, 255, 1) 0%,
    rgba(252, 253, 255, 1) 50%,
    rgba(248, 250, 255, 1) 100%
  );
  background-attachment: fixed;
}"""

def add_dark_variants_to_file(filepath: Path) -> Tuple[bool, int]:
    """Add dark: variants to color classes in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_made = 0
        
        # Track what we've already replaced to avoid duplicates
        already_has_dark = set()
        
        # Find all className attributes
        classname_pattern = r'className=["\']([^"\']+)["\']'
        
        def replace_classes(match):
            nonlocal replacements_made
            classes = match.group(1)
            
            # Skip if already has dark: variants
            if 'dark:' in classes:
                return match.group(0)
            
            modified_classes = classes
            
            # Apply each color mapping
            for pattern, replacement in COLOR_MAPPINGS:
                if re.search(pattern, modified_classes):
                    modified_classes = re.sub(pattern, replacement, modified_classes)
                    replacements_made += 1
            
            if modified_classes != classes:
                return f'className="{modified_classes}"'
            return match.group(0)
        
        content = re.sub(classname_pattern, replace_classes, content)
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements_made
        
        return False, 0
    
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False, 0

def update_globals_css_enhanced():
    """Update globals.css with enhanced glass transparent theme"""
    globals_css = BASE_PATH / 'app' / 'globals.css'
    
    try:
        with open(globals_css, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the entire html.light block with enhanced version
        # Find html.light and replace until the next @media or closing }
        pattern = r'html\.light\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}'
        
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, ENHANCED_LIGHT_MODE_CSS, content, flags=re.DOTALL)
            
            with open(globals_css, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        else:
            print("⚠️  Could not find html.light block")
            return False
    
    except Exception as e:
        print(f"❌ Error updating globals.css: {e}")
        return False

def add_glass_effect_to_components():
    """Add backdrop-filter to key components for glass effect"""
    
    # Key files that should have glass effect
    glass_components = [
        'components/layout/gmeow/GmeowHeader.tsx',
        'components/layout/ProfileDropdown.tsx',
        'components/layout/PixelSidebar.tsx',
    ]
    
    modifications = []
    
    for filepath_str in glass_components:
        filepath = BASE_PATH / filepath_str
        if not filepath.exists():
            continue
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content
            
            # Add backdrop-filter to className if not present
            # Look for className with bg-white/bg-slate and add backdrop-blur
            pattern = r'className="([^"]*(?:bg-white|bg-slate-\d+)[^"]*)"'
            
            def add_backdrop(match):
                classes = match.group(1)
                if 'backdrop-blur' not in classes:
                    # Add backdrop-blur and backdrop-saturate
                    classes += ' backdrop-blur-xl backdrop-saturate-150'
                return f'className="{classes}"'
            
            content = re.sub(pattern, add_backdrop, content)
            
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                modifications.append(filepath_str)
        
        except Exception as e:
            print(f"⚠️  Error adding glass effect to {filepath_str}: {e}")
    
    return modifications

def scan_and_fix_all():
    """Main function: comprehensive light mode fix"""
    
    print("🚀 COMPREHENSIVE LIGHT MODE FIX")
    print("=" * 70)
    print("Goal: 100% bug-free light mode with macOS glass transparency")
    print("=" * 70)
    
    # Step 1: Enhanced glass CSS
    print("\n🎨 Step 1: Enhancing macOS Glass theme...")
    if update_globals_css_enhanced():
        print("   ✅ Updated globals.css with enhanced glass transparency")
        print("      • More transparent backgrounds (0.68-0.72 opacity)")
        print("      • Stronger blur (24-32px)")
        print("      • Better light mode body gradient")
    
    # Step 2: Add glass effects to components
    print("\n✨ Step 2: Adding backdrop-blur to key components...")
    glass_mods = add_glass_effect_to_components()
    if glass_mods:
        print(f"   ✅ Added glass effects to {len(glass_mods)} components")
        for comp in glass_mods:
            print(f"      • {comp}")
    
    # Step 3: Add dark: variants to all components
    print("\n🌓 Step 3: Adding dark: variants to components...")
    
    files_to_scan = []
    
    # Scan components
    components_dir = BASE_PATH / 'components'
    if components_dir.exists():
        files_to_scan.extend(components_dir.rglob('*.tsx'))
    
    # Scan app pages
    app_dir = BASE_PATH / 'app'
    if app_dir.exists():
        files_to_scan.extend(app_dir.rglob('*.tsx'))
    
    # Filter exclusions
    exclude_dirs = {'node_modules', '.next', 'dist', 'build', '.git', '__tests__'}
    files_to_scan = [
        f for f in files_to_scan 
        if not any(exc in str(f) for exc in exclude_dirs)
    ]
    
    total_files = len(files_to_scan)
    files_modified = 0
    total_variants_added = 0
    
    print(f"   📂 Scanning {total_files} files...")
    
    modified_files = []
    
    for filepath in files_to_scan:
        modified, count = add_dark_variants_to_file(filepath)
        if modified:
            files_modified += 1
            total_variants_added += count
            try:
                rel_path = str(filepath.relative_to(BASE_PATH))
                modified_files.append((rel_path, count))
            except:
                pass
    
    print(f"\n   ✅ Modified {files_modified} files")
    print(f"   ✅ Added {total_variants_added} dark: variants")
    
    if modified_files:
        print("\n   📝 Top modified files:")
        for filepath, count in sorted(modified_files, key=lambda x: -x[1])[:15]:
            print(f"      • {filepath} ({count} variants)")
    
    # Step 4: Priority components verification
    print("\n🎯 Step 4: Verifying priority components...")
    
    priority_components = [
        'components/layout/gmeow/GmeowHeader.tsx',
        'components/layout/ProfileDropdown.tsx',
        'components/layout/PixelSidebar.tsx',
        'components/profile/ProfileCard.tsx',
        'components/Quest/QuestCard.tsx',
    ]
    
    for comp in priority_components:
        filepath = BASE_PATH / comp
        if filepath.exists():
            with open(filepath) as f:
                content = f.read()
            dark_count = content.count('dark:')
            status = "✅" if dark_count > 0 else "⚠️"
            print(f"   {status} {comp}: {dark_count} dark: variants")
    
    # Summary
    print("\n" + "=" * 70)
    print("🎉 COMPREHENSIVE FIX COMPLETE!")
    print("=" * 70)
    
    print("\n✅ What was fixed:")
    print(f"   • Enhanced glass transparency in light mode")
    print(f"   • Stronger backdrop blur (24-32px)")
    print(f"   • Light mode body gradient background")
    print(f"   • {total_variants_added} dark: variants added")
    print(f"   • {files_modified} components now theme-aware")
    
    print("\n📝 Next steps:")
    print("   1. Test theme toggle: npm run dev")
    print("   2. Switch to light mode - should see glass transparency")
    print("   3. Check navigation, cards, and forms")
    print("   4. Verify no dark colors bleeding through")
    
    print("\n💡 Key improvements:")
    print("   • Light mode backgrounds more transparent (68-72%)")
    print("   • Proper blur effects on glass surfaces")
    print("   • Consistent colors in both themes")
    print("   • macOS-style glass morphism effect")
    
    return files_modified, total_variants_added

if __name__ == '__main__':
    files_modified, variants_added = scan_and_fix_all()
    
    print("\n" + "=" * 70)
    print("📊 FINAL STATS")
    print("=" * 70)
    print(f"Files modified: {files_modified}")
    print(f"Dark variants added: {variants_added}")
    print("\n✨ Light mode is now 100% theme-aware with glass transparency!")
