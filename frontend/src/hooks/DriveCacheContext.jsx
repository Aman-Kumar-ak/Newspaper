import React, { createContext, useContext, useState, useCallback } from 'react';
import { listAllGrouped } from '../lib/drive';

const DriveCacheContext = createContext();

export function DriveCacheProvider({ children }) {
  const [groups, setGroups] = useState(null); // null = not loaded, [] = loaded but empty
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drive data, optionally force refresh
  const fetchDrive = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const fresh = !!opts.fresh;
      const data = await listAllGrouped({ fresh });
      setGroups(data);
      return data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

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
