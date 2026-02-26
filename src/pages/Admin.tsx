import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Settings, Trash2, Link, Plus, ChevronDown, ChevronUp, Users, Eye, EyeOff, Copy } from 'lucide-react';

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

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

interface Operator {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  created_at: string;
}

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
  operator_id: string | null;
}

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'payments' | 'operators'>('payments');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');

  // Form - novo pagamento
  const [clientName, setClientName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('✈️');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [value, setValue] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [paymentOperatorId, setPaymentOperatorId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Form - novo operador
  const [newOpName, setNewOpName] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [newOpWhatsapp, setNewOpWhatsapp] = useState('');
  const [showOpPassword, setShowOpPassword] = useState(false);

  const adminAction = async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke('admin-action', {
      body: { action, sessionToken, data },
    });
    if (error) {
      toast.error('Erro na operação.');
      return null;
    }
    if (result?.error) {
      toast.error(result.error);
      return null;
    }
    return result;
  };

  const fetchAll = async () => {
    const [opsResult, paysResult] = await Promise.all([
      adminAction('list-operators'),
      adminAction('list-payments'),
    ]);
    if (opsResult?.operators) setOperators(opsResult.operators);
    if (paysResult?.payments) setPayments(paysResult.payments);
  };

  useEffect(() => {
    if (authenticated && sessionToken) fetchAll();
  }, [authenticated, sessionToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.functions.invoke('admin-login', {
      body: { password: adminPass },
    });

    if (error || !data?.success) {
      toast.error('Senha incorreta.');
      return;
    }

    setSessionToken(data.sessionToken);
    setAuthenticated(true);
  };

  // ---- Payments ----
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !cpfRaw || !destination || !value || !pixCode) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    const result = await adminAction('create-payment', {
      client_name: clientName,
      cpf: maskCPF(cpfRaw),
      destination,
      destination_emoji: destinationEmoji,
      destination_description: destinationDescription,
      value: parseFloat(value),
      pix_code: pixCode,
      order_number: generateOrderNumber(),
      operator_id: paymentOperatorId || null,
    });
    setLoading(false);

    if (!result?.success) return;

    toast.success('Pagamento gerado!');
    setClientName(''); setCpfRaw(''); setDestination('');
    setDestinationEmoji('✈️'); setDestinationDescription('');
    setValue(''); setPixCode(''); setPaymentOperatorId('');
    fetchAll();
  };

  const handleDeletePayment = async (id: string) => {
    await adminAction('delete-payment', { id });
    toast.info('Pagamento removido.');
    fetchAll();
  };

  const getPaymentLink = (id: string) => `${PUBLISHED_URL}/pay/${id}`;

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(getPaymentLink(id));
    toast.success('Link copiado!');
  };

  // ---- Operators ----
  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (operators.length >= 5) {
      toast.error('Limite de 5 operadores atingido.');
      return;
    }
    if (!newOpName || !newOpPassword) {
      toast.error('Preencha nome e senha.');
      return;
    }

    const slug = generateSlug(newOpName);
    const result = await adminAction('create-operator', {
      name: newOpName, slug, password: newOpPassword, whatsapp: newOpWhatsapp,
    });

    if (!result?.success) return;

    toast.success('Operador criado!');
    setNewOpName('');
    setNewOpPassword('');
    setNewOpWhatsapp('');
    fetchAll();
  };

  const handleDeleteOperator = async (id: string) => {
    await adminAction('delete-operator', { id });
    toast.info('Operador removido.');
    fetchAll();
  };

  const getOperatorLink = (slug: string) => `${PUBLISHED_URL}/painel/${slug}`;

  const handleCopyOperatorLink = (slug: string) => {
    navigator.clipboard.writeText(getOperatorLink(slug));
    toast.success('Link do painel copiado!');
  };

  const filteredPayments = selectedOperatorFilter === 'all'
    ? payments
    : selectedOperatorFilter === 'mine'
      ? payments.filter(p => !p.operator_id)
      : payments.filter(p => p.operator_id === selectedOperatorFilter);

  const getOperatorName = (opId: string | null) => {
    if (!opId) return 'Meus (Admin)';
    return operators.find(o => o.id === opId)?.name || 'Desconhecido';
  };

  // ---- Login Screen ----
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl bg-card border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin</h1>
          </div>
          <label className="block text-sm font-medium text-card-foreground mb-1">Senha do Admin</label>
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Digite a senha" />
          <button type="submit" className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Principal</h1>
            <p className="text-sm text-muted-foreground">Gerencie pagamentos e operadores</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            Pagamentos
          </button>
          <button onClick={() => setActiveTab('operators')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'operators' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Users className="h-4 w-4" /> Operadores ({operators.length}/5)
          </button>
        </div>

        {/* ========== TAB PAGAMENTOS ========== */}
        {activeTab === 'payments' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-lg text-card-foreground mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" /> Novo Pagamento
              </h2>
              <form onSubmit={handleSubmitPayment} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Atribuir a</label>
                  <select value={paymentOperatorId} onChange={e => setPaymentOperatorId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Meus (Admin)</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
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
                    placeholder="Ex: Campinas (VCP)" maxLength={100} />
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
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Código PIX *</label>
                  <textarea value={pixCode} onChange={e => setPixCode(e.target.value)} rows={2}
                    maxLength={500}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-card-foreground">Pagamentos</h2>
                <select value={selectedOperatorFilter} onChange={e => setSelectedOperatorFilter(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none">
                  <option value="all">Todos</option>
                  <option value="mine">Meus (Admin)</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>

              {filteredPayments.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum pagamento.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredPayments.map(p => (
                    <div key={p.id} className="rounded-lg border border-border bg-background overflow-hidden">
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedPaymentId(expandedPaymentId === p.id ? null : p.id)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{p.destination_emoji}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.destination} · {getOperatorName(p.operator_id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-sm text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
                          </span>
                          {expandedPaymentId === p.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {expandedPaymentId === p.id && (
                        <div className="border-t border-border p-3 space-y-3">
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                            <p className="text-xs text-muted-foreground break-all font-mono">{getPaymentLink(p.id)}</p>
                          </div>
                          <div className="flex justify-center py-2">
                            <QRCodeSVG value={p.pix_code} size={100} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleCopyLink(p.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:opacity-80">
                              <Link className="h-3 w-3" /> Copiar Link
                            </button>
                            <button onClick={() => handleDeletePayment(p.id)}
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
        )}

        {/* ========== TAB OPERADORES ========== */}
        {activeTab === 'operators' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form criar operador */}
            <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-lg text-card-foreground mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" /> Novo Operador
              </h2>
              {operators.length >= 5 ? (
                <p className="text-sm text-muted-foreground">Limite de 5 operadores atingido.</p>
              ) : (
                <form onSubmit={handleCreateOperator} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">Nome *</label>
                    <input type="text" value={newOpName} onChange={e => setNewOpName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ex: Maria" maxLength={50} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">Senha de acesso *</label>
                    <div className="relative">
                      <input type={showOpPassword ? 'text' : 'password'} value={newOpPassword} onChange={e => setNewOpPassword(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Senha para o operador" maxLength={100} />
                      <button type="button" onClick={() => setShowOpPassword(!showOpPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showOpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">WhatsApp</label>
                    <input type="text" value={newOpWhatsapp} onChange={e => setNewOpWhatsapp(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ex: 5511999999999" maxLength={20} />
                  </div>
                  <button type="submit"
                    className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90">
                    Criar Operador
                  </button>
                </form>
              )}
            </div>

            {/* Lista de operadores */}
            <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-lg text-card-foreground mb-4">Operadores</h2>
              {operators.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum operador criado.</p>
              ) : (
                <div className="space-y-3">
                  {operators.map(op => (
                    <div key={op.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{op.name}</p>
                          {op.whatsapp && <p className="text-xs text-muted-foreground">WhatsApp: {op.whatsapp}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {payments.filter(p => p.operator_id === op.id).length} pagamentos
                        </span>
                      </div>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                        <p className="text-xs text-muted-foreground break-all font-mono">{getOperatorLink(op.slug)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCopyOperatorLink(op.slug)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:opacity-80">
                          <Copy className="h-3 w-3" /> Copiar Link do Painel
                        </button>
                        <button onClick={() => handleDeleteOperator(op.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:opacity-80">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
