
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>): Promise<string> => {
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
  try {
      const docRef = await addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento);
      console.log(`[ORCAMENTO SERVICE - addOrcamento] Orçamento salvo com ID: ${docRef.id}`);
      return docRef.id;
  } catch (error: any) {
    console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error.message);
    if (error.code === 'permission-denied') {
        throw new Error("Permissão negada. Verifique as regras de segurança do Firestore.");
    }
    throw new Error(`Falha ao adicionar orçamento: ${error.message}`);
  }
};

// Update an existing orcamento
export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, orcamento);
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
    console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Chamado com userId: ${userId}`);
    if (!userId) {
      console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] userId é nulo.");
      throw new Error("User ID é nulo, impossível gerar número do orçamento.");
    }
    
    const currentYear = new Date().getFullYear();

    try {
        const q = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const orcamentosDoAno = querySnapshot.docs
            .map(doc => doc.data().numeroOrcamento as string)
            .filter(num => num && num.startsWith(`${currentYear}-`));

        let lastSequence = 0;
        if (orcamentosDoAno.length > 0) {
            orcamentosDoAno.forEach(num => {
                const sequencePart = num.split('-')[1];
                if (sequencePart) {
                    const sequence = parseInt(sequencePart, 10);
                    if (sequence > lastSequence) {
                        lastSequence = sequence;
                    }
                }
            });
        }
        
        const newSequenceNumber = lastSequence + 1;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Última sequência para ${currentYear}: ${lastSequence}. Nova sequência: ${newSequenceNumber}`);
        return `${currentYear}-${String(newSequenceNumber).padStart(3, '0')}`;

    } catch (e: any) {
        console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] Erro ao obter próximo número:", e.message);
        // Fallback robusto em caso de erro na consulta, usando timestamp
        return `${currentYear}-${Date.now().toString().slice(-5)}`;
    }
};
