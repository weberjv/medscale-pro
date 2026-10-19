'use client';

import React, { useState, useEffect } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  Users, Calendar, Clock, DollarSign, FileText, Settings, LogOut,
  Plus, Trash2, CheckCircle, XCircle, AlertCircle, Download,
  Search, History, RefreshCw, Award, Briefcase, Activity, User
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
  bonusIncidenceRule: 'shift', // 'shift' (Por Plantão) | 'competence' (Por Mês de Competência)
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

const HOURS_24H = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6
];

const DEFAULT_HOURLY_DEMAND: Record<number, number> = {
  7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4,
  13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4,
  19: 3, 20: 3, 21: 3, 22: 3, 23: 3, 0: 3,
  1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3
};

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
    manualAdjustment: 0,
    adjustmentNote: '',
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
    manualAdjustment: 0,
    adjustmentNote: '',
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
    startHour: 7,
    endHour: 19,
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
    startHour: 19,
    endHour: 7,
    hours: 12,
    sector: 'Box de Emergência / Evolução',
    isWeekendOrHoliday: false,
    isNight: true
  }
];

const initialSwaps = [
  {
    id: 'swap-1',
    shiftId: 'shift-1',
    fromDoctorId: 'doc-1',
    toDoctorId: 'doc-2',
    date: '2025-05-15',
    period: 'Diurno (07h-19h)',
    type: 'Troca de Plantão',
    reason: 'Congresso Médico',
    status: 'Pendente' // 'Pendente' | 'Aprovada' | 'Recusada'
  }
];

const initialVacations = [
  {
    id: 'vac-1',
    doctorId: 'doc-1',
    monthCompetence: '2025-07',
    startDate: '2025-07-01',
    endDate: '2025-07-15',
    type: 'Férias Programadas',
    status: 'Aprovado',
    notes: '15 dias de recesso programado'
  }
];

const initialCourses = [
  {
    id: 'course-1',
    doctorId: 'doc-1',
    courseName: 'ACLS (Suporte Avançado de Vida em Cardiologia)',
    institution: 'AHA / SBC',
    completionDate: '2024-05-10',
    expiryDate: '2026-05-10',
    status: 'Válido'
  },
  {
    id: 'course-2',
    doctorId: 'doc-2',
    courseName: 'ATLS (Suporte Avançado de Vida no Trauma)',
    institution: 'ACS / CBC',
    completionDate: '2024-02-15',
    expiryDate: '2028-02-15',
    status: 'Válido'
  }
];

const initialOccurrences = [
  {
    id: 'occ-1',
    doctorId: 'doc-1',
    date: '2025-05-10',
    type: 'Elogio / Destaque Assistencial',
    severity: 'Positiva',
    description: 'Excelente condução de parada cardiorrespiratória na Sala Vermelha.'
  }
];

function isDoctorWorkingAtHour(shift: any, h: number): boolean {
  const p = shift.period || '';
  if (p.includes('24h')) return true;
  if (p.includes('07h-19h')) return h >= 7 && h < 19;
  if (p.includes('19h-07h')) return h >= 19 || h < 7;
  if (p.includes('07h-13h')) return h >= 7 && h < 13;
  if (p.includes('13h-19h')) return h >= 13 && h < 19;
  if (p.includes('19h-01h')) return h >= 19 || h < 1;
  return h >= 7 && h < 19;
}

export default function MedScaleApp() {
  const [isLoaded, setIsLoaded] = useState(false);

  // --- ESTADOS GERAIS ---
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [doctors, setDoctors] = useState<any[]>(initialDoctors);
  const [shifts, setShifts] = useState<any[]>(initialShifts);
  const [swaps, setSwaps] = useState<any[]>(initialSwaps);
  const [vacations, setVacations] = useState<any[]>(initialVacations);
  const [courses, setCourses] = useState<any[]>(initialCourses);
  const [occurrences, setOccurrences] = useState<any[]>(initialOccurrences);
  const [hourlyDemand, setHourlyDemand] = useState<Record<number, number>>(DEFAULT_HOURLY_DEMAND);
  const [payrollStatus, setPayrollStatus] = useState<Record<string, string>>({
    '2025-05': 'Aberta'
  });
  const [selectedMonth, setSelectedMonth] = useState('2025-05');
  const [selectedMapDate, setSelectedMapDate] = useState('2025-05-15');

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

  // Modal de Edição Completa / Carga Horária do Médico
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

  // Formulários dos Módulos
  const [newShiftForm, setNewShiftForm] = useState({
    doctorId: '',
    date: '',
    period: 'Diurno (07h-19h)',
    hours: 12,
    sector: 'Sala Vermelha / Emergência',
    isWeekendOrHoliday: false,
    isNight: false
  });

  const [newSwapForm, setNewSwapForm] = useState({
    shiftId: '',
    fromDoctorId: '',
    toDoctorId: '',
    date: '',
    period: 'Diurno (07h-19h)',
    type: 'Troca de Plantão',
    reason: ''
  });

  const [newVacationForm, setNewVacationForm] = useState({
    doctorId: '',
    monthCompetence: '2025-07',
    startDate: '',
    endDate: '',
    type: 'Férias Programadas',
    status: 'Aprovado',
    notes: ''
  });

  const [newCourseForm, setNewCourseForm] = useState({
    doctorId: '',
    courseName: 'ACLS',
    institution: '',
    completionDate: '',
    expiryDate: '',
    status: 'Válido'
  });

  const [newOccurrenceForm, setNewOccurrenceForm] = useState({
    doctorId: '',
    date: '',
    type: 'Atraso no Plantão',
    severity: 'Média',
    description: ''
  });

  // Inicializa datas no cliente para evitar erro de prerender na Vercel
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    setSelectedMonth(currentMonth);
    setSelectedMapDate(today);
    setNewWorkloadEntry((prev) => ({ ...prev, date: prev.date || today }));
    setNewDocForm((prev) => ({ ...prev, startDate: prev.startDate || today }));
    setNewShiftForm((prev) => ({ ...prev, date: prev.date || today }));
    setNewSwapForm((prev) => ({ ...prev, date: prev.date || today }));
    setNewVacationForm((prev) => ({
      ...prev,
      monthCompetence: currentMonth,
      startDate: prev.startDate || today,
      endDate: prev.endDate || today
    }));
    setNewCourseForm((prev) => ({ ...prev, completionDate: prev.completionDate || today }));
    setNewOccurrenceForm((prev) => ({ ...prev, date: prev.date || today }));
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
          if (parsed.hourlyDemand) setHourlyDemand(parsed.hourlyDemand);
          if (parsed.payrollStatus) setPayrollStatus(parsed.payrollStatus);
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
            if (p.hourlyDemand) setHourlyDemand(p.hourlyDemand);
            if (p.payrollStatus) setPayrollStatus(p.payrollStatus);
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
      hourlyDemand,
      payrollStatus,
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
  }, [isLoaded, config, doctors, shifts, swaps, vacations, courses, occurrences, hourlyDemand, payrollStatus, adminCredentials]);

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
      manualAdjustment: 0,
      adjustmentNote: '',
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
      manualAdjustment: 0,
      adjustmentNote: '',
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

  // --- EXPORTAR PLANILHA COMPLETA DO CORPO CLÍNICO (CSV PARA EXCEL) ---
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

  // --- CÁLCULO DE FOLHA DE PAGAMENTO COM REGRA DE ADICIONAIS ---
  const calculateDoctorPayroll = (doc: any) => {
    const docShifts = shifts.filter((s) => {
      if (s.doctorId !== doc.id) return false;
      if (config.bonusIncidenceRule === 'competence') {
        return (s.date || '').startsWith(selectedMonth);
      }
      return true;
    });

    const rate = Number(doc.hourlyRate) || Number(config.baseHourlyRate) || 180;
    const nightPct = (Number(config.nightBonusPercent) || 15) / 100;
    const wkndPct = (Number(config.weekendBonusPercent) || 20) / 100;

    let baseHours = 0;
    let nightHours = 0;
    let weekendHours = 0;

    docShifts.forEach((s) => {
      const h = Number(s.hours) || 12;
      baseHours += h;
      if (s.isNight || (s.period && s.period.includes('Noturno'))) nightHours += h;
      if (s.isWeekendOrHoliday) weekendHours += h;
    });

    const baseValue = baseHours * rate;
    const nightBonus = nightHours * rate * nightPct;
    const weekendBonus = weekendHours * rate * wkndPct;
    const manualAdj = Number(doc.manualAdjustment) || 0;
    const total = baseValue + nightBonus + weekendBonus + manualAdj;

    return {
      shiftsCount: docShifts.length,
      baseHours,
      nightHours,
      weekendHours,
      baseValue,
      nightBonus,
      weekendBonus,
      manualAdj,
      total
    };
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
  const pendingSwaps = swaps.filter((s) => s.status === 'Pendente');

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
      {/* CABEÇALHO SUPERIOR */}
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
              {pendingDoctors.length} Cadastro(s) Pendente(s)
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

      {/* MENU COMPLETO COM TODAS AS ABAS */}
      <nav className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap gap-1.5 shadow-sm">
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            Mapa Assistencial 24h
          </button>
        )}

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'doctors' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Corpo Clínico & Cadastros
            {pendingDoctors.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[11px] font-extrabold px-1.5 py-0.5 rounded-full">
                {pendingDoctors.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Escala de Plantões
        </button>

        <button
          onClick={() => setActiveTab('swaps')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'swaps' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Trocas & Passagens
          {currentUser.role === 'admin' && pendingSwaps.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[11px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingSwaps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('vacations')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'vacations' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Férias & Licenças
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'payroll' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          {currentUser.role === 'admin' ? 'Financeiro / Folha PJ' : 'Minha Produção PJ'}
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'courses' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Certificados & Cursos
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'occurrences' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Ocorrências
          </button>
        )}

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        )}

        {currentUser.role === 'doctor' && (
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            Meu Perfil & PJ
          </button>
        )}
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* =======================================================
            ABA 1: MAPA ASSISTENCIAL 24H (07H ÀS 06H) E DASHBOARD
           ======================================================= */}
        {activeTab === 'dashboard' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase">Médicos Ativos</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeDoctors.length}</p>
                <p className="text-[11px] text-slate-400">No corpo clínico da unidade</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase">Cadastros Pendentes</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingDoctors.length}</p>
                <p className="text-[11px] text-slate-400">Aguardando aprovação</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase">Trocas Pendentes</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{pendingSwaps.length}</p>
                <p className="text-[11px] text-slate-400">Para homologação da gestão</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase">Férias Programadas</p>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">{vacations.length}</p>
                <p className="text-[11px] text-slate-400">Registros ativos</p>
              </div>
            </div>

            {/* MAPA ASSISTENCIAL 24H (HEATMAP 07H ÀS 06H) */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Mapa Assistencial 24h (Dimensionamento 07h às 06h)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Compare a quantidade de médicos escalados em cada faixa horária com a meta assistencial da Emergência Adulta - HGD.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Data de Análise:</label>
                  <input
                    type="date"
                    value={selectedMapDate}
                    onChange={(e) => setSelectedMapDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 pt-2">
                {HOURS_24H.map((h) => {
                  const shiftsOnDate = shifts.filter((s) => s.date === selectedMapDate);
                  const presentDocs = shiftsOnDate.filter((s) => isDoctorWorkingAtHour(s, h));
                  const count = presentDocs.length;
                  const target = hourlyDemand[h] ?? 3;
                  const diff = count - target;

                  const cardColor =
                    diff < 0
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : diff === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900';

                  return (
                    <div key={h} className={`p-3 rounded-xl border ${cardColor} flex flex-col justify-between`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{String(h).padStart(2, '0')}:00</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80">
                          {diff < 0 ? `Déficit (${diff})` : diff === 0 ? 'Adequado' : `+${diff} Acima`}
                        </span>
                      </div>
                      <div className="my-2">
                        <div className="text-lg font-extrabold">
                          {count} <span className="text-xs font-normal">/ meta {target}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/10">
                        <span>Ajustar Meta:</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={target}
                          onChange={(e) =>
                            setHourlyDemand({ ...hourlyDemand, [h]: Number(e.target.value) })
                          }
                          className="w-12 text-center border rounded bg-white font-bold py-0.5"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            ABA 2: CORPO CLÍNICO & APROVAÇÃO DE CADASTROS
           ======================================================= */}
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

        {/* =======================================================
            ABA 3: ESCALA DE PLANTÕES
           ======================================================= */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Escala de Plantões • {config.sectorUnitName}</h2>
                <p className="text-xs text-slate-500">
                  Visualize e gerencie os plantões diurnos, noturnos, Cinderela e 24h da unidade.
                </p>
              </div>
            </div>

            {currentUser.role === 'admin' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Período / Turno</label>
                  <select
                    value={newShiftForm.period}
                    onChange={(e) =>
                      setNewShiftForm({
                        ...newShiftForm,
                        period: e.target.value,
                        isNight: e.target.value.includes('Noturno') || e.target.value.includes('19h')
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    <option value="Diurno (07h-19h)">Diurno (07h-19h) - 12h</option>
                    <option value="Noturno (19h-07h)">Noturno (19h-07h) - 12h</option>
                    <option value="Manhã (07h-13h)">Manhã (07h-13h) - 6h</option>
                    <option value="Tarde (13h-19h)">Tarde (13h-19h) - 6h</option>
                    <option value="Cinderela (19h-01h)">Cinderela (19h-01h) - 6h</option>
                    <option value="Plantão 24h">Plantão 24h</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={newShiftForm.isWeekendOrHoliday}
                      onChange={(e) => setNewShiftForm({ ...newShiftForm, isWeekendOrHoliday: e.target.checked })}
                    />
                    Fim de Semana / Feriado
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newShiftForm.doctorId) return;
                    const hrs = newShiftForm.period.includes('24h')
                      ? 24
                      : newShiftForm.period.includes('6h')
                      ? 6
                      : 12;
                    const created = {
                      id: `shift-${Date.now()}`,
                      ...newShiftForm,
                      hours: hrs
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
                    <th className="py-3 px-3">Setor / Alocação</th>
                    <th className="py-3 px-3">Adicionais</th>
                    <th className="py-3 px-3">Carga</th>
                    {currentUser.role === 'admin' && <th className="py-3 px-3 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {shifts
                    .filter((s) => (currentUser.role === 'doctor' ? s.doctorId === currentUser.id : true))
                    .map((s) => {
                      const doc = doctors.find((d) => d.id === s.doctorId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold">{s.date}</td>
                          <td className="py-3 px-3">{s.period}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{doc ? doc.name : 'Médico Removido'}</td>
                          <td className="py-3 px-3 text-slate-600">{doc?.specialty || '-'}</td>
                          <td className="py-3 px-3">{s.sector || 'Emergência Adulta'}</td>
                          <td className="py-3 px-3 space-x-1">
                            {s.isNight && (
                              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">Noturno</span>
                            )}
                            {s.isWeekendOrHoliday && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">FDS/Feriado</span>
                            )}
                            {!s.isNight && !s.isWeekendOrHoliday && <span className="text-slate-400">Normal</span>}
                          </td>
                          <td className="py-3 px-3 font-bold">{s.hours}h</td>
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

        {/* =======================================================
            ABA 4: TROCAS & PASSAGENS DE PLANTÃO
           ======================================================= */}
        {activeTab === 'swaps' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Trocas & Passagens de Plantão</h2>
              <p className="text-xs text-slate-500">
                Solicite trocas/passagens de plantão e acompanhe a homologação da coordenação médica.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs">
              <div>
                <label className="font-bold block mb-1">Médico Solicitante</label>
                <select
                  value={currentUser.role === 'doctor' ? currentUser.id : newSwapForm.fromDoctorId}
                  disabled={currentUser.role === 'doctor'}
                  onChange={(e) => setNewSwapForm({ ...newSwapForm, fromDoctorId: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="">Selecione...</option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Médico Substituto</label>
                <select
                  value={newSwapForm.toDoctorId}
                  onChange={(e) => setNewSwapForm({ ...newSwapForm, toDoctorId: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="">Selecione...</option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Data do Plantão</label>
                <input
                  type="date"
                  value={newSwapForm.date}
                  onChange={(e) => setNewSwapForm({ ...newSwapForm, date: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Período</label>
                <select
                  value={newSwapForm.period}
                  onChange={(e) => setNewSwapForm({ ...newSwapForm, period: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="Diurno (07h-19h)">Diurno (07h-19h)</option>
                  <option value="Noturno (19h-07h)">Noturno (19h-07h)</option>
                  <option value="Plantão 24h">Plantão 24h</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Motivo / Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Congresso / Particular"
                  value={newSwapForm.reason}
                  onChange={(e) => setNewSwapForm({ ...newSwapForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const fromId = currentUser.role === 'doctor' ? currentUser.id : newSwapForm.fromDoctorId;
                  if (!fromId || !newSwapForm.toDoctorId) return;
                  const created = {
                    id: `swap-${Date.now()}`,
                    ...newSwapForm,
                    fromDoctorId: fromId,
                    status: currentUser.role === 'admin' ? 'Aprovada' : 'Pendente'
                  };
                  setSwaps([created, ...swaps]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                + Solicitar Troca
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b uppercase text-slate-600">
                    <th className="py-3 px-3">Data / Turno</th>
                    <th className="py-3 px-3">Solicitante (Sai)</th>
                    <th className="py-3 px-3">Substituto (Entra)</th>
                    <th className="py-3 px-3">Motivo</th>
                    <th className="py-3 px-3">Status</th>
                    {currentUser.role === 'admin' && <th className="py-3 px-3 text-right">Decisão do Gestor</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {swaps.map((sw) => {
                    const fromDoc = doctors.find((d) => d.id === sw.fromDoctorId);
                    const toDoc = doctors.find((d) => d.id === sw.toDoctorId);
                    return (
                      <tr key={sw.id}>
                        <td className="py-3 px-3 font-bold">{sw.date} • {sw.period}</td>
                        <td className="py-3 px-3">{fromDoc?.name || '-'}</td>
                        <td className="py-3 px-3 font-semibold text-blue-700">{toDoc?.name || '-'}</td>
                        <td className="py-3 px-3">{sw.reason || '-'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold ${
                              sw.status === 'Aprovada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sw.status === 'Recusada'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sw.status}
                          </span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              onClick={() =>
                                setSwaps(swaps.map((i) => (i.id === sw.id ? { ...i, status: 'Aprovada' } : i)))
                              }
                              className="text-emerald-600 font-bold hover:underline"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() =>
                                setSwaps(swaps.map((i) => (i.id === sw.id ? { ...i, status: 'Recusada' } : i)))
                              }
                              className="text-red-600 font-bold hover:underline"
                            >
                              Recusar
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

        {/* =======================================================
            ABA 5: CONTROLE MENSAL DE FÉRIAS & LICENÇAS
           ======================================================= */}
        {activeTab === 'vacations' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Controle Mensal de Férias & Licenças</h2>
              <p className="text-xs text-slate-500">
                Planejamento mensal de férias, licenças médicas e afastamentos programados da equipe.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs">
              <div>
                <label className="font-bold block mb-1">Médico</label>
                <select
                  value={currentUser.role === 'doctor' ? currentUser.id : newVacationForm.doctorId}
                  disabled={currentUser.role === 'doctor'}
                  onChange={(e) => setNewVacationForm({ ...newVacationForm, doctorId: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="">Selecione...</option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Mês de Competência</label>
                <input
                  type="month"
                  value={newVacationForm.monthCompetence}
                  onChange={(e) => setNewVacationForm({ ...newVacationForm, monthCompetence: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Início</label>
                <input
                  type="date"
                  value={newVacationForm.startDate}
                  onChange={(e) => setNewVacationForm({ ...newVacationForm, startDate: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Término</label>
                <input
                  type="date"
                  value={newVacationForm.endDate}
                  onChange={(e) => setNewVacationForm({ ...newVacationForm, endDate: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: 1ª quinzena"
                  value={newVacationForm.notes}
                  onChange={(e) => setNewVacationForm({ ...newVacationForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const docId = currentUser.role === 'doctor' ? currentUser.id : newVacationForm.doctorId;
                  if (!docId) return;
                  setVacations([
                    ...vacations,
                    {
                      id: `vac-${Date.now()}`,
                      ...newVacationForm,
                      doctorId: docId,
                      status: currentUser.role === 'admin' ? 'Aprovado' : 'Solicitado'
                    }
                  ]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                + Registrar Férias
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b uppercase text-slate-600">
                    <th className="py-3 px-3">Mês Competência</th>
                    <th className="py-3 px-3">Médico</th>
                    <th className="py-3 px-3">Período</th>
                    <th className="py-3 px-3">Observações</th>
                    <th className="py-3 px-3">Status</th>
                    {currentUser.role === 'admin' && <th className="py-3 px-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vacations.map((v) => {
                    const doc = doctors.find((d) => d.id === v.doctorId);
                    return (
                      <tr key={v.id}>
                        <td className="py-3 px-3 font-extrabold text-blue-700">{v.monthCompetence}</td>
                        <td className="py-3 px-3 font-bold">{doc?.name || '-'}</td>
                        <td className="py-3 px-3">{v.startDate} até {v.endDate}</td>
                        <td className="py-3 px-3">{v.notes || '-'}</td>
                        <td className="py-3 px-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                            {v.status}
                          </span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setVacations(vacations.filter((i) => i.id !== v.id))}
                              className="text-red-600 font-bold hover:underline"
                            >
                              Excluir
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

        {/* =======================================================
            ABA 6: FINANCEIRO / FOLHA PJ (COM REGRA DE ADICIONAIS)
           ======================================================= */}
        {activeTab === 'payroll' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Folha de Pagamento & Produção PJ • {config.sectorUnitName}
                </h2>
                <p className="text-xs text-slate-500">
                  Apuração de horas, adicionais noturnos/fins de semana, ajustes manuais e dados bancários/PJ.
                </p>
              </div>

              {currentUser.role === 'admin' && (
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mês de Competência</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Incidência de Adicionais</label>
                    <select
                      value={config.bonusIncidenceRule || 'shift'}
                      onChange={(e) => setConfig({ ...config, bonusIncidenceRule: e.target.value })}
                      className="border rounded-lg px-2.5 py-1.5 bg-white font-bold text-blue-700"
                    >
                      <option value="shift">Por Plantão Realizado (Geral)</option>
                      <option value="competence">Por Mês de Competência ({selectedMonth})</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status da Folha</label>
                    <button
                      type="button"
                      onClick={() =>
                        setPayrollStatus({
                          ...payrollStatus,
                          [selectedMonth]:
                            payrollStatus[selectedMonth] === 'Fechada / Auditada' ? 'Aberta' : 'Fechada / Auditada'
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg font-extrabold ${
                        payrollStatus[selectedMonth] === 'Fechada / Auditada'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {payrollStatus[selectedMonth] || 'Aberta'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-slate-600">
                    <th className="py-3 px-3">Médico</th>
                    <th className="py-3 px-3">Razão Social / CNPJ</th>
                    <th className="py-3 px-3">Horas Totais</th>
                    <th className="py-3 px-3">Base (R$)</th>
                    <th className="py-3 px-3">Adic. Noturno / FDS</th>
                    <th className="py-3 px-3">Ajuste Manual (R$)</th>
                    <th className="py-3 px-3">Total Líquido PJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeDoctors
                    .filter((d) => (currentUser.role === 'doctor' ? d.id === currentUser.id : true))
                    .map((doc) => {
                      const calc = calculateDoctorPayroll(doc);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{doc.name}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{doc.razaoSocial || '-'}</div>
                            <div className="text-slate-500">{doc.cnpj || '-'}</div>
                          </td>
                          <td className="py-3 px-3 font-bold">{calc.baseHours}h ({calc.shiftsCount} plantões)</td>
                          <td className="py-3 px-3">R$ {calc.baseValue.toFixed(2)}</td>
                          <td className="py-3 px-3 text-blue-700 font-semibold">
                            + R$ {(calc.nightBonus + calc.weekendBonus).toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            {currentUser.role === 'admin' ? (
                              <input
                                type="number"
                                value={doc.manualAdjustment || 0}
                                onChange={(e) => {
                                  const updated = doctors.map((d) =>
                                    d.id === doc.id ? { ...d, manualAdjustment: Number(e.target.value) } : d
                                  );
                                  setDoctors(updated);
                                }}
                                className="w-24 border rounded px-2 py-1 bg-white font-bold"
                              />
                            ) : (
                              `R$ ${calc.manualAdj.toFixed(2)}`
                            )}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-emerald-700 text-sm">
                            R$ {calc.total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =======================================================
            ABA 7: CERTIFICADOS & CURSOS OBRIGATÓRIOS
           ======================================================= */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Certificados & Capacitações (ACLS, ATLS, PALS)</h2>
              <p className="text-xs text-slate-500">
                Controle de conformidade e validade das certificações obrigatórias dos médicos emergencistas.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs">
              <div>
                <label className="font-bold block mb-1">Médico</label>
                <select
                  value={currentUser.role === 'doctor' ? currentUser.id : newCourseForm.doctorId}
                  disabled={currentUser.role === 'doctor'}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, doctorId: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="">Selecione...</option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Certificação / Curso</label>
                <input
                  type="text"
                  placeholder="Ex: ACLS / ATLS / POCUS"
                  value={newCourseForm.courseName}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, courseName: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: AHA / SOMERJ"
                  value={newCourseForm.institution}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, institution: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Validade</label>
                <input
                  type="date"
                  value={newCourseForm.expiryDate}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, expiryDate: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const docId = currentUser.role === 'doctor' ? currentUser.id : newCourseForm.doctorId;
                  if (!docId || !newCourseForm.courseName) return;
                  setCourses([...courses, { id: `course-${Date.now()}`, ...newCourseForm, doctorId: docId }]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                + Adicionar Certificado
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b uppercase text-slate-600">
                    <th className="py-3 px-3">Médico</th>
                    <th className="py-3 px-3">Curso / Certificação</th>
                    <th className="py-3 px-3">Instituição</th>
                    <th className="py-3 px-3">Vencimento</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courses
                    .filter((c) => (currentUser.role === 'doctor' ? c.doctorId === currentUser.id : true))
                    .map((c) => {
                      const doc = doctors.find((d) => d.id === c.doctorId);
                      return (
                        <tr key={c.id}>
                          <td className="py-3 px-3 font-bold">{doc?.name || '-'}</td>
                          <td className="py-3 px-3 font-semibold text-blue-800">{c.courseName}</td>
                          <td className="py-3 px-3">{c.institution || '-'}</td>
                          <td className="py-3 px-3">{c.expiryDate || '-'}</td>
                          <td className="py-3 px-3">
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =======================================================
            ABA 8: OCORRÊNCIAS ADMINISTRATIVAS & ASSISTENCIAIS
           ======================================================= */}
        {activeTab === 'occurrences' && currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Livro de Ocorrências & Governança</h2>
              <p className="text-xs text-slate-500">
                Registre atrasos, faltas, elogios e ocorrências de plantão na Emergência Adulta - HGD.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs">
              <div>
                <label className="font-bold block mb-1">Médico</label>
                <select
                  value={newOccurrenceForm.doctorId}
                  onChange={(e) => setNewOccurrenceForm({ ...newOccurrenceForm, doctorId: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="">Selecione...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Data</label>
                <input
                  type="date"
                  value={newOccurrenceForm.date}
                  onChange={(e) => setNewOccurrenceForm({ ...newOccurrenceForm, date: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Tipo</label>
                <select
                  value={newOccurrenceForm.type}
                  onChange={(e) => setNewOccurrenceForm({ ...newOccurrenceForm, type: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="Atraso no Plantão">Atraso no Plantão</option>
                  <option value="Falta / Ausência">Falta / Ausência</option>
                  <option value="Elogio / Destaque Assistencial">Elogio / Destaque Assistencial</option>
                  <option value="Intercorrência Administrativa">Intercorrência Administrativa</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Detalhes da ocorrência"
                  value={newOccurrenceForm.description}
                  onChange={(e) => setNewOccurrenceForm({ ...newOccurrenceForm, description: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newOccurrenceForm.doctorId || !newOccurrenceForm.description) return;
                  setOccurrences([{ id: `occ-${Date.now()}`, ...newOccurrenceForm }, ...occurrences]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                + Registrar
              </button>
            </div>

            <div className="space-y-2">
              {occurrences.map((occ) => {
                const doc = doctors.find((d) => d.id === occ.doctorId);
                return (
                  <div key={occ.id} className="p-3.5 border rounded-xl flex items-center justify-between text-xs bg-slate-50">
                    <div>
                      <span className="font-extrabold text-slate-900 mr-2">{occ.date}</span>
                      <span className="font-bold text-blue-700 mr-2">{doc?.name || '-'}</span>
                      <span className="bg-white border px-2 py-0.5 rounded font-bold mr-2">{occ.type}</span>
                      <span className="text-slate-700">{occ.description}</span>
                    </div>
                    <button
                      onClick={() => setOccurrences(occurrences.filter((i) => i.id !== occ.id))}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =======================================================
            ABA 9: CONFIGURAÇÕES GERAIS DA UNIDADE (GESTOR)
           ======================================================= */}
        {activeTab === 'settings' && currentUser.role === 'admin' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl space-y-4 text-xs">
            <h2 className="text-xl font-extrabold text-slate-900">Configurações da Unidade & Parâmetros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1">Nome do Sistema</label>
                <input
                  type="text"
                  value={config.appName}
                  onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Unidade / Setor</label>
                <input
                  type="text"
                  value={config.sectorUnitName}
                  onChange={(e) => setConfig({ ...config, sectorUnitName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Valor Hora Base (R$)</label>
                <input
                  type="number"
                  value={config.baseHourlyRate}
                  onChange={(e) => setConfig({ ...config, baseHourlyRate: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Adicional Noturno (%)</label>
                <input
                  type="number"
                  value={config.nightBonusPercent}
                  onChange={(e) => setConfig({ ...config, nightBonusPercent: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Adicional Fim de Semana / Feriado (%)</label>
                <input
                  type="number"
                  value={config.weekendBonusPercent}
                  onChange={(e) => setConfig({ ...config, weekendBonusPercent: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Senha do Gestor (`gestor`)</label>
                <input
                  type="text"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            ABA 10: PERFIL DO MÉDICO (QUANDO LOGADO COMO MÉDICO)
           ======================================================= */}
        {activeTab === 'profile' && currentUser.role === 'doctor' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 max-w-2xl space-y-4 text-xs">
            <h2 className="text-xl font-extrabold text-slate-900">Meus Dados Cadastrais & PJ</h2>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border">
              <div><strong>Nome:</strong> {currentUser.name}</div>
              <div><strong>Username:</strong> {currentUser.username}</div>
              <div><strong>CRM:</strong> {currentUser.crm}</div>
              <div><strong>Especialidade:</strong> {currentUser.specialty}</div>
              <div><strong>Razão Social:</strong> {currentUser.razaoSocial || '-'}</div>
              <div><strong>CNPJ:</strong> {currentUser.cnpj || '-'}</div>
              <div><strong>Início na Unidade:</strong> {currentUser.startDate || '-'}</div>
              <div><strong>Plantões Fixos:</strong> {currentUser.fixedShiftsDescription || '-'}</div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: FICHA COMPLETA DO MÉDICO E HISTÓRICO DE ALTERAÇÕES DE CARGA HORÁRIA
         ========================================================================= */}
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

      {/* =========================================================================
          MODAL: CADASTRAR NOVO MÉDICO DIRETO PELO GESTOR
         ========================================================================= */}
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