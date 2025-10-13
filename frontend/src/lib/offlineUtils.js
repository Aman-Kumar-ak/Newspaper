// Offline utility functions with better error handling for production
import { cacheSetPdf, cacheGetPdf } from './idb';
import { getFileBytes } from './drive';

export class OfflineManager {
  constructor() {
    this.dbName = 'newspapers-db';
    this.dbVersion = 2;
    this.storeName = 'pdfs';
  }

  async isFileOffline(fileId) {
    try {
      const cached = await cacheGetPdf(fileId);
      return !!cached;
    } catch (error) {
      console.error('Error checking offline status:', error);
      return false;
    }
  }

  async makeFileOffline(file) {
    try {
      console.log('Making file available offline:', file.id);
      
      // Check if already offline
      const isAlreadyOffline = await this.isFileOffline(file.id);
      if (isAlreadyOffline) {
        console.log('File is already available offline');
        return { success: true, alreadyOffline: true };
      }

      // Download file bytes from server
      const { bytes, fileName } = await getFileBytes(file.id);
      
      if (!bytes || bytes.byteLength === 0) {
        throw new Error('No file content received from server');
      }

      // Store in IndexedDB
      await cacheSetPdf(file.id, bytes, fileName || file.fileName);
      
      console.log('File saved for offline use:', file.id);
      return { success: true, fileName: fileName || file.fileName };
    } catch (error) {
      console.error('Error making file offline:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred',
        isNetworkError: error.message.includes('fetch') || error.message.includes('network')
      };
    }
  }

  async removeFileFromOffline(fileId) {
    try {
      console.log('Removing file from offline storage:', fileId);
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          reject(new Error('Failed to open database'));
        };
        
        request.onsuccess = () => {
          const db = request.result;
          
          try {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const deleteRequest = store.delete(fileId);
            
            deleteRequest.onsuccess = () => {
              console.log('File removed from offline storage:', fileId);
              resolve({ success: true });
            };
            
            deleteRequest.onerror = () => {
              reject(new Error('Failed to delete file from offline storage'));
            };
            
            transaction.onerror = () => {
              reject(new Error('Transaction failed'));
            };
          } catch (error) {
            reject(error);
          } finally {
            db.close();
          }
        };
      });
    } catch (error) {
      console.error('Error removing file from offline:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  async getOfflineFileList() {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          reject(new Error('Failed to open database'));
        };
        
        request.onsuccess = () => {
          const db = request.result;
          
          try {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const getAllKeysRequest = store.getAllKeys();
            
            getAllKeysRequest.onsuccess = () => {
              resolve(getAllKeysRequest.result || []);
            };
            
            getAllKeysRequest.onerror = () => {
              reject(new Error('Failed to get offline file list'));
            };
          } catch (error) {
            reject(error);
          } finally {
            db.close();
          }
        };
      });
    } catch (error) {
      console.error('Error getting offline file list:', error);
      return [];
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Helper function to show user-friendly error messages
export function getErrorMessage(error, operation) {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.isNetworkError) {
    return `${operation} failed due to network issues. Please check your connection and try again.`;
  }
  
  if (error.message) {
    // Common error message mapping
    switch (error.message) {
      case 'AUTHENTICATION_EXPIRED':
        return 'Your session has expired. Please log in again.';
      case 'Failed to fetch':
        return 'Network error. Please check your connection and try again.';
      case 'Failed to open database':
        return 'Unable to access offline storage. Please try refreshing the page.';
      default:
        return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}