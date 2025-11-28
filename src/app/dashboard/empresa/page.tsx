
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page has been merged into /dashboard/configuracoes
export default function DeprecatedEmpresaPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/configuracoes');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Redirecionando para a página de Configurações...</p>
        </div>
    );
}
