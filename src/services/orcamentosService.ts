'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>) => {
  await addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento);
};

// Update an orcamento status
export const updateOrcamentoStatus = async (orcamentoId: string, status: 'Aceito' | 'Recusado') => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, { status });
};

// Delete an orcamento
export const deleteOrcamento = async (orcamentoId: string) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await deleteDoc(orcamentoDoc);
};

// Get all orcamentos for a user
export const getOrcamentos = async (userId: string): Promise<Orcamento[]> => {
  const q = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId), orderBy('dataCriacao', 'desc'));
  const querySnapshot = await getDocs(q);
  const orcamentos: Orcamento[] = [];
  querySnapshot.forEach((doc) => {
    orcamentos.push({ id: doc.id, ...doc.data() } as Orcamento);
  });
  return orcamentos;
};

// Get the next sequential orcamento number for the current year
export const getNextOrcamentoNumber = async (userId: string): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

    const q = query(
        collection(db, ORCAMENTOS_COLLECTION),
        where('userId', '==', userId),
        where('dataCriacao', '>=', startOfYear),
        where('dataCriacao', '<=', endOfYear),
        orderBy('dataCriacao', 'desc'),
        limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return `${currentYear}-001`;
    }

    const lastOrcamento = querySnapshot.docs[0].data() as Orcamento;
    const lastNumberStr = lastOrcamento.numeroOrcamento.split('-')[1];
    const lastNumber = parseInt(lastNumberStr, 10);
    const newNumber = lastNumber + 1;
    return `${currentYear}-${String(newNumber).padStart(3, '0')}`;
};
