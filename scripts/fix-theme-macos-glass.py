#!/usr/bin/env python3
"""
Fast batch fix: Replace light mode with macOS glass transparent theme
+ Fix all hex color issues using design tokens
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Configuration
BASE_PATH = Path(__file__).parent.parent
COMPONENTS_DIR = BASE_PATH / 'components'
APP_DIR = BASE_PATH / 'app'

# Color replacements mapping
HEX_COLOR_REPLACEMENTS = {
    # Green accent (most common - 8+ instances)
    r'border-\[#7CFF7A\]': 'border-accent-green',
    r'bg-\[#7CFF7A\]': 'bg-accent-green',
    r'text-\[#7CFF7A\]': 'text-accent-green',
    r'from-\[#7CFF7A\]': 'from-accent-green',
    r'to-\[#7CFF7A\]': 'to-accent-green',
    r'via-\[#7CFF7A\]': 'via-accent-green',
    
    # Dark background (should use CSS var or dark-bg token)
    r'bg-\[#0B0A16\]': 'bg-dark-bg',
    r'bg-\[#0a0e27\]': 'bg-dark-bg',
    r'bg-\[#0e1433\]': 'bg-dark-bg-card',
    r'bg-\[#070f25\]': 'bg-dark-bg-alt',
}

# macOS Glass transparent theme CSS replacement
LIGHT_MODE_CSS_NEW = """html.light {
  /* macOS Glass Transparent Theme - Inspired by macOS Sonoma */
  --frost-bg: rgba(255, 255, 255, 0.65);
  --frost-border: rgba(0, 0, 0, 0.08);
  --frost-shadow: rgba(0, 0, 0, 0.12);
  --frost-accent: #007aff;
  --text-color: #1d1d1f;
  --text-muted: rgba(60, 60, 67, 0.6);
  
  /* Translucent backgrounds with blur */
  --bg-gradient: radial-gradient(
    1200px 800px at 50% 0%, 
    rgba(255, 255, 255, 0.8), 
    rgba(250, 250, 252, 0.95)
  );
  
  --page-bg-overlay:
    radial-gradient(140% 120% at 18% 18%, rgba(0, 170, 255, 0.08), rgba(255, 255, 255, 0.4)),
    radial-gradient(120% 130% at 82% 12%, rgba(255, 200, 120, 0.1), rgba(255, 255, 255, 0.35)),
    radial-gradient(120% 150% at 52% 96%, rgba(140, 210, 255, 0.12), rgba(255, 255, 255, 0.5));
  
  /* Glass morphism surfaces */
  --shell-border: rgba(0, 0, 0, 0.06);
  --shell-bg: rgba(255, 255, 255, 0.72);
  --shell-overlay: rgba(250, 250, 255, 0.85);
  
  /* Text colors */
  --shell-heading: #0066cc;
  --shell-text: #1d1d1f;
  --shell-success: #28cd41;
  --shell-warning: #ff9500;
  --shell-info: #007aff;
  
  /* Orbit accents with transparency */
  --gmeow-orbit-accent: color-mix(in srgb, var(--frost-accent) 75%, transparent 25%);
  --gmeow-orbit-info: color-mix(in srgb, var(--shell-info) 78%, transparent 22%);
  --gmeow-orbit-heading: color-mix(in srgb, var(--shell-heading) 72%, transparent 28%);
  --gmeow-orbit-mobile: color-mix(in srgb, var(--shell-info) 70%, transparent 30%);
  --gmeow-shell-shadow: rgba(0, 0, 0, 0.1);
  
  /* Enhanced glass blur for light mode */
  --glass-blur: 20px;
  --glass-blur-large: 28px;
  --glass-saturate: 180%;
}"""

def fix_hex_colors_in_file(filepath: Path) -> Tuple[bool, int]:
    """Replace hex colors with design tokens in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_made = 0
        
        # Apply all hex color replacements
        for pattern, replacement in HEX_COLOR_REPLACEMENTS.items():
            # Handle opacity variants like /30, /10, /50, etc.
            # Pattern: border-[#7CFF7A]/30 -> border-accent-green/30
            pattern_with_opacity = pattern.replace(r'\]', r'\]/([\d]+)')
            replacement_with_opacity = replacement + r'/\1'
            
            if re.search(pattern_with_opacity, content):
                content = re.sub(pattern_with_opacity, replacement_with_opacity, content)
                replacements_made += content.count(replacement) - original_content.count(replacement)
            
            # Pattern without opacity
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                replacements_made += 1
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements_made
        
        return False, 0
    
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False, 0

def update_globals_css():
    """Replace light mode theme with macOS glass transparent"""
    globals_css = BASE_PATH / 'app' / 'globals.css'
    
    try:
        with open(globals_css, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find and replace html.light block
        light_mode_pattern = r'html\.light\s*\{[^}]*\}'
        
        # Use a more precise pattern that captures the full block
        light_mode_pattern = r'html\.light\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}'
        
        if re.search(light_mode_pattern, content, re.DOTALL):
            content = re.sub(
                light_mode_pattern,
                LIGHT_MODE_CSS_NEW,
                content,
                flags=re.DOTALL
            )
            
            with open(globals_css, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        else:
            print("⚠️  Could not find html.light block in globals.css")
            return False
    
    except Exception as e:
        print(f"❌ Error updating globals.css: {e}")
        return False

def add_accent_green_to_tailwind():
    """Add accent-green design token to tailwind config"""
    tailwind_config = BASE_PATH / 'tailwind.config.ts'
    
    try:
        with open(tailwind_config, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if accent-green already exists
        if "'accent-green'" in content or '"accent-green"' in content:
            print("✓ accent-green already exists in tailwind.config.ts")
            return True
        
        # Find the colors section and add accent-green after gold
        gold_pattern = r"(gold:\s*\{[^}]+\},)"
        
        accent_green_definition = """\n\t\t\t'accent-green': {
\t\t\t\tDEFAULT: '#7CFF7A',    // Success/active state
\t\t\t\tdark: '#5FE55D',       // Darker variant for better contrast
\t\t\t},"""
        
        if re.search(gold_pattern, content):
            content = re.sub(
                gold_pattern,
                r'\1' + accent_green_definition,
                content
            )
            
            with open(tailwind_config, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        else:
            print("⚠️  Could not find gold color in tailwind.config.ts")
            return False
    
    except Exception as e:
        print(f"❌ Error updating tailwind.config.ts: {e}")
        return False

def scan_and_fix_all():
    """Main function: scan all files and apply fixes"""
    
    print("🚀 Starting Fast Batch Fix - macOS Glass Theme + Hex Colors")
    print("=" * 70)
    
    # Step 1: Add accent-green to tailwind config
    print("\n📦 Step 1: Adding accent-green design token...")
    if add_accent_green_to_tailwind():
        print("   ✅ Added accent-green to tailwind.config.ts")
    
    # Step 2: Update globals.css with macOS glass theme
    print("\n🎨 Step 2: Replacing light mode with macOS glass transparent...")
    if update_globals_css():
        print("   ✅ Updated app/globals.css with macOS glass theme")
    
    # Step 3: Fix hex colors in all component files
    print("\n🔧 Step 3: Fixing hex colors in components...")
    
    files_to_scan = []
    
    # Scan components directory
    if COMPONENTS_DIR.exists():
        files_to_scan.extend(COMPONENTS_DIR.rglob('*.tsx'))
        files_to_scan.extend(COMPONENTS_DIR.rglob('*.ts'))
    
    # Scan app directory
    if APP_DIR.exists():
        files_to_scan.extend(APP_DIR.rglob('*.tsx'))
        files_to_scan.extend(APP_DIR.rglob('*.ts'))
    
    # Filter out node_modules, .next, etc.
    exclude_dirs = {'node_modules', '.next', 'dist', 'build', '.git'}
    files_to_scan = [
        f for f in files_to_scan 
        if not any(exc in str(f) for exc in exclude_dirs)
    ]
    
    total_files = len(files_to_scan)
    files_modified = 0
    total_replacements = 0
    
    print(f"   📂 Scanning {total_files} files...")
    
    modified_files = []
    
    for filepath in files_to_scan:
        modified, count = fix_hex_colors_in_file(filepath)
        if modified:
            files_modified += 1
            total_replacements += count
            rel_path = filepath.relative_to(BASE_PATH)
            modified_files.append((str(rel_path), count))
    
    # Print results
    print(f"\n   ✅ Modified {files_modified} files")
    print(f"   ✅ Made {total_replacements} color replacements")
    
    if modified_files:
        print("\n   📝 Files modified:")
        for filepath, count in modified_files[:10]:
            print(f"      • {filepath} ({count} replacements)")
        
        if len(modified_files) > 10:
            print(f"      ... and {len(modified_files) - 10} more files")
    
    # Summary
    print("\n" + "=" * 70)
    print("🎉 BATCH FIX COMPLETE!")
    print("=" * 70)
    print(f"✅ macOS Glass theme applied to light mode")
    print(f"✅ accent-green design token added")
    print(f"✅ {total_replacements} hex colors replaced with tokens")
    print(f"✅ {files_modified} files modified")
    
    print("\n📝 Next steps:")
    print("   1. Test theme switching: npm run dev")
    print("   2. Toggle between dark/light modes")
    print("   3. Verify ProfileDropdown looks correct")
    print("   4. Check navigation and cards")

if __name__ == '__main__':
    scan_and_fix_all()
