import { Plane } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-8">
        <Plane className="mx-auto mb-4 h-12 w-12 text-primary animate-pulse" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Azul Viagens</h1>
        <p className="text-muted-foreground">Acesse o link de pagamento enviado pelo atendente.</p>
      </div>
    </div>
  );
};

export default Index;
