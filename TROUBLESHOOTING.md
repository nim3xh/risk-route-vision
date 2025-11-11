# Map Loading Troubleshooting Guide

## Issue: "Loading map..." persists indefinitely

### Diagnostic Checklist

1. **Open Browser Console (F12)**
   - Look for red error messages
   - Check for messages starting with "Map loaded" or "Map error"
   - Look for CORS or network errors

2. **Check Network Tab**
   - Filter by "style.json"
   - Look for failed requests (red, status 0 or 404)
   - Check if map tiles are loading

3. **Verify Internet Connection**
   - Can you access https://basemaps.cartocdn.com in your browser?
   - Try opening: https://demotiles.maplibre.org/style.json

### Common Issues & Solutions

#### Issue 1: CORS / Network Blocking
**Symptoms:** Console shows CORS errors or failed network requests
**Solutions:**
- Disable browser ad blockers (uBlock Origin, AdBlock, etc.)
- Disable VPN or proxy
- Check corporate firewall settings
- Try a different browser
- Try incognito/private mode

#### Issue 2: Firewall/Antivirus Blocking
**Symptoms:** All map tile requests fail
**Solutions:**
- Temporarily disable antivirus
- Add exception for localhost:8080
- Check Windows Defender Firewall settings

#### Issue 3: Invalid Coordinates
**Symptoms:** Map loads but shows ocean/blank area
**Solutions:**
- Check console for coordinate values
- Verify lat/lng are valid numbers
- Current center should be: lat: 7.3167, lng: 80.5333

#### Issue 4: MapLibre CSS Not Loading
**Symptoms:** Map area is blank but no errors
**Solutions:**
- Check if `maplibre-gl.css` is in node_modules
- Run: `npm install maplibre-gl --save`
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)

#### Issue 5: React Hot Reload Issue
**Symptoms:** Map worked before but stopped
**Solutions:**
- Restart dev server: Ctrl+C, then `npm run dev`
- Clear browser cache
- Delete `.vite` folder and restart

### Quick Fixes to Try

1. **Hard Refresh**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

2. **Clear Vite Cache**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite
   npm run dev
   ```

3. **Reinstall Map Dependencies**
   ```powershell
   npm install maplibre-gl react-map-gl --force
   npm run dev
   ```

4. **Check for Console Errors**
   Open your browser at http://localhost:8080
   Press F12, go to Console tab
   Copy any error messages

### Map Implementation Details

The app now includes:
- ✅ Automatic fallback to 3 different map styles
- ✅ Detailed error messages with troubleshooting steps
- ✅ Loading indicators with retry count
- ✅ Console logging for debugging
- ✅ Graceful error handling

### Test Map Component

If you want to test if MapLibre works at all, temporarily replace MapWeb with MapTest:

In `src/pages/MapOverview.tsx`, change:
```tsx
import { MapWeb } from "@/components/MapWeb";
```
to:
```tsx
import { MapTest as MapWeb } from "@/components/MapTest";
```

This uses the native MapLibre API instead of react-map-gl wrapper.

### What to Report

If the map still doesn't load, provide:
1. Browser console errors (screenshot or copy-paste)
2. Network tab showing failed requests (screenshot)
3. Browser and version (Chrome 120, Firefox 121, etc.)
4. Operating system
5. Any security software running (antivirus, firewall, VPN)

### Emergency: Use a Different Map Provider

If CartoDB is blocked, you can use OpenStreetMap tiles instead.

Change in `src/components/MapWeb.tsx`:
```tsx
const MAP_STYLES = [
  "https://demotiles.maplibre.org/style.json", // Try this first
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
];
```

### Verify Installation

Run these commands to verify everything is installed:
```powershell
npm list maplibre-gl
npm list react-map-gl
```

Should show:
- maplibre-gl@5.12.0
- react-map-gl@8.1.0

### Next Steps

1. **Open the app in your browser**: http://localhost:8080
2. **Open DevTools**: Press F12
3. **Check Console tab**: Look for errors
4. **Check Network tab**: Filter by "json" or "style"
5. **Report what you see**: Copy console errors

The map should now either:
- Load successfully (you'll see "Map loaded successfully" in console)
- Show a detailed error message on screen
- Automatically try fallback map styles

If you see specific errors, share them and we can fix them!
