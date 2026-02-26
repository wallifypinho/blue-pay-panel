import { useState } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Settings, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const generateOrderNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const maskCPF = (cpf: string) => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 11) return cpf;
  return `${digits.substring(0, 3)}.***.***-${digits.substring(9, 11)}`;
};

const Admin = () => {
  const { payment, setPayment, clearPayment } = usePayment();
  const navigate = useNavigate();

  const [clientName, setClientName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('✈️');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [value, setValue] = useState('');
  const [pixCode, setPixCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !cpfRaw || !destination || !value || !pixCode) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const data = {
      clientName,
      cpf: maskCPF(cpfRaw),
      destination,
      destinationEmoji,
      destinationDescription,
      value: parseFloat(value),
      pixCode,
      orderNumber: generateOrderNumber(),
    };

    setPayment(data);
    toast.success('Pagamento gerado com sucesso!');
  };

  const handleClear = () => {
    clearPayment();
    toast.info('Pagamento removido.');
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel do Cobrador</h1>
            <p className="text-sm text-muted-foreground">Gere e gerencie pagamentos</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
            <h2 className="font-semibold text-lg text-card-foreground mb-4">Gerar Pagamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">CPF *</label>
                <input
                  type="text"
                  value={cpfRaw}
                  onChange={(e) => setCpfRaw(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Destino *</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Campinas (Viracopos) – VCP"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Descrição</label>
                  <input
                    type="text"
                    value={destinationDescription}
                    onChange={(e) => setDestinationDescription(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Tecnologia e natureza!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Emoji</label>
                  <input
                    type="text"
                    value={destinationEmoji}
                    onChange={(e) => setDestinationEmoji(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="🌻"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="556.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Código PIX (copia e cola) *</label>
                <textarea
                  value={pixCode}
                  onChange={(e) => setPixCode(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Cole o código PIX aqui..."
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Gerar Pagamento
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-card-foreground">Pagamento Ativo</h2>
              <div className="flex gap-2">
                {payment && (
                  <>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-80"
                    >
                      <Eye className="h-3 w-3" /> Ver
                    </button>
                    <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:opacity-80"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  </>
                )}
              </div>
            </div>

            {payment ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium text-card-foreground">{payment.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF</span>
                    <span className="font-medium text-card-foreground">{payment.cpf}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destino</span>
                    <span className="font-medium text-card-foreground">{payment.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pedido</span>
                    <span className="font-medium text-card-foreground">#{payment.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-bold text-highlight">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center py-3">
                  <QRCodeSVG value={payment.pixCode} size={120} />
                </div>

                <div className="rounded-lg bg-muted p-2">
                  <p className="text-xs text-muted-foreground break-all font-mono">{payment.pixCode}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhum pagamento gerado ainda.</p>
                <p className="text-muted-foreground text-xs mt-1">Preencha o formulário ao lado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
