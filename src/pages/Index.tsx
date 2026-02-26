import { usePayment } from '@/contexts/PaymentContext';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, MapPin, Plane, Copy, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import decolarLogo from '@/assets/decolar-logo.png';

const Index = () => {
  const { payment } = usePayment();

  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-8">
          <Plane className="mx-auto mb-4 h-12 w-12 text-primary animate-pulse-slow" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Nenhum pagamento disponível</h1>
          <p className="text-muted-foreground">Aguardando geração de pagamento pelo administrador.</p>
        </div>
      </div>
    );
  }

  const initials = payment.clientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 1)
    .toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(payment.pixCode);
    toast.success('Código PIX copiado!');
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(payment.value);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex justify-center py-4">
        <img src={decolarLogo} alt="Decolar" className="h-8" />
      </header>

      {/* Status badge */}
      <div className="flex justify-center mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning/10 px-4 py-1.5 text-sm font-medium text-warning">
          <Clock className="h-4 w-4" />
          Aguardando Pagamento
        </span>
      </div>

      {/* Main card */}
      <div className="mx-auto max-w-lg px-4">
        {/* Destination header */}
        <div className="gradient-header rounded-t-xl p-6 text-center text-primary-foreground relative overflow-hidden">
          <Plane className="absolute top-4 right-4 h-8 w-8 opacity-30" />
          <div className="flex items-center justify-center gap-2 text-sm opacity-90 mb-1">
            <MapPin className="h-4 w-4" />
            Destino
          </div>
          <h2 className="text-xl font-bold">{payment.destination}</h2>
          <p className="text-sm opacity-80 mt-1">{payment.destinationDescription} {payment.destinationEmoji}</p>
        </div>

        {/* Card body */}
        <div className="rounded-b-xl bg-card shadow-lg border border-border p-6 space-y-5">
          {/* Order info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Plane className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">Passagem Aérea</p>
              <p className="text-sm text-muted-foreground">Pedido #{payment.orderNumber}</p>
            </div>
          </div>

          {/* Client */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Cliente</p>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {initials}
              </div>
              <div>
                <p className="font-medium text-card-foreground">{payment.clientName}</p>
                <p className="text-sm text-muted-foreground">{payment.cpf}</p>
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor da passagem</span>
              <span className="text-card-foreground">{formattedValue}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="font-semibold text-card-foreground">Total a pagar</span>
              <span className="text-2xl font-bold text-highlight">{formattedValue}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center py-4">
            <div className="rounded-xl border border-border p-4 bg-card">
              <QRCodeSVG value={payment.pixCode} size={200} />
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-accent/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-card-foreground text-sm">Como pagar:</p>
                <ol className="mt-1 space-y-0.5 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Escaneie o QR Code ou copie o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>
            </div>
          </div>

          {/* PIX code */}
          <div>
            <p className="text-center text-sm font-medium text-card-foreground mb-2">PIX Copia e Cola</p>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground break-all font-mono leading-relaxed">
                {payment.pixCode}
              </p>
            </div>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar Código PIX
          </button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-4 w-4" />
            <span>Pagamento seguro e protegido</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Após o pagamento, a confirmação será processada automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
