'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Calendar as CalendarIcon, Repeat, DollarSign,
  Umbrella, BookOpen, LogOut, Sliders, Activity, BarChart2,
  Flame, Menu, X, AlertTriangle, Bell
} from 'lucide-react';
import { createClient } from '@/supabase/client';
import { syncStateToSupabase } from '@/utils/migrateLegacyLocalStorage';

import {
  DEFAULT_CONFIG,
  ALL_FUNCTIONS,
  DEFAULT_HOURLY_DEMAND,
  initialDoctors,
  initialShifts,
  initialOpenShifts,
  initialDoctorAvailability,
  initialOccurrences,
  initialAnnouncements,
  initialSwaps,
  initialVacations,
  initialCourses,
  calculateDurationHours,
  getWeekdayName,
  getCompetenceWindow,
  exportWorkloadAuditCSV
} from './medscaleData';

import AuthScreen from './AuthScreen';
import ScheduleAndMapViews from './ScheduleAndMapViews';
import StaffAndFinanceViews from './StaffAndFinanceViews';
import GovernanceAndModals from './GovernanceAndModals';

export default function MedScaleApp() {
  const supabase = useMemo(() => createClient(), []);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // --- ESTADOS GLOBAIS PERSISTIDOS ---
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [doctors, setDoctors] = useState<any[]>(initialDoctors);
  const [shifts, setShifts] = useState<any[]>(initialShifts);
  const [openShifts, setOpenShifts] = useState<any[]>(initialOpenShifts);
  const [doctorAvailability, setDoctorAvailability] = useState<any[]>(initialDoctorAvailability);
  const [swaps, setSwaps] = useState<any[]>(initialSwaps);
  const [vacations, setVacations] = useState<any[]>(initialVacations);
  const [courses, setCourses] = useState<any[]>(initialCourses);
  const [payrollStatus, setPayrollStatus] = useState<Record<number, string>>({
    1: 'Fechada',
    2: 'Pendente',
    3: 'Pago',
    5: 'Pago'
  });
  const [hourlyDemand, setHourlyDemand] = useState<any>(DEFAULT_HOURLY_DEMAND);
  const [occurrences, setOccurrences] = useState<any[]>(initialOccurrences);
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [doctorConferenceData, setDoctorConferenceData] = useState<
    Record<string, { checked: boolean; checkedAt?: string; errorNote?: string }>
  >({});
  const [auditLogs, setAuditLogs] = useState<
    { id: number; timestamp: string; user: string; description: string; previousState?: any }[]
  >([]);

  // Carregamento inicial do LocalStorage
  useEffect(() => {
    try {
      const load = (k: string, fb: any) => {
        const s = localStorage.getItem(`medscale_v10_${k}`);
        return s ? JSON.parse(s) : fb;
      };
      setConfig((prev: any) => ({
        ...DEFAULT_CONFIG,
        ...prev,
        ...load('config', DEFAULT_CONFIG),
        sectorUnitName: 'Emergência Adulta - HGD'
      }));
      setDoctors(load('doctors', initialDoctors));
      setShifts(load('shifts', initialShifts));
      setOpenShifts(load('openShifts', initialOpenShifts));
      setDoctorAvailability(load('doctorAvailability', initialDoctorAvailability));
      setSwaps(load('swaps', initialSwaps));
      setVacations(load('vacations', initialVacations));
      setCourses(load('courses', initialCourses));
      setPayrollStatus(load('payrollStatus', { 1: 'Fechada', 2: 'Pendente', 3: 'Pago', 5: 'Pago' }));
      setHourlyDemand(load('hourlyDemand', DEFAULT_HOURLY_DEMAND));
      setOccurrences(load('occurrences', initialOccurrences));
      setAnnouncements(load('announcements', initialAnnouncements));
      setDoctorConferenceData(load('doctorConferenceData', {}));
    } catch {
      // Ignora falha de leitura local
    }
  }, []);

  // Salvamento automático no LocalStorage
  useEffect(() => { localStorage.setItem('medscale_v10_config', JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem('medscale_v10_doctors', JSON.stringify(doctors)); }, [doctors]);
  useEffect(() => { localStorage.setItem('medscale_v10_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('medscale_v10_openShifts', JSON.stringify(openShifts)); }, [openShifts]);
  useEffect(() => { localStorage.setItem('medscale_v10_doctorAvailability', JSON.stringify(doctorAvailability)); }, [doctorAvailability]);
  useEffect(() => { localStorage.setItem('medscale_v10_swaps', JSON.stringify(swaps)); }, [swaps]);
  useEffect(() => { localStorage.setItem('medscale_v10_vacations', JSON.stringify(vacations)); }, [vacations]);
  useEffect(() => { localStorage.setItem('medscale_v10_courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('medscale_v10_payrollStatus', JSON.stringify(payrollStatus)); }, [payrollStatus]);
  useEffect(() => { localStorage.setItem('medscale_v10_hourlyDemand', JSON.stringify(hourlyDemand)); }, [hourlyDemand]);
  useEffect(() => { localStorage.setItem('medscale_v10_occurrences', JSON.stringify(occurrences)); }, [occurrences]);
  useEffect(() => { localStorage.setItem('medscale_v10_announcements', JSON.stringify(announcements)); }, [announcements]);
  useEffect(() => { localStorage.setItem('medscale_v10_doctorConferenceData', JSON.stringify(doctorConferenceData)); }, [doctorConferenceData]);

  // --- SESSÃO E NAVEGAÇÃO ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- ESTADOS FINANCEIROS ---
  const [competenceMonth, setCompetenceMonth] = useState('2026-10');
  const [payrollClosed, setPayrollClosed] = useState(false);
  const [manualPayrollAdjustments, setManualPayrollAdjustments] = useState<
    Record<number, { description: string; amount: number }[]>
  >({});
  const [shiftCustomOverrides, setShiftCustomOverrides] = useState<
    Record<number, { customRate12h?: number; customFixedTotal?: number }>
  >({});

  // --- ESTADOS DOS MODAIS ---
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [newShift, setNewShift] = useState<any>({
    date: '2026-10-18',
    startTime: '07:00',
    endTime: '19:00',
    category: 'Médico Rotina/Sênior',
    doctorId: '',
    type: 'Plantão Diurno 12h',
    billingType: 'Coringa/Extra',
    ruleId: '',
    customRate12h: '',
    additionals: []
  });

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<any>(null);
  const [swapForm, setSwapForm] = useState<any>({
    proposedDoctorId: '',
    movementType: 'Passagem',
    isPartial: false,
    swapStartTime: '07:00',
    swapEndTime: '13:00',
    reason: ''
  });
  const [showHandoffWarningPopup, setShowHandoffWarningPopup] = useState(false);
  const [handoffWarningAcknowledged, setHandoffWarningAcknowledged] = useState(false);

  const [showDoctorEditModal, setShowDoctorEditModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState<any>({
    id: null,
    username: '',
    name: '',
    cpf: '',
    birthDate: '1990-01-01',
    email: '',
    password: '123',
    phone: '',
    crm: '',
    rqe: '',
    specialty: 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    joinDate: '2026-01-01',
    exitDate: '',
    role: 'Plantonista',
    remunerationLevel: 1,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    allowedFunctions: ['Plantonista'],
    defaultShiftAdditionals: [],
    fixedMonthlyAdditional: 0,
    fixedMonthlyAdditionalLabel: '',
    accumulatedRoles: [],
    workloadHistory: [],
    status: 'Ativo'
  });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState<any>({
    id: null,
    doctorId: 1,
    courseName: 'ACLS (Suporte Avançado de Vida em Cardiologia)',
    issueDate: '2026-05-20',
    expirationDate: '2028-05-20',
    fileName: 'Certificado.pdf'
  });

  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationForm, setVacationForm] = useState<any>({
    doctorId: 1,
    requestType: 'Férias',
    leaveSubtype: 'Férias Regulamentares',
    startDate: '2026-11-10',
    endDate: '2026-11-20',
    justification: ''
  });

  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [newOccurrence, setNewOccurrence] = useState<any>({
    targetType: 'Plantonista',
    doctorId: 1,
    date: '2026-10-18',
    type: 'Intercorrência Administrativa',
    severity: 'Atenção',
    title: '',
    description: ''
  });

  // --- AUDITORIA EM TEMPO REAL COM BOTÃO DESFAZER (UNDO) ---
  const recordAction = (description: string) => {
    const snapshot = {
      doctors: JSON.parse(JSON.stringify(doctors)),
      shifts: JSON.parse(JSON.stringify(shifts)),
      swaps: JSON.parse(JSON.stringify(swaps)),
      vacations: JSON.parse(JSON.stringify(vacations)),
      courses: JSON.parse(JSON.stringify(courses)),
      occurrences: JSON.parse(JSON.stringify(occurrences)),
      config: JSON.parse(JSON.stringify(config))
    };
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [
      {
        id: Date.now(),
        timestamp: nowStr,
        user: currentUser?.name || 'Sistema',
        description,
        previousState: snapshot
      },
      ...prev.slice(0, 29)
    ]);
  };

  const handleUndoAuditLog = (logId: number) => {
    const targetLog = auditLogs.find(l => l.id === logId);
    if (!targetLog || !targetLog.previousState) return;
    const st = targetLog.previousState;
    setDoctors(st.doctors);
    setShifts(st.shifts);
    setSwaps(st.swaps);
    setVacations(st.vacations);
    setCourses(st.courses);
    setOccurrences(st.occurrences);
    setConfig(st.config);
    setAuditLogs(prev => prev.filter(l => l.id !== logId));
  };

  const handleSyncWithSupabase = async () => {
    setSyncingSupabase(true);
    setSyncNotification(null);
    try {
      const res = await syncStateToSupabase(supabase, {
        config,
        doctors,
        shifts,
        swaps,
        vacations,
        courses,
        hourlyDemand
      });
      setSyncNotification(res.message);
    } catch (err: any) {
      setSyncNotification(`Aviso ao sincronizar: ${err?.message || 'Dados salvos localmente.'}`);
    } finally {
      setSyncingSupabase(false);
    }
  };

  // --- FUNÇÕES AUXILIARES DE NEGÓCIO ---
  const isAdmin = currentUser?.role === 'admin';
  const activeDoctors = useMemo(() => doctors.filter(d => d.status === 'Ativo'), [doctors]);
  const scheduleActiveDoctors = useMemo(
    () => activeDoctors.filter(d => d.participatesInSchedule !== false),
    [activeDoctors]
  );
  const adminDoctors = useMemo(
    () =>
      activeDoctors.filter(
        d =>
          d.participatesInSchedule === false ||
          (d.accumulatedRoles || []).some((r: any) => r.categoryType === 'administrativa')
      ),
    [activeDoctors]
  );
  const pendingDoctors = useMemo(() => doctors.filter(d => d.status === 'Pendente'), [doctors]);

  const dynamicCategories = useMemo(() => {
    const keys = Object.keys(config.functionRates || {});
    return keys.length > 0 ? keys : ALL_FUNCTIONS;
  }, [config.functionRates]);

  const getDoctorById = (id: any) => doctors.find(d => Number(d.id) === Number(id));
  const getDoctorName = (id: any) => getDoctorById(id)?.name || 'Médico não encontrado';

  const getCategoryRulesList = (catName: string) => {
    const catData = config.functionRates?.[catName];
    if (!catData) {
      return [
        { id: 'fixo_mensal', label: 'Fixo Mensal / Semanal', billingMode: 'fixo_mensal', value: 15000 },
        { id: 'extra_12h', label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1400 },
        { id: 'extra_fds_12h', label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1650 }
      ];
    }
    if (Array.isArray(catData.rules)) return catData.rules;
    return [
      { id: 'fixo_mensal', label: 'Fixo Mensal / Semanal', billingMode: 'fixo_mensal', value: Number(catData.mensalFixo || 15000) },
      { id: 'extra_12h', label: 'Plantão Extra Avulso 12h', billingMode: 'por_12h', value: Number(catData.extra12h || 1400) }
    ];
  };

  const isDoctorAllowedForFunction = (doc: any, funcName: string) => {
    if (!doc || doc.status !== 'Ativo') return false;
    if (doc.participatesInSchedule === false) return false;
    if (config.functionRates?.[funcName]?.unrestrictedSwaps) return true;
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
    const specExtra = targetCategory === 'Plantão de Especialidade' && specObj ? Number(specObj.extra12h || 0) : 0;
    return fnRate + lvlBonus + specExtra;
  };

  // Suporta adicionais tanto em Valor Unitário (R$) quanto em Percentual (%)
  const calculateShiftAdditionalsAmount = (additionalIds: string[] = [], hours = 12, shiftBaseAmount = 1400) => {
    const ratio = hours / 12;
    let total = 0;
    const details: any[] = [];
    additionalIds.forEach(addId => {
      const found = (config.shiftAdditionals || []).find((a: any) => a.id === addId);
      if (found) {
        const val =
          found.calcMode === 'percent'
            ? (shiftBaseAmount * Number(found.percentValue || 0)) / 100
            : Number(found.value12h || 0) * ratio;
        total += val;
        details.push({ id: found.id, name: found.name, amount: val });
      }
    });
    return { total, details };
  };

  const handleToggleAdditionalOnExistingShift = (shiftId: number, additionalId: string) => {
    setShifts(prev =>
      prev.map(s => {
        if (s.id !== shiftId) return s;
        const currentAdds: string[] = s.additionals || [];
        const exists = currentAdds.includes(additionalId);
        return {
          ...s,
          additionals: exists ? currentAdds.filter(a => a !== additionalId) : [...currentAdds, additionalId]
        };
      })
    );
  };

  // --- CÁLCULO DA FOLHA DE PAGAMENTO PJ (26 A 25) ---
  const competenceWindow = useMemo(() => getCompetenceWindow(competenceMonth), [competenceMonth]);

  const payrollReport = useMemo(() => {
    const { startStr, endStr } = competenceWindow;
    const shiftsInWindow = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    const passagensInWindow = swaps.filter(
      sw => sw.status === 'Aprovado' && sw.movementType === 'Passagem' && sw.shiftDate >= startStr && sw.shiftDate <= endStr
    );

    return activeDoctors.map(doc => {
      const docShifts = shiftsInWindow.filter(s => Number(s.doctorId) === Number(doc.id));
      const accRoles =
        doc.accumulatedRoles && doc.accumulatedRoles.length > 0
          ? doc.accumulatedRoles
          : [
              {
                roleName: doc.role,
                categoryType: dynamicCategories.includes(doc.role) ? 'assistencial' : 'administrativa',
                level: doc.remunerationLevel || 1,
                contractModality: doc.contractType
              }
            ];

      let fixedClinicalMonthly = 0;
      accRoles.forEach((r: any) => {
        if (r.categoryType === 'assistencial' && r.contractModality === 'Fixo Mensal') {
          const rules = getCategoryRulesList(r.roleName);
          const fixedRule = rules.find((rl: any) => rl.billingMode === 'fixo_mensal') || rules[0];
          const fnFixed = Number(fixedRule?.value || 15000);
          const lvlBonus = config.levelBonuses12h?.[r.level || doc.remunerationLevel || 1]?.mensalBonus || 0;
          fixedClinicalMonthly += fnFixed + lvlBonus;
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

      const docFixedAdditional = Number(doc.fixedMonthlyAdditional || 0);
      const baseFixedMonthly = fixedClinicalMonthly + adminMonthlyTotal;
      const isFixedContract = fixedClinicalMonthly > 0 || doc.contractType === 'Fixo Mensal';

      let totalHoursWorked = 0;
      let fixedHoursWorked = 0;
      let extraHoursWorked = 0;
      let fixedShiftsCount = 0;
      let extraShiftsCount = 0;
      let extraShiftsAmount = 0;
      let totalAdditionalsAmount = docFixedAdditional;
      const dailyBreakdown: any[] = [];
      const additionalsList: any[] = [];

      if (docFixedAdditional > 0) {
        additionalsList.push({
          date: competenceMonth,
          weekday: 'Mensal',
          name: doc.fixedMonthlyAdditionalLabel || 'Adicional Fixo Mensal',
          hours: 0,
          amount: docFixedAdditional
        });
      }

      docShifts.forEach(sh => {
        const hours = calculateDurationHours(sh.startTime, sh.endTime);
        totalHoursWorked += hours;
        const weekday = getWeekdayName(sh.date);
        const isWeekend = weekday === 'Sábado' || weekday === 'Domingo';
        const levelUsed = getDoctorLevelForFunction(doc, sh.category);
        const lvlBonus12h = config.levelBonuses12h?.[levelUsed]?.bonus12h || 0;

        const originPassagem = passagensInWindow.find(
          sw => Number(sw.proposedDoctorId) === Number(doc.id) && sw.shiftDate === sh.date && sw.shiftCategory === sh.category
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

        const proportionalBaseRef = (hours / 12) * base12hApplied;
        let shiftBaseVal = 0;
        if (!isPaidDirectlyByTitular && isExtraShift) {
          shiftBaseVal = override?.customFixedTotal !== undefined ? Number(override.customFixedTotal) : proportionalBaseRef;
        }

        extraShiftsAmount += shiftBaseVal;

        const addCalc = calculateShiftAdditionalsAmount(sh.additionals || [], hours, proportionalBaseRef);
        totalAdditionalsAmount += addCalc.total;
        addCalc.details.forEach(d => {
          additionalsList.push({ date: sh.date, weekday, name: d.name, hours, amount: d.amount });
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
          additionals: sh.additionals || [],
          additionalsDetails: addCalc.details,
          ruleLabel:
            override?.customRate12h || sh.customRate12h
              ? 'Acordo Especial (Proporcional 12h)'
              : selectedRule?.label || 'Padrão 12h',
          base12hApplied,
          levelUsed,
          billingType: isPaidDirectlyByTitular ? 'Acerto Direto c/ Titular' : isExtraShift ? 'Extra / Avulso' : 'Fixo',
          shiftBaseVal,
          additionalsVal: addCalc.total
        });
      });

      const docPassagensOut = passagensInWindow.filter(sw => Number(sw.requestingDoctorId) === Number(doc.id));
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
        const effectiveDiscount = !isTitularDirectPay && sw.applyPayrollDiscount ? calculatedDiscount : 0;
        totalDiscounts += effectiveDiscount;

        return {
          ...sw,
          paymentResponsibility: sw.paymentResponsibility || 'hospital',
          weekday: getWeekdayName(sw.shiftDate),
          hoursPassed,
          subDocName: subDoc?.name || 'Substituto',
          titularProportional,
          subProportional,
          rateDiff,
          calculatedDiscount,
          effectiveDiscount
        };
      });

      const docManualAdjs = manualPayrollAdjustments[doc.id] || [];
      const manualAdjustmentsTotal = docManualAdjs.reduce((acc, item) => acc + Number(item.amount || 0), 0);

      const netTotal = Math.max(
        0,
        baseFixedMonthly + extraShiftsAmount + totalAdditionalsAmount + manualAdjustmentsTotal - totalDiscounts
      );

      const confKey = `${competenceMonth}_${doc.id}`;
      const doctorConferenceNote = doctorConferenceData[confKey]?.errorNote || '';

      return {
        ...doc,
        accRoles,
        isFixedContract,
        fixedClinicalMonthly,
        adminMonthlyTotal,
        adminRoleDetails,
        baseFixedMonthly,
        docFixedAdditional,
        totalHoursWorked,
        fixedHoursWorked,
        extraHoursWorked,
        fixedShiftsCount,
        extraShiftsCount,
        weeklyAvgTotalHours: Number((totalHoursWorked / 4.33).toFixed(1)),
        weeklyAvgFixedHours: Number((fixedHoursWorked / 4.33).toFixed(1)),
        weeklyAvgExtraHours: Number((extraHoursWorked / 4.33).toFixed(1)),
        extraShiftsAmount,
        totalAdditionalsAmount,
        manualAdjustmentsTotal,
        docManualAdjs,
        totalDiscounts,
        netTotal,
        dailyBreakdown,
        additionalsList,
        passagesDetails,
        doctorConferenceNote,
        payStatus: payrollStatus[doc.id] || 'Pendente'
      };
    });
  }, [
    activeDoctors,
    shifts,
    swaps,
    config,
    competenceWindow,
    payrollStatus,
    shiftCustomOverrides,
    manualPayrollAdjustments,
    dynamicCategories,
    competenceMonth,
    doctorConferenceData
  ]);

  // --- ABERTURA DE MODAIS ---
  const handleOpenShiftModal = (shiftToEdit?: any, defaultDate?: string) => {
    if (shiftToEdit) {
      setEditingShiftId(shiftToEdit.id);
      setNewShift({
        ...shiftToEdit,
        additionals: shiftToEdit.additionals || []
      });
    } else {
      setEditingShiftId(null);
      const defaultCat = dynamicCategories[0] || 'Médico Rotina/Sênior';
      const firstEligible =
        scheduleActiveDoctors.find(d => isDoctorAllowedForFunction(d, defaultCat)) || scheduleActiveDoctors[0];
      const rules = getCategoryRulesList(defaultCat);
      setNewShift({
        date: defaultDate || '2026-10-18',
        startTime: '07:00',
        endTime: '19:00',
        category: defaultCat,
        doctorId: firstEligible?.id || '',
        type: 'Plantão Diurno 12h',
        billingType: 'Coringa/Extra',
        ruleId: rules[0]?.id || '',
        customRate12h: '',
        additionals: firstEligible?.defaultShiftAdditionals || []
      });
    }
    setShowShiftModal(true);
  };

  const handleOpenSwapModal = (shift: any) => {
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

  const handleOpenDoctorEditModal = (doc?: any) => {
    if (doc) {
      setDoctorForm({
        ...doc,
        defaultShiftAdditionals: doc.defaultShiftAdditionals || [],
        fixedMonthlyAdditional: doc.fixedMonthlyAdditional || 0,
        fixedMonthlyAdditionalLabel: doc.fixedMonthlyAdditionalLabel || '',
        allowedFunctions: doc.allowedFunctions || [doc.role],
        accumulatedRoles: doc.accumulatedRoles || [],
        workloadHistory: doc.workloadHistory || []
      });
    } else {
      setDoctorForm({
        id: null,
        username: '',
        name: '',
        cpf: '',
        birthDate: '1990-01-01',
        email: '',
        password: '123',
        phone: '',
        crm: '',
        rqe: '',
        specialty: 'Clínica Médica',
        razaoSocial: '',
        cnpj: '',
        joinDate: new Date().toISOString().split('T')[0],
        exitDate: '',
        role: dynamicCategories[0] || 'Plantonista',
        remunerationLevel: 1,
        contractType: 'Coringa / Extra',
        participatesInSchedule: true,
        allowedFunctions: [dynamicCategories[0] || 'Plantonista'],
        defaultShiftAdditionals: [],
        fixedMonthlyAdditional: 0,
        fixedMonthlyAdditionalLabel: '',
        accumulatedRoles: [
          {
            id: `ar_${Date.now()}`,
            roleName: dynamicCategories[0] || 'Plantonista',
            categoryType: 'assistencial',
            level: 1,
            contractModality: 'Coringa / Extra'
          }
        ],
        workloadHistory: [],
        status: 'Ativo'
      });
    }
    setShowDoctorEditModal(true);
  };

  // --- TELA DE LOGIN CASO NÃO AUTENTICADO ---
  if (!currentUser) {
    return (
      <AuthScreen
        config={config}
        doctors={doctors}
        setDoctors={setDoctors}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setCurrentView(user.role === 'admin' ? 'dashboard' : 'schedule');
        }}
        recordAction={recordAction}
      />
    );
  }

  // Contadores de notificações
  const pendingSwapsCount = swaps.filter(s => s.status === 'Pendente').length;
  const pendingVacationsCount = vacations.filter(
    v => v.status === 'Pendente' || (v.status === 'Aprovado' && v.substitutionsStatus === 'Pendente Gestor')
  ).length;
  const unreadAnnouncementsCount = !isAdmin
    ? announcements.filter(a => !(a.acknowledgedBy || []).includes(Number(currentUser.id))).length
    : 0;
  const expiredCoursesCount = !isAdmin
    ? courses.filter(c => Number(c.doctorId) === Number(currentUser.id) && c.status !== 'Válido').length
    : 0;

  const navItems = isAdmin
    ? [
        { id: 'dashboard', label: 'Painel Geral', icon: Activity, badge: 0 },
        { id: 'schedule', label: 'Escala Médica', icon: CalendarIcon, badge: 0 },
        { id: 'assistance_map', label: 'Mapa Assistencial 24h', icon: Flame, badge: 0 },
        { id: 'swaps', label: 'Trocas & Passagens', icon: Repeat, badge: pendingSwapsCount },
        { id: 'vacations', label: 'Férias & Substituições', icon: Umbrella, badge: pendingVacationsCount },
        { id: 'payroll', label: 'Folha PJ & Duplo Check', icon: DollarSign, badge: 0 },
        { id: 'remuneration', label: 'Tabela de Remuneração', icon: Sliders, badge: 0 },
        { id: 'staff', label: 'Corpo Clínico', icon: Users, badge: pendingDoctors.length },
        { id: 'management_reports', label: 'Gestão à Vista & Ocorrências', icon: BarChart2, badge: 0 },
        { id: 'courses', label: 'Cursos & Certificados', icon: BookOpen, badge: 0 }
      ]
    : [
        { id: 'schedule', label: 'Meus Plantões & Escala', icon: CalendarIcon, badge: 0 },
        { id: 'payroll', label: 'Meu Saldo / Folha PJ', icon: DollarSign, badge: 0 },
        {
          id: 'swaps',
          label: 'Trocas & Passagens',
          icon: Repeat,
          badge: swaps.filter(
            s =>
              (Number(s.requestingDoctorId) === Number(currentUser.id) ||
                Number(s.proposedDoctorId) === Number(currentUser.id)) &&
              s.status === 'Pendente'
          ).length
        },
        {
          id: 'vacations',
          label: 'Minhas Férias',
          icon: Umbrella,
          badge: vacations.filter(
            v =>
              Number(v.doctorId) === Number(currentUser.id) &&
              v.status === 'Aprovado' &&
              v.substitutionsStatus === 'Aguardando Médico'
          ).length
        },
        { id: 'management_reports', label: 'Gestão à Vista & Avisos', icon: BarChart2, badge: unreadAnnouncementsCount },
        { id: 'courses', label: 'Meus Certificados', icon: BookOpen, badge: expiredCoursesCount },
        { id: 'my_profile', label: 'Meu Cadastro PJ', icon: Users, badge: 0 }
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Topbar Mobile (Smartphones) */}
      <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <span className="font-bold text-sm block leading-none">
              {config.appName} • {config.sectorUnitName || 'Emergência Adulta - HGD'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">{currentUser.name}</span>
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} className="p-2 text-slate-300 hover:text-white" title="Sair">
          <LogOut size={18} />
        </button>
      </header>

      {/* Barra Lateral Esquerda Fixa no Desktop & Menu Retrátil no Smartphone */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-0 z-30 pt-16 bg-slate-900/95 overflow-y-auto block' : 'hidden'
        } lg:static lg:pt-0 lg:flex lg:flex-col w-full lg:w-64 bg-slate-900 text-white shrink-0 lg:min-h-screen p-4 justify-between`}
      >
        <div>
          <div className="hidden lg:flex items-start gap-3 px-2 py-3 border-b border-slate-800 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg mt-0.5">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{config.appName}</h1>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[11px]">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1.5">
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
                  type="button"
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={16} /> {item.label}
                  </span>
                  {item.badge ? (
                    <span className="bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-4">
          <button
            type="button"
            onClick={() => setCurrentUser(null)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-slate-800"
          >
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto space-y-5">
        {/* Alertas Pessoais do Médico no Topo */}
        {!isAdmin && (expiredCoursesCount > 0 || unreadAnnouncementsCount > 0) && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            {expiredCoursesCount > 0 && (
              <div
                onClick={() => setCurrentView('courses')}
                className="flex-1 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600 shrink-0" />
                  Você possui {expiredCoursesCount} certificado(s) vencido(s). Atualize na aba Certificados.
                </span>
                <span className="underline font-bold ml-2">Ver →</span>
              </div>
            )}
            {unreadAnnouncementsCount > 0 && (
              <div
                onClick={() => setCurrentView('management_reports')}
                className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bell size={16} className="text-blue-600 shrink-0" />
                  Há {unreadAnnouncementsCount} comunicado(s) da coordenação aguardando sua confirmação ("Ciente").
                </span>
                <span className="underline font-bold ml-2">Ler →</span>
              </div>
            )}
          </div>
        )}

        {/* MÓDULOS 1 E 2: PAINEL GERAL, MAPA ASSISTENCIAL 24H E ESCALA MÉDICA */}
        {(currentView === 'dashboard' || currentView === 'assistance_map' || currentView === 'schedule') && (
          <ScheduleAndMapViews
            currentView={currentView}
            setCurrentView={setCurrentView}
            config={config}
            isAdmin={isAdmin}
            currentUser={currentUser}
            doctors={doctors}
            activeDoctors={activeDoctors}
            pendingDoctors={pendingDoctors}
            shifts={shifts}
            setShifts={setShifts}
            swaps={swaps}
            vacations={vacations}
            openShifts={openShifts}
            setOpenShifts={setOpenShifts}
            doctorAvailability={doctorAvailability}
            setDoctorAvailability={setDoctorAvailability}
            hourlyDemand={hourlyDemand}
            setHourlyDemand={setHourlyDemand}
            competenceMonth={competenceMonth}
            payrollReport={payrollReport}
            dynamicCategories={dynamicCategories}
            getDoctorById={getDoctorById}
            getDoctorName={getDoctorName}
            getCategoryRulesList={getCategoryRulesList}
            isDoctorAllowedForFunction={isDoctorAllowedForFunction}
            calculateShiftAdditionalsAmount={calculateShiftAdditionalsAmount}
            onOpenShiftModal={handleOpenShiftModal}
            onOpenSwapModal={handleOpenSwapModal}
            onExportWorkloadAuditCSV={() => exportWorkloadAuditCSV(config, competenceWindow, payrollReport)}
            handleSyncWithSupabase={handleSyncWithSupabase}
            syncingSupabase={syncingSupabase}
            syncNotification={syncNotification}
            setSyncNotification={setSyncNotification}
            recordAction={recordAction}
          />
        )}

        {/* MÓDULOS 3 E 4: CORPO CLÍNICO, FOLHA PJ 26 A 25, REMUNERAÇÃO E MEU CADASTRO */}
        {(currentView === 'staff' ||
          currentView === 'payroll' ||
          currentView === 'remuneration' ||
          currentView === 'my_profile') && (
          <StaffAndFinanceViews
            currentView={currentView}
            config={config}
            setConfig={setConfig}
            isAdmin={isAdmin}
            currentUser={currentUser}
            doctors={doctors}
            setDoctors={setDoctors}
            activeDoctors={activeDoctors}
            adminDoctors={adminDoctors}
            pendingDoctors={pendingDoctors}
            shifts={shifts}
            swaps={swaps}
            setSwaps={setSwaps}
            occurrences={occurrences}
            competenceMonth={competenceMonth}
            setCompetenceMonth={setCompetenceMonth}
            competenceWindow={competenceWindow}
            payrollReport={payrollReport}
            payrollClosed={payrollClosed}
            setPayrollClosed={setPayrollClosed}
            manualPayrollAdjustments={manualPayrollAdjustments}
            setManualPayrollAdjustments={setManualPayrollAdjustments}
            shiftCustomOverrides={shiftCustomOverrides}
            setShiftCustomOverrides={setShiftCustomOverrides}
            doctorConferenceData={doctorConferenceData}
            setDoctorConferenceData={setDoctorConferenceData}
            dynamicCategories={dynamicCategories}
            getDoctorById={getDoctorById}
            getCategoryRulesList={getCategoryRulesList}
            handleToggleAdditionalOnExistingShift={handleToggleAdditionalOnExistingShift}
            onOpenDoctorEditModal={handleOpenDoctorEditModal}
            recordAction={recordAction}
          />
        )}

        {/* MÓDULOS 5, 6, 7 E 8 + MODAIS GLOBAIS */}
        <GovernanceAndModals
          currentView={currentView}
          config={config}
          setConfig={setConfig}
          isAdmin={isAdmin}
          currentUser={currentUser}
          doctors={doctors}
          setDoctors={setDoctors}
          activeDoctors={activeDoctors}
          shifts={shifts}
          setShifts={setShifts}
          swaps={swaps}
          setSwaps={setSwaps}
          vacations={vacations}
          setVacations={setVacations}
          courses={courses}
          setCourses={setCourses}
          occurrences={occurrences}
          setOccurrences={setOccurrences}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          doctorAvailability={doctorAvailability}
          auditLogs={auditLogs}
          handleUndoAuditLog={handleUndoAuditLog}
          getDoctorById={getDoctorById}
          getDoctorName={getDoctorName}
          getCategoryRulesList={getCategoryRulesList}
          isDoctorAllowedForFunction={isDoctorAllowedForFunction}
          dynamicCategories={dynamicCategories}
          showShiftModal={showShiftModal}
          setShowShiftModal={setShowShiftModal}
          editingShiftId={editingShiftId}
          setEditingShiftId={setEditingShiftId}
          newShift={newShift}
          setNewShift={setNewShift}
          showSwapModal={showSwapModal}
          setShowSwapModal={setShowSwapModal}
          selectedShiftForSwap={selectedShiftForSwap}
          swapForm={swapForm}
          setSwapForm={setSwapForm}
          showHandoffWarningPopup={showHandoffWarningPopup}
          setShowHandoffWarningPopup={setShowHandoffWarningPopup}
          handoffWarningAcknowledged={handoffWarningAcknowledged}
          setHandoffWarningAcknowledged={setHandoffWarningAcknowledged}
          showDoctorEditModal={showDoctorEditModal}
          setShowDoctorEditModal={setShowDoctorEditModal}
          doctorForm={doctorForm}
          setDoctorForm={setDoctorForm}
          showCourseModal={showCourseModal}
          setShowCourseModal={setShowCourseModal}
          courseForm={courseForm}
          setCourseForm={setCourseForm}
          showVacationModal={showVacationModal}
          setShowVacationModal={setShowVacationModal}
          vacationForm={vacationForm}
          setVacationForm={setVacationForm}
          showOccurrenceModal={showOccurrenceModal}
          setShowOccurrenceModal={setShowOccurrenceModal}
          newOccurrence={newOccurrence}
          setNewOccurrence={setNewOccurrence}
          recordAction={recordAction}
        />
      </main>

      {/* Barra Inferior de Navegação Rápida para Smartphones */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-30 shadow-lg">
        {navItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon size={17} />
              <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}