'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const CLIENTES_COLLECTION = 'clientes';

// Add a new client
export const addCliente = async (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>) => {
  await addDoc(collection(db, CLIENTES_COLLECTION), {
    ...cliente,
    userId,
  });
};

// Update an existing client
export const updateCliente = async (clienteId: string, cliente: Partial<ClienteData>) => {
  const clienteDoc = doc(db, CLIENTES_COLLECTION, clienteId);
  await updateDoc(clienteDoc, cliente);
};

// Delete a client
export const deleteCliente = async (clienteId: string) => {
  const clienteDoc = doc(db, CLIENTES_COLLECTION, clienteId);
  await deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = async (userId: string): Promise<ClienteData[]> => {
  const q = query(collection(db, CLIENTES_COLLECTION), where('userId', '==', userId), orderBy('nome', 'asc'));
  const querySnapshot = await getDocs(q);
  const clientes: ClienteData[] = [];
  querySnapshot.forEach((doc) => {
    clientes.push({ id: doc.id, ...doc.data() } as ClienteData);
  });
  return clientes;
};
