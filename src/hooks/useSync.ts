
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, where, query } from 'firebase/firestore';

import { db as dexieDB } from '@/lib/dexie';
import { db as firestoreDB, auth } from '@/lib/firebase';
import { useToast } from './use-toast';

import { syncClienteToFirestore, deleteClienteFromFirestore } from '@/services/clientesService';
import { syncMaterialToFirestore, deleteMaterialFromFirestore } from '@/services/materiaisService';
import { syncOrcamentoToFirestore, deleteOrcamentoFromFirestore } from '@/services/orcamentosService';
import { syncEmpresaToFirestore } from '@/services/empresaService';

type SyncableCollection = 'clientes' | 'materiais' | 'orcamentos' | 'empresa';

const syncFunctions: Record<SyncableCollection, (data: any) => Promise<void>> = {
  clientes: syncClienteToFirestore,
  materiais: syncMaterialToFirestore,
  orcamentos: syncOrcamentoToFirestore,
  empresa: syncEmpresaToFirestore,
};

const deleteFunctions: Record<string, (id: string) => Promise<void>> = {
  clientes: deleteClienteFromFirestore,
  materiais: deleteMaterialFromFirestore,
  orcamentos: deleteOrcamentoFromFirestore,
};

export function useSync() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncLock = useRef(false);
  const initialSyncDone = useRef(false);

  const pendingItems = useLiveQuery(async () => {
    if (!isOnline || !user) return { count: 0 };

    const [clientes, materiais, orcamentos, empresa, deletions] = await Promise.all([
      dexieDB.clientes.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.materiais.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.orcamentos.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.empresa.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.deletions.where('userId').equals(user.uid).count(),
    ]);

    return { count: clientes + materiais + orcamentos + empresa + deletions };
  }, [isOnline, user]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const pushToFirestore = useCallback(async () => {
    if (!user || !isOnline || syncLock.current) return;

    syncLock.current = true;
    setIsSyncing(true);

    try {
      const syncCollection = async (collectionName: SyncableCollection) => {
        const items = await (dexieDB as any)[collectionName]
          .where({ syncStatus: 'pending', userId: user.uid })
          .toArray();

        for (const item of items) {
          try {
            await syncFunctions[collectionName](item.data);
            await (dexieDB as any)[collectionName].update(item.id, {
              syncStatus: 'synced',
              syncError: null,
            });
          } catch (error) {
            console.error(`Erro ao sincronizar ${collectionName}`, error);
            await (dexieDB as any)[collectionName].update(item.id, {
              syncStatus: 'error',
              syncError: String(error),
            });
          }
        }
      };

      const syncDeletions = async () => {
        const deletions = await dexieDB.deletions
          .where('userId')
          .equals(user.uid)
          .toArray();

        for (const item of deletions) {
          try {
            const fn = deleteFunctions[item.collection];
            if (fn) {
              await fn(item.id);
            }
            await dexieDB.deletions.delete(item.id);
          } catch (error) {
            console.error('Erro ao sincronizar exclusão', error);
          }
        }
      };

      await syncCollection('empresa');
      await syncCollection('clientes');
      await syncCollection('materiais');
      await syncCollection('orcamentos');
      await syncDeletions();
    } catch {
      toast({
        title: 'Erro na sincronização',
        description: 'Alguns dados não puderam ser enviados.',
        variant: 'destructive',
      });
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [user, isOnline, toast]);

  const pullFromFirestore = useCallback(async () => {
    if (!user || !isOnline || syncLock.current) return;
  
    syncLock.current = true;
    setIsSyncing(true);
  
    try {
      const collections: SyncableCollection[] = ['clientes', 'materiais', 'orcamentos', 'empresa'];
  
      for (const coll of collections) {
        const q = query(collection(firestoreDB, coll), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
  
        if (!snapshot.empty) {
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            userId: user.uid,
            data: doc.data(),
            syncStatus: 'synced',
            syncError: null,
          }));
  
          // Limpa a tabela local SOMENTE APÓS buscar os dados com sucesso
          await (dexieDB as any)[coll].where('userId').equals(user.uid).delete();
          await (dexieDB as any)[coll].bulkPut(items);
        } else {
          // Se não há nada no Firestore, verifica se há algo localmente antes de limpar
          const localCount = await (dexieDB as any)[coll].where('userId').equals(user.uid).count();
          if (localCount > 0) {
            await (dexieDB as any)[coll].where('userId').equals(user.uid).delete();
          }
        }
      }
    } catch (error) {
        console.error("Erro ao puxar dados do Firestore:", error);
        toast({
            title: 'Erro ao buscar dados da nuvem',
            description: 'Não foi possível sincronizar os dados. Tente novamente mais tarde.',
            variant: 'destructive',
        });
    } finally {
        syncLock.current = false;
        setIsSyncing(false);
    }
  }, [user, isOnline, toast]);

  useEffect(() => {
    if (isOnline && user && !initialSyncDone.current) {
      initialSyncDone.current = true;
      (async () => {
        await pushToFirestore();
        await pullFromFirestore();
      })();
    }
  }, [isOnline, user, pushToFirestore, pullFromFirestore]);

  useEffect(() => {
    const count = pendingItems?.count ?? 0;
  
    if (count > 0 && isOnline && !isSyncing) {
      pushToFirestore();
    }
  }, [pendingItems, isOnline, isSyncing, pushToFirestore]);
 
  return {
    isOnline,
    isSyncing,
    pendingCount: pendingItems?.count ?? 0,
  };
}
