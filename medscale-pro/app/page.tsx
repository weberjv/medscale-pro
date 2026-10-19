'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Calendar as CalendarIcon, Repeat, DollarSign,
  Umbrella, BookOpen, LogOut, Plus, Edit2, Trash2,
  CheckCircle, XCircle, AlertCircle, Clock, Search,
  Upload, Eye, EyeOff, Lock, Mail, UserPlus, Download,
  Sliders, ShieldAlert, CheckSquare, Square, ChevronDown, ChevronUp,
  Ban, Unlock, AlertTriangle, Briefcase, Activity, BarChart2,
  Flame, Menu, X, ClipboardList, TrendingUp, Database, RefreshCw
} from 'lucide-react';
import { createClient } from '@/supabase/client';
import { syncStateToSupabase } from '@/utils/migrateLegacyLocalStorage';

const DEFAULT_CONFIG = {
  appName: 'MedScale Pro',
  hospitalName: 'Hospital Glória Dor',
  sectorUnitName: 'Emergência Adulta - HGD',
  cpfLabel: 'CPF',
  crmLabel: 'CRM',
  rqeLabel: 'RQE',
  birthDateLabel: 'Data de Nascimento',
  phoneLabel: 'Telefone / Celular',
  razaoSocialLabel: 'Razão Social',
  cnpjLabel: 'CNPJ',
  roleLabel: 'Função Base',
  specialtyLabel: 'Especialidade',
  blockedVacationMonths: ['2026-12', '2027-01'],
  functionRates: {
    'Médico Rotina/Sênior': {
      mensalFixo: 18000,
      extra12h: 1800,
      rules: [
        { id: 'rot_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 18000 },
        { id: 'rot_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1800 },
        { id: 'rot_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 2100 },
      ]
    },
    'Plantonista': {
      mensalFixo: 14000,
      extra12h: 1350,
      rules: [
        { id: 'plt_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 14000 },
        { id: 'plt_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1350 },
        { id: 'plt_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1600 },
      ]
    },
    'Plantão de Especialidade': {
      mensalFixo: 16500,
      extra12h: 1650,
      rules: [
        { id: 'esp_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 16500 },
        { id: 'esp_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1650 },
        { id: 'esp_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1950 },
      ]
    },
    'Chefia/Liderança': {
      mensalFixo: 22000,
      extra12h: 2200,
      rules: [
        { id: 'chf_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 22000 },
        { id: 'chf_extra_util', label: 'Extra Avulso 12h', billingMode: 'por_12h', value: 2200 },
      ]
    },
  } as Record<string, any>,
  adminFunctionRates: {
    'Coordenador Médico (Adm)': { mensalFixo: 12000, description: 'Coordenação geral de escala e equipe (Sem plantão)' },
    'Médico Supervisor (Adm)': { mensalFixo: 8500, description: 'Supervisão assistencial e auditoria clínica (Sem plantão)' },
    'Diretor Técnico / Clínico (Adm)': { mensalFixo: 16000, description: 'Diretoria técnica e governança hospitalar (Sem plantão)' },
  } as Record<string, { mensalFixo: number; description: string }>,
  levelBonuses12h: {
    1: { label: 'Nível 1 (Ingresso / Júnior)', bonus12h: 0, mensalBonus: 0 },
    2: { label: 'Nível 2 (Pleno / 2+ anos)', bonus12h: 180, mensalBonus: 1200 },
    3: { label: 'Nível 3 (Sênior / Titulado)', bonus12h: 350, mensalBonus: 2500 },
    4: { label: 'Nível 4 (Referência / Preceptor)', bonus12h: 600, mensalBonus: 4500 },
  } as Record<number, { label: string; bonus12h: number; mensalBonus: number }>,
  shiftAdditionals: [
    { id: 'fds', name: 'Adicional Fim de Semana', value12h: 250, incidenceType: 'plantao' },
    { id: 'chefia_plantao', name: 'Adicional Chefia de Plantão', value12h: 400, incidenceType: 'plantao' },
    { id: 'feriado', name: 'Adicional Feriado / Data Especial', value12h: 500, incidenceType: 'plantao' },
    { id: 'noturno', name: 'Adicional Noturno Especial', value12h: 180, incidenceType: 'plantao' },
    { id: 'assiduidade_mes', name: 'Adicional de Assiduidade / Retenção', value12h: 1200, incidenceType: 'competencia' },
  ],
  registeredSpecialties: [
    { name: 'Clínica Médica', extra12h: 0 },
    { name: 'Pediatria', extra12h: 150 },
    { name: 'Cardiologia', extra12h: 250 },
    { name: 'Anestesiologia', extra12h: 400 },
    { name: 'Terapia Intensiva (UTI)', extra12h: 300 },
  ]
};

const ALL_FUNCTIONS = [
  'Médico Rotina/Sênior',
  'Plantonista',
  'Plantão de Especialidade',
  'Chefia/Liderança'
];

const MONTHS_LIST = [
  { id: '2026-09', label: 'Set/2026' },
  { id: '2026-10', label: 'Out/2026' },
  { id: '2026-11', label: 'Nov/2026' },
  { id: '2026-12', label: 'Dez/2026' },
  { id: '2027-01', label: 'Jan/2027' },
  { id: '2027-02', label: 'Fev/2027' },
  { id: '2027-03', label: 'Mar/2027' },
];

const initialDoctors = [
  {
    id: 1,
    name: 'Dr. Carlos Eduardo Mendes',
    cpf: '111.222.333-44',
    birthDate: '1984-06-12',
    email: 'carlos@medscale.com.br',
    password: '123',
    phone: '(11) 99876-5432',
    crm: 'CRM-SP 145890',
    rqe: 'RQE 45120',
    joinDate: '2021-03-15',
    razaoSocial: 'Mendes Serviços Médicos LTDA',
    cnpj: '12.345.678/0001-99',
    specialty: 'Clínica Médica',
    role: 'Médico Rotina/Sênior',
    remunerationLevel: 3,
    contractType: 'Fixo Mensal',
    participatesInSchedule: true,
    allowedFunctions: ['Médico Rotina/Sênior', 'Plantonista', 'Chefia/Liderança'],
    accumulatedRoles: [
      { id: 'ar_1', roleName: 'Médico Rotina/Sênior', categoryType: 'assistencial', level: 3, contractModality: 'Fixo Mensal' },
      { id: 'ar_2', roleName: 'Plantonista', categoryType: 'assistencial', level: 3, contractModality: 'Coringa / Extra' },
      { id: 'ar_3', roleName: 'Médico Supervisor (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'Carteira_CRM_Carlos.pdf', type: 'CRM', size: '420 KB', uploadedAt: '2021-03-10' },
      { name: 'Cartao_CNPJ_Mendes.pdf', type: 'CNPJ', size: '310 KB', uploadedAt: '2021-03-10' }
    ]
  },
  {
    id: 2,
    name: 'Dra. Ana Clara Souza',
    cpf: '222.333.444-55',
    birthDate: '1992-09-23',
    email: 'ana@medscale.com.br',
    password: '123',
    phone: '(11) 98765-1234',
    crm: 'CRM-SP 210450',
    rqe: 'RQE 88310',
    joinDate: '2023-01-10',
    razaoSocial: 'Ana Souza Medicina SS',
    cnpj: '98.765.432/0001-11',
    specialty: 'Pediatria',
    role: 'Plantonista',
    remunerationLevel: 1,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    allowedFunctions: ['Plantonista', 'Plantão de Especialidade', 'Médico Rotina/Sênior'],
    accumulatedRoles: [
      { id: 'ar_4', roleName: 'Plantonista', categoryType: 'assistencial', level: 1, contractModality: 'Coringa / Extra' },
      { id: 'ar_5', roleName: 'Plantão de Especialidade', categoryType: 'assistencial', level: 2, contractModality: 'Coringa / Extra' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Ana_Souza.pdf', type: 'CRM', size: '512 KB', uploadedAt: '2023-01-05' }
    ]
  },
  {
    id: 3,
    name: 'Dr. Roberto Almeida Lima',
    cpf: '333.444.555-66',
    birthDate: '1979-11-03',
    email: 'roberto@medscale.com.br',
    password: '123',
    phone: '(11) 97654-9876',
    crm: 'CRM-SP 102340',
    rqe: 'RQE 22901',
    joinDate: '2019-11-05',
    razaoSocial: 'RL Saúde & Cardiologia EIRELI',
    cnpj: '45.678.901/0001-22',
    specialty: 'Cardiologia',
    role: 'Chefia/Liderança',
    remunerationLevel: 4,
    contractType: 'Fixo Mensal',
    participatesInSchedule: true,
    allowedFunctions: ['Chefia/Liderança', 'Médico Rotina/Sênior', 'Plantão de Especialidade', 'Plantonista'],
    accumulatedRoles: [
      { id: 'ar_6', roleName: 'Chefia/Liderança', categoryType: 'assistencial', level: 4, contractModality: 'Fixo Mensal' },
      { id: 'ar_7', roleName: 'Coordenador Médico (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Roberto_Lima.pdf', type: 'CRM', size: '390 KB', uploadedAt: '2019-11-01' }
    ]
  },
  {
    id: 5,
    name: 'Dra. Helena Vasconcelos',
    cpf: '555.666.777-88',
    birthDate: '1978-04-15',
    email: 'helena@medscale.com.br',
    password: '123',
    phone: '(11) 99111-2233',
    crm: 'CRM-SP 98450',
    rqe: 'RQE 19400',
    joinDate: '2018-02-01',
    razaoSocial: 'Vasconcelos Gestão & Auditoria Médica LTDA',
    cnpj: '77.888.999/0001-55',
    specialty: 'Clínica Médica',
    role: 'Coordenador Médico (Adm)',
    remunerationLevel: 4,
    contractType: 'Fixo Mensal',
    participatesInSchedule: false,
    allowedFunctions: [],
    accumulatedRoles: [
      { id: 'ar_8', roleName: 'Coordenador Médico (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' },
      { id: 'ar_9', roleName: 'Médico Supervisor (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Helena_Vasconcelos.pdf', type: 'CRM', size: '410 KB', uploadedAt: '2018-02-01' }
    ]
  },
  {
    id: 4,
    name: 'Dra. Juliana Martins Rocha',
    cpf: '444.555.666-77',
    birthDate: '1994-02-18',
    email: 'juliana@medscale.com.br',
    password: '123',
    phone: '(21) 99123-4567',
    crm: 'CRM-RJ 558920',
    rqe: 'RQE 99104',
    joinDate: '2026-10-16',
    razaoSocial: 'JMR Serviços Médicos LTDA',
    cnpj: '33.221.445/0001-88',
    specialty: 'Anestesiologia',
    role: 'Plantão de Especialidade',
    remunerationLevel: 2,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    allowedFunctions: ['Plantão de Especialidade', 'Plantonista'],
    accumulatedRoles: [
      { id: 'ar_10', roleName: 'Plantão de Especialidade', categoryType: 'assistencial', level: 2, contractModality: 'Coringa / Extra' }
    ],
    status: 'Pendente',
    documents: [
      { name: 'Cedula_Identidade_Medica_CRM.pdf', type: 'CRM / RQE', size: '780 KB', uploadedAt: '2026-10-16' },
      { name: 'Contrato_Social_JMR_Medicina.pdf', type: 'Contrato Social / CNPJ', size: '1.2 MB', uploadedAt: '2026-10-16' }
    ]
  }
];

const initialShifts = [
  { id: 101, date: '2026-09-28', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Médica', category: 'Médico Rotina/Sênior', billingType: 'Fixo', additionals: ['chefia_plantao'] },
  { id: 102, date: '2026-10-04', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Plantão Coringa Fim de Semana', category: 'Médico Rotina/Sênior', billingType: 'Coringa/Extra', additionals: ['fds', 'chefia_plantao'] },
  { id: 103, date: '2026-10-10', startTime: '19:00', endTime: '07:00', doctorId: 2, type: 'Plantão Noturno Pediatria', category: 'Plantonista', billingType: 'Coringa/Extra', additionals: ['fds', 'noturno'] },
  { id: 104, date: '2026-10-18', startTime: '07:00', endTime: '19:00', doctorId: 3, type: 'Coordenação UTI Domingo', category: 'Chefia/Liderança', billingType: 'Fixo', additionals: ['fds', 'chefia_plantao'] },
  { id: 108, date: '2026-10-18', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Diurno', category: 'Médico Rotina/Sênior', billingType: 'Fixo', additionals: ['fds'] },
  { id: 109, date: '2026-10-18', startTime: '07:00', endTime: '13:00', doctorId: 2, type: 'Reforço Pediatria Manhã (6h)', category: 'Plantão de Especialidade', billingType: 'Coringa/Extra', additionals: ['fds'] },
  { id: 110, date: '2026-10-18', startTime: '19:00', endTime: '07:00', doctorId: 2, type: 'Plantão Noturno Pronto Atendimento', category: 'Plantonista', billingType: 'Coringa/Extra', additionals: ['noturno'] },
  { id: 105, date: '2026-10-22', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Quinta', category: 'Médico Rotina/Sênior', billingType: 'Fixo', additionals: [] },
  { id: 106, date: '2026-11-12', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Médica', category: 'Médico Rotina/Sênior', billingType: 'Fixo', additionals: [] },
  { id: 107, date: '2026-11-15', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Plantão Domingo Clínica', category: 'Plantonista', billingType: 'Fixo', additionals: ['fds'] }
];

const SHIFT_HOURS_CYCLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6
];

const DEFAULT_HOURLY_DEMAND: Record<number, { requiredDocs: number; expectedPatients: number; label: string }> = {
  7:  { requiredDocs: 2, expectedPatients: 14, label: 'Passagem de Plantão / Visita' },
  8:  { requiredDocs: 3, expectedPatients: 24, label: 'Pico Manhã / Admissões' },
  9:  { requiredDocs: 3, expectedPatients: 32, label: 'Pico Assistencial Manhã' },
  10: { requiredDocs: 3, expectedPatients: 35, label: 'Pico Crítico Manhã' },
  11: { requiredDocs: 3, expectedPatients: 30, label: 'Alta Demanda Ambulatorial/PA' },
  12: { requiredDocs: 2, expectedPatients: 20, label: 'Horário de Almoço / Revezamento' },
  13: { requiredDocs: 2, expectedPatients: 22, label: 'Início Turno Tarde' },
  14: { requiredDocs: 3, expectedPatients: 28, label: 'Pico Tarde / Pareceres' },
  15: { requiredDocs: 3, expectedPatients: 30, label: 'Pico Assistencial Tarde' },
  16: { requiredDocs: 2, expectedPatients: 25, label: 'Demanda Moderada/Alta' },
  17: { requiredDocs: 2, expectedPatients: 22, label: 'Fechamento Rotina Diurna' },
  18: { requiredDocs: 2, expectedPatients: 19, label: 'Transição Final da Tarde' },
  19: { requiredDocs: 2, expectedPatients: 26, label: 'Troca de Turno Noturno / Pico PA' },
  20: { requiredDocs: 2, expectedPatients: 24, label: 'Atendimento Noturno Inicial' },
  21: { requiredDocs: 2, expectedPatients: 18, label: 'Redução Gradual Noturna' },
  22: { requiredDocs: 1, expectedPatients: 14, label: 'Plantão Noturno Estabilizado' },
  23: { requiredDocs: 1, expectedPatients: 10, label: 'Início Madrugada' },
  0:  { requiredDocs: 1, expectedPatients: 8,  label: 'Madrugada' },
  1:  { requiredDocs: 1, expectedPatients: 6,  label: 'Madrugada' },
  2:  { requiredDocs: 1, expectedPatients: 5,  label: 'Madrugada Baixa Demanda' },
  3:  { requiredDocs: 1, expectedPatients: 5,  label: 'Madrugada Baixa Demanda' },
  4:  { requiredDocs: 1, expectedPatients: 6,  label: 'Madrugada' },
  5:  { requiredDocs: 1, expectedPatients: 8,  label: 'Coleta de Exames / Pré-Visita' },
  6:  { requiredDocs: 1, expectedPatients: 11, label: 'Preparo Passagem 07h' },
};

const initialOccurrences = [
  { id: 901, doctorId: 1, date: '2026-09-29', type: 'Intercorrência Administrativa', severity: 'Atenção', title: 'Passagem de plantão em cima da hora', description: 'Solicitou passagem de plantão de rotina com menos de 48h de antecedência por compromisso externo.' },
  { id: 902, doctorId: 2, date: '2026-10-05', type: 'Elogio / Mérito Assistencial', severity: 'Positivo', title: 'Cobertura emergencial e elogio da família', description: 'Assumiu plantão coringa de última hora na Pediatria e recebeu elogio formal na Ouvidoria do hospital.' },
  { id: 903, doctorId: 3, date: '2026-10-12', type: 'Elogio / Mérito Assistencial', severity: 'Positivo', title: 'Liderança em protocolo de emergência', description: 'Excelente condução do mapa assistencial de UTI durante pico de internações no domingo.' },
  { id: 904, doctorId: 2, date: '2026-10-14', type: 'Atraso / Pontualidade', severity: 'Atenção', title: 'Atraso de 25 minutos na rendição noturna', description: 'Justificou trânsito intenso devido a chuva forte; comunicou a chefia de plantão previamente.' }
];

const initialSwaps = [
  { id: 501, shiftId: 101, shiftDate: '2026-09-28', shiftCategory: 'Médico Rotina/Sênior', shiftBillingType: 'Fixo', requestingDoctorId: 1, proposedDoctorId: 2, movementType: 'Passagem', isPartial: false, swapStartTime: '07:00', swapEndTime: '19:00', reason: 'Passagem de plantão sem permuta (Dr. Carlos repassou para Dra. Ana)', status: 'Aprovado', applyPayrollDiscount: true, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-09-26' },
  { id: 502, shiftId: 104, shiftDate: '2026-10-18', shiftCategory: 'Chefia/Liderança', shiftBillingType: 'Fixo', requestingDoctorId: 3, proposedDoctorId: 1, movementType: 'Passagem', isPartial: true, swapStartTime: '13:00', swapEndTime: '19:00', reason: 'Passagem parcial de 6h à tarde', status: 'Aprovado', applyPayrollDiscount: true, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-10-15' },
  { id: 503, shiftId: 103, shiftDate: '2026-10-10', shiftCategory: 'Plantonista', shiftBillingType: 'Coringa/Extra', requestingDoctorId: 2, proposedDoctorId: 1, movementType: 'Troca (Permuta)', isPartial: false, swapStartTime: '19:00', swapEndTime: '07:00', reason: 'Permuta direta de dia entre colegas (sem ajuste financeiro)', status: 'Aprovado', applyPayrollDiscount: false, discountMode: 'integral', paymentResponsibility: 'hospital', dateRequested: '2026-10-08' },
  { id: 504, shiftId: 105, shiftDate: '2026-10-22', shiftCategory: 'Médico Rotina/Sênior', shiftBillingType: 'Fixo', requestingDoctorId: 1, proposedDoctorId: 3, movementType: 'Passagem', isPartial: true, swapStartTime: '13:00', swapEndTime: '19:00', reason: 'Reunião clínica externa no período vespertino', status: 'Pendente', applyPayrollDiscount: false, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-10-17' }
];

const initialVacations = [
  {
    id: 1, doctorId: 1, requestType: 'Férias', leaveSubtype: 'Férias Regulamentares', startDate: '2026-11-10', endDate: '2026-11-20',
    justification: 'Período de férias anuais programadas.', status: 'Aprovado',
    freeTextSubstitutions: 'Dia 12/11 (07h-19h): Dr. Roberto Almeida Lima assumirá a Rotina Clínica.\nDia 15/11 (07h-19h): Dra. Ana Clara Souza assumirá o Plantão Diurno.',
    substitutionsStatus: 'Pendente Gestor',
    substitutions: [
      { shiftId: 106, date: '2026-11-12', startTime: '07:00', endTime: '19:00', category: 'Médico Rotina/Sênior', substituteDoctorId: 3 },
      { shiftId: 107, date: '2026-11-15', startTime: '07:00', endTime: '19:00', category: 'Plantonista', substituteDoctorId: 2 }
    ]
  },
  {
    id: 2, doctorId: 2, requestType: 'Licença', leaveSubtype: 'Licença para Congresso Científico', startDate: '2026-10-21', endDate: '2026-10-25',
    justification: 'Apresentação de trabalho no Congresso Brasileiro de Pediatria.', status: 'Pendente',
    freeTextSubstitutions: '',
    substitutionsStatus: 'Aguardando Médico',
    substitutions: []
  }
];

const initialCourses = [
  { id: 1, doctorId: 1, courseName: 'ACLS (Suporte Avançado de Vida em Cardiologia)', expirationDate: '2027-05-20', status: 'Válido' },
  { id: 2, doctorId: 2, courseName: 'PALS (Suporte Avançado de Vida em Pediatria)', expirationDate: '2026-09-10', status: 'Vencido' },
  { id: 3, doctorId: 3, courseName: 'ATLS (Suporte Avançado de Vida no Trauma)', expirationDate: '2028-01-15', status: 'Válido' }
];

function calculateDurationHours(start: string, end: string) {
  if (!start || !end) return 12;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.max(1, (endMin - startMin) / 60);
}

function getWeekdayName(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[dateObj.getDay()] || '';
}

function getNextDateStr(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getCompetenceWindow(refMonthStr: string) {
  const [year, month] = refMonthStr.split('-').map(Number);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const startStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-26`;
  const endStr = `${year}-${String(month).padStart(2, '0')}-25`;
  return { startStr, endStr };
}

function isShiftCoveringHourInCycle(shift: any, hourInt: number) {
  if (!shift.startTime || !shift.endTime) return false;
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const [eh, em] = shift.endTime.split(':').map(Number);

  const toCycleOffset = (h: number, m = 0) => {
    const decimalHour = h + (m || 0) / 60;
    return decimalHour >= 7 ? decimalHour - 7 : decimalHour + 17;
  };

  const startOffset = toCycleOffset(sh, sm);
  let endOffset = toCycleOffset(eh, em);
  if (endOffset <= startOffset) endOffset = 24;

  const targetStart = toCycleOffset(hourInt, 0);
  const targetEnd = targetStart + 1;

  return startOffset < targetEnd && endOffset > targetStart;
}

export default function MedScaleApp() {
  const supabase = useMemo(() => createClient(), []);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [doctors, setDoctors] = useState<any[]>(initialDoctors);
  const [shifts, setShifts] = useState<any[]>(initialShifts);
  const [swaps, setSwaps] = useState<any[]>(initialSwaps);
  const [vacations, setVacations] = useState<any[]>(initialVacations);
  const [courses, setCourses] = useState<any[]>(initialCourses);
  const [payrollStatus, setPayrollStatus] = useState<Record<number, string>>({ 1: 'Fechada', 2: 'Pendente', 3: 'Pago', 5: 'Pago' });
  const [hourlyDemand, setHourlyDemand] = useState<any>(DEFAULT_HOURLY_DEMAND);
  const [occurrences, setOccurrences] = useState<any[]>(initialOccurrences);
  useEffect(() => {
    document.title = `${config.appName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'}`;
  }, [config.appName, config.sectorUnitName]);

  // Adicionais incidindo no mês de competência por médico: Record<competenceMonth, Record<doctorId, string[]>>
  const [competenceMonthlyAdditionals, setCompetenceMonthlyAdditionals] = useState<Record<string, Record<number, string[]>>>({
    '2026-10': { 1: ['assiduidade_mes'] }
  });

  useEffect(() => {
    try {
      const load = (k: string, fb: any) => {
        const s = localStorage.getItem(`medscale_v10_${k}`);
        return s ? JSON.parse(s) : fb;
      };
      setConfig((prev: any) => ({ ...prev, ...load('config', DEFAULT_CONFIG), sectorUnitName: 'Emergência Adulta - HGD' }));
      setDoctors(load('doctors', initialDoctors));
      setShifts(load('shifts', initialShifts));
      setSwaps(load('swaps', initialSwaps));
      setVacations(load('vacations', initialVacations));
      setCourses(load('courses', initialCourses));
      setPayrollStatus(load('payrollStatus', { 1: 'Fechada', 2: 'Pendente', 3: 'Pago', 5: 'Pago' }));
      setHourlyDemand(load('hourlyDemand', DEFAULT_HOURLY_DEMAND));
      setOccurrences(load('occurrences', initialOccurrences));
      setCompetenceMonthlyAdditionals(load('competenceMonthlyAdditionals', { '2026-10': { 1: ['assiduidade_mes'] } }));
    } catch {
      // Ignora falha de leitura local
    }
  }, []);

  useEffect(() => { localStorage.setItem('medscale_v10_config', JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem('medscale_v10_doctors', JSON.stringify(doctors)); }, [doctors]);
  useEffect(() => { localStorage.setItem('medscale_v10_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('medscale_v10_swaps', JSON.stringify(swaps)); }, [swaps]);
  useEffect(() => { localStorage.setItem('medscale_v10_vacations', JSON.stringify(vacations)); }, [vacations]);
  useEffect(() => { localStorage.setItem('medscale_v10_courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('medscale_v10_payrollStatus', JSON.stringify(payrollStatus)); }, [payrollStatus]);
  useEffect(() => { localStorage.setItem('medscale_v10_hourlyDemand', JSON.stringify(hourlyDemand)); }, [hourlyDemand]);
  useEffect(() => { localStorage.setItem('medscale_v10_occurrences', JSON.stringify(occurrences)); }, [occurrences]);
  useEffect(() => { localStorage.setItem('medscale_v10_competenceMonthlyAdditionals', JSON.stringify(competenceMonthlyAdditionals)); }, [competenceMonthlyAdditionals]);

  const handleSyncWithSupabase = async () => {
    setSyncingSupabase(true);
    setSyncNotification(null);
    try {
      const res = await syncStateToSupabase(supabase, {
        config, doctors, shifts, swaps, vacations, courses, hourlyDemand
      });
      setSyncNotification(res.message);
    } catch (err: any) {
      setSyncNotification(`Aviso ao sincronizar: ${err?.message || 'Verifique sua conexão com o Supabase.'}`);
    } finally {
      setSyncingSupabase(false);
    }
  };

  // --- AUTENTICAÇÃO E NAVEGAÇÃO ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authTab, setAuthTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<any>(null);

  const [regForm, setRegForm] = useState<any>({
    name: '', cpf: '', birthDate: '', email: '', phone: '',
    crm: '', rqe: '', specialty: 'Clínica Médica', razaoSocial: '', cnpj: '',
    password: '', confirmPassword: '', documents: []
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffSubTab, setStaffSubTab] = useState('active');
  const [scheduleMode, setScheduleMode] = useState('semanal');
  const [selectedDate, setSelectedDate] = useState('2026-10-18');
  const [selectedScheduleMonth, setSelectedScheduleMonth] = useState('2026-10');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const [heatmapDate, setHeatmapDate] = useState('2026-10-18');
  const [selectedHeatmapHour, setSelectedHeatmapHour] = useState(9);

  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [newOccurrence, setNewOccurrence] = useState<any>({
    doctorId: 1, date: '2026-10-18', type: 'Intercorrência Administrativa',
    severity: 'Atenção', title: '', description: ''
  });

  const [competenceMonth, setCompetenceMonth] = useState('2026-10');
  const [expandedPayrollDoctorId, setExpandedPayrollDoctorId] = useState<number | null>(1);
  const [payrollClosed, setPayrollClosed] = useState(false);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [newShift, setNewShift] = useState<any>({
    date: '2026-10-18', startTime: '07:00', endTime: '19:00',
    category: 'Médico Rotina/Sênior', doctorId: '', type: 'Plantão Personalizado',
    billingType: 'Coringa/Extra', ruleId: '', customRate12h: '', additionals: []
  });

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<any>(null);
  const [swapForm, setSwapForm] = useState<any>({
    proposedDoctorId: '', movementType: 'Troca (Permuta)',
    isPartial: false, swapStartTime: '07:00', swapEndTime: '13:00', reason: ''
  });

  const [showHandoffWarningPopup, setShowHandoffWarningPopup] = useState(false);
  const [handoffWarningAcknowledged, setHandoffWarningAcknowledged] = useState(false);

  const [showDoctorEditModal, setShowDoctorEditModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState<any>({
    id: null, name: '', cpf: '', birthDate: '', email: '', password: '123',
    phone: '', crm: '', rqe: '', specialty: 'Clínica Médica', razaoSocial: '', cnpj: '',
    role: 'Plantonista', remunerationLevel: 1, contractType: 'Coringa / Extra',
    participatesInSchedule: true, allowedFunctions: ['Plantonista'],
    accumulatedRoles: [
      { id: 'init_1', roleName: 'Plantonista', categoryType: 'assistencial', level: 1, contractModality: 'Coringa / Extra' }
    ],
    status: 'Ativo'
  });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState<any>({
    id: null, doctorId: 1, courseName: 'ACLS (Suporte Avançado de Vida em Cardiologia)', expirationDate: '2028-05-20'
  });

  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationError, setVacationError] = useState<string | null>(null);
  const [vacationForm, setVacationForm] = useState<any>({
    doctorId: 1, requestType: 'Férias', leaveSubtype: 'Férias Regulamentares',
    startDate: '2026-11-10', endDate: '2026-11-20', justification: '', substitutions: [],
    freeTextSubstitutions: '', substitutionsStatus: 'Aguardando Médico'
  });

  const [vacationSubDrafts, setVacationSubDrafts] = useState<Record<number, string>>({});
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Estados para Criação Livre de Categorias, Caixas de Remuneração e Adicionais
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newRuleInputs, setNewRuleInputs] = useState<Record<string, { label: string; mode: string; value: number }>>({});
  const [manualPayrollAdjustments, setManualPayrollAdjustments] = useState<Record<number, { description: string; amount: number }[]>>({});
  const [shiftCustomOverrides, setShiftCustomOverrides] = useState<Record<number, { customRate12h?: number; customFixedTotal?: number }>>({});

  const [newAdditionalName, setNewAdditionalName] = useState('');
  const [newAdditionalVal, setNewAdditionalVal] = useState<any>(250);
  const [newAdditionalIncidence, setNewAdditionalIncidence] = useState<'plantao' | 'competencia'>('plantao');

  const dynamicCategories = useMemo(() => {
    const keys = Object.keys(config.functionRates || {});
    return keys.length > 0 ? keys : ALL_FUNCTIONS;
  }, [config.functionRates]);

  const isAdmin = currentUser?.role === 'admin';

  const activeDoctors = useMemo(() => doctors.filter(d => d.status === 'Ativo'), [doctors]);
  const scheduleActiveDoctors = useMemo(() => activeDoctors.filter(d => d.participatesInSchedule !== false), [activeDoctors]);
  const adminDoctors = useMemo(
    () => activeDoctors.filter(d => d.participatesInSchedule === false || (d.accumulatedRoles || []).some((r: any) => r.categoryType === 'administrativa')),
    [activeDoctors]
  );
  const pendingDoctors = useMemo(() => doctors.filter(d => d.status === 'Pendente'), [doctors]);

  const getDoctorById = (id: any) => doctors.find(d => d.id === Number(id));
  const getDoctorName = (id: any) => getDoctorById(id)?.name || 'Médico não encontrado';

  const getCategoryRulesList = (catName: string) => {
    const catData = config.functionRates?.[catName];
    if (!catData) {
      return [
        { id: 'fixo_mensal', label: 'Fixo Mensal / Semanal', billingMode: 'fixo_mensal', value: 15000 },
        { id: 'extra_12h', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1400 },
        { id: 'extra_fds_12h', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1650 },
      ];
    }
    if (Array.isArray(catData.rules)) {
      return catData.rules;
    }
    return [
      { id: 'fixo_mensal', label: 'Fixo Mensal / Semanal', billingMode: 'fixo_mensal', value: Number(catData.mensalFixo || 15000) },
      { id: 'extra_12h', label: 'Plantão Extra Avulso 12h', billingMode: 'por_12h', value: Number(catData.extra12h || 1400) },
      { id: 'extra_fds_12h', label: 'Plantão Extra 12h Fim de Semana', billingMode: 'por_12h', value: Number(catData.extra12h || 1400) + 250 },
    ];
  };

  const isDoctorAllowedForFunction = (doc: any, funcName: string) => {
    if (!doc || doc.status !== 'Ativo') return false;
    if (doc.participatesInSchedule === false) return false;
    if (!ALL_FUNCTIONS.includes(funcName)) return true;
    const accClinical = (doc.accumulatedRoles || [])
      .filter((r: any) => r.categoryType === 'assistencial')
      .map((r: any) => r.roleName);
    const combinedAllowed = Array.from(new Set([...(doc.allowedFunctions || []), ...accClinical]));
    if (combinedAllowed.length === 0) return doc.role === funcName;
    return combinedAllowed.includes(funcName);
  };

  const getDoctorLevelForFunction = (doc: any, categoryName: string) => {
    if (!doc) return 1;
    const matchedRole = (doc.accumulatedRoles || []).find(
      (r: any) => r.categoryType === 'assistencial' && r.roleName === categoryName && r.level
    );
    if (matchedRole) return Number(matchedRole.level);
    return Number(doc.remunerationLevel || 1);
  };

  const getDoctor12hRate = (doc: any, categoryName?: string) => {
    if (!doc) return 1400;
    const targetCategory = categoryName || doc.role;
    const rules = getCategoryRulesList(targetCategory);
    const extraRule = rules.find((r: any) => r.billingMode === 'por_12h') || rules[0];
    const fnRate = Number(extraRule?.value || config.functionRates?.[targetCategory]?.extra12h || 1400);
    const specificLevel = getDoctorLevelForFunction(doc, targetCategory);
    const lvlBonus = config.levelBonuses12h?.[specificLevel]?.bonus12h || 0;
    const specObj = (config.registeredSpecialties || []).find((s: any) => s.name === doc.specialty);
    const specExtra = (targetCategory === 'Plantão de Especialidade' && specObj) ? Number(specObj.extra12h || 0) : 0;
    return fnRate + lvlBonus + specExtra;
  };

  // Calcula adicionais de plantão (proporcional às horas quando incidenceType !== 'competencia', ou integral se aplicado)
  const calculateShiftAdditionalsAmount = (additionalIds: string[] = [], hours = 12) => {
    const ratio = hours / 12;
    let total = 0;
    const details: any[] = [];
    additionalIds.forEach(addId => {
      const found = (config.shiftAdditionals || []).find((a: any) => a.id === addId);
      if (found) {
        const isCompetenceFixed = found.incidenceType === 'competencia';
        const val = isCompetenceFixed ? Number(found.value12h || 0) : Number(found.value12h || 0) * ratio;
        total += val;
        details.push({ id: found.id, name: found.name, amount: val, incidenceType: found.incidenceType || 'plantao' });
      }
    });
    return { total, details };
  };

  const toggleDoctorCompetenceAdditional = (docId: number, addId: string) => {
    setCompetenceMonthlyAdditionals(prev => {
      const monthMap = prev[competenceMonth] || {};
      const currentList = monthMap[docId] || [];
      const exists = currentList.includes(addId);
      const nextList = exists ? currentList.filter(id => id !== addId) : [...currentList, addId];
      return {
        ...prev,
        [competenceMonth]: {
          ...monthMap,
          [docId]: nextList
        }
      };
    });
  };

  // --- LOGIN E CADASTRO ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (cleanEmail === 'gestor@medscale.com.br' && loginPassword === 'admin123') {
      setCurrentUser({ role: 'admin', name: 'Gestor Hospitalar', email: cleanEmail });
      setCurrentView('dashboard');
      return;
    }

    const foundDoc = doctors.find(d => d.email.toLowerCase() === cleanEmail);
    if (!foundDoc) {
      setAuthMessage({ type: 'error', text: 'E-mail não encontrado. Verifique os dados ou utilize a aba "Solicitar Cadastro".' });
      return;
    }
    if (foundDoc.password !== loginPassword) {
      setAuthMessage({ type: 'error', text: 'Senha incorreta.' });
      return;
    }
    if (foundDoc.status === 'Pendente') {
      setAuthMessage({
        type: 'warning',
        text: `Olá, ${foundDoc.name}! Seus dados e documentos estão armazenados e aguardam aprovação pelo Gestor.`
      });
      return;
    }
    if (foundDoc.status === 'Recusado') {
      setAuthMessage({ type: 'error', text: 'Cadastro recusado pela gestão médica.' });
      return;
    }

    setCurrentUser({ role: 'doctor', id: foundDoc.id, name: foundDoc.name, email: foundDoc.email });
    setCurrentView('schedule');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    if (regForm.password.length < 3) {
      setAuthMessage({ type: 'error', text: 'A senha deve ter pelo menos 3 caracteres.' });
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }
    if (doctors.some(d => d.email.toLowerCase() === regForm.email.trim().toLowerCase())) {
      setAuthMessage({ type: 'error', text: 'Já existe um médico cadastrado com este e-mail.' });
      return;
    }

    const newDocRecord = {
      id: Date.now(),
      name: regForm.name.trim(),
      cpf: regForm.cpf.trim(),
      birthDate: regForm.birthDate,
      email: regForm.email.trim().toLowerCase(),
      password: regForm.password,
      phone: regForm.phone.trim(),
      crm: regForm.crm.trim(),
      rqe: regForm.rqe.trim() || 'Não informado',
      specialty: regForm.specialty,
      razaoSocial: regForm.razaoSocial.trim(),
      cnpj: regForm.cnpj.trim(),
      joinDate: new Date().toISOString().split('T')[0],
      role: 'Plantonista',
      remunerationLevel: 1,
      contractType: 'Coringa / Extra',
      participatesInSchedule: true,
      allowedFunctions: ['Plantonista'],
      accumulatedRoles: [
        { id: `ar_${Date.now()}`, roleName: 'Plantonista', categoryType: 'assistencial', level: 1, contractModality: 'Coringa / Extra' }
      ],
      status: 'Pendente',
      documents: regForm.documents
    };

    setDoctors(prev => [...prev, newDocRecord]);
    setAuthTab('login');
    setLoginEmail(newDocRecord.email);
    setAuthMessage({
      type: 'success',
      text: 'Solicitação de cadastro enviada com sucesso! O gestor analisará seu perfil.'
    });
  };

  const handleApproveDoctor = (docId: number) => {
    setDoctors(prev => prev.map(d => d.id === docId ? { ...d, status: 'Ativo' } : d));
  };

  const eligibleDoctorsForShiftCategory = useMemo(() => {
    return scheduleActiveDoctors.filter(d => isDoctorAllowedForFunction(d, newShift.category));
  }, [scheduleActiveDoctors, newShift.category]);

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.doctorId) return;
    if (editingShiftId) {
      setShifts(prev => prev.map(s => s.id === editingShiftId ? {
        ...newShift,
        id: editingShiftId,
        doctorId: Number(newShift.doctorId)
      } : s));
    } else {
      setShifts(prev => [...prev, { ...newShift, id: Date.now(), doctorId: Number(newShift.doctorId) }]);
    }
    setEditingShiftId(null);
    setShowShiftModal(false);
  };

  const openSwapModal = (shift: any) => {
    setSelectedShiftForSwap(shift);
    const eligibleSubstitutes = activeDoctors.filter(
      d => d.id !== shift.doctorId && isDoctorAllowedForFunction(d, shift.category)
    );
    setSwapForm({
      proposedDoctorId: eligibleSubstitutes[0]?.id || '',
      movementType: 'Passagem',
      isPartial: false,
      swapStartTime: shift.startTime,
      swapEndTime: '13:00',
      reason: ''
    });
    setHandoffWarningAcknowledged(false);
    setShowSwapModal(true);
    setShowHandoffWarningPopup(true);
  };

  const handleInitiateSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap || !swapForm.proposedDoctorId) return;
    if (swapForm.movementType === 'Passagem' && !handoffWarningAcknowledged) {
      setShowHandoffWarningPopup(true);
      return;
    }

    const reqDoc = getDoctorById(selectedShiftForSwap.doctorId);
    const propDoc = getDoctorById(Number(swapForm.proposedDoctorId));
    const reqRate = getDoctor12hRate(reqDoc, selectedShiftForSwap.category);
    const propRate = getDoctor12hRate(propDoc, selectedShiftForSwap.category);

    const newSwapObj = {
      id: Date.now(),
      shiftId: selectedShiftForSwap.id,
      shiftDate: selectedShiftForSwap.date,
      shiftCategory: selectedShiftForSwap.category,
      shiftBillingType: selectedShiftForSwap.billingType || 'Coringa/Extra',
      requestingDoctorId: selectedShiftForSwap.doctorId,
      proposedDoctorId: Number(swapForm.proposedDoctorId),
      movementType: swapForm.movementType,
      isPartial: swapForm.isPartial,
      swapStartTime: swapForm.isPartial ? swapForm.swapStartTime : selectedShiftForSwap.startTime,
      swapEndTime: swapForm.isPartial ? swapForm.swapEndTime : selectedShiftForSwap.endTime,
      reason: swapForm.reason.trim() || `${swapForm.movementType} registrada no sistema`,
      status: 'Pendente',
      applyPayrollDiscount: swapForm.movementType === 'Passagem' && (selectedShiftForSwap.billingType === 'Fixo' || reqRate > propRate),
      discountMode: reqRate > propRate && selectedShiftForSwap.billingType !== 'Fixo' ? 'diferenca' : 'integral',
      paymentResponsibility: 'hospital',
      dateRequested: new Date().toISOString().split('T')[0]
    };
    setSwaps(prev => [newSwapObj, ...prev]);
    setShowHandoffWarningPopup(false);
    setHandoffWarningAcknowledged(false);
    setShowSwapModal(false);
  };

  const handleResolveSwap = (swap: any, decision: string) => {
    if (decision === 'Aprovado') {
      const targetShift = shifts.find(s => s.id === swap.shiftId);
      if (targetShift) {
        if (!swap.isPartial) {
          setShifts(prev => prev.map(s => s.id === targetShift.id ? {
            ...s,
            doctorId: Number(swap.proposedDoctorId),
            type: `${s.type} (${swap.movementType})`
          } : s));
        } else {
          const updatedShifts: any[] = [];
          shifts.forEach(s => {
            if (s.id !== targetShift.id) {
              updatedShifts.push(s);
            } else {
              if (swap.swapStartTime !== s.startTime) {
                updatedShifts.push({
                  ...s,
                  id: Date.now() + Math.floor(Math.random() * 1000) + 1,
                  endTime: swap.swapStartTime,
                  type: `${s.type} (Titular 1ª Parte)`
                });
              }
              updatedShifts.push({
                ...s,
                id: Date.now() + Math.floor(Math.random() * 1000) + 2,
                doctorId: Number(swap.proposedDoctorId),
                startTime: swap.swapStartTime,
                endTime: swap.swapEndTime,
                type: `${s.type} (${swap.movementType} Parcial)`
              });
              if (swap.swapEndTime !== s.endTime) {
                updatedShifts.push({
                  ...s,
                  id: Date.now() + Math.floor(Math.random() * 1000) + 3,
                  startTime: swap.swapEndTime,
                  type: `${s.type} (Titular Parte Final)`
                });
              }
            }
          });
          setShifts(updatedShifts);
        }
      }
    }
    setSwaps(prev => prev.map(sw => sw.id === swap.id ? { ...sw, status: decision } : sw));
  };

  const handleSaveDoctorForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (doctorForm.id) {
      setDoctors(prev => prev.map(d => d.id === doctorForm.id ? { ...d, ...doctorForm } : d));
    } else {
      setDoctors(prev => [...prev, { ...doctorForm, id: Date.now(), joinDate: new Date().toISOString().split('T')[0], documents: [] }]);
    }
    setShowDoctorEditModal(false);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const computedStatus = courseForm.expirationDate >= todayStr ? 'Válido' : 'Vencido';
    const targetDoctorId = isAdmin ? Number(courseForm.doctorId) : Number(currentUser.id);

    if (courseForm.id) {
      setCourses(prev => prev.map(c => c.id === courseForm.id ? {
        ...c,
        doctorId: targetDoctorId,
        courseName: courseForm.courseName,
        expirationDate: courseForm.expirationDate,
        status: computedStatus
      } : c));
    } else {
      setCourses(prev => [
        ...prev,
        {
          id: Date.now(),
          doctorId: targetDoctorId,
          courseName: courseForm.courseName,
          expirationDate: courseForm.expirationDate,
          status: computedStatus
        }
      ]);
    }
    setShowCourseModal(false);
  };

  const toggleBlockedVacationMonth = (monthId: string) => {
    setConfig((prev: any) => {
      const exists = (prev.blockedVacationMonths || []).includes(monthId);
      return {
        ...prev,
        blockedVacationMonths: exists
          ? prev.blockedVacationMonths.filter((m: string) => m !== monthId)
          : [...(prev.blockedVacationMonths || []), monthId]
      };
    });
  };

  const populateVacationShiftsForDoctor = (docId: any, startStr: string, endStr: string) => {
    setVacationForm((prev: any) => ({
      ...prev,
      doctorId: Number(docId),
      startDate: startStr,
      endDate: endStr,
    }));
  };

  const openNewVacationOrLeaveModal = (defaultType = 'Férias') => {
    setVacationError(null);
    const docId = isAdmin ? (scheduleActiveDoctors[0]?.id || activeDoctors[0]?.id || 1) : currentUser.id;
    const defaultStart = '2026-11-10';
    const defaultEnd = '2026-11-20';

    setVacationForm({
      doctorId: Number(docId),
      requestType: defaultType,
      leaveSubtype: defaultType === 'Férias' ? 'Férias Regulamentares' : 'Licença para Congresso / Capacitação',
      startDate: defaultStart,
      endDate: defaultEnd,
      justification: '',
      freeTextSubstitutions: '',
      substitutionsStatus: 'Aguardando Médico',
      substitutions: []
    });
    setShowVacationModal(true);
  };

  const handleResolveVacationOrLeave = (vac: any, decision: string) => {
    setVacations(prev => prev.map(v => v.id === vac.id ? {
      ...v,
      status: decision,
      substitutionsStatus: decision === 'Aprovado' ? (v.freeTextSubstitutions ? 'Pendente Gestor' : 'Aguardando Médico') : 'Cancelado'
    } : v));
  };

  const handleDoctorSubmitVacationSubstitutions = (vacId: number) => {
    const textVal = (vacationSubDrafts[vacId] ?? '').trim();
    if (!textVal) {
      alert('Por favor, descreva os médicos substitutos e dias/horários antes de enviar ao gestor.');
      return;
    }
    setVacations(prev => prev.map(v => v.id === vacId ? {
      ...v,
      freeTextSubstitutions: textVal,
      substitutionsStatus: 'Pendente Gestor'
    } : v));
    alert('Substituições enviadas com sucesso! O gestor foi notificado para aprovar e inserir na escala.');
  };

  const handleManagerResolveVacationSubstitutions = (vac: any, subDecision: 'Aprovado e Inserido na Escala' | 'Revisão Solicitada') => {
    setVacations(prev => prev.map(v => v.id === vac.id ? {
      ...v,
      substitutionsStatus: subDecision
    } : v));
  };

  const handleCreateVacationOrLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setVacationError(null);

    const startMonth = vacationForm.startDate.slice(0, 7);
    const endMonth = vacationForm.endDate.slice(0, 7);
    const blockedList = config.blockedVacationMonths || [];

    if (
      !isAdmin &&
      vacationForm.requestType === 'Férias' &&
      (blockedList.includes(startMonth) || blockedList.includes(endMonth))
    ) {
      setVacationError(
        `O mês selecionado (${startMonth}) está bloqueado pela gestão para novas solicitações de férias. Caso seja inadiável, utilize "Solicitar Licença".`
      );
      return;
    }

    const newRecord = {
      id: Date.now(),
      doctorId: isAdmin ? Number(vacationForm.doctorId) : Number(currentUser.id),
      requestType: vacationForm.requestType,
      leaveSubtype: vacationForm.leaveSubtype,
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      justification: vacationForm.justification || 'Solicitação registrada via portal.',
      status: isAdmin ? 'Aprovado' : 'Pendente',
      freeTextSubstitutions: '',
      substitutionsStatus: 'Aguardando Médico',
      substitutions: []
    };

    setVacations(prev => [newRecord, ...prev]);
    setShowVacationModal(false);
  };

  // --- CÁLCULO DA FOLHA DE PAGAMENTO E AUDITORIA DE CARGA HORÁRIA (26 A 25) ---
  const competenceWindow = useMemo(() => getCompetenceWindow(competenceMonth), [competenceMonth]);

  const payrollReport = useMemo(() => {
    const { startStr, endStr } = competenceWindow;
    const shiftsInWindow = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    const passagensInWindow = swaps.filter(
      sw => sw.status === 'Aprovado' && sw.movementType === 'Passagem' && sw.shiftDate >= startStr && sw.shiftDate <= endStr
    );
    const monthCompAdditionalsMap = competenceMonthlyAdditionals[competenceMonth] || {};

    return activeDoctors.map(doc => {
      const docShifts = shiftsInWindow.filter(s => s.doctorId === doc.id);
      const accRoles = doc.accumulatedRoles && doc.accumulatedRoles.length > 0
        ? doc.accumulatedRoles
        : [{ roleName: doc.role, categoryType: dynamicCategories.includes(doc.role) ? 'assistencial' : 'administrativa', level: doc.remunerationLevel || 1, contractModality: doc.contractType }];

      let fixedClinicalMonthly = 0;
      accRoles.forEach((r: any) => {
        if (r.categoryType === 'assistencial' && r.contractModality === 'Fixo Mensal') {
          const rules = getCategoryRulesList(r.roleName);
          const fixedRule = rules.find((rl: any) => rl.billingMode === 'fixo_mensal') || rules[0];
          const fnFixed = Number(fixedRule?.value || 15000);
          const lvlBonus = config.levelBonuses12h?.[r.level || doc.remunerationLevel || 1]?.mensalBonus || 0;
          fixedClinicalMonthly += (fnFixed + lvlBonus);
        }
      });

      let adminMonthlyTotal = 0;
      const adminRoleDetails: any[] = [];
      accRoles.forEach((r: any) => {
        if (r.categoryType === 'administrativa') {
          const admVal = config.adminFunctionRates?.[r.roleName]?.mensalFixo || 8500;
          adminMonthlyTotal += admVal;
          adminRoleDetails.push({ roleName: r.roleName, amount: admVal });
        }
      });

      const baseFixedMonthly = fixedClinicalMonthly + adminMonthlyTotal;
      const isFixedContract = fixedClinicalMonthly > 0 || doc.contractType === 'Fixo Mensal';

      let totalHoursWorked = 0;
      let fixedHoursWorked = 0;
      let extraHoursWorked = 0;
      let fixedShiftsCount = 0;
      let extraShiftsCount = 0;
      let extraShiftsAmount = 0;
      let shiftAdditionalsTotal = 0;
      const dailyBreakdown: any[] = [];
      const additionalsList: any[] = [];

      docShifts.forEach(sh => {
        const hours = calculateDurationHours(sh.startTime, sh.endTime);
        totalHoursWorked += hours;
        const weekday = getWeekdayName(sh.date);
        const isWeekend = weekday === 'Sábado' || weekday === 'Domingo';
        const levelUsed = getDoctorLevelForFunction(doc, sh.category);
        const lvlBonus12h = config.levelBonuses12h?.[levelUsed]?.bonus12h || 0;

        const originPassagem = passagensInWindow.find(
          sw => sw.proposedDoctorId === doc.id && sw.shiftDate === sh.date && sw.shiftCategory === sh.category
        );
        const isPaidDirectlyByTitular = originPassagem?.paymentResponsibility === 'titular';

        const rules = getCategoryRulesList(sh.category);
        const selectedRule =
          rules.find((rl: any) => rl.id === sh.ruleId) ||
          (isWeekend ? rules.find((rl: any) => rl.id.includes('fds') || rl.label.toLowerCase().includes('semana')) : null) ||
          rules.find((rl: any) => rl.billingMode === 'por_12h') ||
          rules[0];

        const override = shiftCustomOverrides[sh.id];
        const roleEntry = accRoles.find((r: any) => r.categoryType === 'assistencial' && r.roleName === sh.category);
        const isCategoryExtraForDoc = roleEntry ? roleEntry.contractModality === 'Coringa / Extra' : !isFixedContract;
        const isExtraShift = sh.billingType !== 'Fixo' || isCategoryExtraForDoc || Boolean(sh.customRate12h) || Boolean(override);

        if (isExtraShift) {
          extraHoursWorked += hours;
          extraShiftsCount += 1;
        } else {
          fixedHoursWorked += hours;
          fixedShiftsCount += 1;
        }

        let base12hApplied = Number(selectedRule?.value || 1400) + lvlBonus12h;
        if (sh.customRate12h !== undefined && sh.customRate12h !== '') {
          base12hApplied = Number(sh.customRate12h);
        }
        if (override?.customRate12h !== undefined) {
          base12hApplied = Number(override.customRate12h);
        }

        let shiftBaseVal = 0;
        if (!isPaidDirectlyByTitular && isExtraShift) {
          if (override?.customFixedTotal !== undefined) {
            shiftBaseVal = Number(override.customFixedTotal);
          } else {
            shiftBaseVal = (hours / 12) * base12hApplied;
          }
        }

        extraShiftsAmount += shiftBaseVal;

        const addCalc = calculateShiftAdditionalsAmount(sh.additionals || [], hours);
        shiftAdditionalsTotal += addCalc.total;
        addCalc.details.forEach(d => {
          additionalsList.push({ date: sh.date, weekday, name: d.name, hours, amount: d.amount, scope: 'Plantão' });
        });

        dailyBreakdown.push({
          shiftId: sh.id,
          date: sh.date,
          weekday,
          startTime: sh.startTime,
          endTime: sh.endTime,
          hours,
          fractionLabel: `${hours}h (${((hours / 12) * 100).toFixed(0)}% de 12h)`,
          type: sh.type,
          category: sh.category,
          isExtraShift,
          ruleLabel: override?.customRate12h || sh.customRate12h ? 'Acordo Individual (Não Padronizado)' : (selectedRule?.label || 'Padrão 12h'),
          base12hApplied,
          levelUsed,
          billingType: isPaidDirectlyByTitular ? 'Acerto Direto c/ Titular' : (isExtraShift ? 'Extra / Avulso' : 'Fixo'),
          shiftBaseVal,
          additionalsVal: addCalc.total,
          additionalsDetails: addCalc.details
        });
      });

      // Adicionais incidindo no Mês de Competência para este médico
      const docCompetenceAddIds = monthCompAdditionalsMap[doc.id] || [];
      let competenceAdditionalsTotal = 0;
      const competenceAdditionalsDetails: any[] = [];
      docCompetenceAddIds.forEach((addId: string) => {
        const found = (config.shiftAdditionals || []).find((a: any) => a.id === addId);
        if (found) {
          const val = Number(found.value12h || 0);
          competenceAdditionalsTotal += val;
          competenceAdditionalsDetails.push({ id: found.id, name: found.name, amount: val });
          additionalsList.push({ date: competenceMonth, weekday: 'Mês Competência', name: found.name, hours: 0, amount: val, scope: 'Competência' });
        }
      });

      const totalAdditionalsAmount = shiftAdditionalsTotal + competenceAdditionalsTotal;

      const docPassagensOut = passagensInWindow.filter(sw => sw.requestingDoctorId === doc.id);
      let totalDiscounts = 0;
      const passagesDetails = docPassagensOut.map(sw => {
        const hoursPassed = calculateDurationHours(sw.swapStartTime, sw.swapEndTime);
        const subDoc = getDoctorById(sw.proposedDoctorId);
        const titularRate12h = getDoctor12hRate(doc, sw.shiftCategory);
        const subRate12h = getDoctor12hRate(subDoc, sw.shiftCategory);
        const titularProportional = (hoursPassed / 12) * titularRate12h;
        const subProportional = (hoursPassed / 12) * subRate12h;
        const rateDiff = Math.max(0, titularProportional - subProportional);

        const isTitularDirectPay = sw.paymentResponsibility === 'titular';
        const calculatedDiscount = sw.discountMode === 'diferenca' ? rateDiff : titularProportional;
        const effectiveDiscount = (!isTitularDirectPay && sw.applyPayrollDiscount) ? calculatedDiscount : 0;
        totalDiscounts += effectiveDiscount;

        return {
          ...sw,
          paymentResponsibility: sw.paymentResponsibility || 'hospital',
          weekday: getWeekdayName(sw.shiftDate),
          hoursPassed,
          subDocName: subDoc?.name || 'Substituto',
          subDocRoleLevel: `${subDoc?.role || ''} (Nível ${getDoctorLevelForFunction(subDoc, sw.shiftCategory)})`,
          titularProportional,
          subProportional,
          rateDiff,
          calculatedDiscount,
          effectiveDiscount,
          isSeniorToJunior: titularRate12h > subRate12h
        };
      });

      const docManualAdjs = manualPayrollAdjustments[doc.id] || [];
      const manualAdjustmentsTotal = docManualAdjs.reduce((acc, item) => acc + Number(item.amount || 0), 0);

      const netTotal = Math.max(
        0,
        baseFixedMonthly + extraShiftsAmount + totalAdditionalsAmount + manualAdjustmentsTotal - totalDiscounts
      );

      const weeklyAvgTotalHours = Number((totalHoursWorked / 4.33).toFixed(1));
      const weeklyAvgFixedHours = Number((fixedHoursWorked / 4.33).toFixed(1));
      const weeklyAvgExtraHours = Number((extraHoursWorked / 4.33).toFixed(1));

      return {
        ...doc,
        accRoles,
        isFixedContract,
        fixedClinicalMonthly,
        adminMonthlyTotal,
        adminRoleDetails,
        baseFixedMonthly,
        totalHoursWorked,
        fixedHoursWorked,
        extraHoursWorked,
        fixedShiftsCount,
        extraShiftsCount,
        weeklyAvgTotalHours,
        weeklyAvgFixedHours,
        weeklyAvgExtraHours,
        extraShiftsAmount,
        shiftAdditionalsTotal,
        competenceAdditionalsTotal,
        competenceAdditionalsDetails,
        docCompetenceAddIds,
        totalAdditionalsAmount,
        manualAdjustmentsTotal,
        docManualAdjs,
        totalDiscounts,
        netTotal,
        dailyBreakdown,
        additionalsList,
        passagesDetails,
        payStatus: payrollStatus[doc.id] || 'Pendente'
      };
    });
  }, [activeDoctors, shifts, swaps, config, competenceWindow, payrollStatus, shiftCustomOverrides, manualPayrollAdjustments, dynamicCategories, competenceMonthlyAdditionals, competenceMonth]);

  // --- EXPORTAR AUDITORIA DE CARGA DE TRABALHO (DUPLO CHECK DE FOLHA EM XLS/CSV) ---
  const exportWorkloadAuditCSV = () => {
    const headers = [
      'Unidade / Setor',
      'Competencia (26 a 25)',
      'Plantonista',
      'CRM',
      'Funcao Base',
      'Modalidade Contrato',
      'Total Horas na Competencia',
      'Media Carga Horaria Semanal (h/sem)',
      'Horas Fixas na Competencia',
      'Qtd Plantoes Fixos',
      'Horas Extras Avulsas na Competencia',
      'Qtd Plantoes Extras Avulsos',
      'Valor Fixo (R$)',
      'Valor Plantoes Extras Avulsos (R$)',
      'Adicionais Plantao + Competencia (R$)',
      'Descontos Passagens (R$)',
      'Liquido Final Folha (R$)',
      'Observacao Detalhada (Discriminacao Carga Fixa vs Plantoes Extras Avulsos e Adicionais)'
    ];

    const compLabel = `${competenceWindow.startStr} a ${competenceWindow.endStr}`;

    const csvLines = [
      headers.join(';'),
      ...payrollReport.map(r => {
        const fixedListStr = r.dailyBreakdown
          .filter((d: any) => !d.isExtraShift)
          .map((d: any) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)} (${d.startTime}-${d.endTime}: ${d.hours}h Fixo ${d.category})`)
          .join(' | ');

        const extraListStr = r.dailyBreakdown
          .filter((d: any) => d.isExtraShift)
          .map((d: any) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)} (${d.startTime}-${d.endTime}: ${d.hours}h Extra ${d.category} [${d.ruleLabel}] = R$ ${d.shiftBaseVal.toFixed(2)})`)
          .join(' | ');

        const compAddStr = (r.competenceAdditionalsDetails || [])
          .map((a: any) => `${a.name} (Mes Competencia): R$ ${Number(a.amount).toFixed(2)}`)
          .join(' | ');

        const manualAdjsStr = (r.docManualAdjs || [])
          .map((a: any) => `${a.description}: R$ ${Number(a.amount).toFixed(2)}`)
          .join(' | ');

        const observationField = [
          `CARGA FIXA (${r.fixedHoursWorked}h em ${r.fixedShiftsCount} plantoes; ~${r.weeklyAvgFixedHours}h/sem): ${fixedListStr || 'Nenhum plantao fixo'}`,
          `EXTRAS AVULSOS (${r.extraHoursWorked}h em ${r.extraShiftsCount} plantoes; ~${r.weeklyAvgExtraHours}h/sem): ${extraListStr || 'Nenhum plantao extra'}`,
          compAddStr ? `ADICIONAIS NO MES DE COMPETENCIA: ${compAddStr}` : '',
          manualAdjsStr ? `AJUSTES MANUAIS: ${manualAdjsStr}` : ''
        ].filter(Boolean).join(' /// ');

        return [
          `"${config.sectorUnitName || 'Emergência Adulta - HGD'}"`,
          `"${compLabel}"`,
          `"${r.name}"`,
          `"${r.crm}"`,
          `"${r.role}"`,
          `"${r.contractType}"`,
          r.totalHoursWorked,
          `"${r.weeklyAvgTotalHours}h/sem"`,
          r.fixedHoursWorked,
          r.fixedShiftsCount,
          r.extraHoursWorked,
          r.extraShiftsCount,
          r.baseFixedMonthly.toFixed(2).replace('.', ','),
          r.extraShiftsAmount.toFixed(2).replace('.', ','),
          (r.totalAdditionalsAmount + (r.manualAdjustmentsTotal || 0)).toFixed(2).replace('.', ','),
          r.totalDiscounts.toFixed(2).replace('.', ','),
          r.netTotal.toFixed(2).replace('.', ','),
          `"${observationField}"`
        ].join(';');
      })
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Auditoria_Carga_Horaria_DuploCheck_${competenceWindow.startStr}_a_${competenceWindow.endStr}.csv`;
    a.click();
  };

  const exportDetailedPayrollCSV = () => {
    const headers = [
      'Unidade', 'Competencia (26 a 25)', 'Medico', 'CRM', 'Razao Social', 'CNPJ',
      'Categoria Base', 'Horas Trabalhadas', 'Fixo (R$)', 'Plantoes Extras/Fracionarios (R$)',
      'Adicionais Plantao + Competencia (R$)', 'Ajustes Manuais (R$)', 'Descontos Passagens (R$)', 'Liquido Final (R$)'
    ];
    const compLabel = `${competenceWindow.startStr} a ${competenceWindow.endStr}`;
    const csvLines = [
      headers.join(';'),
      ...payrollReport.map(r => [
        `"${config.sectorUnitName || 'Emergência Adulta - HGD'}"`,
        `"${compLabel}"`, `"${r.name}"`, `"${r.crm}"`, `"${r.razaoSocial}"`, `"${r.cnpj}"`,
        `"${r.role}"`, r.totalHoursWorked, r.baseFixedMonthly.toFixed(2), r.extraShiftsAmount.toFixed(2),
        r.totalAdditionalsAmount.toFixed(2), (r.manualAdjustmentsTotal || 0).toFixed(2),
        r.totalDiscounts.toFixed(2), r.netTotal.toFixed(2)
      ].join(';'))
    ];
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folha_${competenceWindow.startStr}_a_${competenceWindow.endStr}.csv`;
    a.click();
  };

  // --- 1. DASHBOARD PRINCIPAL (EXCLUSIVO GESTOR) ---
  const renderDashboard = () => {
    const pendingVacSubCount = vacations.filter(v => v.status === 'Aprovado' && v.substitutionsStatus === 'Pendente Gestor').length;
    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">Painel de Comando Hospitalar</h2>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>
            <p className="text-sm text-slate-500">Visão consolidada da escala, trocas pendentes, substituições de férias e folha (26 a 25)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportWorkloadAuditCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <ClipboardList size={15} /> Exportar Carga de Trabalho (Duplo Check)
            </button>
            {isAdmin && (
              <button
                onClick={handleSyncWithSupabase}
                disabled={syncingSupabase}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {syncingSupabase ? <RefreshCw size={15} className="animate-spin" /> : <Database size={15} />}
                {syncingSupabase ? 'Sincronizando...' : 'Sincronizar Nuvem (Supabase)'}
              </button>
            )}
          </div>
        </div>

        {syncNotification && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold rounded-xl flex justify-between items-center">
            <span>{syncNotification}</span>
            <button onClick={() => setSyncNotification(null)} className="text-indigo-600 font-bold">✕</button>
          </div>
        )}

        {pendingVacSubCount > 0 && (
          <div
            onClick={() => setCurrentView('vacations')}
            className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/60"
          >
            <div className="flex items-center gap-3">
              <Umbrella size={20} className="text-amber-700" />
              <div className="text-xs">
                <strong className="text-amber-900 block text-sm">
                  Atenção Gestor: {pendingVacSubCount} médico(s) enviaram a lista de substitutos para férias autorizadas!
                </strong>
                <span className="text-amber-800">Clique aqui para revisar, aprovar as substituições e lançar na escala.</span>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">Analisar Substituições →</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase">Corpo Clínico Ativo</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{activeDoctors.length} médicos</p>
            <p className="text-[11px] text-slate-500 mt-1">{pendingDoctors.length} aguardando aprovação</p>
          </div>
          <div
            onClick={() => setCurrentView('assistance_map')}
            className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50/30"
          >
            <p className="text-xs font-bold text-blue-700 uppercase">Plantões & Heatmap 24h</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{shifts.length} plantões</p>
            <p className="text-[11px] text-blue-700 underline mt-1">Ver Mapa Assistencial 07h-06h (PDF)</p>
          </div>
          <div
            onClick={() => setCurrentView('swaps')}
            className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-50/40"
          >
            <p className="text-xs font-bold text-amber-700 uppercase">Trocas / Passagens Pendentes</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {swaps.filter(s => s.status === 'Pendente').length} solicitações
            </p>
            <p className="text-[11px] text-amber-700 underline mt-1">Clique para aprovar ou recusar</p>
          </div>
          <div
            onClick={() => setCurrentView('payroll')}
            className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm cursor-pointer hover:bg-emerald-50/40"
          >
            <p className="text-xs font-bold text-emerald-700 uppercase">Previsão Folha ({competenceMonth})</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">
              R$ {payrollReport.reduce((a, b) => a + b.netTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700 underline mt-1">Ver detalhamento e duplo check</p>
          </div>
        </div>
      </div>
    );
  };

  // --- 2. MAPA ASSISTENCIAL 24H ---
  const renderAssistanceMap = () => {
    const nextDateStr = getNextDateStr(heatmapDate);
    const dayShifts = shifts
      .filter(s => s.date === heatmapDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const handleExportHeatmapPDF = () => {
      const printWindow = window.open('', '_blank', 'width=1280,height=850');
      if (!printWindow) {
        alert('Por favor, permita pop-ups no navegador para exportar o Heatmap 24h em PDF.');
        return;
      }

      const hoursHeaderCells = SHIFT_HOURS_CYCLE.map(h => `
        <th style="border: 1px solid #cbd5e1; padding: 4px 2px; font-size: 9px; background: #1e293b; color: #fff; text-align: center;">
          ${String(h).padStart(2, '0')}h
        </th>
      `).join('');

      const demandRowCells = SHIFT_HOURS_CYCLE.map(h => {
        const dem = hourlyDemand[h]?.requiredDocs ?? 2;
        const cov = dayShifts.filter(s => isShiftCoveringHourInCycle(s, h)).length;
        const bg = cov < dem ? '#fee2e2' : cov === dem ? '#dcfce7' : '#dbeafe';
        const color = cov < dem ? '#991b1b' : cov === dem ? '#166534' : '#1e40af';
        return `
          <td style="border: 1px solid #cbd5e1; padding: 5px 2px; text-align: center; font-weight: 800; font-size: 10px; background: ${bg}; color: ${color};">
            ${cov}/${dem}
          </td>
        `;
      }).join('');

      const shiftRowsHtml = dayShifts.length === 0
        ? `<tr><td colspan="26" style="padding: 16px; text-align: center; color: #64748b;">Nenhum plantão escalado para esta data (${heatmapDate}).</td></tr>`
        : dayShifts.map(sh => {
            const doc = getDoctorById(sh.doctorId);
            const cells = SHIFT_HOURS_CYCLE.map(h => {
              const active = isShiftCoveringHourInCycle(sh, h);
              return `
                <td style="border: 1px solid #e2e8f0; background: ${active ? '#2563eb' : '#f8fafc'}; color: #fff; text-align: center; font-size: 9px; font-weight: 700;">
                  ${active ? '●' : ''}
                </td>
              `;
            }).join('');
            return `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 10px; font-weight: 700; white-space: nowrap;">
                  ${doc?.name || 'Médico'} <span style="font-weight: 400; color: #64748b;">(${doc?.crm || ''})</span>
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 9px; white-space: nowrap;">
                  <strong>${sh.startTime}-${sh.endTime}</strong> • ${sh.category}
                </td>
                ${cells}
              </tr>
            `;
          }).join('');

      const htmlDoc = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Mapa_Assistencial_Heatmap_${heatmapDate}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
            <div>
              <h1 style="margin: 0; font-size: 17px;">${config.appName} • ${config.hospitalName} — ${config.sectorUnitName || 'Emergência Adulta - HGD'}</h1>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #334155;">
                <strong>Mapa Assistencial & Heatmap Hora a Hora (Ciclo 24h):</strong> Das 07:00 de <strong>${heatmapDate} (${getWeekdayName(heatmapDate)})</strong> até as 06:00 de <strong>${nextDateStr}</strong>
              </p>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748b;">
              <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
              <div>Total de Plantões no Ciclo: <strong>${dayShifts.length}</strong></div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 10px; background: #1e293b; color: #fff; text-align: left;">Médico Escalado</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 10px; background: #1e293b; color: #fff; text-align: left;">Turno / Categoria</th>
                ${hoursHeaderCells}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2" style="border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 10px; font-weight: 800; background: #f1f5f9;">
                  COBERTURA REAL vs META MÍNIMA (H/H)
                </td>
                ${demandRowCells}
              </tr>
              ${shiftRowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 24px; display: flex; justify-content: space-around; font-size: 10px; color: #334155;">
            <div style="text-align: center; width: 250px; border-top: 1px solid #64748b; padding-top: 5px;">Coordenação — ${config.sectorUnitName || 'Emergência Adulta - HGD'}</div>
            <div style="text-align: center; width: 250px; border-top: 1px solid #64748b; padding-top: 5px;">Diretoria Técnica — ${config.hospitalName}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlDoc);
      printWindow.document.close();
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800">Mapa Assistencial 24h & Heatmap Hora a Hora</h2>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ciclo de plantão das <strong>07:00 ({heatmapDate})</strong> até as <strong>06:00 do dia seguinte ({nextDateStr})</strong> sincronizado em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              value={heatmapDate}
              onChange={e => setHeatmapDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
            />
            <button
              type="button"
              onClick={handleExportHeatmapPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Download size={15} /> Exportar Heatmap 24h (PDF)
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-sm uppercase text-slate-700">
              1. Termômetro de Cobertura Hora a Hora (07:00 às 06:00)
            </h3>
            <div className="flex flex-wrap gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-red-700"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Déficit</span>
              <span className="flex items-center gap-1 text-emerald-700"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> Meta OK</span>
              <span className="flex items-center gap-1 text-blue-700"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> Acima da Meta</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {SHIFT_HOURS_CYCLE.map((h, idx) => {
              const demand = hourlyDemand[h] || { requiredDocs: 2, expectedPatients: 15, label: 'Rotina' };
              const covering = dayShifts.filter(s => isShiftCoveringHourInCycle(s, h));
              const count = covering.length;
              const isDeficit = count < demand.requiredDocs;
              const isSurplus = count > demand.requiredDocs;
              const isSelected = selectedHeatmapHour === h;
              const isNextDayHour = idx >= 17;

              return (
                <div
                  key={h}
                  onClick={() => setSelectedHeatmapHour(h)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isDeficit
                      ? 'bg-red-50/90 border-red-300 hover:bg-red-100'
                      : isSurplus
                      ? 'bg-blue-50/90 border-blue-300 hover:bg-blue-100'
                      : 'bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100'
                  } ${isSelected ? 'ring-2 ring-slate-900 shadow-md' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-extrabold">
                      <span className="text-slate-900">
                        {String(h).padStart(2, '0')}:00 {isNextDayHour ? <span className="text-[9px] text-slate-500">(+1d)</span> : null}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isDeficit ? 'bg-red-200 text-red-900' : isSurplus ? 'bg-blue-200 text-blue-900' : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {count}/{demand.requiredDocs}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{demand.label}</p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-black/10 space-y-0.5">
                    {covering.length === 0 ? (
                      <p className="text-[10px] text-red-700 font-bold italic">Sem médico</p>
                    ) : (
                      covering.map(sh => {
                        const d = getDoctorById(sh.doctorId);
                        return (
                          <p key={sh.id} className="text-[10px] font-bold text-slate-800 truncate">
                            • {d?.name.replace('Dr. ', '').replace('Dra. ', '').split(' ').slice(0, 2).join(' ')}
                          </p>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 overflow-x-auto">
          <h3 className="font-bold text-sm uppercase text-slate-700">
            2. Matriz Linear do Corpo Clínico Escalado (07:00 de {heatmapDate} às 06:00 de {nextDateStr})
          </h3>

          <table className="w-full border-collapse text-xs min-w-[980px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2.5 text-left rounded-tl-lg">Plantonista Escalado</th>
                <th className="p-2.5 text-left">Turno / Horário</th>
                {SHIFT_HOURS_CYCLE.map(h => (
                  <th key={h} className="p-1.5 text-center text-[10px] font-bold border-l border-slate-700">
                    {String(h).padStart(2, '0')}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayShifts.length === 0 ? (
                <tr>
                  <td colSpan={26} className="p-6 text-center text-slate-400 italic">
                    Nenhum plantão cadastrado para a data selecionada ({heatmapDate}).
                  </td>
                </tr>
              ) : (
                dayShifts.map(sh => {
                  const doc = getDoctorById(sh.doctorId);
                  return (
                    <tr key={sh.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {doc?.name}
                        <span className="block text-[10px] font-normal text-slate-400">{doc?.crm} • {doc?.specialty}</span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-extrabold text-blue-700">{sh.startTime} às {sh.endTime}</span>
                        <span className="block text-[10px] text-slate-500">{sh.category}</span>
                      </td>
                      {SHIFT_HOURS_CYCLE.map(h => {
                        const active = isShiftCoveringHourInCycle(sh, h);
                        return (
                          <td
                            key={h}
                            className={`border-l border-slate-100 text-center p-1 ${
                              active ? 'bg-blue-600/90 text-white font-bold' : 'bg-slate-50/50'
                            }`}
                          >
                            {active ? '●' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- 3. RELATÓRIOS GERENCIAIS & OCORRÊNCIAS ---
  const renderManagementReports = () => (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Gerenciais, Auditoria & Ocorrências</h2>
          <p className="text-xs text-slate-500">Histórico comparativo de folha, ocorrências administrativas e exportação de carga horária</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportWorkloadAuditCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Download size={15} /> Exportar Carga de Trabalho (XLS/CSV)
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowOccurrenceModal(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={15} /> Nova Ocorrência
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-bold text-sm uppercase text-slate-500">Livro de Ocorrências & Mérito Clínico</h3>
        <div className="space-y-2">
          {occurrences.map(occ => (
            <div key={occ.id} className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-start text-xs">
              <div>
                <span className={`px-2 py-0.5 rounded font-bold mr-2 ${occ.severity === 'Positivo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {occ.type}
                </span>
                <strong className="text-slate-800">{occ.title}</strong> — <span className="text-slate-600">{getDoctorName(occ.doctorId)} ({occ.date})</span>
                <p className="text-slate-500 mt-1">{occ.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- 4. ESCALA MÉDICA (SEGUNDA A DOMINGO + PDF) ---
  const renderSchedule = () => {
    const getWeekRangeMondayToSunday = (baseDateStr: string) => {
      if (!baseDateStr) return { weekStart: '', weekEnd: '', daysList: [] as { dateStr: string; label: string; dayName: string }[] };
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = dt.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const monday = new Date(dt);
      monday.setDate(dt.getDate() + diffToMonday);

      const fmt = (dateObj: Date) => {
        const yy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      };

      const shortDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
      const daysList = Array.from({ length: 7 }, (_, i) => {
        const cur = new Date(monday);
        cur.setDate(monday.getDate() + i);
        const dStr = fmt(cur);
        return {
          dateStr: dStr,
          label: `${dStr.slice(8, 10)}/${dStr.slice(5, 7)}`,
          dayName: shortDays[i]
        };
      });

      return {
        weekStart: daysList[0].dateStr,
        weekEnd: daysList[6].dateStr,
        daysList
      };
    };

    const { weekStart, weekEnd, daysList } = getWeekRangeMondayToSunday(selectedDate);

    const filteredShifts = shifts
      .filter(s => {
        if (categoryFilter !== 'Todas' && s.category !== categoryFilter) return false;
        if (scheduleMode === 'diaria' && s.date !== selectedDate) return false;
        if (scheduleMode === 'semanal' && (s.date < weekStart || s.date > weekEnd)) return false;
        if (scheduleMode === 'mensal' && selectedScheduleMonth !== 'Todos' && !s.date.startsWith(selectedScheduleMonth)) return false;
        if (searchTerm) {
          const docName = getDoctorName(s.doctorId).toLowerCase();
          if (!docName.includes(searchTerm.toLowerCase()) && !s.type.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const handleExportWeeklyPDF = () => {
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        alert('Por favor, permita pop-ups no navegador para gerar o PDF da escala.');
        return;
      }

      const columnsHtml = daysList.map(dayObj => {
        const dayShifts = shifts
          .filter(s => s.date === dayObj.dateStr && (categoryFilter === 'Todas' || s.category === categoryFilter))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const shiftsCards = dayShifts.length === 0
          ? `<div style="padding: 10px; color: #94a3b8; font-size: 10px; text-align: center; font-style: italic;">Sem plantões alocados</div>`
          : dayShifts.map(sh => {
              const doc = getDoctorById(sh.doctorId);
              const duration = calculateDurationHours(sh.startTime, sh.endTime);
              return `
                <div style="border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 6px; padding: 6px; margin-bottom: 6px; background: #f8fafc;">
                  <div style="font-weight: 800; font-size: 10px; color: #1e293b;">${sh.startTime} às ${sh.endTime} (${duration}h)</div>
                  <div style="font-weight: 700; font-size: 11px; color: #0f172a; margin-top: 2px;">${doc?.name || 'Médico'}</div>
                  <div style="font-size: 9px; color: #475569;">${doc?.crm || ''} • ${sh.category}</div>
                  <div style="font-size: 9px; color: #2563eb; font-weight: 600; margin-top: 2px;">${sh.type}</div>
                </div>
              `;
            }).join('');

        return `
          <td style="vertical-align: top; width: 14.28%; border: 1px solid #cbd5e1; padding: 6px; background: #ffffff;">
            <div style="background: #1e293b; color: #ffffff; padding: 6px 4px; border-radius: 4px; text-align: center; margin-bottom: 8px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">${dayObj.dayName.split('-')[0]}</div>
              <div style="font-size: 10px; color: #cbd5e1;">${dayObj.label}</div>
            </div>
            ${shiftsCards}
          </td>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Escala_Semanal_${weekStart}_a_${weekEnd}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px;">
            <div>
              <h1 style="margin: 0; font-size: 18px; color: #0f172a;">${config.hospitalName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'} — Escala Semanal</h1>
              <p style="margin: 3px 0 0 0; font-size: 12px; color: #475569;">
                Período: <strong>Segunda-feira (${daysList[0]?.label}/${weekStart.slice(0, 4)}) a Domingo (${daysList[6]?.label}/${weekEnd.slice(0, 4)})</strong>
              </p>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748b;">
              <div><strong>${config.appName} — ${config.sectorUnitName || 'Emergência Adulta - HGD'}</strong></div>
              <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>${columnsHtml}</tr>
          </table>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800">Escala Médica Oficial</h2>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>
            <p className="text-sm text-slate-500">Visualização Diária, Semanal (Seg-Dom) e Mensal</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportWeeklyPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm"
            >
              <Download size={16} /> Exportar Semana (PDF)
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingShiftId(null);
                  const defaultCat = dynamicCategories[0] || 'Médico Rotina/Sênior';
                  const firstEligible = activeDoctors.find(d => isDoctorAllowedForFunction(d, defaultCat));
                  const rules = getCategoryRulesList(defaultCat);
                  setNewShift({
                    date: selectedDate,
                    startTime: '07:00',
                    endTime: '19:00',
                    category: defaultCat,
                    doctorId: firstEligible?.id || activeDoctors[0]?.id || '',
                    type: 'Plantão Personalizado',
                    billingType: 'Coringa/Extra',
                    ruleId: rules[0]?.id || '',
                    customRate12h: '',
                    additionals: []
                  });
                  setShowShiftModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm"
              >
                <Plus size={16} /> Cadastrar Plantão (Horário Livre)
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['diaria', 'semanal', 'mensal'].map(m => (
                <button
                  key={m}
                  onClick={() => setScheduleMode(m)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize ${scheduleMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                >
                  {m === 'diaria' ? 'Diária' : m === 'semanal' ? 'Semanal (Seg-Dom)' : 'Mensal'}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            />
          </div>

          <div className="flex flex-1 min-w-[220px] gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar plantonista ou setor..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>
            <select
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-800"
            >
              <option value="Todas">Todas Categorias</option>
              {dynamicCategories.map(fn => <option key={fn} value={fn}>{fn}</option>)}
            </select>
          </div>
        </div>

        {scheduleMode === 'semanal' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[980px] grid grid-cols-7 gap-2">
              {daysList.map(dayObj => {
                const dayShifts = filteredShifts.filter(s => s.date === dayObj.dateStr);
                return (
                  <div key={dayObj.dateStr} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 flex flex-col justify-between min-h-[180px]">
                    <div>
                      <div className="bg-slate-800 text-white rounded-lg py-1.5 px-2 text-center mb-2">
                        <p className="text-[11px] font-extrabold uppercase">{dayObj.dayName.split('-')[0]}</p>
                        <p className="text-[10px] text-slate-300">{dayObj.label}</p>
                      </div>
                      <div className="space-y-2">
                        {dayShifts.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-6 italic">Sem plantões</p>
                        ) : (
                          dayShifts.map(sh => {
                            const doc = getDoctorById(sh.doctorId);
                            const isMyShift = !isAdmin && sh.doctorId === currentUser.id;
                            return (
                              <div
                                key={sh.id}
                                className={`bg-white p-2 rounded-lg border shadow-sm text-xs border-l-4 ${
                                  isMyShift ? 'border-emerald-400 border-l-emerald-600 ring-1 ring-emerald-200' : 'border-slate-200 border-l-blue-600'
                                }`}
                              >
                                <p className="font-extrabold text-slate-800">{sh.startTime} - {sh.endTime}</p>
                                <p className="font-bold text-blue-700 truncate mt-0.5">{doc?.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{sh.category}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredShifts.map(shift => {
            const doc = getDoctorById(shift.doctorId);
            const duration = calculateDurationHours(shift.startTime, shift.endTime);
            const addInfo = calculateShiftAdditionalsAmount(shift.additionals || [], duration);
            const canRequestSwap = isAdmin || shift.doctorId === currentUser.id;

            return (
              <div key={shift.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-blue-600">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800">{shift.type}</h4>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{shift.category}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${shift.billingType === 'Fixo' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {shift.billingType === 'Fixo' ? 'Carga Fixa' : 'Plantão Extra Avulso'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    <strong>{shift.date}</strong> ({shift.startTime} às {shift.endTime} — {duration}h) • <strong>{doc?.name}</strong>
                  </p>
                  {addInfo.details.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {addInfo.details.map((ad: any) => (
                        <span key={ad.id} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                          + {ad.name}: R$ {ad.amount.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canRequestSwap && (
                    <button
                      onClick={() => openSwapModal(shift)}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Repeat size={14} /> Solicitar Troca / Passagem
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setShifts(prev => prev.filter(s => s.id !== shift.id))}
                      className="text-slate-400 hover:text-red-600 p-2"
                      title="Excluir Plantão"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 4A1. ABA "MEUS PLANTÕES" (EXCLUSIVO VISÃO DO MÉDICO) ---
  const renderMyShifts = () => {
    const myShifts = shifts
      .filter(s => s.doctorId === currentUser.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const totalHours = myShifts.reduce((acc, sh) => acc + calculateDurationHours(sh.startTime, sh.endTime), 0);

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Meus Plantões Escalados</h2>
            <p className="text-xs text-slate-500">
              Unidade: <strong>{config.sectorUnitName || 'Emergência Adulta - HGD'}</strong> • Relação cronológica linear de seus plantões ativos nas semanas e meses.
            </p>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="block text-[10px] text-blue-600 font-bold uppercase">Total de Plantões / Horas</span>
            <span className="text-base font-extrabold text-blue-900">{myShifts.length} plantões ({totalHours}h)</span>
          </div>
        </div>

        <div className="space-y-3">
          {myShifts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-400 text-sm">
              Você não possui plantões escalados no momento.
            </div>
          ) : (
            myShifts.map(shift => {
              const duration = calculateDurationHours(shift.startTime, shift.endTime);
              const weekday = getWeekdayName(shift.date);
              const addInfo = calculateShiftAdditionalsAmount(shift.additionals || [], duration);

              return (
                <div key={shift.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-600">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="bg-slate-100 px-3.5 py-2 rounded-xl text-center min-w-[85px]">
                      <p className="text-xs font-bold text-slate-700">{shift.date.split('-')[2]}/{shift.date.split('-')[1]}/{shift.date.split('-')[0].slice(2)}</p>
                      <p className="text-[11px] text-slate-500">{weekday.split('-')[0]}</p>
                      <p className="text-xs font-extrabold text-emerald-700 mt-0.5">{duration}h</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800">{shift.type}</h4>
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{shift.category}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full">
                          {shift.billingType === 'Fixo' ? 'Carga Fixa' : 'Plantão Extra / Avulso'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Horário: {shift.startTime} às {shift.endTime}</strong>
                      </p>
                      {addInfo.details.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {addInfo.details.map((ad: any) => (
                            <span key={ad.id} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                              + {ad.name}: R$ {ad.amount.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => openSwapModal(shift)}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Repeat size={14} /> Solicitar Troca / Passagem
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // --- 4A2. ABA "MINHA FOLHA / FINANCEIRO" (EXCLUSIVO VISÃO DO MÉDICO COM A MENSAGEM OBRIGATÓRIA) ---
  const renderMyFinancials = () => {
    const myReport = payrollReport.find(r => r.id === currentUser.id);
    if (!myReport) return null;

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Minha Folha & Demonstrativo Financeiro</h2>
            <p className="text-xs text-slate-500">
              Competência: <strong>{competenceWindow.startStr} a {competenceWindow.endStr}</strong> • Unidade: {config.sectorUnitName || 'Emergência Adulta - HGD'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={competenceMonth}
              onChange={e => setCompetenceMonth(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-xs font-bold"
            />
            <div className="text-right">
              <span className="block text-xs text-slate-400 uppercase">Consolidado Estimado</span>
              <strong className="text-2xl font-extrabold text-emerald-700">
                R$ {myReport.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* MENSAGEM OBRIGATÓRIA EXIGIDA */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-3 shadow-sm">
          <AlertTriangle size={22} className="text-amber-700 shrink-0" />
          <span>
            Este valor é uma estimativa prévia e está sujeito a conferência, aprovação e ajuste pelo gestor.
          </span>
        </div>

        {/* Resumo Consolidado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="block text-xs text-slate-400 uppercase font-bold">Carga Horária Fixa Cadastrada</span>
            <strong className="text-lg text-slate-800">R$ {myReport.baseFixedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            <span className="block text-[11px] text-slate-500 mt-0.5">{myReport.fixedHoursWorked}h fixas na competência (~{myReport.weeklyAvgFixedHours}h/sem)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="block text-xs text-slate-400 uppercase font-bold">Plantões Extras Avulsos</span>
            <strong className="text-lg text-blue-700">+ R$ {myReport.extraShiftsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            <span className="block text-[11px] text-slate-500 mt-0.5">{myReport.extraHoursWorked}h extras ({myReport.extraShiftsCount} plantões)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="block text-xs text-slate-400 uppercase font-bold">Adicionais (Plantão + Competência)</span>
            <strong className="text-lg text-amber-700">+ R$ {(myReport.totalAdditionalsAmount + (myReport.manualAdjustmentsTotal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            <span className="block text-[11px] text-slate-500 mt-0.5">Plantão: R$ {myReport.shiftAdditionalsTotal.toFixed(2)} | Mês: R$ {myReport.competenceAdditionalsTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Detalhamento Linear dos Plantões e Valores */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-sm uppercase text-slate-700">Discriminação dos Plantões (Fixos e Extras Avulsos) e Adicionais</h3>
          <div className="space-y-2">
            {myReport.dailyBreakdown.length === 0 ? (
              <p className="text-slate-400 italic text-xs">Nenhum plantão alocado nesta janela de competência.</p>
            ) : (
              myReport.dailyBreakdown.map((d: any) => (
                <div key={d.shiftId} className="p-3.5 bg-slate-50 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <strong>{d.date} ({d.weekday}) • {d.startTime} às {d.endTime}</strong>
                    <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold">{d.fractionLabel}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded font-bold ${d.isExtraShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {d.billingType}
                    </span>
                    <p className="text-slate-500 mt-0.5">Categoria: {d.category} • Regra: {d.ruleLabel}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase">Valor Plantão + Adicionais</span>
                    <strong className="text-sm font-extrabold text-emerald-700">
                      R$ {(d.shiftBaseVal + (d.additionalsVal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              ))
            )}

            {myReport.competenceAdditionalsDetails && myReport.competenceAdditionalsDetails.length > 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-amber-800">Adicionais Incidindo no Mês de Competência:</span>
                {myReport.competenceAdditionalsDetails.map((ca: any) => (
                  <div key={ca.id} className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-900">+ {ca.name} (Incidência Mensal na Competência)</span>
                    <strong className="text-amber-900">R$ {Number(ca.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- 4B. TELA DE TROCAS (PERMUTAS) E PASSAGENS ---
  const renderSwaps = () => {
    const displayedSwaps = isAdmin
      ? swaps
      : swaps.filter(sw => sw.requestingDoctorId === currentUser.id || sw.proposedDoctorId === currentUser.id);

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isAdmin ? 'Gestão de Trocas (Permutas) e Passagens de Plantão' : 'Minhas Trocas & Passagens de Plantão'}
            </h2>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? 'Aprove ou recuse solicitações pendentes. Ao aprovar, a escala médica e a folha são atualizadas automaticamente.'
                : 'Acompanhe o status das solicitações de permuta ou passagem em que você é titular ou substituto.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
              Pendentes: {displayedSwaps.filter(s => s.status === 'Pendente').length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4 font-semibold">Data / Horário</th>
                <th className="p-4 font-semibold">Tipo</th>
                <th className="p-4 font-semibold">Titular → Substituto</th>
                <th className="p-4 font-semibold">Status</th>
                {isAdmin && <th className="p-4 font-semibold text-right">Decisão do Gestor</th>}
              </tr>
            </thead>
            <tbody>
              {displayedSwaps.map(swap => {
                const reqDoc = getDoctorById(swap.requestingDoctorId);
                const propDoc = getDoctorById(swap.proposedDoctorId);
                const hours = calculateDurationHours(swap.swapStartTime, swap.swapEndTime);
                const isPassagem = swap.movementType === 'Passagem';

                return (
                  <tr key={swap.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">
                        {swap.shiftDate} ({getWeekdayName(swap.shiftDate).split('-')[0]})
                      </p>
                      <p className="text-xs text-slate-500">
                        {swap.shiftCategory} • {swap.swapStartTime} às {swap.swapEndTime} ({hours}h)
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPassagem ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {swap.movementType}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{reqDoc?.name || 'Titular'}</p>
                      <p className="text-xs text-emerald-700 font-bold mt-0.5">→ {propDoc?.name || 'Substituto'}</p>
                      {swap.reason && (
                        <p className="text-[11px] text-slate-500 italic mt-1">Motivo: "{swap.reason}"</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        swap.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                        swap.status === 'Recusado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {swap.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right whitespace-nowrap">
                        {swap.status === 'Pendente' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolveSwap(swap, 'Aprovado')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm"
                            >
                              ✓ Confirmar / Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveSwap(swap, 'Recusado')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              ✕ Recusar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSwaps(prev => prev.map(sw => sw.id === swap.id ? { ...sw, status: 'Pendente' } : sw))}
                            className="text-xs text-slate-400 hover:text-blue-600 underline"
                          >
                            Reabrir análise
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- 4C. FÉRIAS E LICENÇAS (COM TABELA MENSAL DE CONTROLE PARA O GESTOR) ---
  const renderVacations = () => {
    const displayedVacations = isAdmin
      ? vacations
      : vacations.filter(v => v.doctorId === currentUser.id);

    // Constrói resumo mês a mês para o controle do Gestor
    const monthlyVacationSummary = MONTHS_LIST.map(m => {
      const inMonth = vacations.filter(
        v => v.status !== 'Recusado' && v.startDate.slice(0, 7) <= m.id && v.endDate.slice(0, 7) >= m.id
      );
      const approvedList = inMonth.filter(v => v.status === 'Aprovado');
      const pendingList = inMonth.filter(v => v.status === 'Pendente');
      const isBlocked = (config.blockedVacationMonths || []).includes(m.id);

      return {
        ...m,
        isBlocked,
        totalCount: inMonth.length,
        approvedCount: approvedList.length,
        pendingCount: pendingList.length,
        records: inMonth
      };
    });

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isAdmin ? 'Gestão de Férias, Licenças & Mapa Mensal de Afastamentos' : 'Minhas Férias & Licenças'}
            </h2>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? 'Visualize quantos e quais médicos estão de férias em cada mês, aprove solicitações e valide substitutos.'
                : 'Solicite seu período de férias/licença. Após a autorização do gestor, informe no campo livre quem cobrirá seus plantões.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openNewVacationOrLeaveModal('Férias')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
            >
              + Solicitar Férias
            </button>
            <button
              onClick={() => openNewVacationOrLeaveModal('Licença')}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
            >
              + Solicitar Licença
            </button>
          </div>
        </div>

        {/* TABELA MENSAL DE CONTROLE DE FÉRIAS / LICENÇAS (EXCLUSIVO LOGIN DO GESTOR) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  📊 Controle Mensal de Férias & Licenças (Quem e Quantos por Mês)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Clique no cadeado de qualquer mês para bloquear ou liberar novas solicitações de férias pelos médicos.
                </p>
              </div>
              <span className="text-xs bg-blue-600 px-3 py-1 rounded-full font-bold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                    <th className="p-3.5 font-bold">Mês / Competência</th>
                    <th className="p-3.5 font-bold">Status do Mês</th>
                    <th className="p-3.5 font-bold text-center">Qtd. Médicos Afastados</th>
                    <th className="p-3.5 font-bold">Quem está de Férias / Licença no Mês (Período & Status)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyVacationSummary.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">
                        {item.label} <span className="text-slate-400 font-normal">({item.id})</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleBlockedVacationMonth(item.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                            item.isBlocked
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.isBlocked ? '🔒 Mês Bloqueado' : '🔓 Liberado'}
                        </button>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {item.totalCount === 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">
                            0 médicos
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full font-extrabold ${
                              item.totalCount >= 2 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.totalCount} médico(s)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              ({item.approvedCount} aprov. / {item.pendingCount} pend.)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {item.records.length === 0 ? (
                          <span className="text-slate-400 italic">Nenhum médico em férias ou licença neste mês</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {item.records.map((rec: any) => (
                              <div
                                key={rec.id}
                                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                                  rec.status === 'Aprovado'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                }`}
                              >
                                <span className="font-extrabold">{getDoctorName(rec.doctorId)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 font-bold">
                                  {rec.requestType}: {rec.startDate.slice(8, 10)}/{rec.startDate.slice(5, 7)} a {rec.endDate.slice(8, 10)}/{rec.endDate.slice(5, 7)}
                                </span>
                                <span className={`text-[10px] font-extrabold uppercase ${
                                  rec.status === 'Aprovado' ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  [{rec.status}]
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {displayedVacations.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-400 text-sm">
              Nenhuma solicitação de férias ou licença encontrada.
            </div>
          ) : (
            displayedVacations.map(vac => {
              const draftText = vacationSubDrafts[vac.id] !== undefined ? vacationSubDrafts[vac.id] : (vac.freeTextSubstitutions || '');

              return (
                <div key={vac.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold mr-2">{vac.requestType}</span>
                      <strong className="text-sm text-slate-800">{getDoctorName(vac.doctorId)}</strong>
                      <p className="text-slate-500 mt-1">Período: <strong>{vac.startDate} até {vac.endDate}</strong> • Justificativa: {vac.justification}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        vac.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                        vac.status === 'Recusado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        Período: {vac.status}
                      </span>

                      {isAdmin && vac.status === 'Pendente' && (
                        <>
                          <button onClick={() => handleResolveVacationOrLeave(vac, 'Aprovado')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">
                            ✓ Autorizar Férias
                          </button>
                          <button onClick={() => handleResolveVacationOrLeave(vac, 'Recusado')} className="bg-red-50 text-red-600 border px-3 py-1.5 rounded-lg font-bold">
                            ✕ Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {vac.status === 'Aprovado' && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-800 uppercase text-[11px]">
                          📋 Plano de Substituições para o Período Autorizado ({vac.startDate} a {vac.endDate})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          vac.substitutionsStatus === 'Aprovado e Inserido na Escala'
                            ? 'bg-emerald-100 text-emerald-800'
                            : vac.substitutionsStatus === 'Pendente Gestor'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          Status: {vac.substitutionsStatus || 'Aguardando Médico'}
                        </span>
                      </div>

                      {!isAdmin && (
                        <div className="space-y-2">
                          <label className="block text-slate-600 font-semibold">
                            Informe abaixo (campo livre) quais colegas cobrirão seus plantões durante as férias autorizadas:
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Ex: Dia 12/11 (07h-19h) - Dr. Roberto Lima..."
                            value={draftText}
                            onChange={e => setVacationSubDrafts(prev => ({ ...prev, [vac.id]: e.target.value }))}
                            className="w-full border rounded-lg p-3 text-xs bg-white text-slate-800"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDoctorSubmitVacationSubstitutions(vac.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
                            >
                              Enviar Substituições ao Gestor
                            </button>
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded-lg border whitespace-pre-line text-slate-800">
                            {vac.freeTextSubstitutions || <span className="italic text-slate-400">O médico ainda não enviou a relação de substitutos.</span>}
                          </div>

                          {vac.freeTextSubstitutions && (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShiftId(null);
                                  setNewShift({
                                    date: vac.startDate,
                                    startTime: '07:00',
                                    endTime: '19:00',
                                    category: dynamicCategories[0] || 'Plantonista',
                                    doctorId: activeDoctors[0]?.id || '',
                                    type: `Cobertura Férias (${getDoctorName(vac.doctorId)})`,
                                    billingType: 'Coringa/Extra',
                                    additionals: []
                                  });
                                  setShowShiftModal(true);
                                }}
                                className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1"
                              >
                                <Plus size={14} /> + Inserir Plantão de Cobertura na Escala
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManagerResolveVacationSubstitutions(vac, 'Aprovado e Inserido na Escala')}
                                className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg font-bold"
                              >
                                ✓ Aprovar Substituições
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // --- 4D. MEU CADASTRO ---
  const renderMyProfile = () => {
    const myDoc = getDoctorById(currentUser.id);
    if (!myDoc) return null;

    return (
      <div className="max-w-3xl space-y-6 text-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Meu Cadastro Profissional & Dados PJ</h2>
          <p className="text-sm text-slate-500">Unidade: <strong>{config.sectorUnitName || 'Emergência Adulta - HGD'}</strong></p>
        </div>

        {profileSavedToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
            ✓ Dados atualizados com sucesso!
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            setProfileSavedToast(true);
            setTimeout(() => setProfileSavedToast(false), 3000);
          }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-600 mb-1">Nome Completo</label>
              <input type="text" value={myDoc.name} onChange={e => setDoctors(prev => prev.map(d => d.id === myDoc.id ? { ...d, name: e.target.value } : d))} className="w-full border rounded-lg px-3 py-2 font-semibold" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">CRM</label>
              <input type="text" value={myDoc.crm} onChange={e => setDoctors(prev => prev.map(d => d.id === myDoc.id ? { ...d, crm: e.target.value } : d))} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
              <input type="text" value={myDoc.phone} onChange={e => setDoctors(prev => prev.map(d => d.id === myDoc.id ? { ...d, phone: e.target.value } : d))} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Razão Social (PJ)</label>
              <input type="text" value={myDoc.razaoSocial} onChange={e => setDoctors(prev => prev.map(d => d.id === myDoc.id ? { ...d, razaoSocial: e.target.value } : d))} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">CNPJ</label>
              <input type="text" value={myDoc.cnpj} onChange={e => setDoctors(prev => prev.map(d => d.id === myDoc.id ? { ...d, cnpj: e.target.value } : d))} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="pt-3 border-t flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold">Salvar Meu Cadastro</button>
          </div>
        </form>
      </div>
    );
  };

  // --- 5. FOLHA DE PAGAMENTO (EXCLUSIVO GESTOR COM ESCOLHA DE ADICIONAIS NA COMPETÊNCIA E EDIÇÃO EM TEMPO REAL) ---
  const renderPayroll = () => {
    const allPassagensInCompetence = payrollReport.flatMap(r =>
      r.passagesDetails.map((p: any) => ({ ...p, titularName: r.name, titularLevel: r.remunerationLevel, titularRole: r.role }))
    );

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">Folha de Pagamento Dinâmica (26 a 25)</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${payrollClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {payrollClosed ? 'Folha Fechada' : 'Editável em Tempo Real'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unidade: <strong>{config.sectorUnitName || 'Emergência Adulta - HGD'}</strong> • Clique em um médico para ajustar valores de plantão ou aplicar adicionais no mês de competência.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input type="month" value={competenceMonth} onChange={e => setCompetenceMonth(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm font-semibold" />
            <button onClick={() => setPayrollClosed(!payrollClosed)} className={`px-4 py-2 rounded-lg text-xs font-bold ${payrollClosed ? 'bg-slate-200 text-slate-800' : 'bg-blue-600 text-white'}`}>
              {payrollClosed ? 'Reabrir Folha' : 'Fechar Folha'}
            </button>
            <button onClick={exportWorkloadAuditCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <ClipboardList size={15} /> Carga de Trabalho (Duplo Check XLS)
            </button>
            <button onClick={exportDetailedPayrollCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Download size={15} /> Folha CSV
            </button>
          </div>
        </div>

        {allPassagensInCompetence.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-700" /> Passagens de Plantão na Competência — Escolha Quem Paga
            </h3>
            <div className="space-y-2">
              {allPassagensInCompetence.map((p: any) => (
                <div key={p.id} className="bg-white p-3.5 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                  <div>
                    <strong>{p.shiftDate} ({p.weekday}) • {p.swapStartTime}-{p.swapEndTime} ({p.hoursPassed}h)</strong>
                    <p className="text-slate-600 mt-0.5">Titular: <strong>{p.titularName}</strong> → Substituto: <strong>{p.subDocName}</strong></p>
                  </div>
                  <select
                    disabled={payrollClosed || !isAdmin}
                    value={p.paymentResponsibility || 'hospital'}
                    onChange={e => {
                      const resp = e.target.value;
                      setSwaps(prev => prev.map(sw => sw.id === p.id ? { ...sw, paymentResponsibility: resp, applyPayrollDiscount: resp === 'hospital' } : sw));
                    }}
                    className="border rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-50"
                  >
                    <option value="hospital">🏥 Hospital Paga Substituto (Desconta Titular)</option>
                    <option value="titular">🤝 Titular Mantém Recebimento (Acerto Direto)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {payrollReport.map(r => {
            const isExpanded = expandedPayrollDoctorId === r.id;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div onClick={() => setExpandedPayrollDoctorId(isExpanded ? null : r.id)} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-base">{r.name}</h4>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{r.role} • Nv.{r.remunerationLevel}</span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                        Média: {r.weeklyAvgTotalHours}h/sem (Fixa: {r.fixedHoursWorked}h | Extras: {r.extraHoursWorked}h)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{r.razaoSocial} ({r.cnpj})</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 text-right text-xs">
                    <div><span className="block text-slate-400">Fixo Base</span><strong>R$ {r.baseFixedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="block text-slate-400">Extras</span><strong className="text-blue-700">+ R$ {r.extraShiftsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="block text-slate-400">Adicionais (Plt+Mês)</span><strong className="text-amber-700">+ R$ {(r.totalAdditionalsAmount + (r.manualAdjustmentsTotal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="block text-slate-400">Líquido Final</span><strong className="text-emerald-700 text-base">R$ {r.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-slate-50 p-5 space-y-5 text-xs">
                    {/* SEÇÃO A: ADICIONAIS INCIDINDO NO MÊS DE COMPETÊNCIA */}
                    <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h5 className="font-extrabold text-amber-900 uppercase">
                          ⭐ Adicionais Incidindo no Mês de Competência ({competenceMonth}) para {r.name}
                        </h5>
                        <span className="text-[11px] text-amber-800 font-semibold">
                          Marque os adicionais que devem incidir diretamente no fechamento do mês de competência deste médico:
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(config.shiftAdditionals || []).map((add: any) => {
                          const checked = (r.docCompetenceAddIds || []).includes(add.id);
                          return (
                            <label
                              key={add.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                checked ? 'bg-amber-100 border-amber-400 font-bold text-amber-950' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  disabled={payrollClosed}
                                  checked={checked}
                                  onChange={() => toggleDoctorCompetenceAdditional(r.id, add.id)}
                                />
                                <div>
                                  <span className="block">{add.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Padrão: {add.incidenceType === 'competencia' ? 'Mês de Competência' : 'Por Plantão'}
                                  </span>
                                </div>
                              </div>
                              <span className="font-extrabold text-emerald-700">+ R$ {Number(add.value12h).toFixed(2)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* SEÇÃO B: PLANTÕES E FRAÇÕES 12H */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 uppercase">Detalhamento de Plantões, Frações de 12h & Edição Individual em Tempo Real</h5>
                      {r.dailyBreakdown.length === 0 ? (
                        <p className="text-slate-400 italic">Nenhum plantão alocado nesta janela.</p>
                      ) : (
                        r.dailyBreakdown.map((d: any) => (
                          <div key={d.shiftId} className="bg-white p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <span className="font-bold text-slate-800">{d.date} ({d.weekday}) • {d.startTime} às {d.endTime}</span>
                              <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold">{d.fractionLabel}</span>
                              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">{d.billingType}</span>
                              <p className="text-slate-500 mt-0.5">Categoria: <strong>{d.category}</strong> • Regra: {d.ruleLabel}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-400 uppercase">Base 12h (R$)</label>
                                <input
                                  type="number"
                                  disabled={payrollClosed}
                                  value={shiftCustomOverrides[d.shiftId]?.customRate12h ?? d.base12hApplied}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setShiftCustomOverrides(prev => ({ ...prev, [d.shiftId]: { ...prev[d.shiftId], customRate12h: val } }));
                                  }}
                                  className="w-28 border border-blue-300 rounded px-2 py-1 font-bold bg-blue-50/40"
                                />
                              </div>
                              <div className="text-right min-w-[120px]">
                                <span className="block text-[10px] text-slate-400 uppercase">Proporcional + Adic.</span>
                                <span className="font-extrabold text-emerald-700 text-sm">
                                  R$ {(d.shiftBaseVal + (d.additionalsVal || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* SEÇÃO C: AJUSTE MANUAL AVULSO */}
                    {!payrollClosed && (
                      <div className="bg-white p-3.5 rounded-xl border border-dashed border-blue-300 flex items-center justify-between">
                        <span className="font-bold text-slate-700">+ Lançar Bônus / Ajuste Avulso na Competência de {r.name}:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const desc = prompt('Descrição do pagamento/ajuste especial:');
                            if (!desc) return;
                            const valStr = prompt('Valor em R$ (use negativo para desconto):', '500');
                            if (!valStr) return;
                            setManualPayrollAdjustments(prev => ({
                              ...prev,
                              [r.id]: [...(prev[r.id] || []), { description: desc, amount: Number(valStr) || 0 }]
                            }));
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold"
                        >
                          + Adicionar Valor Avulso
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 6. MATRIZ DE REMUNERAÇÃO E ADICIONAIS (COM ESCOLHA DE INCIDÊNCIA NO PLANTÃO OU NO MÊS DE COMPETÊNCIA) ---
  const renderRemuneration = () => {
    const handleAddDynamicCategory = () => {
      const clean = newCategoryTitle.trim();
      if (!clean) return;
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [clean]: {
            mensalFixo: 15000,
            extra12h: 1400,
            rules: [
              { id: `rl_${Date.now()}_1`, label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 15000 },
              { id: `rl_${Date.now()}_2`, label: 'Extra Avulso 12h (Dia de Semana)', billingMode: 'por_12h', value: 1400 },
              { id: `rl_${Date.now()}_3`, label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1700 },
            ]
          }
        }
      }));
      setNewCategoryTitle('');
    };

    const handleAddRuleBoxToCategory = (catName: string) => {
      const input = newRuleInputs[catName] || { label: '', mode: 'por_12h', value: 1500 };
      if (!input.label.trim()) return;
      const existingRules = getCategoryRulesList(catName);
      const updatedRules = [
        ...existingRules,
        { id: `rule_${Date.now()}`, label: input.label.trim(), billingMode: input.mode || 'por_12h', value: Number(input.value || 0) }
      ];
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: { ...(prev.functionRates?.[catName] || {}), rules: updatedRules }
        }
      }));
      setNewRuleInputs(prev => ({ ...prev, [catName]: { label: '', mode: 'por_12h', value: 1500 } }));
    };

    const handleAddAdditionalRule = (e: React.FormEvent) => {
      e.preventDefault();
      const name = (newAdditionalName || '').trim();
      const val = Number(newAdditionalVal || 0);
      if (!name) return;

      const newAddObj = {
        id: `add_${Date.now()}`,
        name,
        value12h: val,
        incidenceType: newAdditionalIncidence
      };
      setConfig((prev: any) => ({ ...prev, shiftAdditionals: [...(prev.shiftAdditionals || []), newAddObj] }));
      setNewAdditionalName('');
      setNewAdditionalVal(250);
    };

    return (
      <div className="space-y-8 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">Construtor de Remuneração & Adicionais de Pagamento</h2>
            <p className="text-xs text-slate-500">
              Unidade: <strong>{config.sectorUnitName || 'Emergência Adulta - HGD'}</strong> • Defina se cada adicional incide no Plantão ou no Mês de Competência.
            </p>
          </div>

          <div className="flex gap-2">
            <input type="text" placeholder="Nova Categoria (ex: Emergencista)" value={newCategoryTitle} onChange={e => setNewCategoryTitle(e.target.value)} className="border rounded-lg px-3 py-2 text-xs font-semibold min-w-[210px]" />
            <button type="button" onClick={handleAddDynamicCategory} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Criar Categoria</button>
          </div>
        </div>

        {/* GERENCIAR ADICIONAIS COM ESCOLHA DE INCIDÊNCIA (NO PLANTÃO OU NO MÊS DE COMPETÊNCIA) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              Regras de Adicionais de Pagamento (Incidência por Plantão ou no Mês de Competência)
            </h3>
            <p className="text-xs text-slate-500">
              Escolha livremente se o adicional incide sobre o plantão trabalhado (base 12h) ou diretamente no fechamento do mês de competência do médico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(config.shiftAdditionals || []).map((add: any) => (
              <div key={add.id} className="p-3.5 rounded-xl bg-slate-50 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">{add.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Incidir em:</span>
                    <select
                      value={add.incidenceType || 'plantao'}
                      onChange={e => {
                        const newInc = e.target.value;
                        setConfig((prev: any) => ({
                          ...prev,
                          shiftAdditionals: prev.shiftAdditionals.map((item: any) => item.id === add.id ? { ...item, incidenceType: newInc } : item)
                        }));
                      }}
                      className={`border rounded px-2 py-0.5 text-[11px] font-bold ${
                        add.incidenceType === 'competencia' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}
                    >
                      <option value="plantao">⚡ No Plantão (Base 12h / Proporcional)</option>
                      <option value="competencia">📅 No Mês de Competência (Valor Mensal)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">R$</span>
                  <input
                    type="number"
                    value={add.value12h}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setConfig((prev: any) => ({
                        ...prev,
                        shiftAdditionals: prev.shiftAdditionals.map((item: any) => item.id === add.id ? { ...item, value12h: val } : item)
                      }));
                    }}
                    className="w-24 border rounded-lg px-2.5 py-1.5 font-extrabold bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setConfig((prev: any) => ({ ...prev, shiftAdditionals: prev.shiftAdditionals.filter((item: any) => item.id !== add.id) }))}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Excluir adicional"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAdditionalRule} className="pt-3 border-t flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700">+ Novo Adicional:</span>
            <input
              type="text"
              placeholder="Nome (ex: Adicional Chefia Mensal / Adicional UTI)"
              value={newAdditionalName}
              onChange={e => setNewAdditionalName(e.target.value)}
              className="border rounded-lg px-3 py-1.5 flex-1 min-w-[200px]"
            />
            <select
              value={newAdditionalIncidence}
              onChange={e => setNewAdditionalIncidence(e.target.value as 'plantao' | 'competencia')}
              className="border rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-800"
            >
              <option value="plantao">Incidir no Plantão (Base 12h)</option>
              <option value="competencia">Incidir no Mês de Competência</option>
            </select>
            <input
              type="number"
              placeholder="Valor R$"
              value={newAdditionalVal}
              onChange={e => setNewAdditionalVal(e.target.value)}
              className="border rounded-lg px-3 py-1.5 w-28 font-bold"
            />
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold">
              + Cadastrar Adicional
            </button>
          </form>
        </div>

        {/* CATEGORIAS E CAIXAS DE REMUNERAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dynamicCategories.map(catName => {
            const rules = getCategoryRulesList(catName);
            const inputState = newRuleInputs[catName] || { label: '', mode: 'por_12h', value: 1500 };

            return (
              <div key={catName} className="bg-white p-5 rounded-2xl border shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-extrabold text-base text-slate-800">{catName}</h3>
                    {dynamicCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const clone = { ...(config.functionRates || {}) };
                          delete clone[catName];
                          setConfig({ ...config, functionRates: clone });
                        }}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        Excluir Categoria
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {rules.map((rl: any) => (
                      <div key={rl.id} className="p-3 rounded-xl bg-slate-50 border flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold block">{rl.label}</span>
                          <span className="text-[10px] text-blue-700 font-semibold">
                            {rl.billingMode === 'fixo_mensal' ? 'Valor Fixo (Ciclo)' : 'Base 12h (Calcula fração)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>R$</span>
                          <input
                            type="number"
                            value={rl.value}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const updated = rules.map((r: any) => r.id === rl.id ? { ...r, value: val } : r);
                              setConfig((prev: any) => ({
                                ...prev,
                                functionRates: { ...(prev.functionRates || {}), [catName]: { ...(prev.functionRates?.[catName] || {}), rules: updated } }
                              }));
                            }}
                            className="w-24 border rounded-lg px-2 py-1 font-extrabold bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t space-y-2 text-xs">
                  <label className="block font-bold text-blue-700 uppercase text-[11px]">+ Nova Caixa em "{catName}"</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Extra FDS 12h"
                      value={inputState.label}
                      onChange={e => setNewRuleInputs(prev => ({ ...prev, [catName]: { ...inputState, label: e.target.value } }))}
                      className="border rounded-lg px-2.5 py-1.5 flex-1"
                    />
                    <input
                      type="number"
                      placeholder="R$"
                      value={inputState.value}
                      onChange={e => setNewRuleInputs(prev => ({ ...prev, [catName]: { ...inputState, value: Number(e.target.value) } }))}
                      className="w-24 border rounded-lg px-2 py-1.5 font-bold"
                    />
                    <button type="button" onClick={() => handleAddRuleBoxToCategory(catName)} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold">
                      + Caixa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 7. CORPO CLÍNICO ---
  const renderStaff = () => {
    const displayedDoctors = staffSubTab === 'active' ? activeDoctors : staffSubTab === 'admin_only' ? adminDoctors : doctors.filter(d => d.status !== 'Ativo');
    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Corpo Clínico & Acúmulo de Cargos</h2>
          {isAdmin && (
            <button
              onClick={() => {
                setDoctorForm({
                  id: null, name: '', cpf: '', birthDate: '1990-01-01', email: '', password: '123',
                  phone: '', crm: '', rqe: '', specialty: 'Clínica Médica', razaoSocial: '', cnpj: '',
                  role: 'Plantonista', remunerationLevel: 1, contractType: 'Coringa / Extra',
                  participatesInSchedule: true, allowedFunctions: ['Plantonista'], status: 'Ativo'
                });
                setShowDoctorEditModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold"
            >
              + Cadastrar Médico
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto text-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                <th className="p-4">Médico</th>
                <th className="p-4">CRM / Especialidade</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayedDoctors.map(doc => (
                <tr key={doc.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-bold">{doc.name}</td>
                  <td className="p-4 text-xs text-slate-500">{doc.crm} • {doc.specialty}</td>
                  <td className="p-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">{doc.status}</span></td>
                  <td className="p-4 text-right space-x-2">
                    {doc.status === 'Pendente' && isAdmin && (
                      <button onClick={() => handleApproveDoctor(doc.id)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Aprovar</button>
                    )}
                    {isAdmin && (
                      <button onClick={() => { setDoctorForm(doc); setShowDoctorEditModal(true); }} className="text-blue-600 text-xs font-bold hover:underline">Editar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- 8. CURSOS E CERTIFICAÇÕES ---
  const renderCourses = () => {
    const displayedCourses = isAdmin ? courses : courses.filter(c => c.doctorId === currentUser.id);
    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex justify-between items-center bg-white p-5 rounded-xl border shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">{isAdmin ? 'Certificações do Corpo Clínico' : 'Minhas Certificações (ACLS, ATLS, PALS)'}</h2>
            <p className="text-xs text-slate-500">Unidade: {config.sectorUnitName || 'Emergência Adulta - HGD'}</p>
          </div>
          <button onClick={() => setShowCourseModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Adicionar Certificação</button>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden text-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                <th className="p-4">Médico</th>
                <th className="p-4">Curso</th>
                <th className="p-4">Validade</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedCourses.map(c => (
                <tr key={c.id} className="border-b">
                  <td className="p-4 font-bold">{getDoctorName(c.doctorId)}</td>
                  <td className="p-4">{c.courseName}</td>
                  <td className="p-4">{c.expirationDate}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${c.status === 'Válido' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- TELA DE LOGIN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-slate-800">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-1">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold uppercase tracking-wide">
              {config.sectorUnitName || 'Emergência Adulta - HGD'}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-800 pt-1">{config.appName}</h1>
            <p className="text-xs text-slate-500">{config.hospitalName}</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button type="button" onClick={() => setAuthTab('login')} className={`flex-1 py-2 rounded-lg ${authTab === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Entrar</button>
            <button type="button" onClick={() => setAuthTab('register')} className={`flex-1 py-2 rounded-lg ${authTab === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Solicitar Cadastro</button>
          </div>

          {authMessage && <div className="p-3 rounded-lg text-xs font-semibold bg-red-50 text-red-700">{authMessage.text}</div>}

          {authTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Insira seu email" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Senha</label>
                <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Insira sua senha" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm">Acessar Plataforma</button>
              <div className="pt-3 border-t flex justify-between text-xs">
          
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <input type="text" required placeholder="Nome Completo *" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="CRM *" value={regForm.crm} onChange={e => setRegForm({ ...regForm, crm: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <input type="text" required placeholder="CPF *" value={regForm.cpf} onChange={e => setRegForm({ ...regForm, cpf: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <input type="email" required placeholder="E-mail *" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              <div className="grid grid-cols-2 gap-2">
                <input type="password" required placeholder="Senha *" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                <input type="password" required placeholder="Confirmar Senha *" value={regForm.confirmPassword} onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg">Enviar Solicitação</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const pendingSwapsCount = swaps.filter(s => s.status === 'Pendente').length;
  const pendingVacationsCount = vacations.filter(v => v.status === 'Pendente' || (v.status === 'Aprovado' && v.substitutionsStatus === 'Pendente Gestor')).length;

  const navItems = isAdmin
    ? [
        { id: 'dashboard', label: 'Painel Geral', icon: Activity, badge: 0 },
        { id: 'schedule', label: 'Escala Médica', icon: CalendarIcon, badge: 0 },
        { id: 'assistance_map', label: 'Mapa Assistencial 24h', icon: Flame, badge: 0 },
        { id: 'swaps', label: 'Trocas & Passagens', icon: Repeat, badge: pendingSwapsCount },
        { id: 'vacations', label: 'Férias & Substituições', icon: Umbrella, badge: pendingVacationsCount },
        { id: 'payroll', label: 'Folha & Duplo Check', icon: DollarSign, badge: 0 },
        { id: 'remuneration', label: 'Remuneração & Adicionais', icon: Sliders, badge: 0 },
        { id: 'staff', label: 'Corpo Clínico', icon: Users, badge: pendingDoctors.length },
        { id: 'management_reports', label: 'Relatórios & Auditoria', icon: BarChart2, badge: 0 },
        { id: 'courses', label: 'Certificações', icon: BookOpen, badge: 0 },
      ]
    : [
        { id: 'schedule', label: 'Escala Médica', icon: CalendarIcon, badge: 0 },
        { id: 'my_shifts', label: 'Meus Plantões', icon: ClipboardList, badge: 0 },
        { id: 'swaps', label: 'Trocas / Passagens', icon: Repeat, badge: swaps.filter(s => (s.requestingDoctorId === currentUser.id || s.proposedDoctorId === currentUser.id) && s.status === 'Pendente').length },
        { id: 'vacations', label: 'Minhas Férias', icon: Umbrella, badge: vacations.filter(v => v.doctorId === currentUser.id && v.status === 'Aprovado' && v.substitutionsStatus === 'Aguardando Médico').length },
        { id: 'my_financials', label: 'Minha Folha / Financeiro', icon: DollarSign, badge: 0 },
        { id: 'courses', label: 'Minhas Certificações', icon: BookOpen, badge: 0 },
        { id: 'my_profile', label: 'Meu Cadastro', icon: Users, badge: 0 },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-800 text-slate-200">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <span className="font-bold text-sm block leading-none">{config.appName} • {config.sectorUnitName || 'Emergência Adulta - HGD'}</span>
            <span className="text-[10px] text-slate-400">{currentUser.name}</span>
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} className="p-2 text-slate-300 hover:text-white"><LogOut size={18} /></button>
      </header>

      <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:flex lg:flex-col w-full lg:w-64 bg-slate-900 text-white shrink-0 lg:min-h-screen p-4 justify-between`}>
        <div>
          <div className="hidden lg:flex items-start gap-3 px-2 py-3 border-b border-slate-800 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg mt-0.5"><CalendarIcon size={20} /></div>
            <div>
              <h1 className="font-bold text-base leading-tight">{config.appName}</h1>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[11px]">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">{config.hospitalName}</p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                {isAdmin ? '👔 Perfil: Gestor' : `👨‍⚕️ ${currentUser.name}`}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Icon size={16} /> {item.label}</span>
                  {item.badge ? <span className="bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">{item.badge}</span> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-4">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-slate-800">
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {isAdmin && currentView === 'dashboard' && renderDashboard()}
        {isAdmin && currentView === 'assistance_map' && renderAssistanceMap()}
        {isAdmin && currentView === 'management_reports' && renderManagementReports()}
        {currentView === 'schedule' && renderSchedule()}
        {!isAdmin && currentView === 'my_shifts' && renderMyShifts()}
        {currentView === 'swaps' && renderSwaps()}
        {currentView === 'vacations' && renderVacations()}
        {!isAdmin && currentView === 'my_financials' && renderMyFinancials()}
        {isAdmin && currentView === 'payroll' && renderPayroll()}
        {isAdmin && currentView === 'remuneration' && renderRemuneration()}
        {isAdmin && currentView === 'staff' && renderStaff()}
        {currentView === 'courses' && renderCourses()}
        {!isAdmin && currentView === 'my_profile' && renderMyProfile()}
      </main>

      {/* MODAL: CADASTRAR PLANTÃO COM HORÁRIO LIVRE E ADICIONAIS */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleCreateShift} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Alocar Plantão (Horário Livre) & Adicionais</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Data</label>
                <input type="date" required value={newShift.date} onChange={e => setNewShift({ ...newShift, date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Categoria</label>
                <select
                  value={newShift.category}
                  onChange={e => {
                    const cat = e.target.value;
                    const first = activeDoctors.find(d => isDoctorAllowedForFunction(d, cat));
                    const catRules = getCategoryRulesList(cat);
                    setNewShift({ ...newShift, category: cat, doctorId: first?.id || activeDoctors[0]?.id || '', ruleId: catRules[0]?.id || '' });
                  }}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  {dynamicCategories.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Horário Início (Livre)</label>
                <input type="time" required value={newShift.startTime} onChange={e => setNewShift({ ...newShift, startTime: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Horário Término (Livre)</label>
                <input type="time" required value={newShift.endTime} onChange={e => setNewShift({ ...newShift, endTime: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Médico Escalado</label>
                <select required value={newShift.doctorId} onChange={e => setNewShift({ ...newShift, doctorId: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white">
                  {eligibleDoctorsForShiftCategory.map(d => <option key={d.id} value={d.id}>{d.name} (Nv.{d.remunerationLevel})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Modalidade</label>
                <select value={newShift.billingType} onChange={e => setNewShift({ ...newShift, billingType: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white font-semibold">
                  <option value="Coringa/Extra">Plantão Extra / Avulso</option>
                  <option value="Fixo">Carga Fixa</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Caixa de Remuneração</label>
                <select value={newShift.ruleId || ''} onChange={e => setNewShift({ ...newShift, ruleId: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white">
                  {getCategoryRulesList(newShift.category).map((rl: any) => (
                    <option key={rl.id} value={rl.id}>{rl.label} (R$ {rl.value})</option>
                  ))}
                </select>
              </div>

              {/* SELEÇÃO DE ADICIONAIS PARA ESTE PLANTÃO */}
              <div className="col-span-2 border-t pt-2">
                <label className="block font-bold text-slate-700 mb-1.5">Adicionais Incidindo neste Plantão:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(config.shiftAdditionals || []).map((add: any) => {
                    const isChecked = (newShift.additionals || []).includes(add.id);
                    return (
                      <label key={add.id} className="flex items-center gap-2 p-2 rounded-lg border bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const current = newShift.additionals || [];
                            const updated = e.target.checked ? [...current, add.id] : current.filter((id: string) => id !== add.id);
                            setNewShift({ ...newShift, additionals: updated });
                          }}
                        />
                        <div>
                          <span className="font-semibold text-slate-800 block">{add.name}</span>
                          <span className="text-[10px] text-slate-500">R$ {add.value12h} ({add.incidenceType === 'competencia' ? 'Mês' : '12h'})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold mb-1">Descrição / Setor</label>
                <input type="text" required value={newShift.type} onChange={e => setNewShift({ ...newShift, type: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Salvar Plantão</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDITAR / CADASTRAR MÉDICO */}
      {showDoctorEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleSaveDoctorForm} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">{doctorForm.id ? 'Editar Médico' : 'Cadastrar Novo Médico'}</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Nome Completo *</label>
                <input type="text" required value={doctorForm.name} onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">E-mail *</label>
                <input type="email" required value={doctorForm.email} onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CRM *</label>
                <input type="text" required value={doctorForm.crm} onChange={e => setDoctorForm({ ...doctorForm, crm: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CPF *</label>
                <input type="text" required value={doctorForm.cpf} onChange={e => setDoctorForm({ ...doctorForm, cpf: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CNPJ *</label>
                <input type="text" required value={doctorForm.cnpj} onChange={e => setDoctorForm({ ...doctorForm, cnpj: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowDoctorEditModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: TROCA / PASSAGEM */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleInitiateSwapSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Solicitar Troca ou Passagem</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Troca (Permuta)', 'Passagem'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setSwapForm({ ...swapForm, movementType: t })}
                  className={`py-2 rounded-lg text-xs font-bold border ${swapForm.movementType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Médico Substituto</label>
              <select value={swapForm.proposedDoctorId} onChange={e => setSwapForm({ ...swapForm, proposedDoctorId: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                {activeDoctors.filter(d => selectedShiftForSwap && d.id !== selectedShiftForSwap.doctorId && isDoctorAllowedForFunction(d, selectedShiftForSwap.category)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Justificativa *</label>
              <input type="text" required value={swapForm.reason} onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowSwapModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* POP-UP DE AVISO DE PASSAGEM */}
      {showHandoffWarningPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-amber-400">
            <h4 className="text-base font-extrabold flex items-center gap-2 text-amber-800">
              <AlertTriangle size={22} /> Aviso sobre Passagem de Plantão
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">Passagens sem permuta podem gerar ajuste em folha conforme a regra definida pela gestão.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setHandoffWarningAcknowledged(true); setShowHandoffWarningPopup(false); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold">Estou Ciente, Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FÉRIAS / LICENÇA */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleCreateVacationOrLeave} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Solicitar {vacationForm.requestType}</h3>
            {vacationError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">{vacationError}</div>}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Data Inicial</label>
                <input type="date" required value={vacationForm.startDate} onChange={e => populateVacationShiftsForDoctor(vacationForm.doctorId, e.target.value, vacationForm.endDate)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Data Final</label>
                <input type="date" required value={vacationForm.endDate} onChange={e => populateVacationShiftsForDoctor(vacationForm.doctorId, vacationForm.startDate, e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Justificativa *</label>
                <input type="text" required value={vacationForm.justification} onChange={e => setVacationForm({ ...vacationForm, justification: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowVacationModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Enviar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CURSOS */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleSaveCourse} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Registrar Curso / Certificação</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Curso</label>
                <input type="text" required value={courseForm.courseName} onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Validade</label>
                <input type="date" required value={courseForm.expirationDate} onChange={e => setCourseForm({ ...courseForm, expirationDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: OCORRÊNCIAS */}
      {showOccurrenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={e => { e.preventDefault(); setOccurrences(prev => [...prev, { ...newOccurrence, id: Date.now(), doctorId: Number(newOccurrence.doctorId) }]); setShowOccurrenceModal(false); }} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Registrar Ocorrência</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Médico</label>
                <select value={newOccurrence.doctorId} onChange={e => setNewOccurrence({ ...newOccurrence, doctorId: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 bg-white">
                  {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Título *</label>
                <input type="text" required value={newOccurrence.title} onChange={e => setNewOccurrence({ ...newOccurrence, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Descrição *</label>
                <input type="text" required value={newOccurrence.description} onChange={e => setNewOccurrence({ ...newOccurrence, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowOccurrenceModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">Registrar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}