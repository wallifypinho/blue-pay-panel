import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Settings, Plus, Link, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const getBaseUrl = () => window.location.origin;

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

interface Operator {
  id: string;
  name: string;
  slug: string;
  password: string;
}

const OperatorPanel = () => {
  const { slug } = useParams<{ slug: string }>();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form
  const [clientName, setClientName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('✈️');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [value, setValue] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOperator = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        setNotFound(true);
        return;
      }
      setOperator(data);
    };
    loadOperator();
  }, [slug]);

  const fetchPayments = async () => {
    if (!operator) return;
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: false });
    if (data) setPayments(data);
  };

  useEffect(() => {
    if (authenticated && operator) fetchPayments();
  }, [authenticated, operator]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (operator && password === operator.password) {
      setAuthenticated(true);
    } else {
      toast.error('Senha incorreta.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    if (!clientName || !cpfRaw || !destination || !value || !pixCode) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
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
        operator_id: operator.id,
      });
    setLoading(false);

    if (error) {
      toast.error('Erro ao salvar.');
      return;
    }

    toast.success('Pagamento gerado!');
    setClientName(''); setCpfRaw(''); setDestination('');
    setDestinationEmoji('✈️'); setDestinationDescription('');
    setValue(''); setPixCode('');
    fetchPayments();
  };

  const getPaymentLink = (id: string) => `${getBaseUrl()}/pay/${id}`;

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(getPaymentLink(id));
    toast.success('Link copiado!');
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Painel não encontrado.</p>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl bg-card border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Painel de {operator.name}</h1>
            </div>
          </div>
          <label className="block text-sm font-medium text-card-foreground mb-1">Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de {operator.name}</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus pagamentos</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
            <h2 className="font-semibold text-lg text-card-foreground mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" /> Novo Pagamento
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Nome do Cliente *</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">CPF *</label>
                <input type="text" value={cpfRaw} onChange={e => setCpfRaw(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Destino *</label>
                <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Descrição</label>
                  <input type="text" value={destinationDescription} onChange={e => setDestinationDescription(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Emoji</label>
                  <input type="text" value={destinationEmoji} onChange={e => setDestinationEmoji(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Código PIX *</label>
                <textarea value={pixCode} onChange={e => setPixCode(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Gerar Pagamento'}
              </button>
            </form>
          </div>

          {/* Lista */}
          <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
            <h2 className="font-semibold text-lg text-card-foreground mb-4">Meus Pagamentos ({payments.length})</h2>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum pagamento.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="rounded-lg border border-border bg-background overflow-hidden">
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{p.destination_emoji}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.destination}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-sm text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
                        </span>
                        {expandedId === p.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedId === p.id && (
                      <div className="border-t border-border p-3 space-y-3">
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                          <p className="text-xs text-muted-foreground break-all font-mono">{getPaymentLink(p.id)}</p>
                        </div>
                        <div className="flex justify-center py-2">
                          <QRCodeSVG value={p.pix_code} size={100} />
                        </div>
                        <button onClick={() => handleCopyLink(p.id)}
                          className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:opacity-80">
                          <Link className="h-3 w-3" /> Copiar Link
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorPanel;
