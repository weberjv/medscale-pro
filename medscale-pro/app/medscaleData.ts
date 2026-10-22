// app/medscaleData.ts

export const SHIFT_HOURS_CYCLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6
];

export const ALL_FUNCTIONS = [
  'Médico Rotina/Sênior',
  'Plantonista',
  'Plantão de Especialidade',
  'Chefia/Liderança',
  'Coordenação / Supervisão (Sem Escala)'
];

export const MONTHS_LIST = [
  { id: '2026-09', label: 'Set/2026' },
  { id: '2026-10', label: 'Out/2026' },
  { id: '2026-11', label: 'Nov/2026' },
  { id: '2026-12', label: 'Dez/2026' },
  { id: '2027-01', label: 'Jan/2027' },
  { id: '2027-02', label: 'Fev/2027' },
  { id: '2027-03', label: 'Mar/2027' },
];

export const DEFAULT_CONFIG = {
  appName: 'MedScale Pro',
  hospitalName: 'Hospital Geral & Maternidade',
  sectorUnitName: 'Emergência Adulta - HGD',
  masterAdminPassword: 'admin123',
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
  gestaoAVista: {
    npsScore: 88,
    motivationalQuote: '“Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária na Emergência Adulta - HGD.”',
    customIndicators: [
      { id: 'ind_1', label: 'Taxa de Ocupação Sala Vermelha', value: '74%', target: 'Meta < 85%' },
      { id: 'ind_2', label: 'Tempo Médio Porta-Médico (TMA)', value: '38 min', target: 'Meta < 45 min' },
      { id: 'ind_3', label: 'Adesão ao Protocolo de Sepse / Dor Torácica', value: '96,4%', target: 'Meta > 95%' },
    ],
    recommendations: 'Manter rigor na pontualidade da passagem de plantão às 07h e 19h, registrar intercorrências em prontuário e checar o carro de parada no início do turno.'
  },
  courseCatalog: [
    { id: 'cat_acls', name: 'ACLS (Suporte Avançado de Vida em Cardiologia)', mandatory: true, validityMonths: 24 },
    { id: 'cat_atls', name: 'ATLS (Suporte Avançado de Vida no Trauma)', mandatory: true, validityMonths: 48 },
    { id: 'cat_pals', name: 'PALS (Suporte Avançado de Vida em Pediatria)', mandatory: false, validityMonths: 24 },
    { id: 'cat_pocus', name: 'POCUS / Ultrassonografia Point-of-Care na Emergência', mandatory: false, validityMonths: 36 },
  ],
  payrollCompetenceStatus: {
    '2026-10': { sentToFinance: false, sentAt: '' },
    '2026-09': { sentToFinance: true, sentAt: '2026-09-26' }
  } as Record<string, { sentToFinance: boolean; sentAt: string }>,
  functionRates: {
    'Médico Rotina/Sênior': {
      mensalFixo: 18000,
      extra12h: 1800,
      unrestrictedSwaps: false,
      requiresSchedule: true,
      rules: [
        { id: 'rot_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 18000 },
        { id: 'rot_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1800 },
        { id: 'rot_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 2100 },
      ]
    },
    'Plantonista': {
      mensalFixo: 14000,
      extra12h: 1350,
      unrestrictedSwaps: true,
      requiresSchedule: true,
      rules: [
        { id: 'plt_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 14000 },
        { id: 'plt_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1350 },
        { id: 'plt_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1600 },
      ]
    },
    'Plantão de Especialidade': {
      mensalFixo: 16500,
      extra12h: 1650,
      unrestrictedSwaps: false,
      requiresSchedule: true,
      rules: [
        { id: 'esp_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 16500 },
        { id: 'esp_extra_util', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1650 },
        { id: 'esp_extra_fds', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1950 },
      ]
    },
    'Chefia/Liderança': {
      mensalFixo: 22000,
      extra12h: 2200,
      unrestrictedSwaps: false,
      requiresSchedule: true,
      rules: [
        { id: 'chf_fixo', label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 22000 },
        { id: 'chf_extra_util', label: 'Extra Avulso 12h', billingMode: 'por_12h', value: 2200 },
      ]
    },
    'Coordenação / Supervisão (Sem Escala)': {
      mensalFixo: 12000,
      extra12h: 0,
      unrestrictedSwaps: false,
      requiresSchedule: false,
      rules: [
        { id: 'coord_fixo', label: 'Coordenação Médica Mensal (Sem Escala)', billingMode: 'fixo_mensal', value: 12000 },
        { id: 'sup_fixo', label: 'Supervisão Clínica Mensal (Sem Escala)', billingMode: 'fixo_mensal', value: 8500 },
      ]
    }
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
  // Adicionais com 'incidence': 'shift' (no Plantão) ou 'monthly' (no Mês de Competência)
  shiftAdditionals: [
    { id: 'fds', name: 'Adicional Fim de Semana', incidence: 'shift', calcMode: 'fixed', value12h: 250, percentValue: 0 },
    { id: 'chefia_plantao', name: 'Adicional Chefia de Plantão', incidence: 'shift', calcMode: 'fixed', value12h: 400, percentValue: 0 },
    { id: 'feriado', name: 'Adicional Feriado / Data Especial', incidence: 'shift', calcMode: 'percent', value12h: 500, percentValue: 30 },
    { id: 'noturno', name: 'Adicional Noturno Especial', incidence: 'shift', calcMode: 'fixed', value12h: 180, percentValue: 0 },
    { id: 'preceptoria_mes', name: 'Adicional Preceptoria (Mensal)', incidence: 'monthly', calcMode: 'fixed', value12h: 1500, percentValue: 0 },
    { id: 'bonus_meta_mes', name: 'Bonificação de Meta / Qualidade (Mensal)', incidence: 'monthly', calcMode: 'percent', value12h: 1000, percentValue: 10 },
  ],
  registeredSpecialties: [
    { name: 'Clínica Médica', extra12h: 0 },
    { name: 'Emergência Médica', extra12h: 200 },
    { name: 'Cardiologia', extra12h: 250 },
    { name: 'Terapia Intensiva (UTI)', extra12h: 300 },
    { name: 'Anestesiologia', extra12h: 400 },
    { name: 'Pediatria', extra12h: 150 },
    { name: 'Cirurgia Geral', extra12h: 250 },
  ]
};

export const DEFAULT_HOURLY_DEMAND: Record<number, { requiredDocs: number; expectedPatients: number; label: string }> = {
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

export const initialDoctors = [
  {
    id: 1,
    username: 'carlos',
    name: 'Dr. Carlos Eduardo Mendes',
    cpf: '111.222.333-44',
    birthDate: '1984-06-12',
    email: 'carlos@medscale.com.br',
    password: '123',
    phone: '(11) 99876-5432',
    crm: 'CRM-SP 145890',
    rqe: 'RQE 45120',
    joinDate: '2021-03-15',
    exitDate: '',
    razaoSocial: 'Mendes Serviços Médicos LTDA',
    cnpj: '12.345.678/0001-99',
    specialty: 'Clínica Médica',
    role: 'Médico Rotina/Sênior',
    remunerationLevel: 3,
    contractType: 'Fixo Mensal',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: ['Médico Rotina/Sênior', 'Plantonista', 'Chefia/Liderança'],
    defaultShiftAdditionals: ['chefia_plantao'],
    monthlyAdditionals: ['preceptoria_mes'],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    fixedMonthlyAdditionalMode: 'fixed',
    accumulatedRoles: [
      { id: 'ar_1', roleName: 'Médico Rotina/Sênior', categoryType: 'assistencial', level: 3, contractModality: 'Fixo Mensal' },
      { id: 'ar_2', roleName: 'Plantonista', categoryType: 'assistencial', level: 3, contractModality: 'Coringa / Extra' },
      { id: 'ar_3', roleName: 'Médico Supervisor (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    workloadHistory: [
      { id: 'wh_1', date: '2021-03-15', eventType: 'Início na Unidade', details: 'Admissão com 24h semanais (Quinta e Domingo Diurno).' },
      { id: 'wh_2', date: '2024-06-01', eventType: 'Aumento de Carga Horária', details: 'Passou a acumular Supervisão Médica + Rotina 36h/sem.' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'Carteira_CRM_Carlos.pdf', type: 'CRM', size: '420 KB', uploadedAt: '2021-03-10' },
      { name: 'Cartao_CNPJ_Mendes.pdf', type: 'CNPJ', size: '310 KB', uploadedAt: '2021-03-10' }
    ]
  },
  {
    id: 2,
    username: 'ana',
    name: 'Dra. Ana Clara Souza',
    cpf: '222.333.444-55',
    birthDate: '1992-09-23',
    email: 'ana@medscale.com.br',
    password: '123',
    phone: '(11) 98765-1234',
    crm: 'CRM-SP 210450',
    rqe: 'RQE 88310',
    joinDate: '2023-01-10',
    exitDate: '',
    razaoSocial: 'Ana Souza Medicina SS',
    cnpj: '98.765.432/0001-11',
    specialty: 'Emergência Médica',
    role: 'Plantonista',
    remunerationLevel: 2,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: ['Plantonista', 'Plantão de Especialidade', 'Médico Rotina/Sênior'],
    defaultShiftAdditionals: [],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    fixedMonthlyAdditionalMode: 'fixed',
    accumulatedRoles: [
      { id: 'ar_4', roleName: 'Plantonista', categoryType: 'assistencial', level: 2, contractModality: 'Coringa / Extra' },
      { id: 'ar_5', roleName: 'Plantão de Especialidade', categoryType: 'assistencial', level: 2, contractModality: 'Coringa / Extra' }
    ],
    workloadHistory: [
      { id: 'wh_3', date: '2023-01-10', eventType: 'Início na Unidade', details: 'Ingresso como plantonista de emergência (12h noturno).' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Ana_Souza.pdf', type: 'CRM', size: '512 KB', uploadedAt: '2023-01-05' }
    ]
  },
  {
    id: 3,
    username: 'roberto',
    name: 'Dr. Roberto Almeida Lima',
    cpf: '333.444.555-66',
    birthDate: '1979-11-03',
    email: 'roberto@medscale.com.br',
    password: '123',
    phone: '(11) 97654-9876',
    crm: 'CRM-SP 102340',
    rqe: 'RQE 22901',
    joinDate: '2019-11-05',
    exitDate: '',
    razaoSocial: 'RL Saúde & Cardiologia EIRELI',
    cnpj: '45.678.901/0001-22',
    specialty: 'Cardiologia',
    role: 'Chefia/Liderança',
    remunerationLevel: 4,
    contractType: 'Fixo Mensal',
    participatesInSchedule: true,
    hasManagerAccess: true,
    allowedFunctions: ['Chefia/Liderança', 'Médico Rotina/Sênior', 'Plantão de Especialidade', 'Plantonista'],
    defaultShiftAdditionals: ['chefia_plantao'],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    fixedMonthlyAdditionalMode: 'fixed',
    accumulatedRoles: [
      { id: 'ar_6', roleName: 'Chefia/Liderança', categoryType: 'assistencial', level: 4, contractModality: 'Fixo Mensal' },
      { id: 'ar_7', roleName: 'Coordenador Médico (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    workloadHistory: [
      { id: 'wh_4', date: '2019-11-05', eventType: 'Início na Unidade', details: 'Assumiu Chefia de Plantão de Domingo e Coordenação Adjunta.' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Roberto_Lima.pdf', type: 'CRM', size: '390 KB', uploadedAt: '2019-11-01' }
    ]
  },
  {
    id: 5,
    username: 'helena',
    name: 'Dra. Helena Vasconcelos',
    cpf: '555.666.777-88',
    birthDate: '1978-04-15',
    email: 'helena@medscale.com.br',
    password: '123',
    phone: '(11) 99111-2233',
    crm: 'CRM-SP 98450',
    rqe: 'RQE 19400',
    joinDate: '2018-02-01',
    exitDate: '',
    razaoSocial: 'Vasconcelos Gestão & Auditoria Médica LTDA',
    cnpj: '77.888.999/0001-55',
    specialty: 'Clínica Médica',
    role: 'Coordenação / Supervisão (Sem Escala)',
    remunerationLevel: 4,
    contractType: 'Fixo Mensal',
    participatesInSchedule: false,
    hasManagerAccess: true,
    allowedFunctions: [],
    defaultShiftAdditionals: [],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    fixedMonthlyAdditionalMode: 'fixed',
    accumulatedRoles: [
      { id: 'ar_8', roleName: 'Coordenador Médico (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' },
      { id: 'ar_9', roleName: 'Médico Supervisor (Adm)', categoryType: 'administrativa', level: null, contractModality: 'Cargo Administrativo Fixo' }
    ],
    workloadHistory: [
      { id: 'wh_5', date: '2018-02-01', eventType: 'Início na Unidade', details: 'Coordenação Geral Exclusiva (Sem participação na grade de plantão).' }
    ],
    status: 'Ativo',
    documents: [
      { name: 'CRM_Helena_Vasconcelos.pdf', type: 'CRM', size: '410 KB', uploadedAt: '2018-02-01' }
    ]
  },
  {
    id: 4,
    username: 'juliana',
    name: 'Dra. Juliana Martins Rocha',
    cpf: '444.555.666-77',
    birthDate: '1994-02-18',
    email: 'juliana@medscale.com.br',
    password: '123',
    phone: '(21) 99123-4567',
    crm: 'CRM-RJ 558920',
    rqe: 'RQE 99104',
    joinDate: '2026-10-16',
    exitDate: '',
    razaoSocial: 'JMR Serviços Médicos LTDA',
    cnpj: '33.221.445/0001-88',
    specialty: 'Anestesiologia',
    role: 'Plantão de Especialidade',
    remunerationLevel: 2,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: ['Plantão de Especialidade', 'Plantonista'],
    defaultShiftAdditionals: [],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    fixedMonthlyAdditionalMode: 'fixed',
    accumulatedRoles: [
      { id: 'ar_10', roleName: 'Plantão de Especialidade', categoryType: 'assistencial', level: 2, contractModality: 'Coringa / Extra' }
    ],
    workloadHistory: [],
    status: 'Pendente',
    documents: [
      { name: 'Cedula_Identidade_Medica_CRM.pdf', type: 'CRM / RQE', size: '780 KB', uploadedAt: '2026-10-16' },
      { name: 'Contrato_Social_JMR_Medicina.pdf', type: 'Contrato Social / CNPJ', size: '1.2 MB', uploadedAt: '2026-10-16' }
    ]
  }
];

export const initialShifts = [
  { id: 101, date: '2026-09-28', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Médica', category: 'Médico Rotina/Sênior', billingType: 'Fixo', ruleId: 'rot_fixo', customRate12h: '', additionals: ['chefia_plantao'] },
  { id: 102, date: '2026-10-04', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Plantão Coringa Fim de Semana', category: 'Médico Rotina/Sênior', billingType: 'Coringa/Extra', ruleId: 'rot_extra_fds', customRate12h: '', additionals: ['fds', 'chefia_plantao'] },
  { id: 103, date: '2026-10-10', startTime: '19:00', endTime: '07:00', doctorId: 2, type: 'Plantão Noturno Emergência', category: 'Plantonista', billingType: 'Coringa/Extra', ruleId: 'plt_extra_fds', customRate12h: '', additionals: ['fds', 'noturno'] },
  { id: 104, date: '2026-10-18', startTime: '07:00', endTime: '19:00', doctorId: 3, type: 'Coordenação Sala Vermelha Domingo', category: 'Chefia/Liderança', billingType: 'Fixo', ruleId: 'chf_fixo', customRate12h: '', additionals: ['fds', 'chefia_plantao'] },
  { id: 108, date: '2026-10-18', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Diurno', category: 'Médico Rotina/Sênior', billingType: 'Fixo', ruleId: 'rot_fixo', customRate12h: '', additionals: ['fds'] },
  { id: 109, date: '2026-10-18', startTime: '07:00', endTime: '13:00', doctorId: 2, type: 'Reforço Emergência Manhã (6h)', category: 'Plantão de Especialidade', billingType: 'Coringa/Extra', ruleId: 'esp_extra_fds', customRate12h: '', additionals: ['fds'] },
  { id: 110, date: '2026-10-18', startTime: '19:00', endTime: '07:00', doctorId: 2, type: 'Plantão Noturno Pronto Atendimento', category: 'Plantonista', billingType: 'Coringa/Extra', ruleId: 'plt_extra_util', customRate12h: '', additionals: ['noturno'] },
  { id: 105, date: '2026-10-22', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Quinta', category: 'Médico Rotina/Sênior', billingType: 'Fixo', ruleId: 'rot_fixo', customRate12h: '', additionals: [] },
  { id: 106, date: '2026-11-12', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Rotina Clínica Médica', category: 'Médico Rotina/Sênior', billingType: 'Fixo', ruleId: 'rot_fixo', customRate12h: '', additionals: [] },
  { id: 107, date: '2026-11-15', startTime: '07:00', endTime: '19:00', doctorId: 1, type: 'Plantão Domingo Clínica', category: 'Plantonista', billingType: 'Fixo', ruleId: 'plt_fixo', customRate12h: '', additionals: ['fds'] }
];

export const initialOpenShifts = [
  {
    id: 701,
    date: '2026-10-24',
    startTime: '19:00',
    endTime: '07:00',
    category: 'Plantonista',
    type: 'Cobertura Extra Noturna Sábado (Sala Vermelha)',
    customRate12h: 1750,
    additionals: ['fds', 'noturno'],
    candidateDoctorIds: [2],
    status: 'Aberta'
  }
];

export const initialDoctorAvailability = [
  { id: 801, doctorId: 2, date: '2026-10-24', period: 'Noturno (19h-07h)', notes: 'Disponível para cobrir Sala Vermelha ou Box.' },
  { id: 802, doctorId: 1, date: '2026-10-25', period: 'Diurno (07h-19h)', notes: 'Disponível para plantão extra de rotina.' }
];

export const initialOccurrences = [
  { id: 901, targetType: 'Plantonista', doctorId: 1, shiftDate: '2026-09-29', date: '2026-09-29', type: 'Intercorrência Administrativa', severity: 'Atenção', title: 'Passagem de plantão em cima da hora', description: 'Solicitou passagem de plantão de rotina com menos de 48h de antecedência por compromisso externo.' },
  { id: 902, targetType: 'Plantonista', doctorId: 2, shiftDate: '2026-10-05', date: '2026-10-05', type: 'Elogio / Mérito Assistencial', severity: 'Positivo', title: 'Cobertura emergencial e elogio da família', description: 'Assumiu plantão coringa de última hora e recebeu elogio formal na Ouvidoria do hospital.' },
  { id: 903, targetType: 'Plantão', doctorId: null, shiftDate: '2026-10-12', date: '2026-10-12', type: 'Ocorrência Geral do Plantão', severity: 'Atenção', title: 'Superlotação e contingência de tomografia', description: 'Tomógrafo principal em manutenção preventiva das 14h às 16h; fluxo de AVC redirecionado com sucesso.' },
  { id: 904, targetType: 'Plantonista', doctorId: 2, shiftDate: '2026-10-14', date: '2026-10-14', type: 'Atraso / Pontualidade', severity: 'Atenção', title: 'Atraso de 25 minutos na rendição noturna', description: 'Justificou trânsito intenso devido a chuva forte; comunicou a chefia de plantão previamente.' }
];

export const initialAnnouncements = [
  {
    id: 601,
    title: 'Atualização do Protocolo de Sepse e Hora de Ouro na Emergência Adulta',
    category: 'Protocolo Clínico',
    date: '2026-10-15',
    priority: 'Alta',
    content: 'Reforçamos que a coleta de lactato e hemoculturas + início de antibioticoterapia empírica devem ocorrer impreterivelmente nos primeiros 60 minutos da triagem.',
    acknowledgedBy: [1, 3]
  },
  {
    id: 602,
    title: 'Fechamento da Competência Financeira PJ (Corte Todo Dia 25)',
    category: 'Comunicado Administrativo',
    date: '2026-10-18',
    priority: 'Normal',
    content: 'Lembramos a todos os plantonistas que a janela de apuração vai do dia 26 do mês anterior ao dia 25 do mês atual. Confiram seus plantões na aba Financeiro.',
    acknowledgedBy: [1]
  }
];

export const initialSwaps = [
  { id: 501, shiftId: 101, shiftDate: '2026-09-28', shiftCategory: 'Médico Rotina/Sênior', shiftBillingType: 'Fixo', requestingDoctorId: 1, proposedDoctorId: 2, movementType: 'Passagem', isPartial: false, swapStartTime: '07:00', swapEndTime: '19:00', reason: 'Passagem de plantão sem permuta (Dr. Carlos repassou para Dra. Ana)', status: 'Aprovado', applyPayrollDiscount: true, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-09-26' },
  { id: 502, shiftId: 104, shiftDate: '2026-10-18', shiftCategory: 'Chefia/Liderança', shiftBillingType: 'Fixo', requestingDoctorId: 3, proposedDoctorId: 1, movementType: 'Passagem', isPartial: true, swapStartTime: '13:00', swapEndTime: '19:00', reason: 'Passagem parcial de 6h à tarde', status: 'Aprovado', applyPayrollDiscount: true, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-10-15' },
  { id: 503, shiftId: 103, shiftDate: '2026-10-10', shiftCategory: 'Plantonista', shiftBillingType: 'Coringa/Extra', requestingDoctorId: 2, proposedDoctorId: 1, movementType: 'Troca (Permuta)', isPartial: false, swapStartTime: '19:00', swapEndTime: '07:00', reason: 'Permuta direta de dia entre colegas (sem ajuste financeiro)', status: 'Aprovado', applyPayrollDiscount: false, discountMode: 'integral', paymentResponsibility: 'hospital', dateRequested: '2026-10-08' },
  { id: 504, shiftId: 105, shiftDate: '2026-10-22', shiftCategory: 'Médico Rotina/Sênior', shiftBillingType: 'Fixo', requestingDoctorId: 1, proposedDoctorId: 3, movementType: 'Passagem', isPartial: true, swapStartTime: '13:00', swapEndTime: '19:00', reason: 'Reunião clínica externa no período vespertino', status: 'Pendente', applyPayrollDiscount: false, discountMode: 'diferenca', paymentResponsibility: 'hospital', dateRequested: '2026-10-17' }
];

export const initialVacations = [
  {
    id: 1, doctorId: 1, requestType: 'Férias', leaveSubtype: 'Férias Regulamentares', startDate: '2026-10-19', endDate: '2026-10-28',
    justification: 'Período de descanso programado no mês atual.', status: 'Aprovado',
    freeTextSubstitutions: 'Dia 22/10 (07h-19h): Dr. Roberto Almeida Lima assumirá a Rotina Clínica.',
    substitutionsStatus: 'Pendente Gestor',
    substitutions: [
      { shiftId: 105, date: '2026-10-22', startTime: '07:00', endTime: '19:00', category: 'Médico Rotina/Sênior', substituteDoctorId: 3 }
    ]
  },
  {
    id: 2, doctorId: 2, requestType: 'Férias', leaveSubtype: 'Férias Regulamentares', startDate: '2026-11-10', endDate: '2026-11-20',
    justification: 'Férias programadas para o próximo mês.', status: 'Aprovado',
    freeTextSubstitutions: 'Dia 12/11 (07h-19h): Dr. Roberto Almeida Lima.\nDia 15/11 (07h-19h): Dr. Carlos Eduardo Mendes.',
    substitutionsStatus: 'Pendente Gestor',
    substitutions: []
  }
];

export const initialCourses = [
  { id: 1, doctorId: 1, courseName: 'ACLS (Suporte Avançado de Vida em Cardiologia)', issueDate: '2025-05-20', expirationDate: '2027-05-20', mandatory: true, fileName: 'Certificado_ACLS_Carlos.pdf', status: 'Válido' },
  { id: 2, doctorId: 2, courseName: 'PALS (Suporte Avançado de Vida em Pediatria)', issueDate: '2024-09-10', expirationDate: '2026-09-10', mandatory: false, fileName: 'PALS_Ana.pdf', status: 'Vencido' },
  { id: 3, doctorId: 3, courseName: 'ATLS (Suporte Avançado de Vida no Trauma)', issueDate: '2024-01-15', expirationDate: '2028-01-15', mandatory: true, fileName: 'ATLS_Roberto.pdf', status: 'Válido' }
];

export function calculateDurationHours(start: string, end: string) {
  if (!start || !end) return 12;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.max(1, (endMin - startMin) / 60);
}

export function getWeekdayName(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[dateObj.getDay()] || '';
}

export function getNextDateStr(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function getWeekRangeMondayToSunday(baseDateStr: string) {
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
}

export function getCompetenceWindow(refMonthStr: string) {
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

export function isShiftCoveringHourInCycle(shift: any, hourInt: number) {
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

export function calculateExpirationFromIssueDate(issueDateStr: string, validityMonths = 24) {
  if (!issueDateStr) return '';
  const [y, m, d] = issueDateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1 + Number(validityMonths || 24), d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function checkScheduleConflictOrOverload(
  shifts: any[],
  doctorId: number,
  date: string,
  startTime: string,
  endTime: string,
  ignoreShiftId?: number | null
) {
  const sameDayShifts = shifts.filter(
    s => Number(s.doctorId) === Number(doctorId) && s.date === date && s.id !== ignoreShiftId
  );
  const newDuration = calculateDurationHours(startTime, endTime);
  let totalDayHours = newDuration;

  for (const sh of sameDayShifts) {
    totalDayHours += calculateDurationHours(sh.startTime, sh.endTime);
    if (sh.startTime === startTime || sh.endTime === endTime) {
      return `Conflito de Horário: Este médico já está escalado em "${sh.type}" (${sh.startTime} às ${sh.endTime}) nesta mesma data.`;
    }
  }
  if (totalDayHours > 24) {
    return `Alerta de Sobrecarga (>24h): Com este turno, o médico acumulará ${totalDayHours}h de plantão na mesma data (${date}).`;
  }
  return null;
}

export function exportDailyHeatmapPDF(config: any, heatmapDate: string, shifts: any[], hourlyDemand: any, getDoctorById: (id: any) => any) {
  const nextDateStr = getNextDateStr(heatmapDate);
  const dayShifts = shifts
    .filter(s => s.date === heatmapDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const printWindow = window.open('', '_blank', 'width=1280,height=850');
  if (!printWindow) {
    alert('Permita pop-ups no navegador para exportar o Heatmap 24h em PDF.');
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
      <title>Mapa_Calor_Diario_${heatmapDate}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <div>
          <h1 style="margin: 0; font-size: 17px;">${config.appName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'}</h1>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #334155;">
            <strong>Mapa de Calor 24h (Diário):</strong> Das 07:00 de <strong>${heatmapDate} (${getWeekdayName(heatmapDate)})</strong> até as 06:00 de <strong>${nextDateStr}</strong>
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
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
    </body>
    </html>
  `;
  printWindow.document.open();
  printWindow.document.write(htmlDoc);
  printWindow.document.close();
}

export function exportWeeklyHeatmapPDF(config: any, baseDateStr: string, shifts: any[], hourlyDemand: any) {
  const { weekStart, weekEnd, daysList } = getWeekRangeMondayToSunday(baseDateStr);
  const printWindow = window.open('', '_blank', 'width=1280,height=850');
  if (!printWindow) {
    alert('Permita pop-ups no navegador para exportar o Mapa de Calor Semanal em PDF.');
    return;
  }

  const hoursHeader = SHIFT_HOURS_CYCLE.map(h => `
    <th style="border: 1px solid #cbd5e1; padding: 4px 2px; font-size: 9px; background: #1e293b; color: #fff; text-align: center;">
      ${String(h).padStart(2, '0')}h
    </th>
  `).join('');

  const rowsHtml = daysList.map(dayObj => {
    const dayShifts = shifts.filter(s => s.date === dayObj.dateStr);
    const cells = SHIFT_HOURS_CYCLE.map(h => {
      const dem = hourlyDemand[h]?.requiredDocs ?? 2;
      const cov = dayShifts.filter(s => isShiftCoveringHourInCycle(s, h)).length;
      const bg = cov < dem ? '#fee2e2' : cov === dem ? '#dcfce7' : '#dbeafe';
      const color = cov < dem ? '#991b1b' : cov === dem ? '#166534' : '#1e40af';
      return `
        <td style="border: 1px solid #cbd5e1; padding: 7px 2px; text-align: center; font-weight: 800; font-size: 10px; background: ${bg}; color: ${color};">
          ${cov}/${dem}
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: 800; background: #f8fafc; white-space: nowrap;">
          ${dayObj.dayName.split('-')[0]} (${dayObj.label})
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: center; font-weight: 700;">
          ${dayShifts.length} plantões
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
      <title>Mapa_Calor_Semanal_${weekStart}_a_${weekEnd}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <div>
          <h1 style="margin: 0; font-size: 17px;">${config.appName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'} — Mapa de Calor Semanal</h1>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #334155;">
            Período: <strong>Segunda-feira (${daysList[0]?.label}) a Domingo (${daysList[6]?.label})</strong> • Comparativo Real vs. Meta Hora a Hora (07h às 06h)
          </p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; background: #1e293b; color: #fff; text-align: left;">Dia da Semana</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; background: #1e293b; color: #fff; text-align: center;">Total Turnos</th>
            ${hoursHeader}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
    </body>
    </html>
  `;
  printWindow.document.open();
  printWindow.document.write(htmlDoc);
  printWindow.document.close();
}

export function exportWeeklySchedulePDF(config: any, baseDateStr: string, categoryFilter: string, shifts: any[], getDoctorById: (id: any) => any) {
  const { weekStart, weekEnd, daysList } = getWeekRangeMondayToSunday(baseDateStr);
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    alert('Permita pop-ups no navegador para gerar o PDF da escala semanal.');
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
          <h1 style="margin: 0; font-size: 18px; color: #0f172a;">${config.appName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'} — Escala Semanal Detalhada</h1>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #475569;">
            Período: <strong>Segunda-feira (${daysList[0]?.label}/${weekStart.slice(0, 4)}) a Domingo (${daysList[6]?.label}/${weekEnd.slice(0, 4)})</strong>
            • Categoria: <strong>${categoryFilter}</strong>
          </p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
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
}

export function exportDoctorIndividualSchedulePDF(config: any, doctor: any, shifts: any[]) {
  const myShifts = shifts
    .filter(s => Number(s.doctorId) === Number(doctor?.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    alert('Permita pop-ups para baixar seus plantões em PDF.');
    return;
  }

  const rows = myShifts.map(sh => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:8px;"><strong>${sh.date}</strong> (${getWeekdayName(sh.date)})</td>
      <td style="border:1px solid #cbd5e1;padding:8px;">${sh.startTime} às ${sh.endTime} (${calculateDurationHours(sh.startTime, sh.endTime)}h)</td>
      <td style="border:1px solid #cbd5e1;padding:8px;">${sh.category}</td>
      <td style="border:1px solid #cbd5e1;padding:8px;">${sh.type}</td>
      <td style="border:1px solid #cbd5e1;padding:8px;">${sh.billingType || 'Extra'}</td>
    </tr>
  `).join('');

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"/><title>Meus_Plantoes_${doctor?.name}</title></head>
    <body style="font-family:Arial,sans-serif;padding:20px;color:#0f172a;">
      <h2 style="margin:0;">${config.appName} • ${config.sectorUnitName || 'Emergência Adulta - HGD'}</h2>
      <p style="margin:4px 0 16px 0;font-size:13px;">Extrato de Agenda Individual: <strong>${doctor?.name}</strong> (${doctor?.crm})</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1e293b;color:#fff;text-align:left;">
            <th style="padding:8px;">Data</th>
            <th style="padding:8px;">Horário / Duração</th>
            <th style="padding:8px;">Categoria</th>
            <th style="padding:8px;">Turno / Setor</th>
            <th style="padding:8px;">Modalidade</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:14px;text-align:center;">Sem plantões alocados</td></tr>'}</tbody>
      </table>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportClinicalStaffCSV(config: any, doctors: any[], occurrences: any[]) {
  const headers = [
    'Unidade', 'Nome do Medico', 'Username', 'Status', 'Perfil Gestor Liberado', 'CRM', 'RQE', 'CPF',
    'Especialidade', 'Participa da Escala Assistencial', 'Funcoes Acumuladas',
    'Nivel Senioridade', 'Modalidade Contrato', 'Razao Social (PJ)', 'CNPJ', 'Email', 'Telefone',
    'Data de Inicio na Unidade', 'Data de Saida', 'Historico de Carga Horaria', 'Resumo de Ocorrencias'
  ];

  const lines = [
    headers.join(';'),
    ...doctors.map(d => {
      const rolesStr = (d.accumulatedRoles || [])
        .map((r: any) => `${r.roleName} [${r.categoryType === 'administrativa' ? 'Coord/Adm' : 'Assistencial'}]`)
        .join(' | ');
      const whStr = (d.workloadHistory || [])
        .map((w: any) => `${w.date} (${w.eventType}: ${w.details})`)
        .join(' | ');
      const docOccs = occurrences
        .filter(o => Number(o.doctorId) === Number(d.id))
        .map(o => `${o.date} [${o.type}]: ${o.title}`)
        .join(' | ');

      return [
        `"${config.sectorUnitName || 'Emergência Adulta - HGD'}"`,
        `"${d.name || ''}"`,
        `"${d.username || ''}"`,
        `"${d.status || ''}"`,
        `"${d.hasManagerAccess ? 'Sim' : 'Nao'}"`,
        `"${d.crm || ''}"`,
        `"${d.rqe || ''}"`,
        `"${d.cpf || ''}"`,
        `"${d.specialty || ''}"`,
        `"${d.participatesInSchedule === false ? 'Nao' : 'Sim'}"`,
        `"${rolesStr || d.role}"`,
        d.remunerationLevel || 1,
        `"${d.contractType || ''}"`,
        `"${d.razaoSocial || ''}"`,
        `"${d.cnpj || ''}"`,
        `"${d.email || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.joinDate || ''}"`,
        `"${d.exitDate || 'Em atividade'}"`,
        `"${whStr || 'Sem alteracoes'}"`,
        `"${docOccs || 'Nenhuma ocorrencia'}"`
      ].join(';');
    })
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Corpo_Clinico_HGD_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export function exportDetailedPayrollCSV(config: any, competenceWindow: { startStr: string; endStr: string }, payrollReport: any[]) {
  const headers = [
    'Unidade', 'Competencia (26 a 25)', 'Nome do Medico', 'CRM', 'Razao Social', 'CNPJ', 'Email',
    'Total Horas', 'Valor Fixo/Coord Sem Escala (R$)', 'Valor Plantoes Extras (R$)', 'Adicionais nos Plantoes (R$)',
    'Adicionais no Mes (R$)', 'Ajustes Manuais (R$)', 'Descontos Passagens (R$)', 'Liquido Final (R$)'
  ];
  const compLabel = `${competenceWindow.startStr} a ${competenceWindow.endStr}`;
  const csvLines = [
    headers.join(';'),
    ...payrollReport.map(r => [
      `"${config.sectorUnitName || 'Emergência Adulta - HGD'}"`,
      `"${compLabel}"`,
      `"${r.name || ''}"`,
      `"${r.crm || ''}"`,
      `"${r.razaoSocial || ''}"`,
      `"${r.cnpj || ''}"`,
      `"${r.email || ''}"`,
      r.totalHoursWorked,
      Number(r.baseFixedMonthly || 0).toFixed(2),
      Number(r.extraShiftsAmount || 0).toFixed(2),
      Number(r.totalShiftAdditionalsOnly ?? r.totalAdditionalsAmount ?? 0).toFixed(2),
      Number(r.totalMonthlyAdditionalsOnly ?? 0).toFixed(2),
      Number(r.manualAdjustmentsTotal || 0).toFixed(2),
      Number(r.totalDiscounts || 0).toFixed(2),
      Number(r.netTotal || 0).toFixed(2)
    ].join(';'))
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Folha_PJ_${competenceWindow.startStr}_a_${competenceWindow.endStr}.csv`;
  a.click();
}

export function exportWorkloadAuditCSV(config: any, competenceWindow: { startStr: string; endStr: string }, payrollReport: any[]) {
  const headers = [
    'Unidade / Setor', 'Competencia (26 a 25)', 'Nome do Medico', 'CRM', 'Razao Social', 'CNPJ', 'Email',
    'Total Horas', 'Media Semanal (h/sem)', 'Horas Fixas', 'Qtd Fixos', 'Horas Extras', 'Qtd Extras',
    'Valor Fixo / Sem Escala (R$)', 'Valor Extras (R$)', 'Adicionais Plantao (R$)', 'Adicionais Mes (R$)', 'Liquido (R$)', 'Observacao'
  ];
  const compLabel = `${competenceWindow.startStr} a ${competenceWindow.endStr}`;
  const csvLines = [
    headers.join(';'),
    ...payrollReport.map(r => {
      const shiftAddVal = Number(r.totalShiftAdditionalsOnly ?? r.totalAdditionalsAmount ?? 0);
      const monthAddVal = Number(r.totalMonthlyAdditionalsOnly ?? 0);
      const fixedStr = r.dailyBreakdown.filter((d: any) => !d.isExtraShift).map((d: any) => `${d.date}: ${d.hours}h Fixo`).join(' | ');
      const extraStr = r.dailyBreakdown.filter((d: any) => d.isExtraShift).map((d: any) => `${d.date}: ${d.hours}h Extra (R$ ${d.shiftBaseVal.toFixed(2)})`).join(' | ');
      const obs = `FIXO: ${fixedStr} /// EXTRAS: ${extraStr} /// ADICIONAIS PLANTAO: R$ ${shiftAddVal.toFixed(2)} /// ADICIONAIS MES: R$ ${monthAddVal.toFixed(2)}`;
      return [
        `"${config.sectorUnitName || 'Emergência Adulta - HGD'}"`,
        `"${compLabel}"`,
        `"${r.name || ''}"`,
        `"${r.crm || ''}"`,
        `"${r.razaoSocial || ''}"`,
        `"${r.cnpj || ''}"`,
        `"${r.email || ''}"`,
        r.totalHoursWorked,
        `"${r.weeklyAvgTotalHours}h/sem"`,
        r.fixedHoursWorked,
        r.fixedShiftsCount,
        r.extraHoursWorked,
        r.extraShiftsCount,
        Number(r.baseFixedMonthly || 0).toFixed(2).replace('.', ','),
        Number(r.extraShiftsAmount || 0).toFixed(2).replace('.', ','),
        shiftAddVal.toFixed(2).replace('.', ','),
        monthAddVal.toFixed(2).replace('.', ','),
        Number(r.netTotal || 0).toFixed(2).replace('.', ','),
        `"${obs}"`
      ].join(';');
    })
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Auditoria_Carga_Horaria_${competenceWindow.startStr}_a_${competenceWindow.endStr}.csv`;
  a.click();
}