'use client';

import React, { useState } from 'react';
import {
  Activity, Lock, User, UserPlus, CheckCircle, AlertCircle,
  Stethoscope, Building2, FileText, Mail, Phone, ShieldCheck
} from 'lucide-react';

export default function AuthScreen(props: any) {
  const {
    config = {},
    doctors = [],
    setDoctors,
    onLoginSuccess,
    handleLogin,
    recordAction
  } = props || {};

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Lista dinâmica de Especialidades vinda da Tabela de Remuneração (com fallback seguro)
  const registeredSpecialtiesList: { id: string; name: string }[] =
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

  // Estado do formulário de Solicitação de Cadastro do Médico (Sem opção de escolha de Nível)
  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    password: '',
    crm: '',
    rqe: '',
    cpf: '',
    birthDate: '',
    email: '',
    phone: '',
    specialty: registeredSpecialtiesList[0]?.name || 'Clínica Médica',
    razaoSocial: '',
    cnpj: ''
  });

  const safeDoctors = Array.isArray(doctors) ? doctors : [];

  const onSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Preencha usuário e senha para acessar.');
      return;
    }

    // Se o componente pai forneceu uma função direta handleLogin, delega com segurança
    if (typeof handleLogin === 'function') {
      const result = handleLogin(cleanUser, cleanPass);
      if (result === false) {
        setErrorMsg('Credenciais inválidas ou cadastro ainda pendente de aprovação pelo gestor.');
      }
      return;
    }

    // Caso contrário, autentica diretamente verificando o Login Mestre e o Corpo Clínico
    const masterPass = config?.masterAdminPassword || 'admin123';
    if (cleanUser === 'gestor' && cleanPass === masterPass) {
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess({
          id: 0,
          name: 'Coordenação / Gestor Mestre',
          username: 'gestor',
          role: 'Gestor Geral',
          isAdmin: true,
          isMasterAdmin: true
        });
      }
      return;
    }

    const foundDoc = safeDoctors.find(
      (d: any) =>
        (String(d?.username || '').trim().toLowerCase() === cleanUser ||
          String(d?.email || '').trim().toLowerCase() === cleanUser ||
          String(d?.crm || '').trim().toLowerCase() === cleanUser) &&
        String(d?.password || '123').trim() === cleanPass
    );

    if (!foundDoc) {
      setErrorMsg('Usuário ou senha incorretos. Verifique seus dados.');
      return;
    }

    if (foundDoc.status === 'Pendente') {
      setErrorMsg(
        'Sua solicitação de cadastro já foi recebida e aguarda aprovação do Gestor da unidade.'
      );
      return;
    }

    if (typeof onLoginSuccess === 'function') {
      onLoginSuccess({
        ...foundDoc,
        isAdmin: Boolean(foundDoc.hasManagerAccess),
        isMasterAdmin: false
      });
    }
  };

  const onSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regForm.name.trim() || !regForm.username.trim() || !regForm.password.trim() || !regForm.crm.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const cleanUsername = regForm.username.trim().toLowerCase();
    const exists = safeDoctors.some(
      (d: any) => String(d?.username || '').trim().toLowerCase() === cleanUsername
    );

    if (exists || cleanUsername === 'gestor') {
      setErrorMsg('Este nome de usuário já está em uso. Escolha outro login.');
      return;
    }

    const chosenSpecialty =
      regForm.specialty || registeredSpecialtiesList[0]?.name || 'Clínica Médica';

    // Novo médico entra sempre como Pendente e Nível 1 padrão (o Gestor definirá o Nível 1 a 4 na aprovação)
    const newDoctorRequest = {
      id: Date.now(),
      name: regForm.name.trim(),
      username: cleanUsername,
      password: regForm.password.trim(),
      crm: regForm.crm.trim(),
      rqe: regForm.rqe.trim(),
      cpf: regForm.cpf.trim(),
      birthDate: regForm.birthDate,
      email: regForm.email.trim(),
      phone: regForm.phone.trim(),
      specialty: chosenSpecialty,
      razaoSocial: regForm.razaoSocial.trim(),
      cnpj: regForm.cnpj.trim(),
      role: 'Plantonista',
      remunerationLevel: 1, // Definido exclusivamente pelo gestor após o cadastro
      contractType: 'Coringa / Extra',
      participatesInSchedule: true,
      hasManagerAccess: false,
      allowedFunctions: ['Plantonista'],
      defaultShiftAdditionals: [],
      monthlyAdditionals: [],
      fixedMonthlyAdditional: 0,
      status: 'Pendente'
    };

    if (typeof setDoctors === 'function') {
      setDoctors((prev: any[]) => [...(Array.isArray(prev) ? prev : []), newDoctorRequest]);
    }
    if (typeof recordAction === 'function') {
      recordAction(`Nova solicitação de cadastro enviada por ${newDoctorRequest.name} (${chosenSpecialty})`);
    }

    setRegisterSuccess(true);
    setRegForm({
      name: '',
      username: '',
      password: '',
      crm: '',
      rqe: '',
      cpf: '',
      birthDate: '',
      email: '',
      phone: '',
      specialty: registeredSpecialtiesList[0]?.name || 'Clínica Médica',
      razaoSocial: '',
      cnpj: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho Institucional */}
        <div className="bg-slate-900 text-white p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg">
            <Activity size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">
            {config?.appName || 'MedScale Pro'}
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            {config?.sectorUnitName || 'Emergência Adulta - HGD'} • Governança & Escalas Médicas
          </p>
        </div>

        {/* Alternador Login vs Solicitar Cadastro */}
        <div className="grid grid-cols-2 bg-slate-100 p-1.5 m-5 rounded-2xl text-xs font-extrabold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setRegisterSuccess(false);
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock size={14} /> Entrar na Conta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setRegisterSuccess(false);
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus size={14} /> Solicitar Cadastro
          </button>
        </div>

        <div className="px-6 pb-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={onSubmitLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">
                  Usuário de Acesso / Login
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: gestor ou seu usuário médico"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Digite sua senha..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Acessar Plataforma
              </button>
            </form>
          ) : registerSuccess ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center space-y-3 text-xs">
              <CheckCircle size={36} className="text-emerald-600 mx-auto" />
              <h3 className="text-base font-black text-emerald-950">
                Solicitação Enviada com Sucesso!
              </h3>
              <p className="text-emerald-800 leading-relaxed">
                Seus dados cadastrais e sua especialidade foram encaminhados para a fila de homologação do <strong>Gestor Médico</strong>. Assim que aprovado, seu login estará liberado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRegisterSuccess(false);
                  setMode('login');
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold"
              >
                Voltar para a Tela de Login
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmitRegister} className="space-y-3 text-xs max-h-[62vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                <span>
                  Preencha seus dados para solicitar ingresso no Corpo Clínico. O enquadramento de função e nível será atribuído pela gestão.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. João Silva"
                  value={regForm.name}
                  onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuário Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: joao.silva"
                    value={regForm.username}
                    onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Criar Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha"
                    value={regForm.password}
                    onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CRM (com UF) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CRM-RJ 123456"
                    value={regForm.crm}
                    onChange={e => setRegForm({ ...regForm, crm: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RQE (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Nº RQE"
                    value={regForm.rqe}
                    onChange={e => setRegForm({ ...regForm, rqe: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* SELETOR DE ESPECIALIDADE SINCRONIZADO COM A TABELA DE REMUNERAÇÃO */}
              <div>
                <label className="block font-extrabold text-indigo-900 mb-1 flex items-center gap-1">
                  <Stethoscope size={14} className="text-indigo-600" /> Especialidade Médica *
                </label>
                <select
                  value={regForm.specialty}
                  onChange={e => setRegForm({ ...regForm, specialty: e.target.value })}
                  className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2 bg-indigo-50/40 font-extrabold text-slate-900"
                >
                  {registeredSpecialtiesList.map(sp => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="medico@email.com"
                    value={regForm.email}
                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(00) 90000-0000"
                    value={regForm.phone}
                    onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <span className="block text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1">
                  <Building2 size={13} /> Dados da Pessoa Jurídica (PJ) para Faturamento
                </span>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Razão Social PJ</label>
                  <input
                    type="text"
                    placeholder="Nome da empresa médica Ltda"
                    value={regForm.razaoSocial}
                    onChange={e => setRegForm({ ...regForm, razaoSocial: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={regForm.cnpj}
                    onChange={e => setRegForm({ ...regForm, cnpj: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md mt-2"
              >
                Enviar Solicitação ao Gestor
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}