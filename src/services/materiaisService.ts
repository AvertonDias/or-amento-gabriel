'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { MaterialItem } from '@/lib/types';

const MATERIAIS_COLLECTION = 'materiais';

// Add a new material
export const addMaterial = async (userId: string, material: Omit<MaterialItem, 'id' | 'userId'>) => {
  await addDoc(collection(db, MATERIAIS_COLLECTION), {
    ...material,
    userId,
  });
};

// Update an existing material
export const updateMaterial = async (materialId: string, material: Partial<MaterialItem>) => {
  const materialDoc = doc(db, MATERIAIS_COLLECTION, materialId);
  await updateDoc(materialDoc, material);
};

// Delete a material
export const deleteMaterial = async (materialId: string) => {
  const materialDoc = doc(db, MATERIAIS_COLLECTION, materialId);
  await deleteDoc(materialDoc);
};

// Get all materials for a user
export const getMateriais = async (userId: string): Promise<MaterialItem[]> => {
  const q = query(collection(db, MATERIAIS_COLLECTION), where('userId', '==', userId), orderBy('descricao', 'asc'));
  const querySnapshot = await getDocs(q);
  const materiais: MaterialItem[] = [];
  querySnapshot.forEach((doc) => {
    materiais.push({ id: doc.id, ...doc.data() } as MaterialItem);
  });
  return materiais;
};
