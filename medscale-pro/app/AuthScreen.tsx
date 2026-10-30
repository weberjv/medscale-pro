'use client';

import React, { useState } from 'react';
import {
  Shield, Lock, User, UserPlus, CheckCircle, AlertTriangle,
  KeyRound, ArrowLeft, HelpCircle
} from 'lucide-react';

export default function AuthScreen(props: any) {
  const {
    config = {},
    doctors = [],
    setDoctors,
    onLoginSuccess,
    recordAction
  } = props || {};

  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const registeredSpecialties: { id: string; name: string }[] =
    Array.isArray(config?.registeredSpecialties) && config.registeredSpecialties.length > 0
      ? config.registeredSpecialties
      : [
          { id: 'esp_1', name: 'Clínica Médica' },
          { id: 'esp_2', name: 'Emergência Médica' },
          { id: 'esp_3', name: 'Cardiologia' },
          { id: 'esp_4', name: 'Cirurgia Geral' },
          { id: 'esp_5', name: 'Ortopedia' },
          { id: 'esp_6', name: 'Pediatria' },
          { id: 'esp_7', name: 'Terapia Intensiva' }
        ];

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para "Esqueci minha senha"
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryCpfOrCrm, setRecoveryCpfOrCrm] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');

  // Estados para Solicitar Cadastro (Novo Médico)
  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    password: '',
    crm: '',
    rqe: '',
    cpf: '',
    birthDate: '',
    specialty: registeredSpecialties[0]?.name || 'Clínica Médica',
    email: '',
    phone: '',
    razaoSocial: '',
    cnpj: ''
  });

  // ============================================================================
  // 1. LOGIN: USERNAME CASE-INSENSITIVE | SENHA ESTRITAMENTE CASE-SENSITIVE
  // ============================================================================
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Username ignora maiúsculas/minúsculas
    const normalizedUser = String(usernameInput || '').trim().toLowerCase();
    // Senha mantém exatamente maiúsculas e minúsculas digitadas
    const rawPass = String(passwordInput || '').trim();

    if (!normalizedUser || !rawPass) {
      setErrorMsg('Preencha o utilizador e a senha para entrar.');
      return;
    }

    // 1. Verifica Login Mestre do Gestor (Username case-insensitive | Senha case-sensitive)
    const masterPassword = String(config?.masterAdminPassword || 'admin123').trim();
    const validAdminUsernames = ['gestor', 'admin', 'coordenador', 'coordenacao', 'master'];

    if (validAdminUsernames.includes(normalizedUser)) {
      if (rawPass !== masterPassword) {
        setErrorMsg('Senha incorreta (atenção às letras maiúsculas e minúsculas).');
        return;
      }
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess({
          id: 999999,
          name: 'Gestor Mestre',
          username: 'gestor',
          role: 'Coordenação Geral',
          isAdmin: true,
          canManage: true,
          isMasterAdmin: true
        });
      }
      return;
    }

    // 2. Verifica Login de Médico (Username/CRM/E-mail case-insensitive)
    const matchedDoctor = safeDoctors.find((d: any) => {
      const dUser = String(d?.username || '').trim().toLowerCase();
      const dCrm = String(d?.crm || '').trim().toLowerCase();
      const dEmail = String(d?.email || '').trim().toLowerCase();
      const dName = String(d?.name || '').trim().toLowerCase();
      const dNameSlug = dName.replace(/\s+/g, '.');

      return (
        normalizedUser === dUser ||
        normalizedUser === dCrm ||
        normalizedUser === dEmail ||
        normalizedUser === dName ||
        normalizedUser === dNameSlug
      );
    });

    if (!matchedDoctor) {
      setErrorMsg(
        'Utilizador não encontrado. Verifique o seu login ou solicite o seu cadastro na aba ao lado.'
      );
      return;
    }

    // Senha do médico estritamente case-sensitive
    const docPassword = String(matchedDoctor.password || '123').trim();
    if (rawPass !== docPassword) {
      setErrorMsg(
        'Senha incorreta (a senha diferencia letras maiúsculas e minúsculas). Caso não se recorde, clique em "Esqueci minha senha".'
      );
      return;
    }

    if (matchedDoctor.status === 'Pendente') {
      setErrorMsg(
        'O seu cadastro já foi recebido e aguarda a aprovação do Gestor para libertação do acesso.'
      );
      return;
    }

    if (typeof onLoginSuccess === 'function') {
      onLoginSuccess({
        ...matchedDoctor,
        isAdmin: Boolean(matchedDoctor.hasManagerAccess),
        canManage: Boolean(matchedDoctor.hasManagerAccess),
        isMasterAdmin: false
      });
    }
  };

  // ============================================================================
  // 2. RECUPERAÇÃO / REDEFINIÇÃO DE SENHA ("ESQUECI MINHA SENHA")
  // ============================================================================
  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const normId = String(recoveryIdentifier || '').trim().toLowerCase();
    const normCheck = String(recoveryCpfOrCrm || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    if (!normId) {
      setErrorMsg('Informe o seu Utilizador, E-mail, Nome ou CRM.');
      return;
    }

    if (!recoveryNewPassword.trim()) {
      setErrorMsg('Digite a nova senha desejada.');
      return;
    }

    if (recoveryNewPassword.trim() !== recoveryConfirmPassword.trim()) {
      setErrorMsg('A confirmação da nova senha não coincide.');
      return;
    }

    const targetDoc = safeDoctors.find((d: any) => {
      const dUser = String(d?.username || '').trim().toLowerCase();
      const dCrm = String(d?.crm || '').trim().toLowerCase();
      const dEmail = String(d?.email || '').trim().toLowerCase();
      const dName = String(d?.name || '').trim().toLowerCase();
      return (
        normId === dUser ||
        normId === dCrm ||
        normId === dEmail ||
        normId === dName
      );
    });

    if (!targetDoc) {
      setErrorMsg(
        'Não localizámos nenhum médico com esse Utilizador/CRM/E-mail. Verifique os dados informados.'
      );
      return;
    }

    if (normCheck) {
      const docCrmClean = String(targetDoc.crm || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
      const docCpfClean = String(targetDoc.cpf || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

      if (
        docCrmClean &&
        docCpfClean &&
        !docCrmClean.includes(normCheck) &&
        !docCpfClean.includes(normCheck)
      ) {
        setErrorMsg('O CRM ou CPF de confirmação não confere com o cadastro localizado.');
        return;
      }
    }

    if (typeof setDoctors === 'function') {
      setDoctors((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((d: any) =>
          Number(d?.id) === Number(targetDoc.id)
            ? { ...d, password: recoveryNewPassword.trim() }
            : d
        )
      );
    }

    if (typeof recordAction === 'function') {
      recordAction(
        `Senha redefinida através da opção "Esqueci minha senha" para ${targetDoc.name}`
      );
    }

    setUsernameInput(targetDoc.username || targetDoc.crm || targetDoc.name);
    setPasswordInput('');
    setRecoveryIdentifier('');
    setRecoveryCpfOrCrm('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setMode('login');
    setSuccessMsg(
      `Senha de ${targetDoc.name} atualizada com sucesso! Já pode entrar com a sua nova senha.`
    );
  };

  // ============================================================================
  // 3. SOLICITAÇÃO DE CADASTRO DE NOVO MÉDICO
  // ============================================================================
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regForm.name.trim() || !regForm.crm.trim() || !regForm.password.trim()) {
      setErrorMsg('Preencha pelo menos o Nome Completo, CRM e Senha de acesso.');
      return;
    }

    const cleanUsername =
      regForm.username.trim().toLowerCase() ||
      regForm.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.');

    const newDoc = {
      id: Date.now(),
      name: regForm.name.trim(),
      username: cleanUsername,
      password: regForm.password.trim(),
      crm: regForm.crm.trim(),
      rqe: regForm.rqe.trim(),
      cpf: regForm.cpf.trim(),
      birthDate: regForm.birthDate,
      specialty: regForm.specialty,
      email: regForm.email.trim(),
      phone: regForm.phone.trim(),
      razaoSocial: regForm.razaoSocial.trim(),
      cnpj: regForm.cnpj.trim(),
      role: 'Plantonista',
      allowedFunctions: ['Plantonista'],
      remunerationLevel: 1,
      contractType: 'Fixo Mensal',
      participatesInSchedule: true,
      hasManagerAccess: false,
      workHistory: [],
      individualOccurrences: [],
      status: 'Pendente'
    };

    if (typeof setDoctors === 'function') {
      setDoctors((prev: any[]) => [...(Array.isArray(prev) ? prev : []), newDoc]);
    }

    if (typeof recordAction === 'function') {
      recordAction(
        `Nova solicitação de cadastro enviada por ${newDoc.name} (${newDoc.crm}) — Aguardando aprovação do Gestor`
      );
    }

    setMode('login');
    setSuccessMsg(
      `Solicitação enviada com sucesso! O seu utilizador é "${cleanUsername}". Aguarde a homologação do gestor para aceder.`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex flex-col justify-center items-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho Visual Original */}
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield size={24} className="text-white" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider mb-1">
            {config?.sectorUnitName || 'Emergência Adulta - HGD'}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {config?.appName || 'MedScale Pro'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de Escalas Médicas, Governança & Folha PJ
          </p>
        </div>

        {/* Abas Superiores */}
        {mode !== 'forgot_password' && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-3 text-center transition-colors ${
                mode === 'login'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Acesso ao Sistema
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-3 text-center transition-colors ${
                mode === 'register'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Solicitar Cadastro
            </button>
          </div>
        )}

        <div className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-start gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODO LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Utilizador ou CRM
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Digite seu utilizador ou CRM"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setRecoveryIdentifier(usernameInput);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle size={12} /> Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Digite sua senha"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-extrabold text-sm shadow-md transition-colors"
              >
                Entrar
              </button>
            </form>
          )}

          {/* MODO ESQUECI MINHA SENHA */}
          {mode === 'forgot_password' && (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <KeyRound size={16} className="text-blue-600" />
                  Redefinir Senha
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Voltar
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Utilizador, Nome ou CRM *
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  placeholder="Informe o seu login ou CRM"
                  value={recoveryIdentifier}
                  onChange={e => setRecoveryIdentifier(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirmação de CRM ou CPF (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Digite CRM ou CPF para validação"
                  value={recoveryCpfOrCrm}
                  onChange={e => setRecoveryCpfOrCrm(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nova Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Nova senha"
                    value={recoveryNewPassword}
                    onChange={e => setRecoveryNewPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmar *</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={recoveryConfirmPassword}
                    onChange={e => setRecoveryConfirmPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-extrabold shadow-md"
              >
                Salvar Nova Senha
              </button>
            </form>
          )}

          {/* MODO SOLICITAR CADASTRO */}
          {mode === 'register' && (
            <form
              onSubmit={handleRegisterSubmit}
              className="space-y-3 max-h-[65vh] overflow-y-auto pr-1"
            >
              <div>
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr(a). Nome Completo"
                  value={regForm.name}
                  onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">CRM (com UF) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CRM-SP 123456"
                    value={regForm.crm}
                    onChange={e => setRegForm({ ...regForm, crm: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">RQE</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={regForm.rqe}
                    onChange={e => setRegForm({ ...regForm, rqe: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={regForm.cpf}
                    onChange={e => setRegForm({ ...regForm, cpf: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nascimento</label>
                  <input
                    type="date"
                    value={regForm.birthDate}
                    onChange={e => setRegForm({ ...regForm, birthDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Especialidade *</label>
                <select
                  value={regForm.specialty}
                  onChange={e => setRegForm({ ...regForm, specialty: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold"
                >
                  {registeredSpecialties.map(sp => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={regForm.phone}
                    onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="medico@email.com"
                    value={regForm.email}
                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Razão Social PJ</label>
                  <input
                    type="text"
                    placeholder="Empresa Médica"
                    value={regForm.razaoSocial}
                    onChange={e => setRegForm({ ...regForm, razaoSocial: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={regForm.cnpj}
                    onChange={e => setRegForm({ ...regForm, cnpj: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold mb-1">Utilizador (Login)</label>
                  <input
                    type="text"
                    autoCapitalize="none"
                    placeholder="ex: nome.sobrenome"
                    value={regForm.username}
                    onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha"
                    value={regForm.password}
                    onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-extrabold shadow-md flex items-center justify-center gap-1.5"
              >
                <UserPlus size={15} /> Enviar Cadastro
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}