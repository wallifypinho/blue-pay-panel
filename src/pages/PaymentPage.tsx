import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePayment, PaymentData } from '@/contexts/PaymentContext';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, MapPin, Plane, Copy, Shield, CheckCircle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import azulLogo from '@/assets/azul-viagens-logo.png';

const PaymentPage = () => {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const { loadPayment } = usePayment();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (id) {
        const data = await loadPayment(id);
        setPayment(data);
      } else if (code) {
        // Load by short_code
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('short_code', code.toUpperCase())
          .single();
      if (!error && data) {
          setPayment({
            id: data.id,
            clientName: data.client_name,
            cpf: data.cpf,
            destination: data.destination,
            destinationEmoji: data.destination_emoji,
            destinationDescription: data.destination_description,
            value: Number(data.value),
            pixCode: data.pix_code,
            orderNumber: data.order_number,
            whatsapp: data.whatsapp || '',
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [id, code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <Plane className="h-12 w-12 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
          <p className="text-muted-foreground">Carregando pagamento...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-8">
          <Plane className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Pagamento não encontrado</h1>
          <p className="text-muted-foreground">Este link de pagamento é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  const initials = payment.clientName.split(' ').map((n) => n[0]).join('').substring(0, 1).toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(payment.pixCode);
    toast.success('Código PIX copiado!');
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="flex justify-center py-4">
        <img src={azulLogo} alt="Azul Viagens" className="h-24" />
      </header>

      <div className="flex justify-center mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning/10 px-4 py-1.5 text-sm font-medium text-warning animate-pulse" style={{ animationDuration: '3s' }}>
          <Clock className="h-4 w-4" />
          Aguardando Pagamento
        </span>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Redesigned header with gradient, patterns, and animations */}
        <div className="rounded-t-2xl relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%), hsl(225 80% 40%))'
        }}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-white" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full opacity-5 bg-white" />

          {/* Floating planes */}
          <Plane 
            className="absolute top-3 right-6 h-7 w-7 text-white/20" 
            style={{ 
              animation: 'float-plane 4s ease-in-out infinite',
              transform: 'rotate(-15deg)'
            }} 
          />
          <Plane 
            className="absolute bottom-4 right-16 h-5 w-5 text-white/15" 
            style={{ 
              animation: 'float-plane 5s ease-in-out infinite 1s',
              transform: 'rotate(10deg)'
            }} 
          />
          <Plane 
            className="absolute top-8 left-8 h-4 w-4 text-white/10" 
            style={{ 
              animation: 'float-plane 6s ease-in-out infinite 2s',
              transform: 'rotate(-30deg)'
            }} 
          />

          {/* Dotted pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

          <div className="relative z-10 p-8 text-center text-white">
            <div className="flex items-center justify-center gap-2 text-sm opacity-80 mb-2">
              <MapPin className="h-4 w-4" style={{ animation: 'bounce-subtle 2s ease-in-out infinite' }} />
              <span className="tracking-wider uppercase text-xs font-medium">Destino</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight animate-fade-in">{payment.destination}</h2>
            <p className="text-sm opacity-70 mt-2">{payment.destinationDescription} {payment.destinationEmoji}</p>
          </div>

          {/* Bottom wave */}
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 30" preserveAspectRatio="none" style={{ height: '20px' }}>
            <path d="M0,30 C100,0 300,0 400,30 L400,30 L0,30 Z" fill="hsl(var(--card))" />
          </svg>
        </div>

        <div className="rounded-b-2xl bg-card shadow-xl border border-border border-t-0 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Plane className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">Passagem Aérea</p>
              <p className="text-sm text-muted-foreground">Pedido #{payment.orderNumber}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Cliente</p>
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {initials}
              </div>
              <div>
                <p className="font-medium text-card-foreground">{payment.clientName}</p>
                <p className="text-sm text-muted-foreground">{payment.cpf}</p>
              </div>
            </div>
          </div>

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

          <div className="flex justify-center py-4">
            <div className="rounded-xl border-2 border-primary/20 p-4 bg-card shadow-sm">
              <QRCodeSVG value={payment.pixCode} size={200} />
            </div>
          </div>

          <div className="rounded-xl bg-accent/50 p-4">
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

          <div>
            <p className="text-center text-sm font-medium text-card-foreground mb-2">PIX Copia e Cola</p>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground break-all font-mono leading-relaxed">
                {payment.pixCode}
              </p>
            </div>
          </div>

          <button onClick={handleCopy}
            className="w-full rounded-xl py-3 font-semibold text-primary-foreground transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 42%))' }}>
            <Copy className="h-4 w-4" />
            Copiar Código PIX
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-4 w-4" />
            <span>Pagamento seguro e protegido</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Após o pagamento, a confirmação será processada automaticamente.
          </p>

          <a href={payment.whatsapp ? `https://wa.me/${payment.whatsapp}` : 'https://wa.me/message/7JZNHRKEYXZWE1'} target="_blank" rel="noopener noreferrer"
            className="w-full rounded-xl bg-[#25D366] py-3 font-semibold text-white transition-all hover:shadow-lg hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Enviar Comprovante via WhatsApp
          </a>
        </div>
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes float-plane {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-8px) rotate(-10deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
};

export default PaymentPage;
