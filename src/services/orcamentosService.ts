
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, writeBatch, Timestamp, getDoc } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>): Promise<string> => {
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
   try {
    const docRef = await addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento);
    console.log("[ORCAMENTO SERVICE - addOrcamento] Orçamento salvo com ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error.message);
    throw error;
  }
};


// Update an existing orcamento
export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, orcamento);
};


// Update an orcamento status
export const updateOrcamentoStatus = async (orcamentoId: string, status: Orcamento['status'], payload: object) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, { status, ...payload });
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
    if (!userId) {
      throw new Error("User ID é nulo, impossível gerar número do orçamento.");
    }
    
    console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Chamado com userId: ${userId}`);
    const currentYear = new Date().getFullYear();

    try {
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        
        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId),
            where('dataCriacao', '>=', startOfYear)
        );

        const querySnapshot = await getDocs(q);

        let lastSequence = 0;
        querySnapshot.forEach(doc => {
            const numeroOrcamento = doc.data().numeroOrcamento as string;
            // Apenas considera números no formato ANO-XXX e do ano corrente
            if (numeroOrcamento && numeroOrcamento.startsWith(`${currentYear}-`)) {
                const parts = numeroOrcamento.split('-');
                if (parts.length === 2) {
                    const sequence = parseInt(parts[1], 10);
                    // Garante que o número sequencial não seja um timestamp
                    if (!isNaN(sequence) && String(sequence).length < 5 && sequence > lastSequence) {
                        lastSequence = sequence;
                    }
                }
            }
        });
        
        const newSequence = lastSequence + 1;
        const newNumeroOrcamento = `${currentYear}-${String(newSequence).padStart(3, '0')}`;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Última sequência para ${currentYear}: ${lastSequence}. Novo número: ${newNumeroOrcamento}`);
        return newNumeroOrcamento;

    } catch (error: any) {
        console.warn("Falha ao buscar número sequencial online (provavelmente offline), usando fallback:", error.message);
        const offlineNumber = `${currentYear}-${Date.now()}`;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Gerando número de fallback offline: ${offlineNumber}`);
        return offlineNumber;
    }
};

export const syncOfflineOrcamentos = async (userId: string) => {
    if (!userId) return;

    try {
        const q = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const orcamentos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Orcamento));

        const offlineOrcamentos = orcamentos.filter(o => o.numeroOrcamento && o.numeroOrcamento.includes('-') && o.numeroOrcamento.split('-')[1].length > 4);
        
        if (offlineOrcamentos.length === 0) {
            console.log("Nenhum orçamento offline para sincronizar.");
            return;
        }

        console.log(`Sincronizando ${offlineOrcamentos.length} orçamentos offline...`);

        // Sort by creation date to assign sequential numbers correctly
        offlineOrcamentos.sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime());

        let nextNumberStr = await getNextOrcamentoNumber(userId);
        
        // Check if getNextOrcamentoNumber returned an offline fallback
        if (nextNumberStr.split('-')[1].length > 4) {
          console.warn("Não foi possível obter um número sequencial online para sincronização. Tentando novamente mais tarde.");
          return;
        }
        
        let year = parseInt(nextNumberStr.split('-')[0], 10);
        let nextSequence = parseInt(nextNumberStr.split('-')[1], 10);
        
        const batch = writeBatch(db);

        for (const orcamento of offlineOrcamentos) {
            const orcamentoYear = new Date(orcamento.dataCriacao).getFullYear();
            
            // This is a simplification. A more robust solution would re-fetch the next number if the year changes mid-batch.
            if(orcamentoYear !== year) {
              year = orcamentoYear;
              nextSequence = 1; // Reset for the new year
            }
            
            const newNumeroOrcamento = `${year}-${String(nextSequence).padStart(3, '0')}`;
            const docRef = doc(db, ORCAMENTOS_COLLECTION, orcamento.id);
            batch.update(docRef, { numeroOrcamento: newNumeroOrcamento });
            console.log(`Atualizando orçamento ${orcamento.numeroOrcamento} para ${newNumeroOrcamento}`);
            nextSequence++;
        }

        await batch.commit();
        console.log("Sincronização de orçamentos offline concluída.");

    } catch (error) {
        console.error("Erro ao sincronizar orçamentos offline:", error);
    }
};
