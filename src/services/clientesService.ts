
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const getClientesCollection = () => {
  return collection(db, 'clientes');
};

// Add a new client and return its ID
export const addCliente = (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const clientesCollection = getClientesCollection();
  return addDoc(clientesCollection, {
    ...cliente,
    userId,
  }).then(docRef => docRef.id);
};

// Update an existing client
export const updateCliente = (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  // O segundo argumento de updateDoc deve ser apenas o payload.
  // O userId já está no documento e é validado pelas regras de segurança.
  return updateDoc(clienteDoc, cliente);
};

// Delete a client
export const deleteCliente = (clienteId: string) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  return deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = (userId: string): Promise<ClienteData[]> => {
    const clientesCollection = getClientesCollection();
    const q = query(clientesCollection, where('userId', '==', userId), orderBy('nome', 'asc'));
    
    return getDocs(q).then((querySnapshot) => {
        const clientes: ClienteData[] = [];
        querySnapshot.forEach((doc) => {
            clientes.push({ id: doc.id, ...doc.data() } as ClienteData);
        });
        return clientes;
    });
};
