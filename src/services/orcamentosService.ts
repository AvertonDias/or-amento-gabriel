
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, writeBatch, Timestamp, getDoc, limit, serverTimestamp } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = (orcamento: Omit<Orcamento, 'id'>) => {
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
  
  // Nao usamos await aqui para permitir que o firebase gerencie a fila offline
  addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento)
    .then(docRef => {
      console.log("[ORCAMENTO SERVICE - addOrcamento] Orçamento adicionado à fila com ID temporário/local.");
    })
    .catch(error => {
      console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error.message);
      // Mesmo com erro, o Firestore offline deve ter gerenciado isso.
      // O erro aqui provavelmente seria sobre regras de segurança ou configuração.
    });
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
        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId),
            where('numeroOrcamento', '>=', `${currentYear}-000`),
            where('numeroOrcamento', '<', `${currentYear + 1}-000`),
            orderBy('numeroOrcamento', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

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
        const offlineNumber = `${currentYear}-TEMP-${Date.now()}`;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Gerando número de fallback offline: ${offlineNumber}`);
        return offlineNumber;
    }
};

export const syncOfflineOrcamentos = async (userId: string) => {
    if (!userId) return;

    try {
        const q = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const offlineOrcamentos = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Orcamento))
            .filter(orc => orc.numeroOrcamento && orc.numeroOrcamento.includes('TEMP'));
        
        if (offlineOrcamentos.length === 0) {
            console.log("Nenhum orçamento offline para sincronizar.");
            return;
        }

        console.log(`Sincronizando ${offlineOrcamentos.length} orçamentos offline...`);

        // Ordena para processar os mais antigos primeiro
        offlineOrcamentos.sort((a, b) => {
            const timeA = parseInt(a.numeroOrcamento.split('-').pop() || '0');
            const timeB = parseInt(b.numeroOrcamento.split('-').pop() || '0');
            return timeA - timeB;
        });
        
        const batch = writeBatch(db);

        for (const orcamento of offlineOrcamentos) {
            try {
                const newNumeroOrcamento = await getNextOrcamentoNumber(userId);
                // Se ainda estivermos offline, o número conterá TEMP, então abortamos a sincronização.
                if (newNumeroOrcamento.includes('TEMP')) {
                    console.warn("Ainda offline, não é possível sincronizar os números dos orçamentos.");
                    return; 
                }
                
                const docRef = doc(db, ORCAMENTOS_COLLECTION, orcamento.id);
                batch.update(docRef, { numeroOrcamento: newNumeroOrcamento });
                console.log(`Atualizando orçamento ${orcamento.numeroOrcamento} para ${newNumeroOrcamento}`);
            } catch(e) {
                console.error(`Erro ao gerar novo número para o orçamento ${orcamento.id}. Pulando.`, e);
            }
        }

        await batch.commit();
        console.log("Sincronização de orçamentos offline concluída.");

    } catch (error) {
        console.error("Erro ao buscar orçamentos para sincronização:", error);
    }
};
