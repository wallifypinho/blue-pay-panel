import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Settings, Plus, Link, ChevronDown, ChevronUp, Trash2, AlertTriangle, MessageCircle, Pencil, Check, Zap, Eye, EyeOff } from 'lucide-react';

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
  short_code: string;
  payment_method?: string;
}

interface OperatorInfo {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
}

interface GatewayOption {
  id: string;
  name: string;
  api_url?: string;
  is_active?: boolean;
}

const OperatorPanel = () => {
  const { slug } = useParams<{ slug: string }>();
  const [operator, setOperator] = useState<OperatorInfo | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loadingOperator, setLoadingOperator] = useState(true);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form
  const [clientName, setClientName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('✈️');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [value, setValue] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'gateway'>('manual');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState('');

  // Gateway management
  const [showGatewayForm, setShowGatewayForm] = useState(false);
  const [gwName, setGwName] = useState('');
  const [gwApiUrl, setGwApiUrl] = useState('');
  const [gwSecretKey, setGwSecretKey] = useState('');
  const [gwPublicKey, setGwPublicKey] = useState('');
  const [gwLoading, setGwLoading] = useState(false);
  const [deleteGwId, setDeleteGwId] = useState<string | null>(null);
  const [showSecretKeys, setShowSecretKeys] = useState<Record<string, boolean>>({});

  const operatorAction = async (action: string, data: any = {}) => {
    if (!operator || !sessionToken) return null;
    const { data: result, error } = await supabase.functions.invoke('operator-action', {
      body: { action, sessionToken, operatorId: operator.id, data },
    });
    if (error) {
      toast.error('Erro na operação.');
      return null;
    }
    if (result?.error === 'Invalid or expired session') {
      setSessionBlocked(true);
      setAuthenticated(false);
      localStorage.removeItem(`op_session_${slug}`);
      return null;
    }
    if (result?.error) {
      toast.error(result.error);
      return null;
    }
    return result;
  };

  useEffect(() => {
    const loadOperator = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('operators')
        .select('id, name, slug, whatsapp')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        setNotFound(true);
        setLoadingOperator(false);
        return;
      }
      setOperator({ id: data.id, name: data.name, slug: data.slug, whatsapp: data.whatsapp || '' });
      setWhatsappInput(data.whatsapp || '');
      setLoadingOperator(false);

      const storedToken = localStorage.getItem(`op_session_${slug}`);
      if (storedToken) {
        const { data: result } = await supabase.functions.invoke('operator-action', {
          body: { action: 'list-payments', sessionToken: storedToken, operatorId: data.id, data: {} },
        });
        if (result && !result.error) {
          setSessionTokenState(storedToken);
          setAuthenticated(true);
          if (result.payments) setPayments(result.payments);
        } else {
          localStorage.removeItem(`op_session_${slug}`);
        }
      }
    };
    loadOperator();
  }, [slug]);

  const fetchPayments = async () => {
    const result = await operatorAction('list-payments');
    if (result?.payments) setPayments(result.payments);
  };

  const fetchGateways = async () => {
    const result = await operatorAction('list-gateways');
    if (result?.gateways) setGateways(result.gateways);
  };

  useEffect(() => {
    if (authenticated && operator && sessionToken) {
      fetchPayments();
      fetchGateways();
    }
  }, [authenticated, operator, sessionToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    const { data, error } = await supabase.functions.invoke('operator-login', {
      body: { slug, password },
    });

    if (error || !data?.success) {
      toast.error('Senha incorreta.');
      return;
    }

    localStorage.setItem(`op_session_${slug}`, data.sessionToken);
    setSessionTokenState(data.sessionToken);
    setOperator(data.operator);
    setWhatsappInput(data.operator.whatsapp || '');
    setSessionBlocked(false);
    setAuthenticated(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    if (!clientName || !cpfRaw || !destination || !value) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (paymentMethod === 'manual' && !pixCode) {
      toast.error('Código PIX é obrigatório para pagamento manual.');
      return;
    }

    if (paymentMethod === 'gateway' && !selectedGatewayId) {
      toast.error('Selecione um gateway.');
      return;
    }

    setLoading(true);
    const result = await operatorAction('create-payment', {
      client_name: clientName,
      cpf: maskCPF(cpfRaw),
      destination,
      destination_emoji: destinationEmoji,
      destination_description: destinationDescription,
      value: parseFloat(value),
      pix_code: paymentMethod === 'manual' ? pixCode : '',
      order_number: generateOrderNumber(),
      payment_method: paymentMethod,
      gateway_id: paymentMethod === 'gateway' ? selectedGatewayId : null,
    });
    setLoading(false);

    if (!result?.success) return;

    toast.success('Pagamento gerado!');
    setClientName(''); setCpfRaw(''); setDestination('');
    setDestinationEmoji('✈️'); setDestinationDescription('');
    setValue(''); setPixCode('');
    setPaymentMethod('manual'); setSelectedGatewayId('');
    fetchPayments();
  };

  const handleDeletePayment = async (id: string) => {
    const result = await operatorAction('delete-payment', { id });
    if (result?.success) {
      toast.success('Pagamento excluído!');
      setDeleteConfirmId(null);
      setExpandedId(null);
      fetchPayments();
    }
  };

  const getPaymentLink = (shortCode: string) => `${PUBLISHED_URL}/p/${shortCode}`;

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(getPaymentLink(id));
    toast.success('Link copiado!');
  };

  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gwName || !gwApiUrl || !gwSecretKey) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setGwLoading(true);
    const result = await operatorAction('create-gateway', {
      name: gwName, api_url: gwApiUrl, secret_key: gwSecretKey, public_key: gwPublicKey,
    });
    setGwLoading(false);
    if (result?.success) {
      toast.success('Gateway adicionado!');
      setGwName(''); setGwApiUrl(''); setGwSecretKey(''); setGwPublicKey('');
      setShowGatewayForm(false);
      fetchGateways();
    }
  };

  const handleDeleteGateway = async (id: string) => {
    const result = await operatorAction('delete-gateway', { id });
    if (result?.success) {
      toast.success('Gateway excluído!');
      setDeleteGwId(null);
      fetchGateways();
    }
  };

  const handleToggleGateway = async (id: string, currentActive: boolean) => {
    const result = await operatorAction('toggle-gateway', { id, is_active: !currentActive });
    if (result?.success) {
      toast.success(currentActive ? 'Gateway desativado' : 'Gateway ativado');
      fetchGateways();
    }
  };

  if (loadingOperator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

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
          {sessionBlocked && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">Sua sessão foi encerrada porque outro dispositivo fez login. Faça login novamente para continuar.</p>
            </div>
          )}
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
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de {operator.name}</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus pagamentos</p>
          </div>
        </div>

        {/* WhatsApp config */}
        <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              <span className="text-sm font-medium text-card-foreground">Meu WhatsApp</span>
            </div>
            {editingWhatsapp ? (
              <div className="flex items-center gap-2">
                <input type="text" value={whatsappInput} onChange={e => setWhatsappInput(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground w-40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="5511999999999" maxLength={20} />
                <button onClick={async () => {
                  const result = await operatorAction('update-whatsapp', { whatsapp: whatsappInput });
                  if (result?.success) {
                    setOperator({ ...operator, whatsapp: whatsappInput });
                    setEditingWhatsapp(false);
                    toast.success('WhatsApp atualizado!');
                  }
                }} className="p-1 rounded-lg bg-primary/10 text-primary hover:opacity-80">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{operator.whatsapp || 'Não definido'}</span>
                <button onClick={() => setEditingWhatsapp(true)} className="p-1 rounded-lg hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gateway Management */}
        <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-card-foreground">Meus Gateways</span>
            </div>
            <button onClick={() => setShowGatewayForm(!showGatewayForm)}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:opacity-80">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>

          {showGatewayForm && (
            <form onSubmit={handleCreateGateway} className="space-y-2 mb-4 p-3 rounded-lg border border-border bg-background">
              <input type="text" value={gwName} onChange={e => setGwName(e.target.value)} placeholder="Nome (ex: Hura Pay)"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" value={gwApiUrl} onChange={e => setGwApiUrl(e.target.value)} placeholder="URL da API *"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" value={gwPublicKey} onChange={e => setGwPublicKey(e.target.value)} placeholder="Public Key"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="password" value={gwSecretKey} onChange={e => setGwSecretKey(e.target.value)} placeholder="Secret Key *"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <button type="submit" disabled={gwLoading}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {gwLoading ? 'Salvando...' : 'Salvar Gateway'}
                </button>
                <button type="button" onClick={() => setShowGatewayForm(false)}
                  className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:opacity-80">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {gateways.length === 0 && !showGatewayForm ? (
            <p className="text-xs text-muted-foreground">Nenhum gateway configurado.</p>
          ) : (
            <div className="space-y-2">
              {gateways.map(gw => (
                <div key={gw.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{gw.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{gw.api_url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleGateway(gw.id, gw.is_active !== false)}
                      className={`rounded-lg px-2 py-1 text-xs font-medium ${gw.is_active !== false ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {gw.is_active !== false ? 'Ativo' : 'Inativo'}
                    </button>
                    {deleteGwId === gw.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDeleteGateway(gw.id)}
                          className="rounded-lg bg-destructive px-2 py-1 text-xs text-destructive-foreground">Sim</button>
                        <button onClick={() => setDeleteGwId(null)}
                          className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">Não</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteGwId(gw.id)}
                        className="p-1 rounded-lg hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
            <h2 className="font-semibold text-lg text-card-foreground mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" /> Novo Pagamento
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Payment method selector */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Método de Pagamento</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMethod('manual')}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${paymentMethod === 'manual' ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}>
                    📋 PIX Manual
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('gateway')}
                    disabled={gateways.filter(g => g.is_active !== false).length === 0}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${paymentMethod === 'gateway' ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    ⚡ Gateway
                  </button>
                </div>
                {gateways.filter(g => g.is_active !== false).length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Nenhum gateway ativo. Adicione um gateway acima.</p>
                )}
              </div>

              {paymentMethod === 'gateway' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Gateway *</label>
                  <select value={selectedGatewayId} onChange={e => setSelectedGatewayId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Selecione...</option>
                    {gateways.filter(g => g.is_active !== false).map(gw => (
                      <option key={gw.id} value={gw.id}>{gw.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Nome do Cliente *</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: João Silva" maxLength={100} />
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
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Descrição</label>
                  <input type="text" value={destinationDescription} onChange={e => setDestinationDescription(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={200} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Emoji</label>
                  <input type="text" value={destinationEmoji} onChange={e => setDestinationEmoji(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={10} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" min="0.01" max="100000" value={value} onChange={e => setValue(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {paymentMethod === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Código PIX *</label>
                  <textarea value={pixCode} onChange={e => setPixCode(e.target.value)} rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {loading ? 'Processando...' : paymentMethod === 'gateway' ? '⚡ Gerar via Gateway' : 'Gerar Pagamento'}
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
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                            {p.payment_method === 'gateway' && (
                              <span className="shrink-0 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">⚡</span>
                            )}
                          </div>
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
                          <p className="text-xs text-muted-foreground break-all font-mono">{getPaymentLink(p.short_code)}</p>
                        </div>
                        <div className="flex justify-center py-2">
                          <QRCodeSVG value={p.pix_code} size={100} />
                        </div>
                        <button onClick={() => handleCopyLink(p.short_code)}
                          className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:opacity-80">
                          <Link className="h-3 w-3" /> Copiar Link
                        </button>
                        {deleteConfirmId === p.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleDeletePayment(p.id)}
                              className="flex-1 rounded-lg bg-destructive py-2 text-xs font-medium text-destructive-foreground hover:opacity-90">
                              Confirmar Exclusão
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 rounded-lg bg-muted py-2 text-xs font-medium text-muted-foreground hover:opacity-90">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(p.id)}
                            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:opacity-80">
                            <Trash2 className="h-3 w-3" /> Excluir Pagamento
                          </button>
                        )}
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
