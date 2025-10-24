import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
           <img
            src="/apple-touch-icon.png"
            alt="Logo da Empresa"
            width={80}
            height={80}
            className="mb-4 rounded-lg"
          />
          <CardTitle>Você está offline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sem conexão com a internet no momento.
          </p>
          <p className="text-muted-foreground mt-2">
            Por favor, conecte-se e recarregue a página.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
