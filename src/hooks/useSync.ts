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

const syncFunctions: Record<SyncableCollection, (data: any) => Promise<any>> = {
  clientes: syncClienteToFirestore,
  materiais: syncMaterialToFirestore,
  orcamentos: syncOrcamentoToFirestore,
  empresa: syncEmpresaToFirestore,
};

const deleteFunctions: Record<string, (id: string) => Promise<any>> = {
  clientes: deleteClienteFromFirestore,
  materiais: deleteMaterialFromFirestore,
  orcamentos: deleteOrcamentoFromFirestore,
};

export function useSync() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncLock = useRef(false); // 🔒 trava real contra concorrência

  const pendingItems = useLiveQuery(async () => {
    if (!isOnline || !user) return { count: 0 };

    const [clientes, materiais, orcamentos, empresa, deletions] = await Promise.all([
      dexieDB.clientes.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.materiais.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.orcamentos.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.empresa.where({ syncStatus: 'pending', userId: user.uid }).count(),
      dexieDB.deletions.count(),
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

    const syncCollection = async (collectionName: SyncableCollection) => {
      const items = await (dexieDB as any)[collectionName]
        .where({ syncStatus: 'pending', userId: user.uid })
        .toArray();

      for (const item of items) {
        try {
          await syncFunctions[collectionName](item.data);
          await (dexieDB as any)[collectionName].update(item.id, {
            syncStatus: 'synced',
          });
        } catch (error) {
          console.error(`Erro ao sincronizar ${collectionName} (${item.id})`, error);
          await (dexieDB as any)[collectionName].update(item.id, {
            syncStatus: 'error',
            syncError: String(error),
          });
        }
      }
    };

    const syncDeletions = async () => {
      const deletions = await dexieDB.deletions.toArray();
      for (const item of deletions) {
        try {
          const fn = deleteFunctions[item.collection];
          if (fn) await fn(item.id);
          await dexieDB.deletions.delete(item.id);
        } catch (error) {
          console.error('Erro ao sincronizar exclusão', error);
        }
      }
    };

    try {
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
          }));
          await (dexieDB as any)[coll].bulkPut(items);
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao buscar dados da nuvem', variant: 'destructive' });
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [user, isOnline, toast]);

  useEffect(() => {
    if (isOnline && user) {
      pushToFirestore().then(pullFromFirestore);
    }
  }, [isOnline, user, pushToFirestore, pullFromFirestore]);

  useEffect(() => {
    if (pendingItems?.count && pendingItems.count > 0 && isOnline && !isSyncing) {
      pushToFirestore();
    }
  }, [pendingItems, isOnline, isSyncing, pushToFirestore]);

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingItems?.count ?? 0,
  };
}
