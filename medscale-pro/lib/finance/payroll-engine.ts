// ============================================================================
// MOTOR FINANCEIRO ÚNICO DA FOLHA PJ (FONTE DE VERDADE: DASHBOARD + FOLHA PJ)
// ============================================================================

export function round2(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

export function formatBrDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatCurrencyBR(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function getWeekdayShortLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return '';
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return labels[d.getDay()] || '';
}

export function getShiftHours(s: any): number {
  if (typeof s?.hours === 'number' && s.hours > 0) return s.hours;
  const st = String(s?.startTime || '07:00');
  const et = String(s?.endTime || '19:00');
  const [sh, sm] = st.split(':').map(Number);
  const [eh, em] = et.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return 12;
  let diff = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
  if (diff <= 0) diff += 24;
  return Math.round(diff * 100) / 100;
}

export function isWeekendDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Cota mensal por contrato fixo: até 12h semanais = 1 cota; 12h a 24h semanais = 2 cotas; etc.
export function getWeekendQuotaCountByHours(weeklyFixedWeekendHours: number): number {
  const hrs = Number(weeklyFixedWeekendHours || 0);
  if (hrs <= 0) return 0;
  return Math.max(1, Math.ceil(hrs / 12));
}

function getExplicitShiftCoordinationValue(s: any): number | null {
  const candidates = [
    s?.coordinationShiftValue,
    s?.customShiftValue,
    s?.overrideShiftAmount,
    s?.manualShiftValue,
    s?.attractivenessValue
  ];
  for (const val of candidates) {
    if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
      return Number(val);
    }
  }
  return null;
}

function normalizePersonKeyName(name?: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getActiveLevelsForFunction(fnObj: any): number[] {
  if (Array.isArray(fnObj?.activeLevels) && fnObj.activeLevels.length > 0) {
    return [...fnObj.activeLevels].map(Number).sort((a, b) => a - b);
  }
  if (fnObj?.levels && typeof fnObj.levels === 'object') {
    const extracted = Object.keys(fnObj.levels)
      .map(k => Number(k.replace('level', '')))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    if (extracted.length > 0) return extracted;
  }
  return [1];
}

export function getFunctionEffectiveRates(
  functionRatesObj: Record<string, any>,
  allFunctionNames: string[],
  fnName: string,
  levelNum: number
) {
  const fnObj = functionRatesObj[fnName] || functionRatesObj[allFunctionNames[0]] || {};
  const requiresSchedule = fnObj.requiresSchedule !== false;
  const applyLeveling = Boolean(fnObj.applyLeveling);
  const fixedQuotaRefHours = Number(fnObj.fixedQuotaRefHours || 12);
  const hourlyRefHours = Number(fnObj.hourlyRefHours || 12);
  const periodicRefHours = Number(fnObj.periodicRefHours || 12);

  if (!applyLeveling) {
    const fixedQuotaValue = Number(fnObj.fixed ?? 1500);
    const extraWeekdayRef = Number(fnObj.extraWeekday ?? fnObj.extra ?? 1650);
    const extraWeekendRef = Number(
      fnObj.extraWeekend ??
        fnObj.extraWeekday ??
        (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
    );
    const monthlyAdminRef = Number(fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000);
    return {
      applyLeveling: false,
      requiresSchedule,
      fixedQuotaRefHours,
      hourlyRefHours,
      periodicRefHours,
      fixed12hRef: fixedQuotaValue,
      extraWeekday12hRef: extraWeekdayRef,
      extraWeekend12hRef: extraWeekendRef,
      monthlyAdminRef
    };
  }

  const activeLvls = getActiveLevelsForFunction(fnObj);
  const chosenLvl = activeLvls.includes(Number(levelNum))
    ? Number(levelNum)
    : activeLvls[activeLvls.length - 1] || 1;
  const lvlKey = `level${chosenLvl}`;
  const lvlData = fnObj?.levels?.[lvlKey] || {};

  const fixedQuotaValue = Number(lvlData.fixed ?? fnObj.fixed ?? 1500);
  const extraWeekdayRef = Number(
    lvlData.extraWeekday ?? lvlData.extra ?? fnObj.extraWeekday ?? fnObj.extra ?? 1650
  );
  const extraWeekendRef = Number(
    lvlData.extraWeekend ??
      lvlData.extra ??
      fnObj.extraWeekend ??
      fnObj.extra ??
      extraWeekdayRef
  );
  const monthlyAdminRef = Number(
    lvlData.monthlyFixedValue ?? fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000
  );

  return {
    applyLeveling: true,
    requiresSchedule,
    fixedQuotaRefHours,
    hourlyRefHours,
    periodicRefHours,
    fixed12hRef: fixedQuotaValue,
    extraWeekday12hRef: extraWeekdayRef,
    extraWeekend12hRef: extraWeekendRef,
    monthlyAdminRef
  };
}

export interface ComputePayrollInput {
  config: any;
  doctors: any[];
  activeDoctors?: any[];
  shifts: any[];
  swaps: any[];
  vacations?: any[];
  competenceMonth: string;
  effectiveWindow: { startStr: string; endStr: string };
  doctorConferenceData?: Record<string, any>;
  dynamicCategories?: string[];
  filterFunction?: string;
}

function calculateRoleEntryLineTotal(
  entry: any,
  functionRatesObj: Record<string, any>,
  allFunctionNames: string[],
  docLevel: number
): { lineTotal: number; subcomponentLabel: string; rates: any } {
  const rates = getFunctionEffectiveRates(
    functionRatesObj,
    allFunctionNames,
    entry.functionName,
    docLevel
  );

  let rawTotal = 0;
  let subcomponentLabel = '';

  if (entry.billingMode === 'monthly_no_schedule') {
    const hasOverride =
      entry.customOverrideUnitValue !== undefined &&
      entry.customOverrideUnitValue !== null &&
      entry.customOverrideUnitValue !== '';
    const unitVal = hasOverride ? Number(entry.customOverrideUnitValue) : rates.monthlyAdminRef;
    rawTotal = Number(entry.units || 1) * unitVal;
    subcomponentLabel = `${entry.functionName} (Cargo Mensal s/ Escala)`;
  } else if (entry.billingMode === 'fixed_quota_monthly') {
    const refQuotaHours = rates.fixedQuotaRefHours || 12;
    const hasOverride =
      entry.customOverrideUnitValue !== undefined &&
      entry.customOverrideUnitValue !== null &&
      entry.customOverrideUnitValue !== '';
    const baseQuotaVal = hasOverride
      ? Number(entry.customOverrideUnitValue)
      : rates.fixed12hRef * (Number(entry.hoursPerUnit || refQuotaHours) / refQuotaHours);
    rawTotal = Number(entry.units || 0) * baseQuotaVal;
    subcomponentLabel = `${entry.functionName} (${entry.units || 0}x Cota Fixa ${
      entry.hoursPerUnit || refQuotaHours
    }h/sem)`;
  } else if (entry.billingMode === 'periodic_included') {
    rawTotal = 0;
    subcomponentLabel = `${entry.functionName} (Escala Periódica Inclusa no Pacote: ${
      entry.periodicHours || 0
    }h)`;
  } else {
    const hasCustomTotal =
      entry.customOverrideTotalValue !== undefined &&
      entry.customOverrideTotalValue !== null &&
      entry.customOverrideTotalValue !== '';
    if (hasCustomTotal) {
      rawTotal = Number(entry.customOverrideTotalValue);
    } else {
      const refHr = rates.hourlyRefHours || 12;
      const wkVal = rates.extraWeekday12hRef * (Number(entry.weekdayHours || 0) / refHr);
      const fdVal = rates.extraWeekend12hRef * (Number(entry.weekendHours || 0) / refHr);
      rawTotal = wkVal + fdVal + Number(entry.coordinationExtraAmount || 0);
    }
    subcomponentLabel = `${entry.functionName} (Por CH: ${entry.weekdayHours || 0}h Sem + ${
      entry.weekendHours || 0
    }h FDS)`;
  }

  return {
    lineTotal: round2(rawTotal),
    subcomponentLabel,
    rates
  };
}

function isWeekendWeekendAdditionalTag(add: any): boolean {
  const idStr = String(add?.id || '').toLowerCase();
  const nameStr = String(add?.name || '').toLowerCase();
  return (
    add?.isWeekendFixedQuotaAdditional === true ||
    add?.applicationTarget === 'weekend_fixed_quota' ||
    idStr.includes('weekend') ||
    idStr.includes('fds') ||
    nameStr.includes('fim de semana') ||
    nameStr.includes('final de semana')
  );
}

function isThirteenthInstallmentTag(add: any): boolean {
  const idStr = String(add?.id || '').toLowerCase();
  const nameStr = String(add?.name || '').toLowerCase();
  return (
    add?.isThirteenthInstallment === true ||
    add?.applicationTarget === 'thirteenth_1_12_fixed' ||
    idStr.includes('13') ||
    idStr.includes('decimo') ||
    nameStr.includes('13') ||
    nameStr.includes('décimo')
  );
}

function isNightLeaderAdditionalTag(add: any): boolean {
  const idStr = String(add?.id || '').toLowerCase();
  const nameStr = String(add?.name || '').toLowerCase();
  return (
    add?.isNightLeaderAdditional === true ||
    add?.applicationTarget === 'night_leader_shift' ||
    idStr.includes('leader') ||
    idStr.includes('chefia') ||
    nameStr.includes('líder') ||
    nameStr.includes('lider') ||
    nameStr.includes('chefia')
  );
}

function calculateAdditionalsBreakdown(params: {
  allCatalogAdditionals: any[];
  countsMap: Record<string, number>;
  defaultFn: string;
  docLevel: number;
  functionRatesObj: Record<string, any>;
  allFunctionNames: string[];
  fixedBaseSubtotal: number;
  fixedRemunerationByFunctionMap: Record<string, number>;
  remunerationByFunctionMap: Record<string, number>;
  functionsSubtotal: number;
  isFixedScheduleDoctor: boolean;
  weekendFixedQuotaCount: number;
}) {
  const {
    allCatalogAdditionals,
    countsMap,
    defaultFn,
    docLevel,
    functionRatesObj,
    allFunctionNames,
    fixedBaseSubtotal,
    fixedRemunerationByFunctionMap,
    remunerationByFunctionMap,
    functionsSubtotal,
    isFixedScheduleDoctor,
    weekendFixedQuotaCount
  } = params;

  let additionalsSubtotal = 0;

  const items = allCatalogAdditionals.map((add: any) => {
    const isWeekendQuotaAdd = isWeekendWeekendAdditionalTag(add);
    const isThirteenthAdd = isThirteenthInstallmentTag(add);

    let count = Number(countsMap[add.id] || 0);
    if (isWeekendQuotaAdd && countsMap[add.id] === undefined) {
      count = isFixedScheduleDoctor ? weekendFixedQuotaCount : 0;
    }

    const targetFns: string[] =
      Array.isArray(add.targetFunctionNames) && add.targetFunctionNames.length > 0
        ? add.targetFunctionNames
        : add.targetFunctionName
        ? [add.targetFunctionName]
        : [defaultFn];

    let singleCompetenceValue = 0;
    let applicationTargetLabel = 'Base Plantão';

    if (isWeekendQuotaAdd) {
      singleCompetenceValue = Number(
        add.weekendQuotaValue ?? add.value12h ?? add.fixedQuotaValue ?? 0
      );
      if (!isFixedScheduleDoctor || weekendFixedQuotaCount <= 0) {
        count = 0;
        applicationTargetLabel = 'Apenas Médicos Fixos de Escala (FDS Fixo)';
      } else {
        applicationTargetLabel = `Cota Mensal FDS (Fixo: ${weekendFixedQuotaCount} cota)`;
      }
    } else if (isThirteenthAdd) {
      singleCompetenceValue = fixedBaseSubtotal / 12;
      applicationTargetLabel = '13º Fracionado (1/12 Base Fixa)';
      if (!isFixedScheduleDoctor || fixedBaseSubtotal <= 0) {
        count = 0;
      }
    } else if (add.calcMode === 'percent') {
      const pct = Number(add.percentValue || 0);
      if (add.applicationTarget === 'fixed_base_only') {
        singleCompetenceValue = (fixedBaseSubtotal * pct) / 100;
        applicationTargetLabel = 'Base Fixa';
      } else if (add.applicationTarget === 'specific_function_fixed') {
        const sumFixedTargetFns = targetFns.reduce(
          (acc, fn) => acc + Number(fixedRemunerationByFunctionMap[fn] || 0),
          0
        );
        singleCompetenceValue = (sumFixedTargetFns * pct) / 100;
        applicationTargetLabel = `Base Fixa: ${targetFns.join(', ')}`;
      } else if (add.applicationTarget === 'specific_function') {
        const sumTargetFns = targetFns.reduce(
          (acc, fn) => acc + Number(remunerationByFunctionMap[fn] || 0),
          0
        );
        const fallbackBase =
          sumTargetFns > 0
            ? sumTargetFns
            : getFunctionEffectiveRates(
                functionRatesObj,
                allFunctionNames,
                targetFns[0],
                docLevel
              ).fixed12hRef;
        singleCompetenceValue = (fallbackBase * pct) / 100;
        applicationTargetLabel = `Função (Fixa+Extra): ${targetFns.join(', ')}`;
      } else if (add.applicationTarget === 'final_payroll') {
        singleCompetenceValue = (functionsSubtotal * pct) / 100;
        applicationTargetLabel = 'Folha Total (Fixa+Extra)';
      } else {
        const baseSingleShift =
          getFunctionEffectiveRates(
            functionRatesObj,
            allFunctionNames,
            defaultFn,
            docLevel
          ).fixed12hRef / 4;
        singleCompetenceValue = (baseSingleShift * pct) / 100;
        applicationTargetLabel = 'Base 1 Plantão';
      }
    } else {
      singleCompetenceValue = Number(add.value12h || 0);
      applicationTargetLabel = isNightLeaderAdditionalTag(add)
        ? 'Líder de Plantão Noturno (Chefia)'
        : 'Valor Fixo';
    }

    const totalAmount = round2(count * singleCompetenceValue);
    additionalsSubtotal = round2(additionalsSubtotal + totalAmount);

    return {
      ...add,
      targetFns,
      count,
      singleCompetenceValue: round2(singleCompetenceValue),
      applicationTargetLabel,
      totalAmount
    };
  });

  return { items, additionalsSubtotal };
}

export function computeDetailedPayrollRows(input: ComputePayrollInput): any[] {
  const {
    config = {},
    doctors = [],
    activeDoctors = [],
    shifts = [],
    swaps = [],
    vacations = [],
    competenceMonth = '2026-11',
    effectiveWindow = { startStr: '2026-10-26', endStr: '2026-11-25' },
    doctorConferenceData = {},
    dynamicCategories = [],
    filterFunction = 'Todas'
  } = input || {};

  const safeDoctors = (Array.isArray(doctors) ? [...doctors] : []).sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', {
      sensitivity: 'base'
    })
  );

  const safeActiveDoctors = (
    Array.isArray(activeDoctors) && activeDoctors.length > 0
      ? [...activeDoctors]
      : safeDoctors.filter((d: any) => d?.status === 'Ativo')
  ).sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', {
      sensitivity: 'base'
    })
  );

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeSwaps = Array.isArray(swaps) ? swaps : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];

  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  const resolveDoctorByIdLocal = (id: any) =>
    safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;

  const windowShifts = safeShifts.filter((s: any) => {
    if (!s?.date || s?.isDispensedVacant || s?.isPlannedOpenExtra) return false;
    const hasDoc =
      Boolean(s?.doctorId) ||
      Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName);
    if (!hasDoc) return false;
    if (filterFunction !== 'Todas' && s?.category !== filterFunction) {
      return false;
    }
    return s.date >= effectiveWindow.startStr && s.date <= effectiveWindow.endStr;
  });

  const monthCustomizations = config?.payrollCustomizations?.[competenceMonth] || {};
  const allCatalogAdditionals = Array.isArray(config?.shiftAdditionals)
    ? config.shiftAdditionals
    : [];

  const buildEntry = (
    entityKey: string | number,
    docObj: any,
    entityWindowShifts: any[],
    isManualEntry: boolean = false
  ) => {
    const docLevel = Number(docObj?.remunerationLevel || 1);
    const defaultFn = docObj?.role || allFunctionNames[0] || 'Plantonista';
    const customDoc = monthCustomizations[entityKey] || {};

    const billableShifts = entityWindowShifts.filter(
      (s: any) => s?.substituteBillingMode !== 'direct_settlement'
    );

    const classifyShiftRegime = (s: any, fnName: string) => {
      const rawType = s?.shiftType || s?.modality || '';
      const isPeriodicIncluded =
        rawType === 'Escala Periódica' ||
        Boolean(functionRatesObj[fnName]?.enablePeriodicIncluded && rawType === 'Incluso');
      const isFixed =
        !isPeriodicIncluded &&
        (rawType === 'Fixo' ||
          (!isManualEntry && !rawType && docObj?.contractType === 'Fixo Mensal'));

      if (isPeriodicIncluded) return 'periodic' as const;
      if (isFixed) return 'fixed' as const;
      return 'extra' as const;
    };

    const fixedShiftsInWindow = billableShifts.filter(
      (s: any) => classifyShiftRegime(s, s?.category || s?.role || defaultFn) === 'fixed'
    );

    const isFixedScheduleDoctor =
      !isManualEntry &&
      (docObj?.contractType === 'Fixo Mensal' || fixedShiftsInWindow.length > 0);

    const auditByFunction: Record<
      string,
      {
        fixedShifts: number;
        fixedHours: number;
        extraShifts: number;
        extraHours: number;
        periodicShifts: number;
        periodicHours: number;
        totalHours: number;
      }
    > = {};

    allFunctionNames.forEach(fn => {
      auditByFunction[fn] = {
        fixedShifts: 0,
        fixedHours: 0,
        extraShifts: 0,
        extraHours: 0,
        periodicShifts: 0,
        periodicHours: 0,
        totalHours: 0
      };
    });

    let totalFixedHoursAllFns = 0;
    let totalExtraHoursAllFns = 0;
    let totalPeriodicHoursAllFns = 0;
    let totalWeekendHoursAllShifts = 0;

    const dailyWorkedScheduleList = [...entityWindowShifts]
      .sort((a, b) => {
        const dComp = String(a?.date || '').localeCompare(String(b?.date || ''));
        if (dComp !== 0) return dComp;
        return String(a?.startTime || '07:00').localeCompare(String(b?.startTime || '07:00'));
      })
      .map((s: any) => {
        const fnName = s?.category || s?.role || defaultFn;
        const hrs = getShiftHours(s);
        const regimeCode = classifyShiftRegime(s, fnName);

        if (isWeekendDate(s.date)) {
          totalWeekendHoursAllShifts = round2(totalWeekendHoursAllShifts + hrs);
        }

        if (!auditByFunction[fnName]) {
          auditByFunction[fnName] = {
            fixedShifts: 0,
            fixedHours: 0,
            extraShifts: 0,
            extraHours: 0,
            periodicShifts: 0,
            periodicHours: 0,
            totalHours: 0
          };
        }

        let regimeLabel = 'Por CH / Extra';
        if (regimeCode === 'periodic') {
          auditByFunction[fnName].periodicShifts += 1;
          auditByFunction[fnName].periodicHours = round2(
            auditByFunction[fnName].periodicHours + hrs
          );
          totalPeriodicHoursAllFns = round2(totalPeriodicHoursAllFns + hrs);
          regimeLabel = 'Escala Periódica (Incluso na Cota)';
        } else if (regimeCode === 'fixed') {
          auditByFunction[fnName].fixedShifts += 1;
          auditByFunction[fnName].fixedHours = round2(
            auditByFunction[fnName].fixedHours + hrs
          );
          totalFixedHoursAllFns = round2(totalFixedHoursAllFns + hrs);
          regimeLabel = 'Cota Fixa Mensal';
        } else {
          auditByFunction[fnName].extraShifts += 1;
          auditByFunction[fnName].extraHours = round2(
            auditByFunction[fnName].extraHours + hrs
          );
          totalExtraHoursAllFns = round2(totalExtraHoursAllFns + hrs);
          regimeLabel = 'Por CH / Extra';
        }

        auditByFunction[fnName].totalHours = round2(auditByFunction[fnName].totalHours + hrs);

        return {
          id: s.id,
          date: s.date,
          weekday: getWeekdayShortLabel(s.date),
          startTime: s.startTime || '07:00',
          endTime: s.endTime || '19:00',
          hours: hrs,
          functionName: fnName,
          regime: regimeLabel,
          regimeCode,
          isNightLeader: Boolean(s.isNightLeader),
          isFromSwap: Boolean(s.isFromSwap),
          directSettlement: s?.substituteBillingMode === 'direct_settlement'
        };
      });

    // Cota mensal de fim de semana: apenas contratos/plantões FIXOS (nunca extra/coringa)
    const fixedWeekendShifts = fixedShiftsInWindow.filter((s: any) => isWeekendDate(s.date));
    const totalFixedWeekendHours = round2(
      fixedWeekendShifts.reduce((acc: number, s: any) => acc + getShiftHours(s), 0)
    );
    const distinctFixedWeekendWeekdays = new Set(
      fixedWeekendShifts.map((s: any) => {
        const d = new Date(`${s.date}T12:00:00`);
        return isNaN(d.getTime()) ? s.date : d.getDay();
      })
    );
    const fixedWeeksCount = Math.max(
      1,
      Math.round(
        Math.max(1, fixedShiftsInWindow.length) /
          Math.max(
            1,
            new Set(
              fixedShiftsInWindow.map((s: any) => {
                const d = new Date(`${s.date}T12:00:00`);
                return isNaN(d.getTime()) ? s.date : d.getDay();
              })
            ).size
          )
      )
    );
    const weeklyFixedWeekendHours =
      fixedWeekendShifts.length > 0 && distinctFixedWeekendWeekdays.size > 0
        ? totalFixedWeekendHours / Math.min(5, fixedWeeksCount)
        : 0;

    const weekendFixedQuotaCount =
      isFixedScheduleDoctor && weeklyFixedWeekendHours > 0
        ? getWeekendQuotaCountByHours(weeklyFixedWeekendHours)
        : 0;

    const autoRoleEntries: {
      id: string;
      functionName: string;
      billingMode:
        | 'monthly_no_schedule'
        | 'fixed_quota_monthly'
        | 'hourly_extra'
        | 'periodic_included';
      units: number;
      hoursPerUnit: number;
      weekdayHours: number;
      weekendHours: number;
      periodicHours: number;
      coordinationExtraAmount?: number;
      customOverrideUnitValue?: number | null;
    }[] = [];

    if (!isManualEntry) {
      const docAllowedFns: string[] = Array.from(
        new Set([docObj?.role, ...(docObj?.allowedFunctions || [])].filter(Boolean))
      );
      docAllowedFns.forEach((fnName, idx) => {
        if (filterFunction !== 'Todas' && fnName !== filterFunction) return;
        const fnCfg = functionRatesObj[fnName];
        if (fnCfg && fnCfg.requiresSchedule === false) {
          autoRoleEntries.push({
            id: `auto_nosched_${idx}`,
            functionName: fnName,
            billingMode: 'monthly_no_schedule',
            units: 1,
            hoursPerUnit: 12,
            weekdayHours: 0,
            weekendHours: 0,
            periodicHours: 0,
            customOverrideUnitValue: null
          });
        }
      });
    }

    const autoWeeklyFixedSlotsMap: Record<
      string,
      { functionName: string; hoursPerUnit: number; occurrences: number }
    > = {};

    const autoExtraByFnMap: Record<
      string,
      { weekdayHours: number; weekendHours: number; coordinationExtraAmount: number }
    > = {};

    const autoPeriodicByFnMap: Record<string, number> = {};

    billableShifts.forEach((s: any) => {
      const fnName = s?.category || s?.role || defaultFn;
      const hrs = getShiftHours(s);
      const regimeCode = classifyShiftRegime(s, fnName);

      if (regimeCode === 'periodic') {
        autoPeriodicByFnMap[fnName] = round2((autoPeriodicByFnMap[fnName] || 0) + hrs);
      } else if (regimeCode === 'fixed') {
        const dObj = new Date(`${s.date}T12:00:00`);
        const dayOfWeek = isNaN(dObj.getTime()) ? 0 : dObj.getDay();
        const slotKey = `${fnName}__${dayOfWeek}__${s.startTime || '07:00'}__${hrs}`;
        if (!autoWeeklyFixedSlotsMap[slotKey]) {
          autoWeeklyFixedSlotsMap[slotKey] = {
            functionName: fnName,
            hoursPerUnit: hrs,
            occurrences: 0
          };
        }
        autoWeeklyFixedSlotsMap[slotKey].occurrences += 1;
      } else {
        if (!autoExtraByFnMap[fnName]) {
          autoExtraByFnMap[fnName] = {
            weekdayHours: 0,
            weekendHours: 0,
            coordinationExtraAmount: 0
          };
        }

        const explicitCoordVal = getExplicitShiftCoordinationValue(s);
        if (explicitCoordVal !== null) {
          autoExtraByFnMap[fnName].coordinationExtraAmount = round2(
            autoExtraByFnMap[fnName].coordinationExtraAmount + explicitCoordVal
          );
        } else if (isWeekendDate(s.date)) {
          autoExtraByFnMap[fnName].weekendHours = round2(
            autoExtraByFnMap[fnName].weekendHours + hrs
          );
        } else {
          autoExtraByFnMap[fnName].weekdayHours = round2(
            autoExtraByFnMap[fnName].weekdayHours + hrs
          );
        }
      }
    });

    const groupedAutoQuotas: Record<
      string,
      { functionName: string; hoursPerUnit: number; units: number }
    > = {};
    Object.values(autoWeeklyFixedSlotsMap).forEach(slot => {
      const gKey = `${slot.functionName}__${slot.hoursPerUnit}`;
      if (!groupedAutoQuotas[gKey]) {
        groupedAutoQuotas[gKey] = {
          functionName: slot.functionName,
          hoursPerUnit: slot.hoursPerUnit,
          units: 0
        };
      }
      groupedAutoQuotas[gKey].units += 1;
    });

    Object.values(groupedAutoQuotas).forEach((q, idx) => {
      autoRoleEntries.push({
        id: `auto_fixed_${idx}`,
        functionName: q.functionName,
        billingMode: 'fixed_quota_monthly',
        units: q.units,
        hoursPerUnit: q.hoursPerUnit,
        weekdayHours: 0,
        weekendHours: 0,
        periodicHours: 0,
        customOverrideUnitValue: null
      });
    });

    Object.entries(autoExtraByFnMap).forEach(([fnName, extraObj], idx) => {
      autoRoleEntries.push({
        id: `auto_extra_${idx}`,
        functionName: fnName,
        billingMode: 'hourly_extra',
        units: 1,
        hoursPerUnit: Number(functionRatesObj[fnName]?.hourlyRefHours || 12),
        weekdayHours: extraObj.weekdayHours,
        weekendHours: extraObj.weekendHours,
        periodicHours: 0,
        coordinationExtraAmount: extraObj.coordinationExtraAmount,
        customOverrideUnitValue: null
      });
    });

    Object.entries(autoPeriodicByFnMap).forEach(([fnName, pHours], idx) => {
      autoRoleEntries.push({
        id: `auto_periodic_${idx}`,
        functionName: fnName,
        billingMode: 'periodic_included',
        units: 1,
        hoursPerUnit: Number(functionRatesObj[fnName]?.periodicRefHours || 12),
        weekdayHours: 0,
        weekendHours: 0,
        periodicHours: pHours,
        customOverrideUnitValue: 0
      });
    });

    const summarizeRoleList = (roleList: any[]) => {
      const byFnTotal: Record<string, number> = {};
      const byFnFixed: Record<string, number> = {};
      let subTotal = 0;
      let fixedSub = 0;
      let extraSub = 0;

      const evaluated = roleList.map((entry: any) => {
        const { lineTotal, subcomponentLabel, rates } = calculateRoleEntryLineTotal(
          entry,
          functionRatesObj,
          allFunctionNames,
          docLevel
        );

        subTotal = round2(subTotal + lineTotal);
        byFnTotal[entry.functionName] = round2(
          (byFnTotal[entry.functionName] || 0) + lineTotal
        );

        if (
          entry.billingMode === 'fixed_quota_monthly' ||
          entry.billingMode === 'monthly_no_schedule'
        ) {
          fixedSub = round2(fixedSub + lineTotal);
          byFnFixed[entry.functionName] = round2(
            (byFnFixed[entry.functionName] || 0) + lineTotal
          );
        } else if (entry.billingMode === 'hourly_extra') {
          extraSub = round2(extraSub + lineTotal);
        }

        const fnAudit = auditByFunction[entry.functionName] || {
          fixedShifts: 0,
          fixedHours: 0,
          extraShifts: 0,
          extraHours: 0,
          periodicShifts: 0,
          periodicHours: 0,
          totalHours: 0
        };

        return {
          ...entry,
          rates,
          lineTotal,
          subcomponentLabel,
          fulfilledFixedShifts: fnAudit.fixedShifts,
          fulfilledFixedHours: fnAudit.fixedHours,
          fulfilledExtraHours: fnAudit.extraHours,
          fulfilledPeriodicHours: fnAudit.periodicHours
        };
      });

      return {
        evaluated,
        functionsSubtotal: subTotal,
        fixedBaseSubtotal: fixedSub,
        extraBaseSubtotal: extraSub,
        remunerationByFunctionMap: byFnTotal,
        fixedRemunerationByFunctionMap: byFnFixed
      };
    };

    const autoRoleSummary = summarizeRoleList(autoRoleEntries);
    const hasCustomRoleEntries = Array.isArray(customDoc.roleEntries);
    const activeRoleEntries = hasCustomRoleEntries ? customDoc.roleEntries : autoRoleEntries;
    const activeRoleSummary = hasCustomRoleEntries
      ? summarizeRoleList(activeRoleEntries)
      : autoRoleSummary;

    const abonadaDispensesCount = safeSwaps.filter(
      (sw: any) =>
        sw?.status === 'Aprovado' &&
        sw?.type === 'Liberação / Dispensa Gerencial' &&
        Number(sw?.requesterId) === Number(docObj?.id) &&
        sw?.financialDispenseType !== 'desconto' &&
        sw?.date >= effectiveWindow.startStr &&
        sw?.date <= effectiveWindow.endStr
    ).length;

    const evaluatedRoleEntries = activeRoleSummary.evaluated.map((item: any) => ({
      ...item,
      abonadaDispensesCount
    }));

    const nightLeaderShiftsCount = billableShifts.filter((s: any) =>
      Boolean(s?.isNightLeader)
    ).length;

    const autoAdditionalCounts: Record<string, number> = {};
    allCatalogAdditionals.forEach((add: any) => {
      if (isWeekendWeekendAdditionalTag(add)) {
        autoAdditionalCounts[add.id] = isFixedScheduleDoctor ? weekendFixedQuotaCount : 0;
      } else if (isThirteenthInstallmentTag(add)) {
        autoAdditionalCounts[add.id] = isFixedScheduleDoctor ? 1 : 0;
      } else if (isNightLeaderAdditionalTag(add)) {
        const countByFlag = nightLeaderShiftsCount;
        const countInShifts = billableShifts.filter(
          (s: any) => Array.isArray(s?.additionals) && s.additionals.includes(add.id)
        ).length;
        autoAdditionalCounts[add.id] = Math.max(countByFlag, countInShifts);
      } else if (add.incidence === 'monthly') {
        const docMonthly: string[] = Array.isArray(docObj?.monthlyAdditionals)
          ? docObj.monthlyAdditionals
          : [];
        autoAdditionalCounts[add.id] = docMonthly.includes(add.id) ? 1 : 0;
      } else {
        const countInShifts = billableShifts.filter(
          (s: any) => Array.isArray(s?.additionals) && s.additionals.includes(add.id)
        ).length;
        autoAdditionalCounts[add.id] = countInShifts;
      }
    });

    const autoAdditionalsCalc = calculateAdditionalsBreakdown({
      allCatalogAdditionals,
      countsMap: autoAdditionalCounts,
      defaultFn,
      docLevel,
      functionRatesObj,
      allFunctionNames,
      fixedBaseSubtotal: autoRoleSummary.fixedBaseSubtotal,
      fixedRemunerationByFunctionMap: autoRoleSummary.fixedRemunerationByFunctionMap,
      remunerationByFunctionMap: autoRoleSummary.remunerationByFunctionMap,
      functionsSubtotal: autoRoleSummary.functionsSubtotal,
      isFixedScheduleDoctor,
      weekendFixedQuotaCount
    });

    const customAddCounts: Record<string, number> = customDoc.additionalCounts || {};
    const effectiveAddCounts: Record<string, number> = {};
    allCatalogAdditionals.forEach((add: any) => {
      effectiveAddCounts[add.id] =
        customAddCounts[add.id] !== undefined
          ? Number(customAddCounts[add.id])
          : Number(autoAdditionalCounts[add.id] || 0);
    });

    const activeAdditionalsCalc = calculateAdditionalsBreakdown({
      allCatalogAdditionals,
      countsMap: effectiveAddCounts,
      defaultFn,
      docLevel,
      functionRatesObj,
      allFunctionNames,
      fixedBaseSubtotal: activeRoleSummary.fixedBaseSubtotal,
      fixedRemunerationByFunctionMap: activeRoleSummary.fixedRemunerationByFunctionMap,
      remunerationByFunctionMap: activeRoleSummary.remunerationByFunctionMap,
      functionsSubtotal: activeRoleSummary.functionsSubtotal,
      isFixedScheduleDoctor,
      weekendFixedQuotaCount
    });

    const doctorPassagensInWindow = safeSwaps.filter((sw: any) => {
      if (sw?.status !== 'Aprovado') return false;
      if (Number(sw?.requesterId) !== Number(docObj?.id)) return false;
      const d = String(sw?.date || sw?.shiftDate || '');
      if (d < effectiveWindow.startStr || d > effectiveWindow.endStr) return false;
      return true;
    });

    const doctorSubstitutionsReceivedInWindow = safeSwaps
      .filter((sw: any) => {
        if (sw?.status !== 'Aprovado') return false;
        const d = String(sw?.date || sw?.shiftDate || '');
        if (d < effectiveWindow.startStr || d > effectiveWindow.endStr) return false;
        if (Number(sw?.targetDoctorId) === Number(docObj?.id)) return true;
        if (
          Array.isArray(sw?.segments) &&
          sw.segments.some((seg: any) => Number(seg?.targetDoctorId) === Number(docObj?.id))
        ) {
          return true;
        }
        return false;
      })
      .map((sw: any) => {
        const reqDoc = resolveDoctorByIdLocal(sw.requesterId);
        const hrs = getShiftHours({
          startTime: sw.startTime || '07:00',
          endTime: sw.endTime || '19:00'
        });
        return {
          swapId: sw.id,
          date: sw.date || sw.shiftDate || '',
          startTime: sw.startTime || '07:00',
          endTime: sw.endTime || '19:00',
          hours: hrs,
          functionName: sw.category || defaultFn,
          type: sw.type || 'Passagem de Plantão',
          titularName: reqDoc?.name || 'Médico Titular',
          substituteBillingMode: sw.substituteBillingMode || 'payroll_extra',
          managerComment: sw.managerFinancialComment || ''
        };
      });

    const swapDiscountConfigs = customDoc.swapDiscounts || {};
    let totalPassagensDiscounts = 0;
    let autoPassagensDiscounts = 0;

    const computeDiscountByMode = (
      mode: string,
      fullShiftValue: number,
      levelDiffValue: number,
      fractionPercent: number,
      customAmount: number
    ) => {
      if (mode === 'full') return round2(fullShiftValue);
      if (mode === 'level_diff') {
        return round2(levelDiffValue > 0 ? levelDiffValue : fullShiftValue * 0.15);
      }
      if (mode === 'fraction') {
        return round2((fullShiftValue * Number(fractionPercent || 50)) / 100);
      }
      if (mode === 'custom') {
        return round2(Math.max(0, Number(customAmount || 0)));
      }
      return 0;
    };

    const evaluatedPassagensDiscounts = doctorPassagensInWindow.map((sw: any) => {
      const subDoc = resolveDoctorByIdLocal(sw.targetDoctorId);
      const subLevel = Number(subDoc?.remunerationLevel || 1);
      const isLowerLevel = subLevel < docLevel;
      const fnName = sw.category || defaultFn;
      const hrs = getShiftHours({
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00'
      });

      const titularRates = getFunctionEffectiveRates(
        functionRatesObj,
        allFunctionNames,
        fnName,
        docLevel
      );
      const subRates = getFunctionEffectiveRates(
        functionRatesObj,
        allFunctionNames,
        fnName,
        subLevel
      );

      const titularRefH = titularRates.fixedQuotaRefHours || 12;
      const subRefH = subRates.fixedQuotaRefHours || 12;
      const fullShiftValue = round2((titularRates.fixed12hRef / 4) * (hrs / titularRefH));
      const subShiftValue = round2((subRates.fixed12hRef / 4) * (hrs / subRefH));
      const levelDiffValue = round2(Math.max(0, fullShiftValue - subShiftValue));

      const isAbonadaDispense =
        sw.type === 'Liberação / Dispensa Gerencial' &&
        sw.financialDispenseType === 'abonada';

      const defaultMode = isAbonadaDispense
        ? 'none'
        : sw.type === 'Liberação / Dispensa Gerencial' &&
          sw.financialDispenseType === 'desconto'
        ? 'full'
        : sw.titularDiscountMode || 'none';

      const autoDisc = computeDiscountByMode(
        defaultMode,
        fullShiftValue,
        levelDiffValue,
        sw.titularFractionPercent ?? 50,
        sw.titularCustomDiscountAmount ??
          (levelDiffValue > 0 ? levelDiffValue : fullShiftValue)
      );
      autoPassagensDiscounts = round2(autoPassagensDiscounts + autoDisc);

      const cfg = swapDiscountConfigs[sw.id] || {
        mode: defaultMode as 'none' | 'full' | 'level_diff' | 'fraction' | 'custom',
        fractionPercent: sw.titularFractionPercent ?? 50,
        customAmount:
          sw.titularCustomDiscountAmount ??
          (levelDiffValue > 0 ? levelDiffValue : fullShiftValue),
        managerComment: sw.managerFinancialComment || ''
      };

      const discountApplied = computeDiscountByMode(
        cfg.mode,
        fullShiftValue,
        levelDiffValue,
        cfg.fractionPercent ?? 50,
        cfg.customAmount ?? 0
      );
      totalPassagensDiscounts = round2(totalPassagensDiscounts + discountApplied);

      const modeDescriptionLabel =
        cfg.mode === 'full'
          ? 'Desconto Integral (100%)'
          : cfg.mode === 'level_diff'
          ? `Diferença de Nível (Nível ${docLevel} → Nível ${subLevel})`
          : cfg.mode === 'fraction'
          ? `Fração (${cfg.fractionPercent ?? 50}%)`
          : cfg.mode === 'custom'
          ? 'Valor Parcial Personalizado'
          : isAbonadaDispense
          ? 'Dispensa Abonada (Isento)'
          : 'Sem Desconto (Isento)';

      return {
        swapId: sw.id,
        date: sw.date || sw.shiftDate || '',
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00',
        hours: hrs,
        functionName: fnName,
        type: sw.type || 'Passagem de Plantão',
        substituteName:
          sw.type === 'Liberação / Dispensa Gerencial' && sw.dispenseMode === 'vacant'
            ? 'Dispensado s/ Substituto'
            : subDoc?.name || 'Substituto',
        permutedShiftInfo: sw.permutedShiftInfo || '',
        titularLevel: docLevel,
        substituteLevel: subLevel,
        isLowerLevel,
        fullShiftValue,
        levelDiffValue,
        mode: cfg.mode,
        modeDescriptionLabel,
        fractionPercent: cfg.fractionPercent ?? 50,
        customAmount: cfg.customAmount ?? 0,
        managerComment:
          cfg.managerComment !== undefined
            ? cfg.managerComment
            : sw.managerFinancialComment || '',
        reason: sw.reason || '',
        discountApplied,
        autoDiscountApplied: autoDisc
      };
    });

    const approvedVacationsInWindow = safeVacations.filter(
      (v: any) =>
        v?.status === 'Aprovado' &&
        Number(v?.doctorId) === Number(docObj?.id) &&
        String(v?.startDate || '') <= effectiveWindow.endStr &&
        String(v?.endDate || '') >= effectiveWindow.startStr &&
        (v?.titularPayMode === 'fraction' || v?.titularPayMode === 'none')
    );

    let vacationFractionDiscount = 0;
    if (approvedVacationsInWindow.length > 0 && activeRoleSummary.functionsSubtotal > 0) {
      approvedVacationsInWindow.forEach((v: any) => {
        const payPct =
          v?.titularPayMode === 'none'
            ? 0
            : Math.max(0, Math.min(100, Number(v?.titularFractionPercent ?? 50)));
        const nonPaidPct = 100 - payPct;
        const vacStart =
          String(v.startDate) > effectiveWindow.startStr
            ? String(v.startDate)
            : effectiveWindow.startStr;
        const vacEnd =
          String(v.endDate) < effectiveWindow.endStr
            ? String(v.endDate)
            : effectiveWindow.endStr;
        const d1 = new Date(`${vacStart}T12:00:00`).getTime();
        const d2 = new Date(`${vacEnd}T12:00:00`).getTime();
        const daysInVac =
          !isNaN(d1) && !isNaN(d2) && d2 >= d1
            ? Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
            : 7;
        const ratioOfMonth = Math.min(1, daysInVac / 30);
        const disc = round2(
          (activeRoleSummary.functionsSubtotal * ratioOfMonth * nonPaidPct) / 100
        );
        vacationFractionDiscount = round2(vacationFractionDiscount + disc);
      });
    }

    const totalDiscountsWithVacation = round2(
      totalPassagensDiscounts + vacationFractionDiscount
    );
    const autoDiscountsWithVacation = round2(
      autoPassagensDiscounts + vacationFractionDiscount
    );

    const manualAdjustmentsList: {
      id: string;
      type: 'add' | 'subtract';
      amount: number;
      description: string;
    }[] = Array.isArray(customDoc.manualAdjustments) ? customDoc.manualAdjustments : [];

    const manualAdjustmentsNet = round2(
      manualAdjustmentsList.reduce(
        (acc, adj) =>
          acc + (adj.type === 'subtract' ? -Number(adj.amount || 0) : Number(adj.amount || 0)),
        0
      )
    );

    const netTotalCalculated = round2(
      activeRoleSummary.functionsSubtotal +
        activeAdditionalsCalc.additionalsSubtotal +
        manualAdjustmentsNet -
        totalDiscountsWithVacation
    );

    const autoNetTotal = round2(
      autoRoleSummary.functionsSubtotal +
        autoAdditionalsCalc.additionalsSubtotal -
        autoDiscountsWithVacation
    );

    const totalFulfilledHours = round2(
      entityWindowShifts.reduce((acc: number, s: any) => acc + getShiftHours(s), 0)
    );

    const confKey = `${competenceMonth}__${docObj?.id}`;
    const conferenceStatus = doctorConferenceData?.[confKey] || {
      checked: false,
      checkedAt: '',
      errorNote: ''
    };

    const hasAdditionalOverride = Object.keys(customAddCounts).length > 0;
    const hasDiscountOverride = Object.keys(swapDiscountConfigs).length > 0;
    const hasManualAdjustments = manualAdjustmentsList.length > 0;

    return {
      entityKey,
      isManualEntry,
      isFixedScheduleDoctor,
      weekendFixedQuotaCount,
      nightLeaderShiftsCount,
      vacationFractionDiscount,
      doctor: docObj,
      docLevel,
      shiftsCount: entityWindowShifts.length,
      totalFulfilledHours,
      totalFixedHoursAllFns,
      totalExtraHoursAllFns,
      totalPeriodicHoursAllFns,
      totalWeekendHoursAllShifts,
      dailyWorkedScheduleList,
      evaluatedRoleEntries,
      activeRoleEntries,
      functionsSubtotal: activeRoleSummary.functionsSubtotal,
      fixedBaseSubtotal: activeRoleSummary.fixedBaseSubtotal,
      extraBaseSubtotal: activeRoleSummary.extraBaseSubtotal,
      evaluatedAdditionals: activeAdditionalsCalc.items,
      additionalsSubtotal: activeAdditionalsCalc.additionalsSubtotal,
      evaluatedPassagensDiscounts,
      doctorSubstitutionsReceivedInWindow,
      totalPassagensDiscounts: totalDiscountsWithVacation,
      manualAdjustmentsList,
      manualAdjustmentsNet,
      netTotal: netTotalCalculated,
      auditByFunction,
      conferenceStatus,
      audit: {
        autoFunctionsSubtotal: autoRoleSummary.functionsSubtotal,
        autoFixedBaseSubtotal: autoRoleSummary.fixedBaseSubtotal,
        autoExtraBaseSubtotal: autoRoleSummary.extraBaseSubtotal,
        autoAdditionalsSubtotal: autoAdditionalsCalc.additionalsSubtotal,
        autoDiscountsTotal: autoDiscountsWithVacation,
        autoNetTotal,
        manualDeltaNet: round2(netTotalCalculated - autoNetTotal),
        hasRoleOverride: hasCustomRoleEntries,
        hasAdditionalOverride,
        hasDiscountOverride,
        hasManualAdjustments
      },
      isCustomized:
        hasCustomRoleEntries ||
        hasAdditionalOverride ||
        hasDiscountOverride ||
        hasManualAdjustments
    };
  };

  const regRows = safeActiveDoctors.map(doc => {
    const docWindowShifts = windowShifts.filter(
      (s: any) => !s?.isManualUnregisteredDoctor && Number(s?.doctorId) === Number(doc.id)
    );
    return buildEntry(Number(doc.id), doc, docWindowShifts, false);
  });

  const manualGroupsMap: Record<
    string,
    { manualName: string; manualCrm: string; level: number; role: string; shifts: any[] }
  > = {};

  windowShifts
    .filter((s: any) => Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName))
    .forEach((s: any) => {
      const cleanName = String(s.manualDoctorName).replace(/\s+/g, ' ').trim();
      const normKey = normalizePersonKeyName(cleanName);
      const key = `manual__${normKey || cleanName.toLowerCase()}`;
      if (!manualGroupsMap[key]) {
        manualGroupsMap[key] = {
          manualName: cleanName,
          manualCrm: s.manualDoctorCrm || 'Alocação Manual',
          level: Number(s.manualDoctorLevel || 1),
          role: s.category || allFunctionNames[0] || 'Plantonista',
          shifts: []
        };
      }
      manualGroupsMap[key].shifts.push(s);
    });

  const manRows = Object.entries(manualGroupsMap)
    .sort((a, b) => a[1].manualName.localeCompare(b[1].manualName, 'pt-BR'))
    .map(([mKey, grp]) => {
      const virtualDoc = {
        id: mKey,
        name: `Plantonista alocado manualmente (${grp.manualName})`,
        crm: grp.manualCrm,
        specialty: 'Alocação Manual Gestor',
        razaoSocial: 'Plantonista Avulso / Manual',
        cnpj: '—',
        remunerationLevel: grp.level,
        role: grp.role,
        contractType: 'Coringa / Extra'
      };
      return buildEntry(mKey, virtualDoc, grp.shifts, true);
    });

  return [...regRows, ...manRows];
}