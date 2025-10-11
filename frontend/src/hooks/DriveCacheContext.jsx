import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { listAllGrouped } from '../lib/drive';

const DriveCacheContext = createContext();

export function DriveCacheProvider({ children }) {
  const [groups, setGroups] = useState(null); // null = not loaded, [] = loaded but empty
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with cached data on mount for offline users
  useEffect(() => {
    const initializeCache = async () => {
      if (!navigator.onLine) {
        console.log('[DriveCacheContext] Offline on mount - checking for cached data');
        // Try to load cached data from localStorage or IndexedDB
        try {
          const cached = localStorage.getItem('cachedGroups');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[DriveCacheContext] Found cached data in localStorage');
              setGroups(parsed);
            }
          }
        } catch (e) {
          console.log('[DriveCacheContext] No cached data found');
        }
      }
    };
    initializeCache();
  }, []);

  // Fetch drive data, optionally force refresh
  const fetchDrive = useCallback(async (opts = {}) => {
    const fresh = !!opts.fresh;
    
    // If explicitly forcing fresh and we appear online, try the request
    // The request itself will fail if truly offline
    if (fresh && navigator.onLine) {
      console.log('[DriveCacheContext] Forcing fresh fetch...');
      setLoading(true);
      setError(null);
      try {
        const data = await listAllGrouped({ fresh: true });
        setGroups(data);
        // Save to localStorage for offline access
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('cachedGroups', JSON.stringify(data));
        }
        return data;
      } catch (e) {
        console.error('[DriveCacheContext] Failed to fetch:', e.message);
        setError(e);
        // If we have cached groups, return them as fallback
        if (groups && groups.length > 0) {
          console.log('[DriveCacheContext] Returning cached data as fallback');
          return groups;
        }
        throw e;
      } finally {
        setLoading(false);
      }
    }
    
    // If offline or not forcing refresh, return cached data
    if (!navigator.onLine) {
      console.log('[DriveCacheContext] Offline mode - returning cached data');
      return groups || [];
    }
    
    // Normal fetch (may use cache)
    setLoading(true);
    setError(null);
    try {
      const data = await listAllGrouped({ fresh });
      setGroups(data);
      // Save to localStorage for offline access
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('cachedGroups', JSON.stringify(data));
      }
      return data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [groups]);

  // Invalidate cache (e.g., after upload/delete)
  const invalidate = useCallback(() => {
    setGroups(null);
  }, []);

  return (
    <DriveCacheContext.Provider value={{ groups, setGroups, loading, error, fetchDrive, invalidate }}>
      {children}
    </DriveCacheContext.Provider>
  );
}

export function useDriveCache() {
  return useContext(DriveCacheContext);
}
