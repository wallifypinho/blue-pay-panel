import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Settings, Trash2, Link, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const PUBLISHED_URL = 'https://centralazul.site';

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

interface Payment {
  id: string;
  client_name: string;
  cpf: string;
  destination: string;
  destination_emoji: string;
  destination_description: string;
  value: number;
  pix_code: string;
  order_number: string;
  created_at: string;
}

const Admin = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('✈️');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [value, setValue] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPayments(data);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !cpfRaw || !destination || !value || !pixCode) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    const { data: inserted, error } = await supabase
      .from('payments')
      .insert({
        client_name: clientName,
        cpf: maskCPF(cpfRaw),
        destination,
        destination_emoji: destinationEmoji,
        destination_description: destinationDescription,
        value: parseFloat(value),
        pix_code: pixCode,
        order_number: generateOrderNumber(),
      })
      .select()
      .single();
    setLoading(false);

    if (error || !inserted) {
      toast.error('Erro ao salvar pagamento.');
      return;
    }

    toast.success('Pagamento gerado com sucesso!');
    setClientName('');
    setCpfRaw('');
    setDestination('');
    setDestinationEmoji('✈️');
    setDestinationDescription('');
    setValue('');
    setPixCode('');
    setExpandedId(inserted.id);
    fetchPayments();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (!error) {
      toast.info('Pagamento removido.');
      fetchPayments();
    }
  };

  const getPaymentLink = (id: string) => `${PUBLISHED_URL}/pay/${id}`;

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(getPaymentLink(id));
    toast.success('Link copiado!');
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel do Cobrador</h1>
            <p className="text-sm text-muted-foreground">Gere e gerencie múltiplos pagamentos</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="rounded-xl bg-card border border-border p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-lg text-card-foreground mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" /> Novo Pagamento
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Nome do Cliente *</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">CPF *</label>
              <input type="text" value={cpfRaw} onChange={(e) => setCpfRaw(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Destino *</label>
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Campinas (Viracopos) – VCP" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Descrição</label>
                <input type="text" value={destinationDescription} onChange={(e) => setDestinationDescription(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Tecnologia e natureza!" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Emoji</label>
                <input type="text" value={destinationEmoji} onChange={(e) => setDestinationEmoji(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="🌻" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="556.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Código PIX *</label>
              <textarea value={pixCode} onChange={(e) => setPixCode(e.target.value)} rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Cole o código PIX aqui..." />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                {loading ? 'Salvando...' : 'Gerar Pagamento'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Pagamentos */}
        <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-card-foreground mb-4">
            Pagamentos ({payments.length})
          </h2>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum pagamento gerado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-background overflow-hidden">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{p.destination_emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-sm text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
                      </span>
                      {expandedId === p.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === p.id && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-xs font-medium text-primary mb-1">Link para o cliente:</p>
                        <p className="text-xs text-muted-foreground break-all font-mono">{getPaymentLink(p.id)}</p>
                      </div>

                      <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CPF</span>
                          <span className="font-medium text-card-foreground">{p.cpf}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pedido</span>
                          <span className="font-medium text-card-foreground">#{p.order_number}</span>
                        </div>
                      </div>

                      <div className="flex justify-center py-2">
                        <QRCodeSVG value={p.pix_code} size={100} />
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => handleCopyLink(p.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:opacity-80">
                          <Link className="h-3 w-3" /> Copiar Link
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:opacity-80">
                          <Trash2 className="h-3 w-3" /> Remover
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
