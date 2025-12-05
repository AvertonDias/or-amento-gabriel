"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PermissionRequest {
  title: string;
  description: string;
}

interface PermissionDialogContextType {
  requestPermission: (request: PermissionRequest) => Promise<boolean>;
}

const PermissionDialogContext = createContext<PermissionDialogContextType | undefined>(undefined);

export function PermissionDialogProvider({ children }: { children: ReactNode }) {
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>(() => {});

  const requestPermission = useCallback((request: PermissionRequest) => {
    return new Promise<boolean>((resolve) => {
      setPermissionRequest(request);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleAllow = () => {
    resolvePromise(true);
    setPermissionRequest(null);
  };

  const handleDeny = () => {
    resolvePromise(false);
    setPermissionRequest(null);
  };

  return (
    <PermissionDialogContext.Provider value={{ requestPermission }}>
      {children}
      <AlertDialog open={!!permissionRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{permissionRequest?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {permissionRequest?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeny}>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={handleAllow}>Permitir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionDialogContext.Provider>
  );
}

export function usePermissionDialog() {
  const context = useContext(PermissionDialogContext);
  if (context === undefined) {
    throw new Error('usePermissionDialog must be used within a PermissionDialogProvider');
  }
  return context;
}
