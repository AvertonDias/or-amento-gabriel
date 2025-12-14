
'use client';

import { db as firestoreDB } from '@/lib/firebase';
import {
  doc,
  updateDoc as updateDocFirestore,
  deleteDoc as deleteDocFirestore,
  setDoc,
} from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { Orcamento } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// --- Funções que interagem com o Dexie (local) ---

export const getNextOrcamentoNumber = async (userId: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  
  const orcamentosDoAno = await dexieDB.orcamentos
    .where('userId').equals(userId)
    .filter(o => o.data.numeroOrcamento.endsWith(`-${currentYear}`))
    .toArray();

  let lastSequence = 0;
  if (orcamentosDoAno.length > 0) {
    orcamentosDoAno.forEach(o => {
      const seq = parseInt(o.data.numeroOrcamento.split('-')[0], 10);
      if (!isNaN(seq) && seq > lastSequence) {
        lastSequence = seq;
      }
    });
  }

  const newSequence = lastSequence + 1;
  return `${String(newSequence).padStart(3, '0')}-${currentYear}`;
};

export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>): Promise<string> => {
  if (!orcamento || !orcamento.cliente) {
    throw new Error('Dados do orçamento ou cliente inválidos.');
  }

  const newId = uuidv4();
  const dataToSave: Orcamento = {
    ...orcamento,
    cliente: {
      ...orcamento.cliente,
      cpfCnpj: orcamento.cliente.cpfCnpj || null,
      email: orcamento.cliente.email || null,
    },
    id: newId,
  };

  await dexieDB.orcamentos.put({
    id: newId,
    userId: orcamento.userId,
    data: dataToSave,
    syncStatus: 'pending',
  });

  return newId;
};

export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  const existing = await dexieDB.orcamentos.get(orcamentoId);
  if (!existing) throw new Error("Orçamento não encontrado para atualização.");
  
  // Assegura que não estamos sobrescrevendo o ID
  const { id, ...restOfBudget } = orcamento;

  const updatedData = { ...existing.data, ...restOfBudget };
  await dexieDB.orcamentos.put({
    ...existing,
    data: updatedData,
    syncStatus: 'pending',
  });
};

export const updateOrcamentoStatus = async (
  budgetId: string,
  status: Orcamento['status'],
  payload: object
) => {
    const existing = await dexieDB.orcamentos.get(budgetId);
    if (!existing) throw new Error("Orçamento não encontrado.");

    const updatedData = { ...existing.data, status, ...payload };
    await dexieDB.orcamentos.put({
        ...existing,
        data: updatedData,
        syncStatus: 'pending',
    });
};


export const deleteOrcamento = async (orcamentoId: string) => {
  await dexieDB.orcamentos.delete(orcamentoId);
  await dexieDB.deletions.put({ id: orcamentoId, collection: 'orcamentos', deletedAt: new Date() });
};


// --- Funções para sincronização com Firestore ---

export const syncOrcamentoToFirestore = async (orcamentoData: Orcamento) => {
  const orcamentoDocRef = doc(firestoreDB, 'orcamentos', orcamentoData.id);
  await setDoc(orcamentoDocRef, orcamentoData, { merge: true });
};

export const deleteOrcamentoFromFirestore = async (orcamentoId: string) => {
  const orcamentoDocRef = doc(firestoreDB, 'orcamentos', orcamentoId);
  await deleteDocFirestore(orcamentoDocRef);
};
