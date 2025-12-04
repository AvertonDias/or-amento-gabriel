
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const getClientesCollection = () => {
  return collection(db, 'clientes');
};

// Add a new client and return its ID
export const addCliente = (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const clientesCollection = getClientesCollection();
  const dataToSave = {
    ...cliente,
    userId,
    telefones: Array.isArray(cliente.telefones) ? cliente.telefones : [],
  };
  return addDoc(clientesCollection, dataToSave).then(docRef => docRef.id);
};

// Update an existing client
export const updateCliente = (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  return updateDoc(clienteDoc, cliente);
};

// Delete a client
export const deleteCliente = (clienteId: string) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  return deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = async (userId: string): Promise<ClienteData[]> => {
    const clientesCollection = getClientesCollection();
    const q = query(clientesCollection, where('userId', '==', userId), orderBy('nome', 'asc'));
    
    const querySnapshot = await getDocs(q);
    const clientes: ClienteData[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Fallback for old structure
        if (data.telefone && !data.telefones) {
            data.telefones = [{ nome: 'Principal', numero: data.telefone }];
        }
        clientes.push({ id: doc.id, ...data } as ClienteData);
    });
    return clientes;
};
