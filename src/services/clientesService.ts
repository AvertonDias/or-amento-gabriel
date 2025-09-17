'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
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

// Get all clients for a user with real-time updates
export const getClientes = (userId: string, callback: (data: ClienteData[]) => void) => {
  const q = query(collection(db, CLIENTES_COLLECTION), where('userId', '==', userId));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const clientes: ClienteData[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() } as ClienteData);
    });
    callback(clientes);
  });

  return unsubscribe; // Return the unsubscribe function to be called on cleanup
};
