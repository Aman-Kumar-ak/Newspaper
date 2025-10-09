# Auto-Refresh When Back Online

## Problem
When the user goes offline and then comes back online, the app was showing cached data but not automatically refreshing to get the latest files from the server.

## Solution Implemented

### 1. Dashboard Auto-Refresh (Dashboard.jsx)
Added a new `useEffect` that watches the `isOnline` state:
```javascript
useEffect(() => {
  if (isOnline && groups !== null) {
    const existing = getTokens();
    if (existing.accessToken) {
      console.log('🔄 Back online - refreshing data...');
      // Fetch fresh data from server
      fetchDrive({ fresh: true });
    }
  }
}, [isOnline]);
```

**How it works:**
- When `isOnline` changes from `false` to `true`
- Automatically calls `fetchDrive({ fresh: true })`
- Fetches latest data from the server
- Updates the UI with fresh files

### 2. Improved Network Detection (drive.js)
Updated `listDates()` and `listAllGrouped()` to handle network transitions better:

**Before:**
```javascript
if (!navigator.onLine) {
  throw new Error('OFFLINE');
}
```

**After:**
```javascript
try {
  // Try the request even if navigator.onLine is false
  const res = await fetch(...);
  return handleApiResponse(res);
} catch (error) {
  // Only throw OFFLINE if truly offline
  if (!navigator.onLine || error.message.includes('Failed to fetch')) {
    throw new Error('OFFLINE');
  }
  throw error;
}
```

**Why this matters:**
- `navigator.onLine` can sometimes be stale (still reports false after network comes back)
- Now we always attempt the request when forcing fresh
- Only fall back to cache if the request truly fails

### 3. Smart Fallback in listAllGrouped()
When forcing fresh fetch fails, automatically falls back to cached data:

```javascript
if (fresh) {
  try {
    // Try to fetch from server
    const res = await listDates();
    // ... fetch and return fresh data
  } catch (error) {
    if (error.message === 'OFFLINE' || !navigator.onLine) {
      console.log('Network unavailable - returning cached data');
      const cached = await cacheGetGroups();
      return cached || [];
    }
    throw error;
  }
}
```

### 4. Enhanced DriveCacheContext (DriveCacheContext.jsx)
Improved `fetchDrive()` to handle online transitions better:
- When forcing fresh and online, always attempts the request
- Falls back to cached data if request fails
- Better error handling and logging

## User Experience

### Scenario 1: Go Offline While Using App
1. ✅ Red banner appears: "You are offline..."
2. ✅ App shows cached files only
3. ✅ Offline files (with green checkmark) are still readable

### Scenario 2: Come Back Online
1. ✅ Red banner disappears
2. 🆕 App automatically refreshes data in background
3. 🆕 Console logs: "🔄 Back online - refreshing data..."
4. 🆕 Latest files appear (new uploads, deletions, etc.)
5. ✅ No manual refresh needed!

### Scenario 3: Network Flaky (On/Off/On)
1. ✅ App gracefully handles multiple transitions
2. ✅ Always shows cached data while fetching
3. ✅ Updates to fresh data when available
4. ✅ Never shows blank screen or errors

## Console Logs

Watch the browser console for these messages:

**When going offline:**
```
📴 Network went offline
[Drive] Offline mode - returning cached data only
```

**When coming back online:**
```
🌐 Network is back online!
🔄 Back online - refreshing data...
[DriveCacheContext] Forcing fresh fetch...
✅ Data refreshed successfully
```

**If refresh fails (but has cache):**
```
[Drive] Network unavailable - returning cached data
[DriveCacheContext] Returning cached data as fallback
```

## Testing

1. **Test Offline Mode:**
   - Open DevTools → Network tab → Set "Offline"
   - Verify red banner appears
   - Verify cached files still visible

2. **Test Coming Back Online:**
   - Set Network back to "Online" 
   - Watch console for "🔄 Back online - refreshing data..."
   - Verify latest files appear (upload a file in another tab to test)
   - Verify banner disappears

3. **Test Flaky Connection:**
   - Toggle Offline/Online several times quickly
   - Verify app doesn't crash or show errors
   - Verify data refreshes when stable

## Benefits

✅ **Automatic** - No manual refresh button needed
✅ **Seamless** - Smooth transition between offline/online
✅ **Reliable** - Falls back to cache if network request fails
✅ **User-Friendly** - Always shows something (cached or fresh)
✅ **Smart** - Only refreshes when actually coming back online
