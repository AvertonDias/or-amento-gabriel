'use server';

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, limit } from 'firebase/firestore';
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Save or update empresa data for a user
export const saveEmpresaData = async (empresaData: EmpresaData) => {
  if (!empresaData.userId) {
    throw new Error('User ID is required to save empresa data.');
  }
  // Use a predictable doc ID, e.g., the user's UID, to ensure one-to-one relationship
  const empresaDocRef = doc(db, EMPRESA_COLLECTION, empresaData.userId);
  await setDoc(empresaDocRef, empresaData, { merge: true });
};

// Get empresa data for a user
export const getEmpresaData = async (userId: string): Promise<EmpresaData | null> => {
  const q = query(collection(db, EMPRESA_COLLECTION), where('userId', '==', userId), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as EmpresaData;
};
