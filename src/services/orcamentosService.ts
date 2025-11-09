
'use client';

import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
  Timestamp,
  getDoc,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const getOrcamentosCollection = () => {
  return collection(db, 'orcamentos');
};

// Add a new orcamento
export const addOrcamento = (
  userId: string,
  orcamento: Omit<Orcamento, 'id'>
): Promise<string> => {
  if (!orcamento || !orcamento.cliente) {
    console.error(
      '[ORCAMENTO SERVICE - addOrcamento] Tentativa de salvar orçamento com dados inválidos.'
    );
    return Promise.reject(new Error('Dados do orçamento ou cliente inválidos.'));
  }
  console.log(
    `[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`
  );
  const orcamentosCollection = getOrcamentosCollection();
  
  // Return the promise from addDoc directly
  return addDoc(orcamentosCollection, { ...orcamento })
    .then(docRef => {
      console.log(
        '[ORCAMENTO SERVICE - addOrcamento] Orçamento adicionado com ID:',
        docRef.id
      );
      return docRef.id;
    })
    .catch(error => {
      // This will catch actual errors, but allow offline queuing to work.
      console.error(
        '[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:',
        error
      );
      throw error; // Re-throw the error to be handled by the caller if needed
    });
};


// Update an existing orcamento
export const updateOrcamento = async (
  orcamentoId: string,
  orcamento: Partial<Orcamento>
) => {
  if (!orcamento.userId) throw new Error('userId é obrigatório para atualizar');
  const orcamentoDoc = doc(db, 'orcamentos', orcamentoId);
  await updateDoc(orcamentoDoc, orcamento);
};

// Update an orcamento status
export const updateOrcamentoStatus = async (
  budgetId: string,
  status: Orcamento['status'],
  payload: object
) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('Usuário não autenticado.');
  }
  const orcamentoDoc = doc(db, 'orcamentos', budgetId);
  await updateDoc(orcamentoDoc, { status, ...payload });
};

// Delete an orcamento
export const deleteOrcamento = (orcamentoId: string) => {
  const orcamentoDoc = doc(db, 'orcamentos', orcamentoId);
  return deleteDoc(orcamentoDoc);
};


// Get all orcamentos for a user
export const getOrcamentos = async (userId: string): Promise<Orcamento[]> => {
  try {
    const orcamentosCollection = getOrcamentosCollection();
    const q = query(
      orcamentosCollection,
      where('userId', '==', userId),
      orderBy('numeroOrcamento', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const orcamentos: Orcamento[] = [];
    querySnapshot.forEach((doc) => {
      orcamentos.push({ id: doc.id, ...doc.data() } as Orcamento);
    });
    return orcamentos;
  } catch (e) {
    console.error('Error getting documents: ', e);
    return [];
  }
};

// Get the next sequential orcamento number for the current year
export const getNextOrcamentoNumber = (
  userId: string
): Promise<string> => {
  if (!userId) {
    return Promise.reject(new Error('User ID é nulo, impossível gerar número do orçamento.'));
  }

  console.log(
    `[ORCAMENTO SERVICE - getNextOrcamentoNumber] Chamado com userId: ${userId}`
  );

  const orcamentosCollection = getOrcamentosCollection();
    const q = query(
      orcamentosCollection,
      where('userId', '==', userId),
      orderBy('numeroOrcamento', 'desc'),
      limit(1)
    );

  return getDocs(q).then(querySnapshot => {
    const currentYear = new Date().getFullYear();
    let lastSequence = 0;

    if (!querySnapshot.empty) {
      const lastBudget = querySnapshot.docs[0].data() as Orcamento;
      const numeroOrcamento = lastBudget.numeroOrcamento;

      if (numeroOrcamento && numeroOrcamento.startsWith(`${currentYear}-`)) {
        const parts = numeroOrcamento.split('-');
        if (parts.length === 2) {
          const sequence = parseInt(parts[1], 10);
          if (!isNaN(sequence)) {
            lastSequence = sequence;
          }
        }
      }
    }
     const newSequence = lastSequence + 1;
    const newNumeroOrcamento = `${currentYear}-${String(newSequence).padStart(
      3,
      '0'
    )}`;
    console.log(
      `[ORCAMENTO SERVICE - getNextOrcamentoNumber] Última sequência para ${currentYear}: ${lastSequence}. Novo número: ${newNumeroOrcamento}`
    );
    return newNumeroOrcamento;
  }).catch((error: any) => {
     console.warn(
      'Falha ao buscar número sequencial online (provavelmente offline), usando fallback:',
      error.message
    );
    const offlineNumber = `${new Date().getFullYear()}-TEMP-${Date.now()}`;
    console.log(
      `[ORCAMENTO SERVICE - getNextOrcamentoNumber] Gerando número de fallback offline: ${offlineNumber}`
    );
    return offlineNumber;
  })
};

