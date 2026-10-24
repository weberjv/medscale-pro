'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Users, DollarSign, RefreshCw, Umbrella, GraduationCap,
  Sliders, ShieldAlert, LayoutDashboard, LogOut, Menu, X, Flame,
  Megaphone, ClipboardList, History, UserCheck, Shield, Wifi, WifiOff
} from 'lucide-react';
import { createClient } from '@/supabase/client';
import {
  syncStateToSupabase,
  fetchStateFromSupabase,
  CLOUD_STATE_ROW_ID
} from '@/utils/migrateLegacyLocalStorage';

import {
  DEFAULT_CONFIG,
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
  getCompetenceWindow
} from './medscaleData';

import AuthScreen from './AuthScreen';
import ScheduleAndMapViewsOrig from './ScheduleAndMapViews';
import StaffAndFinanceViews from './StaffAndFinanceViews';
import GovernanceAndModals from './GovernanceAndModals';

const ScheduleAndMapViews = ScheduleAndMapViewsOrig as any;

export default function MedScaleProApp() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [managerViewMode, setManagerViewMode] = useState<'admin' | 'doctor'>('admin');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [hourlyDemand, setHourlyDemand] = useState<any>(DEFAULT_HOURLY_DEMAND);
  const [doctors, setDoctors] = useState<any[]>(initialDoctors);
  const [shifts, setShifts] = useState<any[]>(initialShifts);
  const [openShifts, setOpenShifts] = useState<any[]>(initialOpenShifts);
  const [doctorAvailability, setDoctorAvailability] = useState<any[]>(initialDoctorAvailability);
  const [occurrences, setOccurrences] = useState<any[]>(initialOccurrences);
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [swaps, setSwaps] = useState<any[]>(initialSwaps);
  const [vacations, setVacations] = useState<any[]>(initialVacations);
  const [courses, setCourses] = useState<any[]>(initialCourses);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  const [competenceMonth, setCompetenceMonth] = useState<string>('2026-10');
  const [payrollClosed, setPayrollClosed] = useState<boolean>(false);
  const [manualPayrollAdjustments, setManualPayrollAdjustments] = useState<
    Record<number, { description: string; amount: number }[]>
  >({});
  const [shiftCustomOverrides, setShiftCustomOverrides] = useState<
    Record<number, { customRate12h?: number; customFixedTotal?: number }>
  >({});
  const [doctorConferenceData, setDoctorConferenceData] = useState<
    Record<string, { checked: boolean; checkedAt?: string; errorNote?: string }>
  >({});

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'online' | 'offline'>(
    'connecting'
  );

  const clientIdRef = useRef<string>('');

  if (!clientIdRef.current && typeof window !== 'undefined') {
    clientIdRef.current = `client_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
  }
  const isCloudReadyRef = useRef<boolean>(false);
  const lastStateSignatureRef = useRef<string>('');

  const applyRemotePayload = (remote: any) => {
    if (!remote || typeof remote !== 'object') return;

    const mergedConfig = remote.config ? { ...DEFAULT_CONFIG, ...remote.config } : DEFAULT_CONFIG;
    const isCleared = Boolean(mergedConfig?.demoDoctorsCleared);

    const cleanSnapshot = {
      config: mergedConfig,
      hourlyDemand: remote.hourlyDemand || DEFAULT_HOURLY_DEMAND,
      doctors: Array.isArray(remote.doctors)
        ? remote.doctors
        : isCleared
        ? []
        : initialDoctors,
      shifts: Array.isArray(remote.shifts)
        ? remote.shifts
        : isCleared
        ? []
        : initialShifts,
      openShifts: Array.isArray(remote.openShifts) ? remote.openShifts : initialOpenShifts,
      doctorAvailability: Array.isArray(remote.doctorAvailability)
        ? remote.doctorAvailability
        : initialDoctorAvailability,
      occurrences: Array.isArray(remote.occurrences) ? remote.occurrences : initialOccurrences,
      announcements: Array.isArray(remote.announcements)
        ? remote.announcements
        : initialAnnouncements,
      swaps: Array.isArray(remote.swaps) ? remote.swaps : initialSwaps,
      vacations: Array.isArray(remote.vacations)
        ? remote.vacations
        : isCleared
        ? []
        : initialVacations,
      courses: Array.isArray(remote.courses)
        ? remote.courses
        : isCleared
        ? []
        : initialCourses,
      auditTrail: Array.isArray(remote.auditTrail) ? remote.auditTrail : [],
      manualPayrollAdjustments: remote.manualPayrollAdjustments || {},
      shiftCustomOverrides: remote.shiftCustomOverrides || {},
      doctorConferenceData: remote.doctorConferenceData || {}
    };

    lastStateSignatureRef.current = JSON.stringify(cleanSnapshot);

    setConfig(cleanSnapshot.config);
    setHourlyDemand(cleanSnapshot.hourlyDemand);
    setDoctors(cleanSnapshot.doctors);
    setShifts(cleanSnapshot.shifts);
    setOpenShifts(cleanSnapshot.openShifts);
    setDoctorAvailability(cleanSnapshot.doctorAvailability);
    setOccurrences(cleanSnapshot.occurrences);
    setAnnouncements(cleanSnapshot.announcements);
    setSwaps(cleanSnapshot.swaps);
    setVacations(cleanSnapshot.vacations);
    setCourses(cleanSnapshot.courses);
    setAuditTrail(cleanSnapshot.auditTrail);
    setManualPayrollAdjustments(cleanSnapshot.manualPayrollAdjustments);
    setShiftCustomOverrides(cleanSnapshot.shiftCustomOverrides);
    setDoctorConferenceData(cleanSnapshot.doctorConferenceData);
  };

  // 1. Carrega LocalStorage e conecta ao Supabase Realtime ao iniciar
  useEffect(() => {
    let localParsed: any = null;
    try {
      const saved = localStorage.getItem('medscale_pro_state_v2');
      if (saved) {
        localParsed = JSON.parse(saved);
        applyRemotePayload(localParsed);
      }
    } catch (e) {
      console.error('Erro ao ler LocalStorage:', e);
    }

    setIsHydrated(true);

    const supabase = createClient();
    let channel: any = null;

    const initCloudAndRealtime = async () => {
      try {
        const cloudPayload = await fetchStateFromSupabase(supabase);
        if (
          cloudPayload &&
          typeof cloudPayload === 'object' &&
          (Array.isArray(cloudPayload.doctors) || cloudPayload.config?.demoDoctorsCleared)
        ) {
          applyRemotePayload(cloudPayload);
        } else {
          const initialToUpload = localParsed || {
            config: DEFAULT_CONFIG,
            hourlyDemand: DEFAULT_HOURLY_DEMAND,
            doctors: initialDoctors,
            shifts: initialShifts,
            openShifts: initialOpenShifts,
            doctorAvailability: initialDoctorAvailability,
            occurrences: initialOccurrences,
            announcements: initialAnnouncements,
            swaps: initialSwaps,
            vacations: initialVacations,
            courses: initialCourses,
            auditTrail: [],
            manualPayrollAdjustments: {},
            shiftCustomOverrides: {},
            doctorConferenceData: {}
          };
          await syncStateToSupabase(supabase, {
            ...initialToUpload,
            updatedByClientId: clientIdRef.current
          });
        }
        isCloudReadyRef.current = true;
        setRealtimeStatus('online');
      } catch (err) {
        console.warn('Modo local ativo (verifique tabela medscale_app_state no Supabase):', err);
        isCloudReadyRef.current = true;
        setRealtimeStatus('offline');
      }

      channel = supabase
        .channel('medscale_live_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medscale_app_state',
            filter: `id=eq.${CLOUD_STATE_ROW_ID}`
          },
          (eventPayload: any) => {
            const incoming = eventPayload?.new?.payload;
            if (!incoming) return;
            if (incoming.updatedByClientId === clientIdRef.current) return;
            applyRemotePayload(incoming);
            setRealtimeStatus('online');
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('online');
          }
        });
    };

    initCloudAndRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // 2. Guarda automaticamente no LocalStorage e envia para a Nuvem em Tempo Real
  useEffect(() => {
    if (!isHydrated) return;

    const currentSnapshot = {
      config,
      hourlyDemand,
      doctors,
      shifts,
      openShifts,
      doctorAvailability,
      occurrences,
      announcements,
      swaps,
      vacations,
      courses,
      auditTrail,
      manualPayrollAdjustments,
      shiftCustomOverrides,
      doctorConferenceData
    };

    try {
      localStorage.setItem('medscale_pro_state_v2', JSON.stringify(currentSnapshot));
    } catch (e) {
      console.error('Erro ao guardar LocalStorage:', e);
    }

    if (!isCloudReadyRef.current) return;

    const newSignature = JSON.stringify(currentSnapshot);
    if (newSignature === lastStateSignatureRef.current) return;

    lastStateSignatureRef.current = newSignature;

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        await syncStateToSupabase(supabase, {
          ...currentSnapshot,
          updatedByClientId: clientIdRef.current
        });
        setRealtimeStatus('online');
      } catch (err) {
        console.warn('Falha ao enviar atualização automática para a nuvem:', err);
        setRealtimeStatus('offline');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    isHydrated,
    config,
    hourlyDemand,
    doctors,
    shifts,
    openShifts,
    doctorAvailability,
    occurrences,
    announcements,
    swaps,
    vacations,
    courses,
    auditTrail,
    manualPayrollAdjustments,
    shiftCustomOverrides,
    doctorConferenceData
  ]);

  // Verifica permissões reais em tempo real
  const isMasterAdmin = Boolean(currentUser?.isMasterAdmin);
  const loggedDoctorObj = useMemo(
    () => doctors.find(d => Number(d.id) === Number(currentUser?.id)),
    [doctors, currentUser]
  );
  const canUserManage =
    isMasterAdmin ||
    Boolean(loggedDoctorObj?.hasManagerAccess) ||
    Boolean(currentUser?.canManage) ||
    Boolean(currentUser?.isAdmin);
  const isAdmin = isMasterAdmin ? true : canUserManage && managerViewMode === 'admin';

  const recordAction = (description: string) => {
    const actorName = isMasterAdmin
      ? 'Gestor Mestre'
      : currentUser?.name
      ? `${currentUser.name}${canUserManage ? ' [Perfil Gestor]' : ''}`
      : 'Sistema';
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('pt-BR'),
      user: actorName,
      description
    };
    setAuditTrail(prev => [newEntry, ...prev.slice(0, 199)]);
  };

  const getDoctorById = (id: any) => doctors.find(d => Number(d.id) === Number(id));

  const dynamicCategories = useMemo(() => {
    return Object.keys(config.functionRates || {});
  }, [config.functionRates]);

  const getCategoryRulesList = (catName: string) => {
    return config.functionRates?.[catName]?.rules || [];
  };

  const activeDoctors = useMemo(
    () => doctors.filter(d => d.status === 'Ativo' && d.participatesInSchedule !== false),
    [doctors]
  );

  const adminDoctors = useMemo(
    () => doctors.filter(d => d.status === 'Ativo' && d.participatesInSchedule === false),
    [doctors]
  );

  const pendingDoctors = useMemo(
    () => doctors.filter(d => d.status === 'Pendente'),
    [doctors]
  );

  const competenceWindow = useMemo(
    () => getCompetenceWindow(competenceMonth),
    [competenceMonth]
  );

  const handleToggleAdditionalOnExistingShift = (shiftId: number, additionalId: string) => {
    setShifts(prev =>
      prev.map(sh => {
        if (sh.id !== shiftId) return sh;
        const curr = sh.additionals || [];
        const exists = curr.includes(additionalId);
        return {
          ...sh,
          additionals: exists ? curr.filter((id: string) => id !== additionalId) : [...curr, additionalId]
        };
      })
    );
  };

  const handleToggleMonthlyAdditionalOnDoctor = (doctorId: number, additionalId: string) => {
    setDoctors(prev =>
      prev.map(d => {
        if (Number(d.id) !== Number(doctorId)) return d;
        const curr = d.monthlyAdditionals || [];
        const exists = curr.includes(additionalId);
        return {
          ...d,
          monthlyAdditionals: exists
            ? curr.filter((id: string) => id !== additionalId)
            : [...curr, additionalId]
        };
      })
    );
    recordAction(`Adicional mensal alterado na folha do médico ID ${doctorId}`);
  };

  // ============================================================================
  // CÁLCULO DA FOLHA DE PAGAMENTO PJ (26 A 25)
  // ============================================================================
  const payrollReport = useMemo(() => {
    const { startStr, endStr } = competenceWindow;
    const shiftsInWindow = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    const passagensInWindow = swaps.filter(
      sw =>
        sw.status === 'Aprovado' &&
        sw.movementType === 'Passagem' &&
        sw.shiftDate >= startStr &&
        sw.shiftDate <= endStr
    );

    const calculateShiftAdditionalsAmount = (
      addIds: string[],
      hours: number,
      shiftBaseRef: number
    ) => {
      let total = 0;
      const details: { id: string; name: string; amount: number }[] = [];
      (addIds || []).forEach(id => {
        const addObj = (config.shiftAdditionals || []).find((a: any) => a.id === id);
        if (!addObj || addObj.incidence === 'monthly') return;
        let val = 0;
        if (addObj.calcMode === 'percent') {
          val = (shiftBaseRef * Number(addObj.percentValue || 0)) / 100;
        } else {
          val = (hours / 12) * Number(addObj.value12h || 0);
        }
        total += val;
        details.push({ id: addObj.id, name: addObj.name, amount: val });
      });
      return { total, details };
    };

    return doctors
      .filter(d => d.status === 'Ativo')
      .map(doc => {
        const docShifts = shiftsInWindow
          .filter(s => Number(s.doctorId) === Number(doc.id) && !s.isManualUnregisteredDoctor)
          .sort((a, b) => a.date.localeCompare(b.date));

        const accRoles = doc.accumulatedRoles || [];
        const isFixedContract = doc.contractType === 'Fixo Mensal';

        let baseFixedMonthly = 0;
        const allAllowedFns: string[] = Array.from(
          new Set(
            [
              doc.role,
              ...(doc.allowedFunctions || []),
              ...accRoles.map((r: any) => r.roleName)
            ].filter(Boolean)
          )
        );

        allAllowedFns.forEach(fnName => {
          const fnRateCfg = config.functionRates?.[fnName];
          const adminRateCfg = config.adminFunctionRates?.[fnName];

          if (fnRateCfg && fnRateCfg.requiresSchedule === false) {
            baseFixedMonthly += Number(fnRateCfg.mensalFixo || fnRateCfg.monthlyFixedValue || 0);
          } else if (adminRateCfg) {
            baseFixedMonthly += Number(adminRateCfg.mensalFixo || 0);
          } else if (fnRateCfg && isFixedContract && fnName === doc.role) {
            const lvlBonusMensal =
              config.levelBonuses12h?.[doc.remunerationLevel || 1]?.mensalBonus || 0;
            baseFixedMonthly += Number(fnRateCfg.mensalFixo || 0) + lvlBonusMensal;
          }
        });

        let totalHoursWorked = 0;
        let fixedHoursWorked = 0;
        let extraHoursWorked = 0;
        let fixedShiftsCount = 0;
        let extraShiftsCount = 0;
        let extraShiftsAmount = 0;
        let totalShiftAdditionalsOnly = 0;
        let totalMonthlyAdditionalsOnly = 0;
        const dailyBreakdown: any[] = [];

        docShifts.forEach(sh => {
          const hours = calculateDurationHours(sh.startTime, sh.endTime);
          totalHoursWorked += hours;
          const weekday = getWeekdayName(sh.date);
          const isWeekend = weekday === 'Sábado' || weekday === 'Domingo';
          const levelUsed = doc.remunerationLevel || 1;
          const lvlBonus12h = config.levelBonuses12h?.[levelUsed]?.bonus12h || 0;

          const rules = getCategoryRulesList(sh.category);
          const selectedRule =
            rules.find((rl: any) => rl.id === sh.ruleId) ||
            (isWeekend ? rules.find((rl: any) => rl.id.includes('fds')) : null) ||
            rules.find((rl: any) => rl.billingMode === 'por_12h') ||
            rules[0];

          const override = shiftCustomOverrides[sh.id];
          const isExtraShift =
            sh.billingType !== 'Fixo' ||
            !isFixedContract ||
            Boolean(sh.customRate12h) ||
            Boolean(override);

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
          if (isExtraShift) {
            shiftBaseVal =
              override?.customFixedTotal !== undefined
                ? Number(override.customFixedTotal)
                : proportionalBaseRef;
          }

          extraShiftsAmount += shiftBaseVal;

          const addCalc = calculateShiftAdditionalsAmount(
            sh.additionals || [],
            hours,
            proportionalBaseRef
          );
          totalShiftAdditionalsOnly += addCalc.total;

          dailyBreakdown.push({
            shiftId: sh.id,
            date: sh.date,
            weekday,
            startTime: sh.startTime,
            endTime: sh.endTime,
            hours,
            type: sh.type,
            category: sh.category,
            isExtraShift,
            additionals: sh.additionals || [],
            additionalsDetails: addCalc.details,
            billingType: isExtraShift ? 'Extra / Avulso' : 'Fixo',
            shiftBaseVal,
            additionalsVal: addCalc.total
          });
        });

        const monthlyAddCatalog = (config.shiftAdditionals || []).filter(
          (a: any) => a.incidence === 'monthly'
        );
        const docMonthlyIds: string[] = doc.monthlyAdditionals || [];

        monthlyAddCatalog.forEach((mAdd: any) => {
          if (docMonthlyIds.includes(mAdd.id)) {
            const baseForPercent = baseFixedMonthly + extraShiftsAmount;
            const val =
              mAdd.calcMode === 'percent'
                ? (baseForPercent * Number(mAdd.percentValue || 0)) / 100
                : Number(mAdd.value12h || 0);
            totalMonthlyAdditionalsOnly += val;
          }
        });

        if (Number(doc.fixedMonthlyAdditional || 0) > 0) {
          totalMonthlyAdditionalsOnly += Number(doc.fixedMonthlyAdditional);
        }

        let totalDiscounts = 0;
        passagensInWindow.forEach(sw => {
          if (Number(sw.requestingDoctorId) === Number(doc.id) && sw.applyPayrollDiscount) {
            totalDiscounts += 1400;
          }
        });

        const manualAdjs = manualPayrollAdjustments[doc.id] || [];
        const manualAdjustmentsTotal = manualAdjs.reduce(
          (acc, item) => acc + Number(item.amount || 0),
          0
        );

        const totalAdditionalsAmount = totalShiftAdditionalsOnly + totalMonthlyAdditionalsOnly;
        const netTotal =
          baseFixedMonthly +
          extraShiftsAmount +
          totalAdditionalsAmount +
          manualAdjustmentsTotal -
          totalDiscounts;

        return {
          ...doc,
          doctor: doc,
          shiftsCount: docShifts.length,
          totalHours: totalHoursWorked,
          totalHoursWorked,
          weeklyAvgTotalHours: (totalHoursWorked / 4.33).toFixed(1),
          fixedHoursWorked,
          fixedShiftsCount,
          extraHoursWorked,
          extraShiftsCount,
          baseFixedMonthly,
          extraShiftsAmount,
          shiftAdditionalsTotal: totalShiftAdditionalsOnly,
          monthlyAdditionalsTotal: totalMonthlyAdditionalsOnly,
          totalShiftAdditionalsOnly,
          totalMonthlyAdditionalsOnly,
          totalAdditionalsAmount,
          manualAdjustmentsTotal,
          totalDiscounts,
          netTotal,
          dailyBreakdown
        };
      });
  }, [
    doctors,
    shifts,
    swaps,
    config,
    competenceWindow,
    shiftCustomOverrides,
    manualPayrollAdjustments
  ]);

  const handleCloudSync = async () => {
    try {
      setSyncStatusMsg('A sincronizar com a nuvem...');
      const supabase = createClient();
      const res = await syncStateToSupabase(supabase, {
        config,
        doctors,
        shifts,
        openShifts,
        doctorAvailability,
        occurrences,
        announcements,
        swaps,
        vacations,
        courses,
        hourlyDemand,
        auditTrail,
        manualPayrollAdjustments,
        shiftCustomOverrides,
        doctorConferenceData,
        updatedByClientId: clientIdRef.current
      });
      setRealtimeStatus('online');
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(''), 5000);
    } catch (err: any) {
      setRealtimeStatus('offline');
      setSyncStatusMsg(`Erro: ${err.message}`);
    }
  };

  if (!isHydrated) return null;

  if (!currentUser) {
    return (
      <AuthScreen
        config={config}
        doctors={doctors}
        setDoctors={setDoctors}
        onLoginSuccess={(user: any) => {
          setCurrentUser(user);
          setManagerViewMode(user.canManage || user.isAdmin ? 'admin' : 'doctor');
          setCurrentView('dashboard');
        }}
        recordAction={recordAction}
      />
    );
  }

  // Menu de navegação: "Vagas Extras" removido do login do médico plantonista
  const navItems = isAdmin
    ? [
        { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
        { id: 'schedule', label: 'Escala Oficial', icon: Calendar },
        { id: 'heatmap', label: 'Mapa 24h (Heatmap)', icon: Flame },
        { id: 'open_shifts', label: 'Plantões em Aberto', icon: Megaphone },
        { id: 'swaps', label: 'Trocas & Passagens', icon: RefreshCw },
        { id: 'staff', label: 'Corpo Clínico', icon: Users },
        { id: 'payroll', label: 'Folha PJ (26 a 25)', icon: DollarSign },
        { id: 'remuneration', label: 'Tabela de Remuneração', icon: Sliders },
        { id: 'vacations', label: 'Férias & Licenças', icon: Umbrella },
        { id: 'courses', label: 'Cursos (ACLS/ATLS)', icon: GraduationCap },
        { id: 'occurrences', label: 'Ocorrências', icon: ShieldAlert },
        { id: 'announcements', label: 'Comunicados', icon: ClipboardList },
        { id: 'audit', label: 'Auditoria', icon: History },
        { id: 'settings', label: 'Configurações', icon: Sliders }
      ]
    : [
        { id: 'dashboard', label: 'Meu Painel', icon: LayoutDashboard },
        { id: 'schedule', label: 'Minha Escala', icon: Calendar },
        { id: 'swaps', label: 'Minhas Trocas', icon: RefreshCw },
        { id: 'payroll', label: 'Meu Extrato PJ', icon: DollarSign },
        { id: 'vacations', label: 'Minhas Férias', icon: Umbrella },
        { id: 'courses', label: 'Meus Certificados', icon: GraduationCap },
        { id: 'announcements', label: 'Comunicados', icon: ClipboardList },
        { id: 'profile', label: 'Meu Cadastro PJ', icon: UserCheck }
      ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-800">
      {/* BARRA LATERAL */}
      <aside className="w-full lg:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-600 rounded text-white">
              {config.sectorUnitName}
            </span>
            <h1 className="text-lg font-extrabold mt-1">{config.appName}</h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold">
              {realtimeStatus === 'online' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Wifi size={12} /> Nuvem Ao Vivo (Realtime)
                </span>
              ) : realtimeStatus === 'connecting' ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> A ligar à nuvem...
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <WifiOff size={12} /> Modo Local
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Alternador de visão para médico com perfil de Gestor */}
        {!isMasterAdmin && canUserManage && (
          <div className="p-3 bg-slate-800 border-b border-slate-700 text-xs space-y-1.5">
            <span className="block text-[10px] uppercase font-bold text-amber-400">
              Alternar Modo de Acesso:
            </span>
            <div className="flex bg-slate-900 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setManagerViewMode('admin')}
                className={`flex-1 py-1.5 rounded font-bold text-[11px] ${
                  managerViewMode === 'admin'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400'
                }`}
              >
                Modo Gestor
              </button>
              <button
                type="button"
                onClick={() => setManagerViewMode('doctor')}
                className={`flex-1 py-1.5 rounded font-bold text-[11px] ${
                  managerViewMode === 'doctor' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Minha Agenda
              </button>
            </div>
          </div>
        )}

        <nav
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block flex-1 p-3 space-y-1 overflow-y-auto`}
        >
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
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield
              size={14}
              className={isMasterAdmin ? 'text-amber-400' : 'text-blue-400'}
            />
            <div className="truncate">
              <strong className="block truncate">{currentUser.name}</strong>
              <span className="text-[10px] text-slate-400">
                {isMasterAdmin
                  ? 'Login Mestre (Gestor)'
                  : canUserManage
                  ? 'Médico c/ Perfil Gestor'
                  : 'Médico Plantonista'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentUser(null)}
            className="w-full bg-slate-800 hover:bg-red-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut size={14} /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {syncStatusMsg && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold">
            {syncStatusMsg}
          </div>
        )}

        {['dashboard', 'schedule', 'heatmap', 'open_shifts', 'swaps'].includes(
          currentView
        ) && (
          <ScheduleAndMapViews
            currentView={currentView}
            setCurrentView={setCurrentView}
            config={config}
            setConfig={setConfig}
            isAdmin={isAdmin}
            isMasterAdmin={isMasterAdmin}
            currentUser={currentUser}
            doctors={doctors}
            setDoctors={setDoctors}
            activeDoctors={activeDoctors}
            adminDoctors={adminDoctors}
            pendingDoctors={pendingDoctors}
            shifts={shifts}
            setShifts={setShifts}
            openShifts={openShifts}
            setOpenShifts={setOpenShifts}
            doctorAvailability={doctorAvailability}
            setDoctorAvailability={setDoctorAvailability}
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
            auditTrail={auditTrail}
            hourlyDemand={hourlyDemand}
            setHourlyDemand={setHourlyDemand}
            competenceMonth={competenceMonth}
            setCompetenceMonth={setCompetenceMonth}
            competenceWindow={competenceWindow}
            payrollReport={payrollReport}
            payrollClosed={payrollClosed}
            setPayrollClosed={setPayrollClosed}
            dynamicCategories={dynamicCategories}
            getDoctorById={getDoctorById}
            getCategoryRulesList={getCategoryRulesList}
            handleToggleAdditionalOnExistingShift={handleToggleAdditionalOnExistingShift}
            handleToggleMonthlyAdditionalOnDoctor={handleToggleMonthlyAdditionalOnDoctor}
            handleCloudSync={handleCloudSync}
            recordAction={recordAction}
            setIsDoctorModalOpen={setIsDoctorModalOpen}
            setEditingDoctor={setEditingDoctor}
            onOpenDoctorEditModal={(doc: any) => {
              setEditingDoctor(doc || null);
              setIsDoctorModalOpen(true);
            }}
          />
        )}

        {['staff', 'payroll', 'remuneration', 'rates', 'profile'].includes(
          currentView
        ) && (
          <StaffAndFinanceViews
            currentView={currentView === 'remuneration' ? 'rates' : currentView}
            config={config}
            setConfig={setConfig}
            isAdmin={isAdmin}
            isMasterAdmin={isMasterAdmin}
            currentUser={currentUser}
            doctors={doctors}
            setDoctors={setDoctors}
            activeDoctors={activeDoctors}
            adminDoctors={adminDoctors}
            pendingDoctors={pendingDoctors}
            shifts={shifts}
            setShifts={setShifts}
            swaps={swaps}
            setSwaps={setSwaps}
            vacations={vacations}
            setVacations={setVacations}
            courses={courses}
            setCourses={setCourses}
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
            handleToggleMonthlyAdditionalOnDoctor={handleToggleMonthlyAdditionalOnDoctor}
            setIsDoctorModalOpen={setIsDoctorModalOpen}
            setEditingDoctor={setEditingDoctor}
            onOpenDoctorEditModal={(doc: any) => {
              setEditingDoctor(doc || null);
              setIsDoctorModalOpen(true);
            }}
            recordAction={recordAction}
          />
        )}

        <GovernanceAndModals
          currentView={currentView}
          config={config}
          setConfig={setConfig}
          isAdmin={isAdmin}
          isMasterAdmin={isMasterAdmin}
          currentUser={currentUser}
          doctors={doctors}
          setDoctors={setDoctors}
          shifts={shifts}
          setShifts={setShifts}
          vacations={vacations}
          setVacations={setVacations}
          courses={courses}
          setCourses={setCourses}
          occurrences={occurrences}
          setOccurrences={setOccurrences}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          auditTrail={auditTrail}
          dynamicCategories={dynamicCategories}
          getDoctorById={getDoctorById}
          recordAction={recordAction}
          isDoctorModalOpen={isDoctorModalOpen}
          setIsDoctorModalOpen={setIsDoctorModalOpen}
          editingDoctor={editingDoctor}
        />
      </main>
    </div>
  );
}