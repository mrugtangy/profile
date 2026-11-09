import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_CONFIG } from '../constants';

const SETTINGS_DOC_PATH = 'settings/config';
const CACHE_KEY = 'app_settings_cache';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', error);
  throw error;
}

export const fetchSettings = async () => {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return data;
    } else {
      await setDoc(docRef, INITIAL_CONFIG);
      localStorage.setItem(CACHE_KEY, JSON.stringify(INITIAL_CONFIG));
      return INITIAL_CONFIG;
    }
  } catch (error) {
    // Fallback to cache if offline
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.warn('Invalid cache data', e);
      }
    }
    handleFirestoreError(error, OperationType.GET, SETTINGS_DOC_PATH);
  }
};

export const updateSettings = async (data: any) => {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH);
    await setDoc(docRef, data, { merge: true });
    // Optimistically update cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SETTINGS_DOC_PATH);
  }
};

export const subscribeToSettings = (callback: (data: any) => void) => {
  const docRef = doc(db, SETTINGS_DOC_PATH);
  
  // Immediately serve from cache (adaptable cache system)
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    try {
      callback(JSON.parse(cachedData));
    } catch (e) {
      console.warn('Invalid cache data', e);
    }
  }

  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      callback(data);
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(INITIAL_CONFIG));
      callback(INITIAL_CONFIG);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SETTINGS_DOC_PATH);
  });
};
