
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, writeBatch, Timestamp, getDoc, limit, serverTimestamp } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const getOrcamentosCollection = (userId: string) => {
  return collection(db, 'empresa', userId, 'orcamentos');
};

// Add a new orcamento
export const addOrcamento = async (userId: string, orcamento: Omit<Orcamento, 'id'>) => {
  if (!orcamento || !orcamento.cliente) {
    console.error("[ORCAMENTO SERVICE - addOrcamento] Tentativa de salvar orçamento com dados inválidos.");
    throw new Error("Dados do orçamento ou cliente inválidos.");
  }
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
  const orcamentosCollection = getOrcamentosCollection(userId);
  try {
    const docRef = await addDoc(orcamentosCollection, { ...orcamento });
    console.log("[ORCAMENTO SERVICE - addOrcamento] Orçamento adicionado com ID:", docRef.id);
  } catch (error) {
      console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error);
      // If offline, Firestore writes to a local queue and resolves the promise.
      // The error here would be something other than network. Let's re-throw.
      throw error;
  }
};


// Update an existing orcamento
export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  if (!orcamento.userId) throw new Error("userId é obrigatório para atualizar");
  const orcamentoDoc = doc(db, 'empresa', orcamento.userId, 'orcamentos', orcamentoId);
  await updateDoc(orcamentoDoc, orcamento);
};


// Update an orcamento status
export const updateOrcamentoStatus = async (orcamentoId: string, status: Orcamento['status'], payload: object) => {
  const orcamentoToUpdate = await getDoc(doc(db, 'orcamentos', orcamentoId));
  if (!orcamentoToUpdate.exists()) throw new Error("Orçamento não encontrado");
  const userId = orcamentoToUpdate.data().userId;
  const orcamentoDoc = doc(db, 'empresa', userId, 'orcamentos', orcamentoId);
  await updateDoc(orcamentoDoc, { status, ...payload });
};

// Delete an orcamento
export const deleteOrcamento = async (orcamentoId: string) => {
    const orcamentoToUpdate = await getDoc(doc(db, 'orcamentos', orcamentoId));
    if (!orcamentoToUpdate.exists()) throw new Error("Orçamento não encontrado");
    const userId = orcamentoToUpdate.data().userId;
    const orcamentoDoc = doc(db, 'empresa', userId, 'orcamentos', orcamentoId);
    await deleteDoc(orcamentoDoc);
};

// Get all orcamentos for a user
export const getOrcamentos = async (userId: string): Promise<Orcamento[]> => {
  try {
    const orcamentosCollection = getOrcamentosCollection(userId);
    const q = query(orcamentosCollection, where('userId', '==', userId), orderBy('numeroOrcamento', 'desc'));
    const querySnapshot = await getDocs(q);
    const orcamentos: Orcamento[] = [];
    querySnapshot.forEach((doc) => {
      orcamentos.push({ id: doc.id, ...doc.data() } as Orcamento);
    });
    return orcamentos;
  } catch(e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};

// Get the next sequential orcamento number for the current year
export const getNextOrcamentoNumber = async (userId: string): Promise<string> => {
    if (!userId) {
      throw new Error("User ID é nulo, impossível gerar número do orçamento.");
    }
    
    console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Chamado com userId: ${userId}`);
    
    try {
        const orcamentosCollection = getOrcamentosCollection(userId);
        const q = query(
            orcamentosCollection,
            where('userId', '==', userId),
            orderBy('numeroOrcamento', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        
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
        const newNumeroOrcamento = `${currentYear}-${String(newSequence).padStart(3, '0')}`;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Última sequência para ${currentYear}: ${lastSequence}. Novo número: ${newNumeroOrcamento}`);
        return newNumeroOrcamento;

    } catch (error: any) {
        console.warn("Falha ao buscar número sequencial online (provavelmente offline), usando fallback:", error.message);
        const offlineNumber = `${new Date().getFullYear()}-TEMP-${Date.now()}`;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Gerando número de fallback offline: ${offlineNumber}`);
        return offlineNumber;
    }
};

export const syncOfflineOrcamentos = async (userId: string) => {
    if (!navigator.onLine || !userId) {
        console.log("Offline ou sem usuário, pulando sincronização.");
        return;
    }

    try {
        const orcamentosCollection = getOrcamentosCollection(userId);
        const q = query(orcamentosCollection, where('userId', '==', userId), where('numeroOrcamento', '>=', '0-TEMP-'), where('numeroOrcamento', '<=', '9-TEMP-~'));
        const querySnapshot = await getDocs(q);
        
        const offlineOrcamentos = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Orcamento))
            .filter(orc => orc.numeroOrcamento && orc.numeroOrcamento.includes('TEMP'));
        
        if (offlineOrcamentos.length === 0) {
            console.log("Nenhum orçamento offline para sincronizar.");
            return;
        }

        console.log(`Sincronizando ${offlineOrcamentos.length} orçamentos offline...`);

        offlineOrcamentos.sort((a, b) => {
            const timeA = parseInt(a.numeroOrcamento.split('-').pop() || '0');
            const timeB = parseInt(b.numeroOrcamento.split('-').pop() || '0');
            return timeA - timeB;
        });
        
        for (const orcamento of offlineOrcamentos) {
            try {
                const newNumeroOrcamento = await getNextOrcamentoNumber(userId);
                if (newNumeroOrcamento.includes('TEMP')) {
                    console.log("Ainda offline, não é possível sincronizar os números dos orçamentos.");
                    return; 
                }
                
                const docRef = doc(db, 'empresa', userId, 'orcamentos', orcamento.id);
                await updateDoc(docRef, { numeroOrcamento: newNumeroOrcamento });
                console.log(`Atualizando orçamento ${orcamento.numeroOrcamento} para ${newNumeroOrcamento}`);
            } catch(e) {
                console.error(`Erro ao gerar novo número para o orçamento ${orcamento.id}. Pulando.`, e);
            }
        }

        console.log("Sincronização de orçamentos offline concluída.");

    } catch (error) {
        console.error("Erro ao buscar orçamentos para sincronização:", error);
    }
};
