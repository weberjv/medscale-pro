'use client';

import React, { useState, useEffect } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  Users, Calendar, DollarSign, LogOut,
  Plus, Trash2, CheckCircle, AlertCircle, Download,
  Search, History
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  try {
    return createSupabaseClient(url, key);
  } catch {
    return null;
  }
}

const DEFAULT_CONFIG = {
  appName: 'MedScale Pro',
  sectorUnitName: 'Emergência Adulta - HGD',
  baseHourlyRate: 180,
  weekendBonusPercent: 20,
  nightBonusPercent: 15,
  bonusIncidenceRule: 'shift',
};

const SPECIALTIES = [
  'Clínica Médica',
  'Medicina de Emergência',
  'Terapia Intensiva (UTI)',
  'Cirurgia Geral',
  'Cardiologia',
  'Ortopedia',
  'Neurologia',
  'Anestesiologia',
  'Outra'
];

const initialDoctors = [
  {
    id: 'doc-1',
    name: 'Dr. Carlos Eduardo Silva',
    username: 'carlos',
    email: 'carlos@medscale.com.br',
    password: '123',
    cpf: '123.456.789-00',
    birthDate: '1985-04-12',
    phone: '(21) 99999-1111',
    crm: '52-101010-0',
    rqe: '12345',
    specialty: 'Medicina de Emergência',
    razaoSocial: 'Carlos Silva Serviços Médicos LTDA',
    cnpj: '12.345.678/0001-90',
    status: 'active', // 'active' | 'inactive' | 'pending'
    startDate: '2024-01-10',
    endDate: '',
    fixedShiftsDescription: 'Segundas Diurno (12h) e Quintas Noturno (12h)',
    hourlyRate: 180,
    workloadHistory: [
      {
        id: 'wh-1',
        date: '2024-01-10',
        type: 'Admissão / Início',
        description: 'Iniciou com 24h semanais (Seg D e Qui N)'
      }
    ]
  },
  {
    id: 'doc-2',
    name: 'Dra. Mariana Costa',
    username: 'mariana',
    email: 'mariana@medscale.com.br',
    password: '123',
    cpf: '234.567.890-11',
    birthDate: '1990-08-25',
    phone: '(21) 98888-2222',
    crm: '52-202020-5',
    rqe: '54321',
    specialty: 'Clínica Médica',
    razaoSocial: 'Mariana Costa Clínica Médica Unipessoal LTDA',
    cnpj: '98.765.432/0001-10',
    status: 'active',
    startDate: '2024-03-01',
    endDate: '',
    fixedShiftsDescription: 'Terças e Quartas Diurno (12h)',
    hourlyRate: 180,
    workloadHistory: [
      {
        id: 'wh-2',
        date: '2024-03-01',
        type: 'Admissão / Início',
        description: 'Entrada no corpo clínico fixo (24h semanais)'
      }
    ]
  }
];

const initialShifts = [
  {
    id: 'shift-1',
    doctorId: 'doc-1',
    date: '2025-05-15',
    period: 'Diurno (07h-19h)',
    hours: 12,
    sector: 'Sala Vermelha / Emergência',
    isWeekendOrHoliday: false,
    isNight: false
  },
  {
    id: 'shift-2',
    doctorId: 'doc-2',
    date: '2025-05-15',
    period: 'Noturno (19h-07h)',
    hours: 12,
    sector: 'Box de Emergência / Evolução',
    isWeekendOrHoliday: false,
    isNight: true
  }
];

export default function MedScaleApp() {
  const [isLoaded, setIsLoaded] = useState(false);

  // --- ESTADOS GERAIS ---
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [doctors, setDoctors] = useState<any[]>(initialDoctors);
  const [shifts, setShifts] = useState<any[]>(initialShifts);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [adminCredentials, setAdminCredentials] = useState({
    username: 'gestor',
    email: 'gestor@medscale.com.br',
    password: 'admin123'
  });

  // --- AUTENTICAÇÃO E NAVEGAÇÃO ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Estado Esqueci Minha Senha
  const [forgotForm, setForgotForm] = useState({
    identifier: '',
    securityDoc: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estado Solicitar Cadastro
  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    email: '',
    phone: '',
    crm: '',
    rqe: '',
    specialty: 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    password: '',
    confirmPassword: ''
  });

  // Navegação interna
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctorFilter, setDoctorFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Edição Completa / Carga Horária do Médico (sem new Date() no estado inicial)
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [newWorkloadEntry, setNewWorkloadEntry] = useState({
    date: '',
    type: 'Aumento de Carga Horária',
    description: ''
  });

  // Modal de Novo Médico pelo Gestor
  const [showNewDoctorModal, setShowNewDoctorModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    email: '',
    phone: '',
    crm: '',
    rqe: '',
    specialty: 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    password: '123',
    startDate: '',
    fixedShiftsDescription: '',
    hourlyRate: 180
  });

  // Modal de Novo Plantão
  const [newShiftForm, setNewShiftForm] = useState({
    doctorId: '',
    date: '',
    period: 'Diurno (07h-19h)',
    hours: 12,
    sector: 'Emergência Adulta',
    isWeekendOrHoliday: false,
    isNight: false
  });

  // Inicializa as datas padrão somente no navegador (evita erro de prerender na Vercel)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setNewWorkloadEntry((prev) => ({ ...prev, date: prev.date || today }));
    setNewDocForm((prev) => ({ ...prev, startDate: prev.startDate || today }));
    setNewShiftForm((prev) => ({ ...prev, date: prev.date || today }));
  }, []);

  // --- TÍTULO DA ABA DO NAVEGADOR ---
  useEffect(() => {
    document.title = `${config.appName || 'MedScale Pro'} • ${config.sectorUnitName || 'Emergência Adulta - HGD'}`;
  }, [config.appName, config.sectorUnitName]);

  // --- CARREGAMENTO E PERSISTÊNCIA (LOCALSTORAGE + SUPABASE) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = localStorage.getItem('medscale_hgd_state_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.config) setConfig(parsed.config);
          if (parsed.doctors) setDoctors(parsed.doctors);
          if (parsed.shifts) setShifts(parsed.shifts);
          if (parsed.swaps) setSwaps(parsed.swaps);
          if (parsed.vacations) setVacations(parsed.vacations);
          if (parsed.courses) setCourses(parsed.courses);
          if (parsed.occurrences) setOccurrences(parsed.occurrences);
          if (parsed.adminCredentials) setAdminCredentials(parsed.adminCredentials);
        }

        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase
            .from('medscale_state')
            .select('payload')
            .eq('id', 'hgd_main')
            .single();
          if (data && data.payload) {
            const p = data.payload;
            if (p.config) setConfig(p.config);
            if (p.doctors) setDoctors(p.doctors);
            if (p.shifts) setShifts(p.shifts);
            if (p.swaps) setSwaps(p.swaps);
            if (p.vacations) setVacations(p.vacations);
            if (p.courses) setCourses(p.courses);
            if (p.occurrences) setOccurrences(p.occurrences);
            if (p.adminCredentials) setAdminCredentials(p.adminCredentials);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar estado inicial:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  const persistState = async (customDoctors?: any[], customShifts?: any[]) => {
    const payload = {
      config,
      doctors: customDoctors ?? doctors,
      shifts: customShifts ?? shifts,
      swaps,
      vacations,
      courses,
      occurrences,
      adminCredentials,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('medscale_hgd_state_v2', JSON.stringify(payload));
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('medscale_state').upsert({ id: 'hgd_main', payload });
      }
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    persistState();
  }, [isLoaded, config, doctors, shifts, swaps, vacations, courses, occurrences, adminCredentials]);

  // --- FUNÇÕES DE LOGIN / CADASTRO / RECUPERAÇÃO DE SENHA ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    const identifier = loginIdentifier.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!identifier || !pass) {
      setAuthMessage({ type: 'error', text: 'Preencha seu usuário e senha para entrar.' });
      return;
    }

    if (
      (identifier === adminCredentials.username.toLowerCase() ||
        identifier === adminCredentials.email.toLowerCase()) &&
      pass === adminCredentials.password
    ) {
      setCurrentUser({ id: 'admin', name: 'Gestor Geral', role: 'admin', username: adminCredentials.username });
      setActiveTab('doctors');
      return;
    }

    const foundDoc = doctors.find(
      (d) =>
        (d.username && d.username.toLowerCase() === identifier) ||
        (d.email && d.email.toLowerCase() === identifier)
    );

    if (!foundDoc || foundDoc.password !== pass) {
      setAuthMessage({ type: 'error', text: 'Usuário ou senha inválidos.' });
      return;
    }

    if (foundDoc.status === 'pending') {
      setAuthMessage({
        type: 'error',
        text: 'Seu cadastro ainda está aguardando aprovação do Gestor da Emergência Adulta - HGD.'
      });
      return;
    }

    if (foundDoc.status === 'inactive') {
      setAuthMessage({
        type: 'error',
        text: 'Seu cadastro encontra-se inativo na unidade. Entre em contato com a coordenação.'
      });
      return;
    }

    setCurrentUser({ ...foundDoc, role: 'doctor' });
    setActiveTab('schedule');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!regForm.name || !regForm.username || !regForm.crm || !regForm.password || !regForm.razaoSocial || !regForm.cnpj) {
      setAuthMessage({
        type: 'error',
        text: 'Preencha todos os campos obrigatórios (Nome, Usuário, CRM, Razão Social, CNPJ e Senha).'
      });
      return;
    }

    if (regForm.password !== regForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'As senhas digitadas não conferem.' });
      return;
    }

    const cleanUsername = regForm.username.trim().toLowerCase().replace(/\s+/g, '.');
    const exists = doctors.some(
      (d) =>
        (d.username && d.username.toLowerCase() === cleanUsername) ||
        (d.email && regForm.email && d.email.toLowerCase() === regForm.email.trim().toLowerCase())
    );

    if (exists || cleanUsername === 'gestor') {
      setAuthMessage({ type: 'error', text: 'Este nome de usuário ou e-mail já está em uso. Escolha outro.' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newRequest = {
      id: `doc-${Date.now()}`,
      name: regForm.name.trim(),
      username: cleanUsername,
      cpf: regForm.cpf.trim(),
      birthDate: regForm.birthDate,
      email: regForm.email.trim(),
      phone: regForm.phone.trim(),
      crm: regForm.crm.trim(),
      rqe: regForm.rqe.trim(),
      specialty: regForm.specialty,
      razaoSocial: regForm.razaoSocial.trim(),
      cnpj: regForm.cnpj.trim(),
      password: regForm.password,
      status: 'pending',
      startDate: '',
      endDate: '',
      fixedShiftsDescription: '',
      hourlyRate: config.baseHourlyRate || 180,
      requestedAt: today,
      workloadHistory: [
        {
          id: `wh-${Date.now()}`,
          date: today,
          type: 'Solicitação de Cadastro',
          description: 'Solicitação enviada pelo médico na plataforma.'
        }
      ]
    };

    const updated = [...doctors, newRequest];
    setDoctors(updated);
    persistState(updated);

    setRegForm({
      name: '', username: '', cpf: '', birthDate: '', email: '', phone: '',
      crm: '', rqe: '', specialty: 'Clínica Médica', razaoSocial: '', cnpj: '',
      password: '', confirmPassword: ''
    });

    setAuthTab('login');
    setAuthMessage({
      type: 'success',
      text: `Solicitação enviada com sucesso! Seu usuário será "${cleanUsername}". Aguarde a aprovação do Gestor.`
    });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    const id = forgotForm.identifier.trim().toLowerCase();
    const docValidation = forgotForm.securityDoc.replace(/\D/g, '');

    if (!id || !forgotForm.securityDoc || !forgotForm.newPassword) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos para redefinir sua senha.' });
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    const targetDoc = doctors.find(
      (d) =>
        (d.username && d.username.toLowerCase() === id) ||
        (d.email && d.email.toLowerCase() === id)
    );

    if (!targetDoc) {
      setAuthMessage({ type: 'error', text: 'Usuário não encontrado no sistema.' });
      return;
    }

    const cleanCpf = (targetDoc.cpf || '').replace(/\D/g, '');
    const cleanCrm = (targetDoc.crm || '').replace(/\D/g, '');

    if (
      !docValidation ||
      (docValidation !== cleanCpf && docValidation !== cleanCrm && forgotForm.securityDoc.trim() !== targetDoc.crm)
    ) {
      setAuthMessage({
        type: 'error',
        text: 'CPF ou CRM informado não corresponde ao cadastro deste usuário.'
      });
      return;
    }

    const updated = doctors.map((d) =>
      d.id === targetDoc.id ? { ...d, password: forgotForm.newPassword } : d
    );
    setDoctors(updated);
    persistState(updated);

    setForgotForm({ identifier: '', securityDoc: '', newPassword: '', confirmPassword: '' });
    setAuthTab('login');
    setAuthMessage({
      type: 'success',
      text: 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.'
    });
  };

  // --- FUNÇÕES DE GESTÃO DO CORPO CLÍNICO ---
  const handleApproveDoctor = (docId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = doctors.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'active',
          startDate: d.startDate || today,
          workloadHistory: [
            ...(d.workloadHistory || []),
            {
              id: `wh-${Date.now()}`,
              date: today,
              type: 'Aprovação / Início na Unidade',
              description: 'Cadastro aprovado pelo Gestor. Médico ativo no corpo clínico.'
            }
          ]
        };
      }
      return d;
    });
    setDoctors(updated);
    persistState(updated);
  };

  const handleDeleteDoctor = (docId: string, docName: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o cadastro de "${docName}"?`)) return;
    const updated = doctors.filter((d) => d.id !== docId);
    setDoctors(updated);
    persistState(updated);
    if (editingDoctor?.id === docId) setEditingDoctor(null);
  };

  const handleToggleStatus = (docId: string, newStatus: 'active' | 'inactive') => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = doctors.map((d) => {
      if (d.id === docId) {
        const isLeaving = newStatus === 'inactive';
        return {
          ...d,
          status: newStatus,
          endDate: isLeaving ? (d.endDate || today) : '',
          workloadHistory: [
            ...(d.workloadHistory || []),
            {
              id: `wh-${Date.now()}`,
              date: today,
              type: isLeaving ? 'Inativação / Saída dos Plantões' : 'Reativação no Corpo Clínico',
              description: isLeaving
                ? 'Marcado como inativo (parou de realizar plantões na unidade).'
                : 'Marcado novamente como médico ativo na unidade.'
            }
          ]
        };
      }
      return d;
    });
    setDoctors(updated);
    persistState(updated);
  };

  const handleAddWorkloadRecord = () => {
    if (!editingDoctor || !newWorkloadEntry.description.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const entry = {
      id: `wh-${Date.now()}`,
      date: newWorkloadEntry.date || today,
      type: newWorkloadEntry.type,
      description: newWorkloadEntry.description.trim()
    };
    const updatedDoc = {
      ...editingDoctor,
      workloadHistory: [entry, ...(editingDoctor.workloadHistory || [])]
    };
    setEditingDoctor(updatedDoc);
    const updatedList = doctors.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDoctors(updatedList);
    persistState(updatedList);
    setNewWorkloadEntry({
      date: today,
      type: 'Aumento de Carga Horária',
      description: ''
    });
  };

  const handleRemoveWorkloadRecord = (recordId: string) => {
    if (!editingDoctor) return;
    const updatedDoc = {
      ...editingDoctor,
      workloadHistory: (editingDoctor.workloadHistory || []).filter((w: any) => w.id !== recordId)
    };
    setEditingDoctor(updatedDoc);
    const updatedList = doctors.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDoctors(updatedList);
    persistState(updatedList);
  };

  const handleSaveEditingDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    const updatedList = doctors.map((d) => (d.id === editingDoctor.id ? editingDoctor : d));
    setDoctors(updatedList);
    persistState(updatedList);
    setEditingDoctor(null);
  };

  const handleCreateDoctorByManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.name || !newDocForm.username) return;
    const today = new Date().toISOString().slice(0, 10);
    const cleanUser = newDocForm.username.trim().toLowerCase().replace(/\s+/g, '.');
    const created = {
      id: `doc-${Date.now()}`,
      ...newDocForm,
      username: cleanUser,
      startDate: newDocForm.startDate || today,
      status: 'active',
      endDate: '',
      workloadHistory: [
        {
          id: `wh-${Date.now()}`,
          date: newDocForm.startDate || today,
          type: 'Admissão / Início',
          description: `Cadastrado pelo Gestor. Plantões fixos iniciais: ${newDocForm.fixedShiftsDescription || 'A definir'}`
        }
      ]
    };
    const updated = [...doctors, created];
    setDoctors(updated);
    persistState(updated);
    setShowNewDoctorModal(false);
    setNewDocForm({
      name: '', username: '', cpf: '', birthDate: '', email: '', phone: '',
      crm: '', rqe: '', specialty: 'Clínica Médica', razaoSocial: '', cnpj: '',
      password: '123', startDate: today,
      fixedShiftsDescription: '', hourlyRate: 180
    });
  };

  // --- EXPORTAR PLANILHA COMPLETA (CSV PARA EXCEL) ---
  const handleExportDoctorsCSV = () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      'Nome Completo',
      'Username (Login)',
      'Status',
      'Especialidade',
      'CRM',
      'RQE',
      'CPF',
      'Data de Nascimento',
      'E-mail',
      'Telefone',
      'Razão Social (PJ)',
      'CNPJ',
      'Data de Início na Unidade',
      'Data de Saída (Fim Plantões)',
      'Plantões Fixos Atuais',
      'Valor Hora (R$)',
      'Histórico de Alterações de Carga Horária'
    ];

    const statusLabel = (s: string) =>
      s === 'active' ? 'Ativo' : s === 'inactive' ? 'Inativo' : 'Pendente Aprovação';

    const rows = doctors.map((d) => {
      const historyText = (d.workloadHistory || [])
        .map((h: any) => `[${h.date} - ${h.type}: ${h.description}]`)
        .join(' | ');

      return [
        d.name || '',
        d.username || '',
        statusLabel(d.status),
        d.specialty || '',
        d.crm || '',
        d.rqe || '',
        d.cpf || '',
        d.birthDate || '',
        d.email || '',
        d.phone || '',
        d.razaoSocial || '',
        d.cnpj || '',
        d.startDate || '',
        d.endDate || '',
        d.fixedShiftsDescription || '',
        d.hourlyRate || config.baseHourlyRate || 180,
        historyText
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `corpo_clinico_emergencia_hgd_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TELA DE LOGIN / SOLICITAR CADASTRO / ESQUECI MINHA SENHA ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-extrabold px-3.5 py-1 rounded-full tracking-wider uppercase mb-2">
              {config.sectorUnitName || 'EMERGÊNCIA ADULTA - HGD'}
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900">
              {config.appName || 'MedScale Pro'}
            </h1>
          </div>

          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => { setAuthTab('login'); setAuthMessage(null); }}
              className={`py-2.5 rounded-lg transition ${
                authTab === 'login' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('register'); setAuthMessage(null); }}
              className={`py-2.5 rounded-lg transition ${
                authTab === 'register' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Solicitar Cadastro
            </button>
          </div>

          {authMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                authMessage.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authMessage.text}</span>
            </div>
          )}

          {/* ABA 1: LOGIN */}
          {authTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Usuário (Username)
                </label>
                <input
                  type="text"
                  placeholder="Insira seu usuário"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Senha</label>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('forgot'); setAuthMessage(null); }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Insira sua senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md"
              >
                Acessar Plataforma
              </button>
            </form>
          )}

          {/* ABA 2: SOLICITAR CADASTRO MÉDICO */}
          {authTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. João Silva"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username (p/ Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: joao.silva"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Especialidade *</label>
                  <select
                    value={regForm.specialty}
                    onChange={(e) => setRegForm({ ...regForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                  >
                    {SPECIALTIES.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CRM *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 52-12345-0"
                    value={regForm.crm}
                    onChange={(e) => setRegForm({ ...regForm, crm: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RQE</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={regForm.rqe}
                    onChange={(e) => setRegForm({ ...regForm, rqe: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={regForm.cpf}
                    onChange={(e) => setRegForm({ ...regForm, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={regForm.birthDate}
                    onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <p className="text-xs font-extrabold text-slate-700 uppercase">Dados Pessoa Jurídica (PJ)</p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome da empresa médica LTDA"
                    value={regForm.razaoSocial}
                    onChange={(e) => setRegForm({ ...regForm, razaoSocial: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={regForm.cnpj}
                    onChange={(e) => setRegForm({ ...regForm, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(21) 99999-0000"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Criar Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={regForm.confirmPassword}
                    onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow-md mt-2"
              >
                Enviar Solicitação de Cadastro
              </button>
            </form>
          )}

          {/* ABA 3: ESQUECI MINHA SENHA */}
          {authTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
                Informe seu <strong>Username</strong> (ou E-mail) e valide sua identidade com seu <strong>CPF ou CRM</strong> cadastrado para criar uma nova senha.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seu Username ou E-mail</label>
                <input
                  type="text"
                  required
                  placeholder="Insira seu usuário"
                  value={forgotForm.identifier}
                  onChange={(e) => setForgotForm({ ...forgotForm, identifier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CPF ou CRM (Validação de Segurança)</label>
                <input
                  type="text"
                  required
                  placeholder="Digite seu CPF ou CRM cadastrado"
                  value={forgotForm.securityDoc}
                  onChange={(e) => setForgotForm({ ...forgotForm, securityDoc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Nova senha"
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a nova senha"
                    value={forgotForm.confirmPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-lg text-sm"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm"
                >
                  Redefinir Senha
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- CONTADORES DO CORPO CLÍNICO ---
  const pendingDoctors = doctors.filter((d) => d.status === 'pending');
  const activeDoctors = doctors.filter((d) => d.status === 'active');
  const inactiveDoctors = doctors.filter((d) => d.status === 'inactive');

  const filteredDoctors = doctors.filter((d) => {
    const matchesStatus = doctorFilter === 'all' ? true : d.status === doctorFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.username && d.username.toLowerCase().includes(q)) ||
      (d.crm && d.crm.toLowerCase().includes(q)) ||
      (d.specialty && d.specialty.toLowerCase().includes(q)) ||
      (d.razaoSocial && d.razaoSocial.toLowerCase().includes(q)) ||
      (d.cnpj && d.cnpj.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // --- PAINEL PRINCIPAL (GESTOR E MÉDICO) ---
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg font-extrabold text-lg">HGD</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg leading-none">{config.appName}</h1>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                {config.sectorUnitName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logado como: <strong className="text-white">{currentUser.name}</strong> ({currentUser.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.role === 'admin' && pendingDoctors.length > 0 && (
            <button
              onClick={() => { setActiveTab('doctors'); setDoctorFilter('pending'); }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 animate-pulse"
            >
              <AlertCircle className="w-4 h-4" />
              {pendingDoctors.length} Solicitação(ões) Pendente(s)
            </button>
          )}

          <button
            onClick={() => setCurrentUser(null)}
            className="bg-slate-800 hover:bg-red-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 py-2 flex flex-wrap gap-2">
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'doctors' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Corpo Clínico & Cadastros
            {pendingDoctors.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
                {pendingDoctors.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Escala de Plantões
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'payroll' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Financeiro / PJ
          </button>
        )}
      </nav>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'doctors' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            {pendingDoctors.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">
                        Solicitações de Cadastro Aguardando Aprovação ({pendingDoctors.length})
                      </h2>
                      <p className="text-xs text-amber-800">
                        Analise os dados do médico (incluindo Razão Social e CNPJ) antes de aprovar o acesso à plataforma.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDoctors.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">{doc.name}</h3>
                          <p className="text-xs text-blue-700 font-bold">
                            Username: <span className="underline">{doc.username}</span> • {doc.specialty}
                          </p>
                        </div>
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                          Pendente
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg">
                        <div><strong>CRM:</strong> {doc.crm} {doc.rqe ? `(RQE: ${doc.rqe})` : ''}</div>
                        <div><strong>CPF:</strong> {doc.cpf || '-'}</div>
                        <div><strong>Telefone:</strong> {doc.phone || '-'}</div>
                        <div><strong>E-mail:</strong> {doc.email || '-'}</div>
                        <div className="col-span-2 pt-1 border-t border-slate-200">
                          <strong>Razão Social:</strong> {doc.razaoSocial || 'Não informada'}
                        </div>
                        <div className="col-span-2">
                          <strong>CNPJ:</strong> {doc.cnpj || 'Não informado'}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApproveDoctor(doc.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprovar Cadastro
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          Recusar / Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Gestão do Corpo Clínico</h2>
                  <p className="text-xs text-slate-500">
                    Controle médicos ativos/inativos, especialidades, datas de início/saída, histórico de carga horária e dados PJ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportDoctorsCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Planilha Completa (Excel / CSV)
                  </button>

                  <button
                    onClick={() => setShowNewDoctorModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Médico
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setDoctorFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      doctorFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Todos ({doctors.length})
                  </button>
                  <button
                    onClick={() => setDoctorFilter('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      doctorFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    Ativos ({activeDoctors.length})
                  </button>
                  <button
                    onClick={() => setDoctorFilter('inactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      doctorFilter === 'inactive' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Inativos / Saíram ({inactiveDoctors.length})
                  </button>
                  <button
                    onClick={() => setDoctorFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      doctorFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    Pendentes ({pendingDoctors.length})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar nome, username, CRM, CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase">
                      <th className="py-3 px-3">Médico / Username</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Especialidade</th>
                      <th className="py-3 px-3">Razão Social / CNPJ</th>
                      <th className="py-3 px-3">Início na Unidade</th>
                      <th className="py-3 px-3">Saída (Parou Plantões)</th>
                      <th className="py-3 px-3 text-right">Ações / Carga Horária</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDoctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 text-sm">{doc.name}</div>
                          <div className="text-slate-500">
                            Login: <strong className="text-blue-700">{doc.username}</strong> • CRM: {doc.crm}
                          </div>
                          {doc.fixedShiftsDescription && (
                            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                              Fixos: {doc.fixedShiftsDescription}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {doc.status === 'pending' ? (
                            <button
                              onClick={() => handleApproveDoctor(doc.id)}
                              className="bg-amber-100 hover:bg-emerald-600 hover:text-white text-amber-900 font-bold px-2.5 py-1 rounded-full text-xs transition"
                            >
                              Aprovar Agora
                            </button>
                          ) : (
                            <select
                              value={doc.status}
                              onChange={(e) => handleToggleStatus(doc.id, e.target.value as 'active' | 'inactive')}
                              className={`font-bold px-2.5 py-1 rounded-full text-xs border cursor-pointer ${
                                doc.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="active">Ativo (Trabalhando)</option>
                              <option value="inactive">Inativo (Saiu da Escala)</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={doc.specialty || 'Clínica Médica'}
                            onChange={(e) => {
                              const updated = doctors.map((d) =>
                                d.id === doc.id ? { ...d, specialty: e.target.value } : d
                              );
                              setDoctors(updated);
                              persistState(updated);
                            }}
                            className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800 font-medium"
                          >
                            {SPECIALTIES.map((sp) => (
                              <option key={sp} value={sp}>{sp}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{doc.razaoSocial || '-'}</div>
                          <div className="text-slate-500">{doc.cnpj || '-'}</div>
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={doc.startDate || ''}
                            onChange={(e) => {
                              const updated = doctors.map((d) =>
                                d.id === doc.id ? { ...d, startDate: e.target.value } : d
                              );
                              setDoctors(updated);
                              persistState(updated);
                            }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={doc.endDate || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = doctors.map((d) =>
                                d.id === doc.id
                                  ? { ...d, endDate: val, status: val ? 'inactive' : d.status }
                                  : d
                              );
                              setDoctors(updated);
                              persistState(updated);
                            }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingDoctor(doc)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                              title="Editar Ficha Completa e Histórico de Carga Horária"
                            >
                              <History className="w-3.5 h-3.5" />
                              Ficha / Carga Horária ({(doc.workloadHistory || []).length})
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg"
                              title="Excluir Médico Indevido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900">Escala de Plantões • {config.sectorUnitName}</h2>

            {currentUser.role === 'admin' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Médico Plantonista (Ativos)</label>
                  <select
                    value={newShiftForm.doctorId}
                    onChange={(e) => setNewShiftForm({ ...newShiftForm, doctorId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    <option value="">Selecione um médico...</option>
                    {activeDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={newShiftForm.date}
                    onChange={(e) => setNewShiftForm({ ...newShiftForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Período</label>
                  <select
                    value={newShiftForm.period}
                    onChange={(e) =>
                      setNewShiftForm({
                        ...newShiftForm,
                        period: e.target.value,
                        isNight: e.target.value.includes('Noturno')
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    <option value="Diurno (07h-19h)">Diurno (07h-19h)</option>
                    <option value="Noturno (19h-07h)">Noturno (19h-07h)</option>
                    <option value="Plantão 24h">Plantão 24h</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newShiftForm.doctorId) return;
                    const created = {
                      id: `shift-${Date.now()}`,
                      ...newShiftForm,
                      hours: newShiftForm.period.includes('24h') ? 24 : 12
                    };
                    const updated = [...shifts, created];
                    setShifts(updated);
                    persistState(undefined, updated);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs"
                >
                  + Escalonar
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-slate-600">
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Período</th>
                    <th className="py-3 px-3">Plantonista</th>
                    <th className="py-3 px-3">Especialidade</th>
                    <th className="py-3 px-3">Carga</th>
                    {currentUser.role === 'admin' && <th className="py-3 px-3 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {shifts.map((s) => {
                    const doc = doctors.find((d) => d.id === s.doctorId);
                    return (
                      <tr key={s.id}>
                        <td className="py-3 px-3 font-bold">{s.date}</td>
                        <td className="py-3 px-3">{s.period}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{doc ? doc.name : 'Médico Removido'}</td>
                        <td className="py-3 px-3 text-slate-600">{doc?.specialty || '-'}</td>
                        <td className="py-3 px-3">{s.hours}h</td>
                        {currentUser.role === 'admin' && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                const updated = shifts.filter((item) => item.id !== s.id);
                                setShifts(updated);
                                persistState(undefined, updated);
                              }}
                              className="text-red-600 hover:underline font-bold"
                            >
                              Remover
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900">Relatório Financeiro & Dados PJ para Faturamento</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-slate-600">
                    <th className="py-3 px-3">Médico</th>
                    <th className="py-3 px-3">Razão Social</th>
                    <th className="py-3 px-3">CNPJ</th>
                    <th className="py-3 px-3">Total Horas Escaladas</th>
                    <th className="py-3 px-3">Valor Hora</th>
                    <th className="py-3 px-3">Total Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeDoctors.map((doc) => {
                    const docShifts = shifts.filter((s) => s.doctorId === doc.id);
                    const totalHours = docShifts.reduce((acc, s) => acc + (Number(s.hours) || 0), 0);
                    const rate = Number(doc.hourlyRate) || config.baseHourlyRate || 180;
                    return (
                      <tr key={doc.id}>
                        <td className="py-3 px-3 font-bold">{doc.name}</td>
                        <td className="py-3 px-3">{doc.razaoSocial || '-'}</td>
                        <td className="py-3 px-3">{doc.cnpj || '-'}</td>
                        <td className="py-3 px-3">{totalHours}h</td>
                        <td className="py-3 px-3">R$ {rate.toFixed(2)}</td>
                        <td className="py-3 px-3 font-extrabold text-emerald-700">
                          R$ {(totalHours * rate).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {editingDoctor && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Ficha Cadastral & Histórico de Vínculo: {editingDoctor.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Edite dados cadastrais, PJ, datas de entrada/saída e registre mudanças de carga horária ou plantões fixos.
                </p>
              </div>
              <button
                onClick={() => setEditingDoctor(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSaveEditingDoctor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editingDoctor.name || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username (Login)</label>
                  <input
                    type="text"
                    value={editingDoctor.username || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Senha de Acesso</label>
                  <input
                    type="text"
                    value={editingDoctor.password || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status na Unidade</label>
                  <select
                    value={editingDoctor.status}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                  >
                    <option value="active">Ativo (Trabalhando)</option>
                    <option value="inactive">Inativo (Parou Plantões)</option>
                    <option value="pending">Pendente de Aprovação</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Especialidade</label>
                  <select
                    value={editingDoctor.specialty || 'Clínica Médica'}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, specialty: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    {SPECIALTIES.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CRM / RQE</label>
                  <input
                    type="text"
                    value={editingDoctor.crm || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, crm: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Razão Social (PJ)</label>
                  <input
                    type="text"
                    value={editingDoctor.razaoSocial || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, razaoSocial: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={editingDoctor.cnpj || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, cnpj: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                <div>
                  <label className="font-bold text-blue-950 block mb-1">Data de Início na Unidade</label>
                  <input
                    type="date"
                    value={editingDoctor.startDate || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, startDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-blue-950 block mb-1">Quando Parou Plantões (Saída)</label>
                  <input
                    type="date"
                    value={editingDoctor.endDate || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, endDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-blue-950 block mb-1">Resumo Plantões Fixos Atuais</label>
                  <input
                    type="text"
                    placeholder="Ex: Terça D e Sexta N"
                    value={editingDoctor.fixedShiftsDescription || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, fixedShiftsDescription: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  Histórico de Alterações de Carga Horária & Plantões Fixos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-slate-50 p-3 rounded-lg">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data da Alteração</label>
                    <input
                      type="date"
                      value={newWorkloadEntry.date}
                      onChange={(e) => setNewWorkloadEntry({ ...newWorkloadEntry, date: e.target.value })}
                      className="w-full border rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Evento</label>
                    <select
                      value={newWorkloadEntry.type}
                      onChange={(e) => setNewWorkloadEntry({ ...newWorkloadEntry, type: e.target.value })}
                      className="w-full border rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      <option value="Aumento de Carga Horária">Aumento de Carga Horária</option>
                      <option value="Redução de Carga Horária">Redução de Carga Horária</option>
                      <option value="Mudança de Plantão Fixo">Mudança de Plantão Fixo</option>
                      <option value="Saída do Corpo Clínico Fixo">Saída do Corpo Clínico Fixo</option>
                      <option value="Retorno / Reativação">Retorno / Reativação</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <div className="flex-1">
                      <label className="block font-bold text-slate-700 mb-1">Descrição / Detalhes</label>
                      <input
                        type="text"
                        placeholder="Ex: Passou de 12h para 24h semanais (incluiu Quarta N)"
                        value={newWorkloadEntry.description}
                        onChange={(e) => setNewWorkloadEntry({ ...newWorkloadEntry, description: e.target.value })}
                        className="w-full border rounded-lg px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWorkloadRecord}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg self-end"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {(editingDoctor.workloadHistory || []).length === 0 ? (
                    <p className="text-slate-400 italic">Nenhuma alteração registrada ainda.</p>
                  ) : (
                    (editingDoctor.workloadHistory || []).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div>
                          <span className="font-extrabold text-blue-700 mr-2">{item.date}</span>
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded mr-2">
                            {item.type}
                          </span>
                          <span className="text-slate-700">{item.description}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveWorkloadRecord(item.id)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg shadow-md"
                >
                  Salvar Alterações da Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewDoctorModal && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Cadastrar Novo Médico no Corpo Clínico</h3>
              <button onClick={() => setShowNewDoctorModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateDoctorByManager} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newDocForm.name}
                    onChange={(e) => setNewDocForm({ ...newDocForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Username (Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: dra.ana"
                    value={newDocForm.username}
                    onChange={(e) => setNewDocForm({ ...newDocForm, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Especialidade</label>
                  <select
                    value={newDocForm.specialty}
                    onChange={(e) => setNewDocForm({ ...newDocForm, specialty: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    {SPECIALTIES.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">CRM</label>
                  <input
                    type="text"
                    value={newDocForm.crm}
                    onChange={(e) => setNewDocForm({ ...newDocForm, crm: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Razão Social (PJ)</label>
                  <input
                    type="text"
                    value={newDocForm.razaoSocial}
                    onChange={(e) => setNewDocForm({ ...newDocForm, razaoSocial: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={newDocForm.cnpj}
                    onChange={(e) => setNewDocForm({ ...newDocForm, cnpj: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Data de Início na Unidade</label>
                  <input
                    type="date"
                    value={newDocForm.startDate}
                    onChange={(e) => setNewDocForm({ ...newDocForm, startDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Senha Inicial</label>
                  <input
                    type="text"
                    value={newDocForm.password}
                    onChange={(e) => setNewDocForm({ ...newDocForm, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewDoctorModal(false)}
                  className="bg-slate-200 px-4 py-2 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                >
                  Cadastrar Médico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}