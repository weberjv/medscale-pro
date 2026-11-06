// lib/analytics/emergency-parser.ts

export type ShiftScope = 'ALL' | 'DIURNO' | 'NOTURNO';

export interface StatSummary {
  avg: number;
  median: number;
  p90: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

export interface HourlySlotStats extends StatSummary {
  total: number;
}

export interface ShiftPeriodMetrics {
  totalVolume: number;
  distinctDays: number;
  dailyVolume: StatSummary;
  doorToDoctor: StatSummary & { slaRate20m: number };
  medicalAttendance: StatSummary & { withinGoal25m: boolean };
  lengthOfStay: StatSummary & { withinGoal240m: boolean };
  losDecomposition: {
    preMedicalAvgMin: number;
    consultationAvgMin: number;
    propaedeuticAvgMin: number;
    preMedicalPct: number;
    consultationPct: number;
    propaedeuticPct: number;
  };
  lab: {
    requestCount: number;
    requestRate: number;
    waitStats: StatSummary;
    slaRate90m: number;
  };
  ct: {
    requestCount: number;
    requestRate: number;
    waitStats: StatSummary;
    slaRate120m: number;
  };
  rx: {
    requestCount: number;
    requestRate: number;
    waitStats: StatSummary;
  };
  medication: {
    waitStats: StatSummary;
    adminStats: StatSummary;
  };
  outcomes: {
    admissionCount: number;
    admissionRate: number;
    admissionWaitStats: StatSummary;
    evasionCount: number;
    evasionRate: number;
    earlyReturn48hCount: number;
    earlyReturn48hRate: number;
  };
  demographics: {
    under18: number;
    age18to35: number;
    age36to59: number;
    age60plus: number;
    avgAge: number;
  };
  hourlyProductivity: {
    avgActiveDoctorsPerHour: number;
    patientsPerDoctorHour: StatSummary;
  };
}

export interface DayOfWeekBreakdown {
  dayIndex: number; // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 0=Dom
  dayName: string;
  full24h: ShiftPeriodMetrics;
  diurno: ShiftPeriodMetrics;
  noturno: ShiftPeriodMetrics;
}

export interface DoctorProductivityRow {
  doctorName: string;
  total: number;
  diurno: number;
  noturno: number;
  activeHoursCount: number;
  avgPerActiveHour: number;
  medianPerActiveHour: number;
  stdDevPerActiveHour: number;
  hourlyDistribution: Record<number, number>;
}

export interface EmergencyMetrics {
  monthLabel: string;
  overall: {
    full24h: ShiftPeriodMetrics;
    diurno: ShiftPeriodMetrics;
    noturno: ShiftPeriodMetrics;
  };
  byDayOfWeek: DayOfWeekBreakdown[];
  operationalHoursOrder: number[]; // [7, 8, ..., 23, 0, 1, ..., 6]
  heatmap: {
    matrix: Record<string, number>; // "${dayIndex}_${hour}" -> acumulado no mês
    avgMatrix: Record<string, number>; // "${dayIndex}_${hour}" -> média diária
    cellStats: Record<string, HourlySlotStats>; // "${dayIndex}_${hour}" -> Média, DP, Mediana, Mín-Máx
    hourlyTotals: Record<number, number>;
    hourlyStats: Record<number, HourlySlotStats>; // Por hora (0..23) -> Média, DP, Mediana, Mín-Máx
    hourlyAvgActiveDoctors: Record<number, number>;
    hourlyAvgPatientsPerDoc: Record<number, number>;
  };
  topCIDs: Array<{ name: string; count: number; pct: number; syndrome: string }>;
  syndromeClusters: Array<{ syndrome: string; count: number; pct: number }>;
  doctorProductivity: DoctorProductivityRow[];
}

export interface MonthlyComparisonItem {
  indicator: string;
  prevValue: number;
  currValue: number;
  deltaAbs: number;
  deltaPct: number;
  unit: string;
  improved: boolean;
  diagnosticNote: string;
}

// ==========================================
// FUNÇÕES MATEMÁTICAS E ESTATÍSTICAS PURAS
// ==========================================
const calcMean = (arr: number[]): number =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

const calcPercentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= sorted.length) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const calcStdDev = (arr: number[]): number => {
  if (arr.length <= 1) return 0;
  const mean = calcMean(arr);
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

const buildStatSummary = (arr: number[]): StatSummary => {
  if (arr.length === 0) {
    return { avg: 0, median: 0, p90: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    avg: calcMean(sorted),
    median: calcPercentile(sorted, 0.5),
    p90: calcPercentile(sorted, 0.9),
    stdDev: calcStdDev(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
};

const buildHourlySlotStats = (arr: number[]): HourlySlotStats => {
  const base = buildStatSummary(arr);
  const total = arr.reduce((a, b) => a + b, 0);
  return { ...base, total };
};

// ==========================================
// HIGIENIZAÇÃO E CONVERSÃO DE DADOS DO EXCEL
// ==========================================
const normalizeText = (val: any): string =>
  String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const timeToMinutes = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    if (val > 0 && val < 10) return val * 24 * 60;
    return val > 0 ? val : null;
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.getHours() * 60 + val.getMinutes() + val.getSeconds() / 60;
  }

  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean.includes(':')) {
      const num = Number(clean.replace(',', '.'));
      return !isNaN(num) && num > 0 ? num : null;
    }
    const parts = clean.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const hours = parts[0];
      const mins = parts[1];
      const secs = parts[2] && !isNaN(parts[2]) ? parts[2] : 0;
      const totalMin = hours * 60 + mins + secs / 60;
      return totalMin >= 0 && totalMin <= 4320 ? totalMin : null;
    }
  }
  return null;
};

export const parseFlexibleDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === 'number') {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = val - Math.floor(val) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return new Date(
      dateInfo.getUTCFullYear(),
      dateInfo.getUTCMonth(),
      dateInfo.getUTCDate(),
      hours,
      minutes,
      seconds
    );
  }

  if (typeof val === 'string') {
    const clean = val.trim();
    const brMatch = clean.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (brMatch) {
      const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = brMatch;
      const d = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(hh),
        Number(min),
        Number(ss)
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const classifySyndrome = (cidRaw: string): string => {
  const text = normalizeText(cidRaw);
  if (!text || text === 'NAO INFORMADO') return 'Outros / Não Especificado';

  if (
    text.includes('VIAS AEREAS') ||
    text.includes('NASOFARINGITE') ||
    text.includes('SINUSITE') ||
    text.includes('AMIGDALITE') ||
    text.includes('FARINGITE') ||
    text.includes('TOSSE') ||
    text.includes('BRONQUITE') ||
    text.includes('PNEUMONIA') ||
    text.includes('ASMA') ||
    text.includes('GRIPE') ||
    text.includes('INFLUENZA') ||
    /^J[0-2]\d/.test(text)
  ) {
    return 'Síndromes Respiratórias / IVAS';
  }
  if (
    text.includes('DIARREIA') ||
    text.includes('GASTROENTERITE') ||
    text.includes('ABDOMINAL') ||
    text.includes('NAUSEA') ||
    text.includes('VOMITO') ||
    text.includes('DISPEPSIA') ||
    text.includes('GASTRITE') ||
    text.includes('COLICA BILIAR') ||
    /^(A09|R10|R11|K29|K52)/.test(text)
  ) {
    return 'Gastroenterites / Dor Abdominal';
  }
  if (
    text.includes('LOMBAR') ||
    text.includes('LOMBALGIA') ||
    text.includes('DORSALGIA') ||
    text.includes('CERVICALGIA') ||
    text.includes('MEMBRO') ||
    text.includes('ARTICULAR') ||
    text.includes('MIALGIA') ||
    /^M\d\d/.test(text)
  ) {
    return 'Osteomusculares / Lombalgias';
  }
  if (
    text.includes('TORACICA') ||
    text.includes('HIPERTENSAO') ||
    text.includes('SINCOPE') ||
    text.includes('PALPITAC') ||
    text.includes('TAQUICARDIA') ||
    text.includes('INFARTO') ||
    text.includes('ANGINA') ||
    text.includes('ACIDENTE VASCULAR') ||
    /^(I10|I20|I21|R07|R55)/.test(text)
  ) {
    return 'Cardioneurovasculares / Dor Torácica';
  }
  if (
    text.includes('CEFALEIA') ||
    text.includes('ENXAQUECA') ||
    text.includes('VERTIGEM') ||
    text.includes('TONTURA') ||
    /^(R51|G43|G44|H81)/.test(text)
  ) {
    return 'Neurológicas / Cefaleias e Vertigens';
  }
  if (
    text.includes('URINARIA') ||
    text.includes('URINARIO') ||
    text.includes('CISTITE') ||
    text.includes('COLICA RENAL') ||
    text.includes('NEFROLITIASE') ||
    /^(N30|N39|N20)/.test(text)
  ) {
    return 'Urológicas / ITU e Cólica Nefrítica';
  }
  if (
    text.includes('DENGUE') ||
    text.includes('FEBRE') ||
    text.includes('VIROSE') ||
    text.includes('INFECCAO VIRAL') ||
    /^(A90|A91|B34|R50)/.test(text)
  ) {
    return 'Síndromes Febris / Arboviroses';
  }
  if (
    text.includes('ANSIEDADE') ||
    text.includes('PANICO') ||
    text.includes('DEPRESS') ||
    /^F\d\d/.test(text)
  ) {
    return 'Saúde Mental / Ansiedade';
  }
  return 'Outras Condições Clínicas';
};

interface CleanRecord {
  calDateKey: string; // YYYY-MM-DD (data civil real do evento)
  opDateKey: string; // YYYY-MM-DD (após offset de -7h)
  opDayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  arrivalHour: number; // 0 a 23
  shift: 'DIURNO' | 'NOTURNO';
  doorToDocMin: number | null;
  medAttendMin: number | null;
  losMin: number | null;
  labRequested: boolean;
  labWaitMin: number | null;
  ctRequested: boolean;
  ctWaitMin: number | null;
  rxRequested: boolean;
  rxWaitMin: number | null;
  medWaitMin: number | null;
  medAdminMin: number | null;
  admitted: boolean;
  admissionWaitMin: number | null;
  evaded: boolean;
  earlyReturn48h: boolean;
  age: number | null;
  cid: string;
  syndrome: string;
  doctorName: string;
}

const computeSubsetMetrics = (
  records: CleanRecord[],
  validCalendarDatesSet: Set<string>
): ShiftPeriodMetrics => {
  const total = records.length;
  const byOpDate: Record<string, number> = {};
  const doorToDocArr: number[] = [];
  let doorSla20Count = 0;

  const medAttendArr: number[] = [];
  const losArr: number[] = [];

  let labReqCount = 0;
  const labWaitArr: number[] = [];
  let labSla90Count = 0;

  let ctReqCount = 0;
  const ctWaitArr: number[] = [];
  let ctSla120Count = 0;

  let rxReqCount = 0;
  const rxWaitArr: number[] = [];

  const medWaitArr: number[] = [];
  const medAdminArr: number[] = [];

  let admCount = 0;
  const admWaitArr: number[] = [];
  let evasionCount = 0;
  let earlyRetCount = 0;

  let u18 = 0,
    a18_35 = 0,
    a36_59 = 0,
    a60 = 0;
  const agesArr: number[] = [];

  const slotDoctors: Record<string, Set<string>> = {};
  const docSlotCounts: Record<string, number> = {};

  records.forEach((r) => {
    // Contabiliza na distribuição diária apenas datas operacionais completas presentes no mês
    if (validCalendarDatesSet.has(r.opDateKey)) {
      byOpDate[r.opDateKey] = (byOpDate[r.opDateKey] || 0) + 1;
    }

    if (r.doorToDocMin !== null) {
      doorToDocArr.push(r.doorToDocMin);
      if (r.doorToDocMin <= 20) doorSla20Count++;
    }
    if (r.medAttendMin !== null) medAttendArr.push(r.medAttendMin);
    if (r.losMin !== null) losArr.push(r.losMin);

    if (r.labRequested) {
      labReqCount++;
      if (r.labWaitMin !== null) {
        labWaitArr.push(r.labWaitMin);
        if (r.labWaitMin <= 90) labSla90Count++;
      }
    }

    if (r.ctRequested) {
      ctReqCount++;
      if (r.ctWaitMin !== null) {
        ctWaitArr.push(r.ctWaitMin);
        if (r.ctWaitMin <= 120) ctSla120Count++;
      }
    }

    if (r.rxRequested) {
      rxReqCount++;
      if (r.rxWaitMin !== null) rxWaitArr.push(r.rxWaitMin);
    }

    if (r.medWaitMin !== null) medWaitArr.push(r.medWaitMin);
    if (r.medAdminMin !== null) medAdminArr.push(r.medAdminMin);

    if (r.admitted) {
      admCount++;
      if (r.admissionWaitMin !== null) admWaitArr.push(r.admissionWaitMin);
    }
    if (r.evaded) evasionCount++;
    if (r.earlyReturn48h) earlyRetCount++;

    if (r.age !== null && r.age >= 0) {
      agesArr.push(r.age);
      if (r.age < 18) u18++;
      else if (r.age <= 35) a18_35++;
      else if (r.age <= 59) a36_59++;
      else a60++;
    }

    if (r.doctorName !== 'NÃO IDENTIFICADO') {
      const slotKey = `${r.calDateKey}_${r.arrivalHour}`;
      if (!slotDoctors[slotKey]) slotDoctors[slotKey] = new Set();
      slotDoctors[slotKey].add(r.doctorName);

      const docSlotKey = `${r.calDateKey}_${r.arrivalHour}_${r.doctorName}`;
      docSlotCounts[docSlotKey] = (docSlotCounts[docSlotKey] || 0) + 1;
    }
  });

  const dailyCounts = Object.values(byOpDate);
  const doorStats = buildStatSummary(doorToDocArr);
  const attendStats = buildStatSummary(medAttendArr);
  const losStats = buildStatSummary(losArr);

  const preMedAvg = doorStats.avg;
  const consultAvg = attendStats.avg;
  const propAvg = Math.max(0, losStats.avg - (preMedAvg + consultAvg));
  const totalLosRef = preMedAvg + consultAvg + propAvg || 1;

  const activeDoctorsPerSlot = Object.values(slotDoctors).map((s) => s.size);
  const ptsPerDocHourArr = Object.values(docSlotCounts);

  const safeTotal = total || 1;

  return {
    totalVolume: total,
    distinctDays: dailyCounts.length,
    dailyVolume: buildStatSummary(dailyCounts),
    doorToDoctor: {
      ...doorStats,
      slaRate20m: doorStats.count > 0 ? (doorSla20Count / doorStats.count) * 100 : 0,
    },
    medicalAttendance: {
      ...attendStats,
      withinGoal25m: attendStats.avg <= 25,
    },
    lengthOfStay: {
      ...losStats,
      withinGoal240m: losStats.avg <= 240,
    },
    losDecomposition: {
      preMedicalAvgMin: preMedAvg,
      consultationAvgMin: consultAvg,
      propaedeuticAvgMin: propAvg,
      preMedicalPct: (preMedAvg / totalLosRef) * 100,
      consultationPct: (consultAvg / totalLosRef) * 100,
      propaedeuticPct: (propAvg / totalLosRef) * 100,
    },
    lab: {
      requestCount: labReqCount,
      requestRate: (labReqCount / safeTotal) * 100,
      waitStats: buildStatSummary(labWaitArr),
      slaRate90m: labWaitArr.length > 0 ? (labSla90Count / labWaitArr.length) * 100 : 0,
    },
    ct: {
      requestCount: ctReqCount,
      requestRate: (ctReqCount / safeTotal) * 100,
      waitStats: buildStatSummary(ctWaitArr),
      slaRate120m: ctWaitArr.length > 0 ? (ctSla120Count / ctWaitArr.length) * 100 : 0,
    },
    rx: {
      requestCount: rxReqCount,
      requestRate: (rxReqCount / safeTotal) * 100,
      waitStats: buildStatSummary(rxWaitArr),
    },
    medication: {
      waitStats: buildStatSummary(medWaitArr),
      adminStats: buildStatSummary(medAdminArr),
    },
    outcomes: {
      admissionCount: admCount,
      admissionRate: (admCount / safeTotal) * 100,
      admissionWaitStats: buildStatSummary(admWaitArr),
      evasionCount,
      evasionRate: (evasionCount / safeTotal) * 100,
      earlyReturn48hCount: earlyRetCount,
      earlyReturn48hRate: (earlyRetCount / safeTotal) * 100,
    },
    demographics: {
      under18: u18,
      age18to35: a18_35,
      age36to59: a36_59,
      age60plus: a60,
      avgAge: calcMean(agesArr),
    },
    hourlyProductivity: {
      avgActiveDoctorsPerHour: calcMean(activeDoctorsPerSlot),
      patientsPerDoctorHour: buildStatSummary(ptsPerDocHourArr),
    },
  };
};

// ==========================================
// MOTOR PRINCIPAL DE PARSING (LGPD POR DESIGN)
// ==========================================
export const parseEmergencyData = (rawData: any[], monthLabel = 'Mensal'): EmergencyMetrics => {
  const cleanRecords: CleanRecord[] = [];
  const cidCountMap: Record<string, number> = {};
  const syndromeCountMap: Record<string, number> = {};
  const calendarDatesSet = new Set<string>();

  const operationalHoursOrder = [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6,
  ];

  rawData.forEach((rawRow) => {
    const setorNorm = normalizeText(rawRow['Setor']);
    const clinicaNorm = normalizeText(rawRow['Clínica'] ?? rawRow['Clinica']);
    if (!setorNorm.includes('PS ADULTO') || !clinicaNorm.includes('MEDICA')) {
      return;
    }

    // LGPD POR DESIGN: Descarte imediato em memória de colunas sensíveis
    const {
      Paciente,
      Email,
      Endereço,
      Endereco,
      Numero,
      bairro,
      Bairro,
      'Dt. Nascimento': _dtNasc,
      ...row
    } = rawRow;

    const mainTimestamp =
      parseFlexibleDate(row['Entrada']) || parseFlexibleDate(row['Senha/Retirada']);
    if (!mainTimestamp) return;

    const cY = mainTimestamp.getFullYear();
    const cM = String(mainTimestamp.getMonth() + 1).padStart(2, '0');
    const cD = String(mainTimestamp.getDate()).padStart(2, '0');
    const calDateKey = `${cY}-${cM}-${cD}`;
    calendarDatesSet.add(calDateKey);

    // Offset operacional de -7 horas (Plantão 07:00 às 06:59)
    const opDateObj = new Date(mainTimestamp.getTime() - 7 * 60 * 60 * 1000);
    const yyyy = opDateObj.getFullYear();
    const mm = String(opDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(opDateObj.getDate()).padStart(2, '0');
    const opDateKey = `${yyyy}-${mm}-${dd}`;
    const opDayOfWeek = opDateObj.getDay();

    const arrivalHour = mainTimestamp.getHours();
    const shift: 'DIURNO' | 'NOTURNO' =
      arrivalHour >= 7 && arrivalHour <= 18 ? 'DIURNO' : 'NOTURNO';

    const doorToDocMin =
      timeToMinutes(row['Esp. Totem x Médico']) ??
      timeToMinutes(row['Esp. Recepção x Médico']);

    const medAttendMin = timeToMinutes(row['Atend. Médico']);

    const losRaw = Number(row['Qt Minutos Entrada- Desfecho']);
    const losMin =
      !isNaN(losRaw) && losRaw > 0 && losRaw <= 10080
        ? losRaw
        : timeToMinutes(row['Tempo PS']);

    const labRequested = normalizeText(row['Exame Laboratório']) === 'S';
    let labWaitMin = timeToMinutes(row['Espera Laboratório']);
    if (labRequested && labWaitMin === null) {
      const dtPresc = parseFlexibleDate(row['Dt Prescrição']);
      const dtLaudoLab = parseFlexibleDate(row['Dt Laudo Lab']);
      if (dtPresc && dtLaudoLab && dtLaudoLab >= dtPresc) {
        labWaitMin = (dtLaudoLab.getTime() - dtPresc.getTime()) / 60000;
      }
    }

    const ctWaitCandidate =
      timeToMinutes(row['Esp TC Presc x Exec']) ?? timeToMinutes(row['Espera TC']);
    const ctLaudoMin = timeToMinutes(row['Espera Laudo TC']);
    const hasCtTimestamp = Boolean(
      row['Espera TC'] || row['Esp TC Presc x Exec'] || row['Dt Laudo TC']
    );
    const ctRequested = hasCtTimestamp;
    let ctWaitMin = ctWaitCandidate;
    if (ctWaitMin !== null && ctLaudoMin !== null && ctWaitMin + ctLaudoMin <= 1440) {
      ctWaitMin = ctWaitMin + ctLaudoMin;
    }

    const rxWaitMin =
      timeToMinutes(row['Esp RX Presc x Exec']) ?? timeToMinutes(row['Espera RX']);
    const rxRequested = Boolean(row['Espera RX'] || row['Esp RX Presc x Exec']);

    const medWaitMin = timeToMinutes(row['Espera Medicamento']);
    const medAdminMin = timeToMinutes(row['Tempo ADM Medicamento']);

    const admitted = normalizeText(row['Internado']) === 'S';
    const admissionWaitMin = timeToMinutes(row['Espera Internação']);

    const motivoAltaNorm = normalizeText(row['MOTIVO_ALTA']);
    const evaded =
      motivoAltaNorm.includes('EVADIU') || motivoAltaNorm.includes('DESISTENCIA');

    let earlyReturn48h = false;
    const lastPassDate = parseFlexibleDate(row['DT Últ Passagem PS']);
    if (lastPassDate) {
      const diffHours =
        (mainTimestamp.getTime() - lastPassDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 0.5 && diffHours <= 48) {
        earlyReturn48h = true;
      }
    }

    const ageNum = Number(row['Idade']);
    const age = !isNaN(ageNum) && ageNum >= 0 && ageNum <= 120 ? ageNum : null;

    const cidClean = String(row['CID'] || 'NÃO INFORMADO').trim().toUpperCase();
    const syndrome = classifySyndrome(cidClean);
    if (cidClean && cidClean !== 'NÃO INFORMADO' && cidClean !== 'NAN') {
      cidCountMap[cidClean] = (cidCountMap[cidClean] || 0) + 1;
      syndromeCountMap[syndrome] = (syndromeCountMap[syndrome] || 0) + 1;
    }

    const doctorName = String(
      row['Medico Anamnese'] || row['Médico 1º Atend'] || 'NÃO IDENTIFICADO'
    )
      .trim()
      .toUpperCase();

    cleanRecords.push({
      calDateKey,
      opDateKey,
      opDayOfWeek,
      arrivalHour,
      shift,
      doorToDocMin,
      medAttendMin,
      losMin,
      labRequested,
      labWaitMin,
      ctRequested,
      ctWaitMin,
      rxRequested,
      rxWaitMin,
      medWaitMin,
      medAdminMin,
      admitted,
      admissionWaitMin,
      evaded,
      earlyReturn48h,
      age,
      cid: cidClean,
      syndrome,
      doctorName,
    });
  });

  const overall24h = computeSubsetMetrics(cleanRecords, calendarDatesSet);
  const overallDiurno = computeSubsetMetrics(
    cleanRecords.filter((r) => r.shift === 'DIURNO'),
    calendarDatesSet
  );
  const overallNoturno = computeSubsetMetrics(
    cleanRecords.filter((r) => r.shift === 'NOTURNO'),
    calendarDatesSet
  );

  const daysOrder = [
    { index: 1, name: 'Segunda-feira' },
    { index: 2, name: 'Terça-feira' },
    { index: 3, name: 'Quarta-feira' },
    { index: 4, name: 'Quinta-feira' },
    { index: 5, name: 'Sexta-feira' },
    { index: 6, name: 'Sábado' },
    { index: 0, name: 'Domingo' },
  ];

  const byDayOfWeek: DayOfWeekBreakdown[] = daysOrder.map((d) => {
    const dayRecords = cleanRecords.filter((r) => r.opDayOfWeek === d.index);
    return {
      dayIndex: d.index,
      dayName: d.name,
      full24h: computeSubsetMetrics(dayRecords, calendarDatesSet),
      diurno: computeSubsetMetrics(
        dayRecords.filter((r) => r.shift === 'DIURNO'),
        calendarDatesSet
      ),
      noturno: computeSubsetMetrics(
        dayRecords.filter((r) => r.shift === 'NOTURNO'),
        calendarDatesSet
      ),
    };
  });

  // =========================================================================
  // CÁLCULO FIDEDIGNO DA DISTRIBUIÇÃO DIÁRIA POR HORA E POR CÉLULA DO HEATMAP
  // =========================================================================
  const matrix: Record<string, number> = {};
  const avgMatrix: Record<string, number> = {};
  const cellStats: Record<string, HourlySlotStats> = {};
  const hourlyTotals: Record<number, number> = {};
  const hourlyStats: Record<number, HourlySlotStats> = {};
  const hourlySlotDoctors: Record<number, Record<string, Set<string>>> = {};

  // Contagem real por [calDateKey_hour]
  const calDateHourCounts: Record<string, number> = {};

  operationalHoursOrder.forEach((h) => {
    hourlyTotals[h] = 0;
    hourlySlotDoctors[h] = {};
  });

  cleanRecords.forEach((r) => {
    const key = `${r.opDayOfWeek}_${r.arrivalHour}`;
    matrix[key] = (matrix[key] || 0) + 1;
    hourlyTotals[r.arrivalHour] = (hourlyTotals[r.arrivalHour] || 0) + 1;

    const calSlotKey = `${r.calDateKey}_${r.arrivalHour}`;
    calDateHourCounts[calSlotKey] = (calDateHourCounts[calSlotKey] || 0) + 1;

    if (r.doctorName !== 'NÃO IDENTIFICADO') {
      if (!hourlySlotDoctors[r.arrivalHour][r.calDateKey]) {
        hourlySlotDoctors[r.arrivalHour][r.calDateKey] = new Set();
      }
      hourlySlotDoctors[r.arrivalHour][r.calDateKey].add(r.doctorName);
    }
  });

  // Para cada dia civil presente na planilha e cada hora (0..23),
  // mapeamos a série diária exata (incluindo zeros) para calcular Média, Mediana, DP e Mín-Máx
  const cellDailySeries: Record<string, number[]> = {};
  const hourlyDailySeries: Record<number, number[]> = {};
  operationalHoursOrder.forEach((h) => {
    hourlyDailySeries[h] = [];
    daysOrder.forEach((d) => {
      cellDailySeries[`${d.index}_${h}`] = [];
    });
  });

  const sortedCalDates = Array.from(calendarDatesSet).sort();
  sortedCalDates.forEach((cDateStr) => {
    const [yy, mm, dd] = cDateStr.split('-').map(Number);
    operationalHoursOrder.forEach((h) => {
      const slotDt = new Date(yy, mm - 1, dd, h, 0, 0);
      const opDt = new Date(slotDt.getTime() - 7 * 60 * 60 * 1000);
      const opDow = opDt.getDay();
      const countVal = calDateHourCounts[`${cDateStr}_${h}`] || 0;

      hourlyDailySeries[h].push(countVal);
      const cellKey = `${opDow}_${h}`;
      if (!cellDailySeries[cellKey]) cellDailySeries[cellKey] = [];
      cellDailySeries[cellKey].push(countVal);
    });
  });

  operationalHoursOrder.forEach((h) => {
    hourlyStats[h] = buildHourlySlotStats(hourlyDailySeries[h]);
    daysOrder.forEach((d) => {
      const key = `${d.index}_${h}`;
      const stats = buildHourlySlotStats(cellDailySeries[key] || []);
      cellStats[key] = stats;
      avgMatrix[key] = stats.avg;
    });
  });

  const hourlyAvgActiveDoctors: Record<number, number> = {};
  const hourlyAvgPatientsPerDoc: Record<number, number> = {};

  operationalHoursOrder.forEach((h) => {
    const docCounts = Object.values(hourlySlotDoctors[h]).map((s) => s.size);
    const avgDocs = calcMean(docCounts);
    hourlyAvgActiveDoctors[h] = avgDocs;
    const avgArrivalsInHour = hourlyStats[h]?.avg || 0;
    hourlyAvgPatientsPerDoc[h] = avgDocs > 0 ? avgArrivalsInHour / avgDocs : 0;
  });

  // Produtividade Nominal por Médico
  const docMap: Record<
    string,
    {
      total: number;
      diurno: number;
      noturno: number;
      slots: Record<string, number>;
      hourly: Record<number, number>;
    }
  > = {};

  cleanRecords.forEach((r) => {
    if (r.doctorName === 'NÃO IDENTIFICADO') return;
    if (!docMap[r.doctorName]) {
      docMap[r.doctorName] = { total: 0, diurno: 0, noturno: 0, slots: {}, hourly: {} };
    }
    const d = docMap[r.doctorName];
    d.total++;
    if (r.shift === 'DIURNO') d.diurno++;
    else d.noturno++;

    const slotKey = `${r.calDateKey}_${r.arrivalHour}`;
    d.slots[slotKey] = (d.slots[slotKey] || 0) + 1;
    d.hourly[r.arrivalHour] = (d.hourly[r.arrivalHour] || 0) + 1;
  });

  const doctorProductivity: DoctorProductivityRow[] = Object.entries(docMap)
    .map(([doctorName, data]) => {
      const slotCounts = Object.values(data.slots);
      return {
        doctorName,
        total: data.total,
        diurno: data.diurno,
        noturno: data.noturno,
        activeHoursCount: slotCounts.length,
        avgPerActiveHour: calcMean(slotCounts),
        medianPerActiveHour: calcPercentile(slotCounts, 0.5),
        stdDevPerActiveHour: calcStdDev(slotCounts),
        hourlyDistribution: data.hourly,
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalValidCIDs = Object.values(cidCountMap).reduce((a, b) => a + b, 0) || 1;
  const topCIDs = Object.entries(cidCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({
      name,
      count,
      pct: (count / totalValidCIDs) * 100,
      syndrome: classifySyndrome(name),
    }));

  const syndromeClusters = Object.entries(syndromeCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([syndrome, count]) => ({
      syndrome,
      count,
      pct: (count / totalValidCIDs) * 100,
    }));

  return {
    monthLabel,
    overall: {
      full24h: overall24h,
      diurno: overallDiurno,
      noturno: overallNoturno,
    },
    byDayOfWeek,
    operationalHoursOrder,
    heatmap: {
      matrix,
      avgMatrix,
      cellStats,
      hourlyTotals,
      hourlyStats,
      hourlyAvgActiveDoctors,
      hourlyAvgPatientsPerDoc,
    },
    topCIDs,
    syndromeClusters,
    doctorProductivity,
  };
};

// ==========================================
// MOTOR DE COMPARATIVO EVOLUTIVO MENSAL (MoM)
// ==========================================
export const compareMonthlyMetrics = (
  prev: EmergencyMetrics,
  curr: EmergencyMetrics
): MonthlyComparisonItem[] => {
  const p = prev.overall.full24h;
  const c = curr.overall.full24h;

  const volDeltaPct =
    p.totalVolume > 0 ? ((c.totalVolume - p.totalVolume) / p.totalVolume) * 100 : 0;

  const buildRow = (
    indicator: string,
    prevVal: number,
    currVal: number,
    unit: string,
    lowerIsBetter: boolean,
    customNote?: string
  ): MonthlyComparisonItem => {
    const deltaAbs = currVal - prevVal;
    const deltaPct = prevVal !== 0 ? (deltaAbs / prevVal) * 100 : 0;
    const improved = lowerIsBetter ? deltaAbs <= 0 : deltaAbs >= 0;
    return {
      indicator,
      prevValue: prevVal,
      currValue: currVal,
      deltaAbs,
      deltaPct,
      unit,
      improved,
      diagnosticNote: customNote || (improved ? 'Evolução favorável' : 'Atenção gerencial'),
    };
  };

  let doorNote = 'Estabilidade operacional na porta';
  if (c.doorToDoctor.p90 > p.doorToDoctor.p90 + 2) {
    doorNote =
      volDeltaPct > 5
        ? 'Sobrecarga de Demanda: Volume cresceu pressionando a porta (avaliar médico extra no pico)'
        : 'Perda de Eficiência Operacional: Tempo subiu sem aumento proporcional de demanda';
  } else if (c.doorToDoctor.p90 < p.doorToDoctor.p90 - 2) {
    doorNote = 'Ganho real de agilidade na recepção/porta médica';
  }

  return [
    buildRow('Volume Total de Atendimentos', p.totalVolume, c.totalVolume, 'pac', false, 'Variação de demanda global'),
    buildRow('Média Diária de Atendimentos', p.dailyVolume.avg, c.dailyVolume.avg, 'pac/d', false, 'Pressão média diária'),
    buildRow('Tempo Porta-Médico (Média)', p.doorToDoctor.avg, c.doorToDoctor.avg, 'min', true, doorNote),
    buildRow('Tempo Porta-Médico (P90)', p.doorToDoctor.p90, c.doorToDoctor.p90, 'min', true, doorNote),
    buildRow('% Meta Porta-Médico (<= 20 min)', p.doorToDoctor.slaRate20m, c.doorToDoctor.slaRate20m, '%', false),
    buildRow('Tempo de Consulta Médica (Média)', p.medicalAttendance.avg, c.medicalAttendance.avg, 'min', true),
    buildRow('Tempo Permanência / Desfecho (Média)', p.lengthOfStay.avg, c.lengthOfStay.avg, 'min', true),
    buildRow('SLA Laboratório (<= 90 min)', p.lab.slaRate90m, c.lab.slaRate90m, '%', false),
    buildRow('SLA Tomografia (<= 120 min)', p.ct.slaRate120m, c.ct.slaRate120m, '%', false),
    buildRow('Taxa de Coleta Laboratorial', p.lab.requestRate, c.lab.requestRate, '%', true),
    buildRow('Taxa de Conversão em Internação', p.outcomes.admissionRate, c.outcomes.admissionRate, '%', true),
    buildRow('Taxa de Retorno Precoce (< 48h)', p.outcomes.earlyReturn48hRate, c.outcomes.earlyReturn48hRate, '%', true),
    buildRow('Taxa de Evasão', p.outcomes.evasionRate, c.outcomes.evasionRate, '%', true),
    buildRow('Atendimentos / Médico / Hora (Média)', p.hourlyProductivity.patientsPerDoctorHour.avg, c.hourlyProductivity.patientsPerDoctorHour.avg, 'pac/h', false),
  ];
};