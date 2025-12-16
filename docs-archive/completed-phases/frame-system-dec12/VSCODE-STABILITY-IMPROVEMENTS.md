# VS Code Stability Improvements
**Date**: December 12, 2024  
**Status**: Settings optimized for Next.js 15 + TypeScript builds

## Problem Report

User experiencing "force close" during builds despite successful compilation:
- Build completes: ✓ Compiled successfully in 27.6s
- VS Code crashes during TypeScript processing
- Terminal may close unexpectedly

## Root Causes Identified

1. **Memory Constraints**: TypeScript server was limited to 4GB (now 8GB)
2. **File Watching Overhead**: Watching unnecessary directories (.next, node_modules, dist)
3. **Resource Intensive Features**: Many editor features enabled unnecessarily

## Applied Optimizations

### 1. TypeScript Memory (CRITICAL)
```json
{
  "typescript.tsserver.maxTsServerMemory": 8192  // Increased from 4096
}
```
**Impact**: Prevents out-of-memory crashes during large compilations

### 2. File Watching (NEW)
```json
{
  "typescript.tsserver.watchOptions": {
    "watchFile": "useFsEvents",
    "watchDirectory": "useFsEvents",
    "fallbackPolling": "dynamicPriorityPolling",
    "synchronousWatchDirectory": false,
    "excludeDirectories": ["**/node_modules", "**/.next", "**/dist", "**/out"]
  }
}
```
**Impact**: Reduces CPU usage by avoiding polling on build artifacts

### 3. Already Optimized Features ✅
- `typescript.tsserver.experimental.enableProjectDiagnostics`: false
- `typescript.disableAutomaticTypeAcquisition`: true
- Auto imports disabled
- Parameter hints disabled
- Code lens disabled
- Semantic highlighting disabled
- Extensions auto-update disabled
- Git autofetch disabled

## Build Verification

Test after settings change:
```bash
npm run build
```

Expected output:
```
✓ Compiled successfully in 27-30s
✓ Generating static pages (81/81)
```

## Alternative Approaches

If crashes continue, try:

### 1. Use Terminal Instead of Integrated Terminal
```bash
# Run builds in external terminal window
gnome-terminal -- bash -c "cd /home/heycat/Desktop/2025/Gmeowbased && npm run build"
```

### 2. Split TypeScript Checking
```bash
# Run type checking separately
npm run type-check &  # Background
npm run build        # Foreground
```

### 3. Disable Extensions During Build
Create VS Code task in `.vscode/tasks.json`:
```json
{
  "label": "Build (No Extensions)",
  "type": "shell",
  "command": "code --disable-extensions && npm run build",
  "problemMatcher": []
}
```

### 4. Increase System Swap (Linux)
```bash
# Check current swap
free -h

# Add 8GB swap file if needed
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Success Metrics

- ✅ Build completes without VS Code crash
- ✅ Terminal remains responsive
- ✅ TypeScript server stays alive
- ✅ Compilation time: ~27-30s (no degradation)

## Current Status: 85/100

**Blocker Progress**:
- ✅ Frame Image Caching: 11/11 routes complete
- ✅ Hybrid Calculator: EXISTS (lib/frames/hybrid-calculator.ts)
- ✅ Frame HTML Builder: Security fixes applied
- ✅ VS Code Settings: Memory + file watching optimized
- ⏳ Badge API Tests: ~20 failures (500 errors)
- ⏳ Maintenance Schema: 2 failures (undefined)
- ⏳ HTML Builder Tests: 10 failures (test expectations)

**Next Action**: Fix badge API tests to reach 90/100

## Testing After Changes

1. **Restart VS Code** (required for settings to take effect):
   ```bash
   code --new-window /home/heycat/Desktop/2025/Gmeowbased
   ```

2. **Monitor Resources**:
   ```bash
   # Watch memory usage
   watch -n 1 "ps aux | grep 'tsserver\|node' | grep -v grep"
   ```

3. **Run Build**:
   ```bash
   npm run build 2>&1 | tee build.log
   ```

4. **Check Logs** if crash occurs:
   - VS Code: `~/.config/Code/logs/`
   - System: `dmesg | tail -50`

## Additional Recommendations

### For Large Builds:
```json
{
  "typescript.tsserver.pluginPaths": [],
  "typescript.implementationsCodeLens.enabled": false,
  "typescript.referencesCodeLens.enabled": false,
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

### For Memory-Constrained Systems:
```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/*/**": true,
    "**/.hg/store/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/out/**": true,
    "**/.vercel/**": true,
    "**/cache/**": true
  }
}
```

## Troubleshooting

**If VS Code still crashes**:
1. Check system RAM: `free -h` (need >4GB free)
2. Close other applications during build
3. Use external terminal for builds
4. Consider upgrading to 16GB+ RAM
5. Enable swap space (see Alternative Approaches)

**If build is slow**:
1. Clear Next.js cache: `rm -rf .next`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check disk space: `df -h`
4. Disable source maps: `GENERATE_SOURCEMAP=false npm run build`

## References

- Next.js Build Performance: https://nextjs.org/docs/pages/building-your-application/optimizing/performance
- VS Code TypeScript Settings: https://code.visualstudio.com/docs/typescript/typescript-compiling
- Node.js Memory Management: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
