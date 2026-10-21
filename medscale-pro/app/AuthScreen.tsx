'use client';

import React, { useState } from 'react';
import {
  Lock, UserPlus, Upload, Trash2, CheckCircle,
  AlertCircle, Eye, EyeOff, FileText, RefreshCw
} from 'lucide-react';

interface AuthScreenProps {
  config: any;
  doctors: any[];
  setDoctors: React.Dispatch<React.SetStateAction<any[]>>;
  onLoginSuccess: (user: any) => void;
  recordAction?: (description: string) => void;
}

export default function AuthScreen({
  config,
  doctors,
  setDoctors,
  onLoginSuccess,
  recordAction
}: AuthScreenProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'warning' | 'success'; text: string } | null>(null);

  // Estado para Recuperação de Senha ("Esqueci minha senha")
  const [forgotForm, setForgotForm] = useState({
    userOrEmail: '',
    cpfOrCrm: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Estado para Solicitação de Cadastro Médico Completo
  const [regForm, setRegForm] = useState<any>({
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    email: '',
    phone: '',
    crm: '',
    rqe: '',
    specialty: config?.registeredSpecialties?.[0]?.name || 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    password: '',
    confirmPassword: '',
    documents: [] as { name: string; type: string; size: string; uploadedAt: string }[]
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    const cleanInput = loginUser.trim().toLowerCase();

    // Acesso do Gestor (aceita username "gestor" ou o e-mail administrativo)
    if ((cleanInput === 'gestor' || cleanInput === 'gestor@medscale.com.br') && loginPassword === 'admin123') {
      onLoginSuccess({
        role: 'admin',
        username: 'gestor',
        name: 'Gestor Hospitalar',
        email: 'gestor@medscale.com.br'
      });
      return;
    }

    // Busca médico por Username ou E-mail
    const foundDoc = doctors.find(
      d =>
        (d.username && d.username.toLowerCase() === cleanInput) ||
        (d.email && d.email.toLowerCase() === cleanInput)
    );

    if (!foundDoc) {
      setAuthMessage({
        type: 'error',
        text: 'Usuário não encontrado. Verifique seu usuário ou utilize a aba "Solicitar Cadastro".'
      });
      return;
    }

    if (foundDoc.password !== loginPassword) {
      setAuthMessage({
        type: 'error',
        text: 'Senha incorreta. Caso não se lembre, clique em "Esqueci minha senha".'
      });
      return;
    }

    if (foundDoc.status === 'Pendente') {
      setAuthMessage({
        type: 'warning',
        text: `Olá, ${foundDoc.name}! Seu cadastro e documentos já foram recebidos e aguardam a aprovação do Gestor da unidade.`
      });
      return;
    }

    if (foundDoc.status === 'Inativo') {
      setAuthMessage({
        type: 'error',
        text: 'Seu vínculo encontra-se Inativo no momento. Entre em contato com a coordenação médica.'
      });
      return;
    }

    if (foundDoc.status === 'Recusado') {
      setAuthMessage({
        type: 'error',
        text: 'Sua solicitação de cadastro não foi aprovada pela gestão médica.'
      });
      return;
    }

    onLoginSuccess({
      role: 'doctor',
      id: foundDoc.id,
      username: foundDoc.username || foundDoc.email,
      name: foundDoc.name,
      email: foundDoc.email
    });
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const cleanUser = forgotForm.userOrEmail.trim().toLowerCase();
    const cleanDocId = forgotForm.cpfOrCrm.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (!cleanUser || !cleanDocId) {
      setAuthMessage({ type: 'error', text: 'Preencha seu Usuário/E-mail e seu CPF ou CRM para validar.' });
      return;
    }

    if (forgotForm.newPassword.length < 3) {
      setAuthMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 3 caracteres.' });
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmNewPassword) {
      setAuthMessage({ type: 'error', text: 'A confirmação da nova senha não confere.' });
      return;
    }

    const targetDoc = doctors.find(d => {
      const matchUser =
        (d.username && d.username.toLowerCase() === cleanUser) ||
        (d.email && d.email.toLowerCase() === cleanUser);
      const docCpfClean = (d.cpf || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const docCrmClean = (d.crm || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const matchValidator =
        (docCpfClean && docCpfClean.includes(cleanDocId)) ||
        (docCrmClean && docCrmClean.includes(cleanDocId));
      return matchUser && matchValidator;
    });

    if (!targetDoc) {
      setAuthMessage({
        type: 'error',
        text: 'Dados de validação não conferem com nenhum médico cadastrado (Verifique Usuário + CPF ou CRM).'
      });
      return;
    }

    setDoctors(prev =>
      prev.map(d => (d.id === targetDoc.id ? { ...d, password: forgotForm.newPassword } : d))
    );

    if (recordAction) {
      recordAction(`Redefinição de senha realizada pelo médico ${targetDoc.name}`);
    }

    setForgotForm({ userOrEmail: '', cpfOrCrm: '', newPassword: '', confirmNewPassword: '' });
    setAuthTab('login');
    setAuthMessage({
      type: 'success',
      text: `Senha redefinida com sucesso para ${targetDoc.name}! Faça login com sua nova senha.`
    });
  };

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const addedDocs = Array.from(files).map(file => ({
      name: file.name,
      type: 'Documento Comprobatório',
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedAt: today
    }));
    setRegForm((prev: any) => ({
      ...prev,
      documents: [...(prev.documents || []), ...addedDocs]
    }));
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const cleanUsername = regForm.username.trim().toLowerCase();
    const cleanEmail = regForm.email.trim().toLowerCase();

    if (!cleanUsername) {
      setAuthMessage({ type: 'error', text: 'Informe um nome de usuário (username) para o seu acesso.' });
      return;
    }

    if (regForm.password.length < 3) {
      setAuthMessage({ type: 'error', text: 'A senha deve ter pelo menos 3 caracteres.' });
      return;
    }

    if (regForm.password !== regForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    if (
      cleanUsername === 'gestor' ||
      doctors.some(
        d =>
          (d.username && d.username.toLowerCase() === cleanUsername) ||
          (d.email && d.email.toLowerCase() === cleanEmail)
      )
    ) {
      setAuthMessage({
        type: 'error',
        text: 'Já existe um profissional cadastrado com este Usuário (Username) ou E-mail.'
      });
      return;
    }

    const joinDateStr = new Date().toISOString().split('T')[0];

    const newDocRecord = {
      id: Date.now(),
      username: cleanUsername,
      name: regForm.name.trim(),
      cpf: regForm.cpf.trim(),
      birthDate: regForm.birthDate,
      email: cleanEmail,
      password: regForm.password,
      phone: regForm.phone.trim(),
      crm: regForm.crm.trim(),
      rqe: regForm.rqe.trim() || 'Não informado',
      specialty: regForm.specialty,
      razaoSocial: regForm.razaoSocial.trim(),
      cnpj: regForm.cnpj.trim(),
      joinDate: joinDateStr,
      exitDate: '',
      role: 'Plantonista',
      remunerationLevel: 1,
      contractType: 'Coringa / Extra',
      participatesInSchedule: true,
      allowedFunctions: ['Plantonista'],
      defaultShiftAdditionals: [],
      fixedMonthlyAdditional: 0,
      fixedMonthlyAdditionalLabel: '',
      fixedMonthlyAdditionalMode: 'fixed',
      accumulatedRoles: [
        {
          id: `ar_${Date.now()}`,
          roleName: 'Plantonista',
          categoryType: 'assistencial',
          level: 1,
          contractModality: 'Coringa / Extra'
        }
      ],
      workloadHistory: [
        {
          id: `wh_${Date.now()}`,
          date: joinDateStr,
          eventType: 'Solicitação de Cadastro',
          details: 'Auto-cadastro enviado pelo portal aguardando homologação do gestor.'
        }
      ],
      status: 'Pendente',
      documents:
        regForm.documents && regForm.documents.length > 0
          ? regForm.documents
          : [{ name: 'Cadastro_Digital_Validado.pdf', type: 'CRM / CNPJ', size: '250 KB', uploadedAt: joinDateStr }]
    };

    setDoctors(prev => [...prev, newDocRecord]);
    if (recordAction) {
      recordAction(`Nova solicitação de cadastro enviada por ${newDocRecord.name}`);
    }

    setRegForm({
      name: '',
      username: '',
      cpf: '',
      birthDate: '',
      email: '',
      phone: '',
      crm: '',
      rqe: '',
      specialty: config?.registeredSpecialties?.[0]?.name || 'Clínica Médica',
      razaoSocial: '',
      cnpj: '',
      password: '',
      confirmPassword: '',
      documents: []
    });

    setAuthTab('login');
    setLoginUser('');
    setLoginPassword('');
    setAuthMessage({
      type: 'success',
      text: 'Solicitação de cadastro enviada com sucesso! O gestor analisará seu perfil e documentos para liberar seu acesso.'
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-slate-800">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-6">
        {/* Cabeçalho Limpo — Sem subtítulo Hospital Geral & Maternidade */}
        <div className="text-center space-y-1.5">
          <span className="px-3.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold uppercase tracking-wide inline-block">
            {config?.sectorUnitName || 'Emergência Adulta - HGD'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 pt-1">
            {config?.appName || 'MedScale Pro'}
          </h1>
        </div>

        {/* Seletor de Abas */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setAuthMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              authTab === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Entrar no Sistema
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('register');
              setAuthMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              authTab === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Solicitar Cadastro
          </button>
        </div>

        {/* Mensagens de Alerta / Confirmação */}
        {authMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 border ${
              authMessage.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : authMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {authMessage.type === 'success' ? (
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{authMessage.text}</span>
          </div>
        )}

        {/* ABA 1: LOGIN LIMPO POR USERNAME */}
        {authTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                required
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                placeholder="Insira seu usuário"
                autoComplete="off"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('forgot');
                    setAuthMessage(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Insira sua senha"
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={16} /> Acessar Plataforma
            </button>
          </form>
        )}

        {/* ABA 2: RECUPERAÇÃO DE SENHA ("ESQUECI MINHA SENHA") */}
        {authTab === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
              <strong className="block mb-0.5">Recuperação de Acesso</strong>
              Informe seu Usuário (ou E-mail) e valide sua identidade com seu CPF ou CRM cadastrado.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Usuário ou E-mail *</label>
              <input
                type="text"
                required
                placeholder="Insira seu usuário ou e-mail"
                value={forgotForm.userOrEmail}
                onChange={e => setForgotForm({ ...forgotForm, userOrEmail: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">CPF ou CRM (Validação) *</label>
              <input
                type="text"
                required
                placeholder="Digite seu CPF ou número do CRM"
                value={forgotForm.cpfOrCrm}
                onChange={e => setForgotForm({ ...forgotForm, cpfOrCrm: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nova Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Nova senha"
                  value={forgotForm.newPassword}
                  onChange={e => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={forgotForm.confirmNewPassword}
                  onChange={e => setForgotForm({ ...forgotForm, confirmNewPassword: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl"
              >
                Voltar ao Login
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} /> Redefinir Senha
              </button>
            </div>
          </form>
        )}

        {/* ABA 3: AUTO-CADASTRO MÉDICO COMPLETO */}
        {authTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. João Silva"
                  value={regForm.name}
                  onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-blue-700 mb-1">Usuário de Acesso (Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: joaosilva"
                  value={regForm.username}
                  onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                  className="w-full border border-blue-300 bg-blue-50/30 rounded-lg px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={regForm.cpf}
                  onChange={e => setRegForm({ ...regForm, cpf: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CRM *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CRM-SP 123456"
                  value={regForm.crm}
                  onChange={e => setRegForm({ ...regForm, crm: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">RQE</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={regForm.rqe}
                  onChange={e => setRegForm({ ...regForm, rqe: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especialidade Principal *</label>
                <select
                  value={regForm.specialty}
                  onChange={e => setRegForm({ ...regForm, specialty: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {(config?.registeredSpecialties || [{ name: 'Clínica Médica' }]).map((s: any) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data de Nascimento *</label>
                <input
                  type="date"
                  required
                  value={regForm.birthDate}
                  onChange={e => setRegForm({ ...regForm, birthDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="medico@email.com"
                  value={regForm.email}
                  onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="(00) 90000-0000"
                  value={regForm.phone}
                  onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                <span className="text-[11px] font-extrabold uppercase text-emerald-800">
                  Dados Fiscais PJ (Para Faturamento e Folha de Pagamento)
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Razão Social (PJ) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome da Empresa Médica LTDA"
                  value={regForm.razaoSocial}
                  onChange={e => setRegForm({ ...regForm, razaoSocial: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CNPJ *</label>
                <input
                  type="text"
                  required
                  placeholder="00.000.000/0001-00"
                  value={regForm.cnpj}
                  onChange={e => setRegForm({ ...regForm, cnpj: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Crie uma senha"
                  value={regForm.password}
                  onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Repita a senha"
                  value={regForm.confirmPassword}
                  onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Upload de Documentos Comprobatórios */}
              <div className="sm:col-span-2 pt-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Anexar Documentos (Carteira CRM, RQE, Cartão CNPJ)
                </label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 cursor-pointer bg-slate-50 text-slate-600 font-semibold">
                  <Upload size={16} className="text-blue-600" />
                  <span>Selecionar arquivos (PDF ou Imagem)</span>
                  <input type="file" multiple onChange={handleFileAttachment} className="hidden" />
                </label>

                {regForm.documents && regForm.documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {regForm.documents.map((doc: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-blue-900 truncate">
                          <FileText size={13} /> {doc.name} ({doc.size})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRegForm((prev: any) => ({
                              ...prev,
                              documents: prev.documents.filter((_: any, i: number) => i !== idx)
                            }))
                          }
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <UserPlus size={16} /> Enviar Solicitação de Cadastro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}