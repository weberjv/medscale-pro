import * as XLSX from 'xlsx';

// ============================================================================
// INTERFACES E TIPOS ESTATÍSTICOS / VSM LEAN HEALTHCARE (MULTI-SETOR & CLÍNICA)
// ============================================================================

export interface MetricStats {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  p90: number;
  count: number;
  sum: number;
}

export interface ShiftMetricBreakdown {
  overall: MetricStats;
  dayShift: MetricStats;   // 07h00 - 18h59
  nightShift: MetricStats; // 19h00 - 06h59
}

export interface HeatmapCellStat {
  dayIndex: number; // 0 = Seg ... 6 = Dom (Dia Operacional 07h -> 06h59 D+1)
  hour: number;     // 7, 8, ..., 23, 0, 1, ..., 6
  totalCount: number;
  OccurrencesDays: number;
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
}

export interface SimultaneousCensusCell {
  dayIndex: number;
  hour: number;
  totalStats: MetricStats;
  portaStats: MetricStats;
  fastReavMedStats: MetricStats;
  giroExamesStats: MetricStats;
  boardingStats: MetricStats;
  totalMean: number;
  totalStdDev: number;
  totalMedian: number;
  totalMin: number;
  totalMax: number;
  portaMean: number;
  fastReavMedMean: number;
  giroExamesMean: number;
  boardingMean: number;
}

export interface HourlySimultaneousPoint {
  hour: number;
  label: string;
  newArrivalsStats: MetricStats;
  totalStats: MetricStats;
  portaStats: MetricStats;       // Frente 1: Porta / 1º Atendimento
  fastReavMedStats: MetricStats; // Frente 2A: Fast Reav (Só Medicação)
  giroExamesStats: MetricStats;  // Frente 2B: Giro de Exames (Lab/TC/RX/USG)
  boardingStats: MetricStats;    // Frente 3: Boarding (UI/UTI)
  // Recomendação Dinâmica de Dimensionamento Médico por Frente
  recommendedDocsPorta: number;
  recommendedDocsGiroReav: number;
  recommendedDocsTotal: number;
  // Propriedades planas mantidas para retrocompatibilidade
  newArrivalsMean: number;
  newArrivalsMedian: number;
  totalSimultaneousMean: number;
  totalSimultaneousMedian: number;
  totalSimultaneousMax: number;
  portaMean: number;
  fastReavMedMean: number;
  giroExamesMean: number;
  boardingMean: number;
}

export interface DoctorProductivity {
  name: string;
  totalAttendances: number;
  dayAttendances: number;
  nightAttendances: number;
  shiftsWorked: number;
  meanPerShift: number;
  stdDevPerShift: number;
  medianPerShift: number;
  minPerShift: number;
  maxPerShift: number;
  meanConsultTime: number;
  medianConsultTime: number;
  meanDoorToDoc: number;
  meanLos: number;
  medianLos: number;
  labRate: number;
  rxRate: number;
  tcRate: number;
  medRate: number;
  admissionRate: number;
  directDischargeRate: number;
}

export interface DoctorConductRow {
  name: string;
  firstAttendCount: number;
  firstDayCount: number;
  firstNightCount: number;
  directDischargeCount: number;
  directDischargePct: number;
  fastReavMedOnlyCount: number;
  fastReavMedOnlyPct: number;
  medOrderedPct: number;
  labOrderedPct: number;
  rxOrderedPct: number;
  tcOrderedPct: number;
  usgOrderedPct: number;
  convertedToAdmissionCount: number;
  convertedToAdmissionPct: number;
  firstAttendMeanConsultMin: number;
  firstAttendMeanLosMin: number;
  firstAttendMedianLosMin: number;
  lastAttendCount: number;
  lastDayCount: number;
  lastNightCount: number;
  closedOwnPatientsCount: number;
  closedHandoffPatientsCount: number;
  handoffAbsorptionPct: number;
  postPropDischargeCount: number;
  postPropDischargePct: number;
  admissionsSignedCount: number;
  admissionsSignedPct: number;
  netReavalBalance: number;
}

export interface CidStat {
  cid: string;
  count: number;
  percentage: number;
  dayCount: number;
  nightCount: number;
  meanLos: number;
  medianLos: number;
  admissionRate: number;
}

export interface CidClusterStat {
  clusterName: string;
  count: number;
  percentage: number;
  meanLos: number;
  medianLos: number;
  labRate: number;
  tcRate: number;
  medRate: number;
  admissionRate: number;
  topCids: { cid: string; count: number }[];
}

export interface CidThroughputRow {
  cid: string;
  clusterName: string;
  totalCount: number;
  pctOfTotalPs: number;
  directDischargeCount: number;
  directDischargePct: number;
  fastReavMedCount: number;
  fastReavMedPct: number;
  diagnosticGiroCount: number;
  diagnosticGiroPct: number;
  admittedCount: number;
  admittedPct: number;
  meanLos: number;
  medianLos: number;
}

export interface BedTypeBoardingBreakdown {
  bedType: 'UI' | 'UTI' | 'Surgical' | 'Clinical' | 'Global';
  label: string;
  admittedCount: number;
  pctOfAdmissions: number;
  uiCount: number;
  utiCount: number;
  surgicalCount: number;
  surgicalPct: number;
  physicalConfirmedCount: number;
  t1DecisionToVirtualStats: MetricStats; // Solicitação/Desfecho -> Leito Virtual (Plano)
  t1AguardoToVirtualStats: MetricStats;  // Dt ent aguard -> Leito Virtual (Plano)
  t2VirtualToPhysicalStats: MetricStats; // Leito Virtual -> Subida Física ao Leito UI/UTI
  totalBoardingStats: MetricStats;       // Aguardo -> Entrada Física na Unidade
  hospitalStayDaysStats: MetricStats;    // Permanência hospitalar (dias)
  wastedBedHours: number;                // Horas-maca retidas no PS
  equivalentBlockedBeds24h: number;      // Macas físicas bloqueadas 24h/dia no período
}

export interface ConvenioBoardingStat {
  convenio: string;
  admittedCount: number;
  pctOfAdmissions: number;
  uiCount: number;
  utiCount: number;
  ccCount: number;
  clinicalCount: number;
  t1VirtualApprovalStats: MetricStats;
  t2PhysicalUploadStats: MetricStats;
  totalBoardingStats: MetricStats;
  hospitalStayDaysStats: MetricStats;
  // Estratificado UI vs UTI dentro do Convênio
  uiT1VirtualStats: MetricStats;
  uiT2PhysicalStats: MetricStats;
  uiTotalBoardingStats: MetricStats;
  utiT1VirtualStats: MetricStats;
  utiT2PhysicalStats: MetricStats;
  utiTotalBoardingStats: MetricStats;
  // Estratificado Cirúrgico vs Clínico dentro do Convênio
  surgicalTotalBoardingStats: MetricStats;
  clinicalTotalBoardingStats: MetricStats;
}

export interface SectorClinicSummaryRow {
  setor: string;
  clinica: string;
  totalCount: number;
  pctOfGlobal: number;
  dayCount: number;
  nightCount: number;
  directDischargePct: number;
  fastReavMedPct: number;
  diagnosticExamsPct: number;
  admissionsCount: number;
  uiCount: number;
  utiCount: number;
  surgicalAdmissionsCount: number;
  conversionRate: number;
  doorToDocStats: MetricStats;
  losStats: MetricStats;
  boardingTotalStats: MetricStats;
}

export interface LosAgingBucket {
  bucketLabel: string;
  rangeDescription: string;
  count: number;
  percentage: number;
  directDischargeCount: number;
  fastReavCount: number;
  diagnosticExamsCount: number;
  admittedCount: number;
  meanLos: number;
}

export interface ShiftChangeBottleneckAnalytics {
  morningWindowReadyBefore7hCount: number;  // Laudo pronto entre 04h30 e 06h59, alta só após 07h00 c/ handoff
  morningWindowExtraWaitStats: MetricStats;
  eveningWindowReadyBefore19hCount: number; // Laudo pronto entre 16h30 e 18h59, alta só após 19h00 c/ handoff
  eveningWindowExtraWaitStats: MetricStats;
  totalShiftChangeRetainedCount: number;
  pctOfAllPostLaudoPatients: number;
}

export interface DataCompletenessAudit {
  totalRecordsEvaluated: number;
  doorToDocCompletenessPct: number;
  consultTimeCompletenessPct: number;
  labReportNativeColPct: number;
  labReportReconstructedFromTsCount: number;
  tcReportCompletenessPct: number;
  losCompletenessPct: number;
  negativeTimesPurgedCount: number;
  cappedOutliersCount: number;
  cate3493MatchRateOnAdmissionsPct: number;
  chaa3704MatchRateOnAdmissionsPct: number;
}

export interface DiagnosticChangePair {
  cidIn: string;
  cidOut: string;
  count: number;
  isSameChapter: boolean;
  classification: 'Concordante Exato' | 'Refinamento Fisiopatológico' | 'Mudança de Sistema/Capítulo';
}

export interface DiagnosticGovernanceAnalytics {
  hasChaa3704Data: boolean;
  evaluatedAdmissionsCount: number;
  exactMatchCount: number;
  exactMatchPct: number;
  reclassifiedCount: number;
  reclassifiedPct: number;
  sameChapterRefinementCount: number;
  sameChapterRefinementPct: number;
  crossChapterDiscordanceCount: number;
  crossChapterDiscordancePct: number;
  meanLosExactMatch: number;
  meanLosReclassified: number;
  topReclassifications: DiagnosticChangePair[];
}

export interface ReturnVisitAnalytics {
  totalWithPriorVisitRecord: number;
  return48hCount: number;
  return48hPct: number;
  return48hAdmittedCount: number;
  return48hAdmissionRate: number;
  return72hCount: number;
  return72hPct: number;
  return72hAdmittedCount: number;
  return72hAdmissionRate: number;
  topReturnCids: { cid: string; count: number; admittedCount: number }[];
}

export interface VsmSliceMetrics {
  label: string;
  totalInput: number;
  preMedEvasionCount: number;
  preMedEvasionPct: number;
  attendedByDoctorCount: number;
  attendedByDoctorPct: number;
  waitTotemToRecepStats: MetricStats;
  recepRegistrationStats: MetricStats;
  waitRecepToDocStats: MetricStats;
  doorToDocTotalStats: MetricStats;
  firstConsultDurationStats: MetricStats;
  directDischargeCount: number;
  directDischargePct: number;
  directDischargeLosStats: MetricStats;
  propaedeuticLoopCount: number;
  propaedeuticLoopPct: number;
  propaedeuticLoopLosStats: MetricStats;
  fastReavMedOnlyCount: number;
  fastReavMedOnlyPct: number;
  fastReavMedOnlyLosStats: MetricStats;
  diagnosticExamsLoopCount: number;
  diagnosticExamsLoopPct: number;
  diagnosticExamsLoopLosStats: MetricStats;
  medicatedCount: number;
  medicatedPct: number;
  waitMedStartStats: MetricStats;
  medInfusionDurationStats: MetricStats;
  labCount: number;
  labPct: number;
  waitLabCollectStats: MetricStats;
  waitLabReportStats: MetricStats;
  rxCount: number;
  rxPct: number;
  waitRxExecStats: MetricStats;
  tcCount: number;
  tcPct: number;
  waitTcTotalStats: MetricStats;
  waitTcExecStats: MetricStats;
  waitTcReportStats: MetricStats;
  usgCount: number;
  usgPct: number;
  waitUsgTotalStats: MetricStats;
  combinedExamReportWaitStats: MetricStats; // Espera real consolidada de Laudo (Lab/TC/USG) sem falso zero
  postReportReavalWaitStats: MetricStats;
  sameDoctorCount: number;
  sameDoctorPct: number;
  sameDoctorLosStats: MetricStats;
  handoffDoctorCount: number;
  handoffDoctorPct: number;
  handoffDoctorLosStats: MetricStats;
  postPropDischargeCount: number;
  postPropDischargePct: number;
  postPropDischargeLosStats: MetricStats;
  postConsultEvasionCount: number;
  postConsultEvasionPct: number;
  admittedTotalCount: number;
  admittedTotalPct: number;
  admittedUiCount: number;
  admittedUiPct: number;
  admittedUtiCount: number;
  admittedUtiPct: number;
  admittedSurgicalCount: number;
  admittedSurgicalPct: number;
  admittedClinicalCount: number;
  admittedClinicalPct: number;
  admittedDirectNoPropCount: number;
  admittedWithPropCount: number;
  admittedLosUntilDecisionStats: MetricStats;
  // Boarding Decomposto Geral
  t1DecisionToVirtualBedStats: MetricStats;
  t1AguardoToVirtualBedStats: MetricStats;
  t2VirtualToPhysicalBedStats: MetricStats;
  totalBoardingStats: MetricStats;
  // Boarding Decomposto UI (Enfermaria) vs UTI
  uiT1DecisionToVirtualStats: MetricStats;
  uiT1AguardoToVirtualStats: MetricStats;
  uiT2VirtualToPhysicalStats: MetricStats;
  uiBoardingStats: MetricStats;
  uiHospitalStayDaysStats: MetricStats;
  utiT1DecisionToVirtualStats: MetricStats;
  utiT1AguardoToVirtualStats: MetricStats;
  utiT2VirtualToPhysicalStats: MetricStats;
  utiBoardingStats: MetricStats;
  utiHospitalStayDaysStats: MetricStats;
  // Boarding Decomposto Cirúrgico vs Clínico Não Cirúrgico
  surgicalT1VirtualStats: MetricStats;
  surgicalT2PhysicalStats: MetricStats;
  surgicalBoardingStats: MetricStats;
  surgicalHospitalStayDaysStats: MetricStats;
  clinicalT1VirtualStats: MetricStats;
  clinicalT2PhysicalStats: MetricStats;
  clinicalBoardingStats: MetricStats;
  clinicalHospitalStayDaysStats: MetricStats;
  // Lean VSM Timeline & PCE Estratificado por Rota
  vaMinutesMean: number;
  nvaMinutesMean: number;
  totalCycleMinutesMean: number;
  pceEfficiencyPct: number;
  pceRamoADirectPct: number;
  pceRamoB1FastReavPct: number;
  pceRamoB2DiagExamsPct: number;
}

export interface VsmFullAnalytics {
  hasCate3493Data: boolean;
  hasChaa3704Data: boolean;
  matched3493Count: number;
  matched3704Count: number;
  monthlyOverall: VsmSliceMetrics;
  byShift: {
    day: VsmSliceMetrics;
    night: VsmSliceMetrics;
  };
  byWeekOfMonth: Record<string, VsmSliceMetrics>;
  byDayOfWeek: Record<string, VsmSliceMetrics>;
  hourlySimultaneousOverall: HourlySimultaneousPoint[];
  hourlySimultaneousByDayOfWeek: Record<number, HourlySimultaneousPoint[]>;
  censusHeatmap24x7: SimultaneousCensusCell[];
  boardingByBedType: {
    global: BedTypeBoardingBreakdown;
    ui: BedTypeBoardingBreakdown;
    uti: BedTypeBoardingBreakdown;
    surgical: BedTypeBoardingBreakdown;
    clinical: BedTypeBoardingBreakdown;
  };
  boardingByConvenio: ConvenioBoardingStat[];
  surgicalAdmissionsCount: number;
  surgicalAdmissionsPct: number;
  clinicalAdmissionsCount: number;
  clinicalAdmissionsPct: number;
  hospitalStayDaysStats: MetricStats;
  wastedBedHoursInBoarding: number;
  equivalentBlockedBeds24h: number;
  losAgingBuckets: LosAgingBucket[];
  shiftChangeBottleneck: ShiftChangeBottleneckAnalytics;
  dataQualityAudit: DataCompletenessAudit;
  doctorConductMatrix: DoctorConductRow[];
  cidThroughputMatrix: CidThroughputRow[];
  diagnosticGovernance: DiagnosticGovernanceAnalytics;
  returnVisits: ReturnVisitAnalytics;
}

export interface NormalizedAttendanceRecord {
  atendimentoId: number;
  setor: string;
  clinica: string;
  entradaTs: number;
  desfechoTs: number;
  dateStr: string;            // Data civil YYYY-MM-DD
  operationalDateStr: string; // Data operacional do plantão (07h D -> 06h59 D+1)
  dayOfWeekIdx: number;
  operationalDayOfWeekIdx: number;
  dayOfWeekName: string;
  weekOfMonthLabel: string;
  hour: number;
  shift: 'Diurno' | 'Noturno';
  convenio: string;
  cid: string;
  clusterName: string;
  medicoAnamnese: string;
  medicoUltimoAtend: string;
  isSameDoctor: boolean;
  waitRecepMin: number | null;
  atendRecepMin: number | null;
  waitRecepToDocMin: number | null;
  doorToDocMin: number | null;
  consultMin: number | null;
  waitMedMin: number | null;
  admMedMin: number | null;
  waitLabCollectMin: number | null;
  waitLabReportMin: number | null;
  isLabReportReconstructed: boolean;
  waitRxMin: number | null;
  waitTcTotalMin: number | null;
  waitTcExecMin: number | null;
  waitTcReportMin: number | null;
  waitUsgMin: number | null;
  combinedExamReportWaitMin: number | null;
  lastExamReportTs: number | null;
  postLaudoReavalWaitMin: number | null;
  losMin: number | null;
  hasMed: boolean;
  hasLab: boolean;
  hasRx: boolean;
  hasTc: boolean;
  hasUsg: boolean;
  hasAnyProp: boolean;
  hasReceita: boolean;
  hasAtestado: boolean;
  isPreMedEvasion: boolean;
  isPostMedEvasion: boolean;
  isDirectDischarge: boolean;
  isFastReavMedOnly: boolean;
  isDiagnosticExamsLoop: boolean;
  isPostPropDischarge: boolean;
  isAdmitted: boolean;
  tipoLeito: 'UI' | 'UTI' | 'Outro';
  virtualBedTs: number | null;
  aguardoInternacaoTs: number | null;
  physicalBedTs: number | null;
  unidFisicaNome: string | null;
  isPhysicalBedConfirmed: boolean;
  waitDecisionToVirtualMin: number | null;
  waitAguardoToVirtualMin: number | null;
  waitVirtualToPhysicalMin: number | null;
  totalBoardingMin: number | null;
  isCentroCirurgico: boolean;
  isSurgicalProfile: boolean; // CC == 'S' ou Clínica Cirúrgica/Ortopédica
  hospitalStayDays: number | null;
  diagEntrada3704: string | null;
  diagSaida3704: string | null;
  hoursSinceLastVisit: number | null;
  hadNegativeTimePurged: boolean;
  hadOutlierCapped: boolean;
}

export interface EmergencyAnalyticsData {
  fileName: string;
  periodLabel: string;
  monthKey: string;
  activeScopeLabel: string;
  selectedSectors: string[];
  selectedClinics: string[];
  availableSectors: { name: string; count: number }[];
  availableClinics: { name: string; count: number }[];
  sectorClinicBreakdown: SectorClinicSummaryRow[];
  totalGlobalAttendances: number;
  totalDays: number;
  totalAttendances: number;
  totalAdmissions: number;
  uiAdmissions: number;
  utiAdmissions: number;
  surgicalAdmissions: number;
  clinicalAdmissions: number;
  conversionRate: number;
  evasionCount: number;
  evasionRate: number;
  dailyVolume: ShiftMetricBreakdown;
  doorToDoctor: ShiftMetricBreakdown;
  consultTime: ShiftMetricBreakdown;
  medicationWait: ShiftMetricBreakdown;
  medicationAdmTime: ShiftMetricBreakdown;
  labWait: ShiftMetricBreakdown;
  labReportWait: ShiftMetricBreakdown;
  rxWait: ShiftMetricBreakdown;
  tcWait: ShiftMetricBreakdown;
  losOverall: ShiftMetricBreakdown;
  losDischarge: ShiftMetricBreakdown;
  losAdmissionWait: ShiftMetricBreakdown;
  labCount: number;
  labRate: number;
  rxCount: number;
  rxRate: number;
  tcCount: number;
  tcRate: number;
  usgCount: number;
  usgRate: number;
  medCount: number;
  medRate: number;
  withinSlaDoorToDocCount: number;
  withinSlaDoorToDocRate: number;
  dailySeries: {
    date: string;
    label: string;
    dayOfWeek: string;
    total: number;
    dayShift: number;
    nightShift: number;
    admissions: number;
    meanDoorToDoc: number;
    meanLos: number;
  }[];
  hourlyCurve: {
    hour: number;
    label: string;
    total: number;
    meanPerDay: number;
    stdDevPerDay: number;
    medianPerDay: number;
    minPerDay: number;
    maxPerDay: number;
    meanDoorToDoc: number;
    meanLos: number;
  }[];
  weekdayStats: {
    dayIndex: number;
    dayName: string;
    total: number;
    daysOccurred: number;
    meanPerDay: number;
    stdDevPerDay: number;
    medianPerDay: number;
    minPerDay: number;
    maxPerDay: number;
    dayShiftMean: number;
    nightShiftMean: number;
    meanDoorToDoc: number;
    meanLos: number;
  }[];
  weekOfMonthStats: {
    weekLabel: string;
    daysCount: number;
    total: number;
    meanPerDay: number;
    stdDevPerDay: number;
    medianPerDay: number;
    meanDoorToDoc: number;
    meanLos: number;
    admissions: number;
  }[];
  heatmap24x7: HeatmapCellStat[];
  topCids: CidStat[];
  cidClusters: CidClusterStat[];
  doctorProductivity: DoctorProductivity[];
  vsm: VsmFullAnalytics;
  sanitizedRecords: NormalizedAttendanceRecord[];
  allSanitizedRecords: NormalizedAttendanceRecord[];
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS DE ESTATÍSTICA E HIGIENIZAÇÃO (LGPD STATELESS)
// ============================================================================

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS_7_TO_6 = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

export function computeStats(values: number[]): MetricStats {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const count = valid.length;
  if (count === 0) {
    return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0, p90: 0, count: 0, sum: 0 };
  }
  const sorted = [...valid].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p90Idx = Math.min(count - 1, Math.floor(count * 0.9));
  return {
    mean: Number(mean.toFixed(1)),
    stdDev: Number(stdDev.toFixed(1)),
    median: Number(median.toFixed(1)),
    min: Number(sorted[0].toFixed(1)),
    max: Number(sorted[count - 1].toFixed(1)),
    p90: Number(sorted[p90Idx].toFixed(1)),
    count,
    sum: Number(sum.toFixed(1)),
  };
}

function normalizeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function standardizeSectorName(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'PS Adulto - HGD';
  return s;
}

function standardizeClinicName(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'Médica';
  const up = normalizeStr(s).toUpperCase();
  if (up.includes('MEDIC')) return 'Médica';
  if (up.includes('ORTOPED')) return 'Ortopédica';
  if (up.includes('CIRURG')) return 'Cirúrgica';
  if (up.includes('GINECOL')) return 'Ginecologia';
  if (up.includes('OBSTET')) return 'Obstetrícia';
  if (up.includes('PEDIAT')) return 'Pediátrica';
  if (up.includes('CARDIO')) return 'Cardiologia';
  if (up.includes('NEONAT')) return 'Neonatologia';
  return s;
}

function parseTimestampMs(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    const t = val.getTime();
    if (!isNaN(t) && val.getFullYear() >= 2000) return t;
    return null;
  }
  if (typeof val === 'number') {
    if (val > 35000 && val < 70000) {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const fractionalDay = val - Math.floor(val);
      const totalSeconds = Math.round(86400 * fractionalDay);
      return (utcValue + totalSeconds) * 1000;
    }
    return null;
  }
  const s = String(val).trim();
  if (!s) return null;

  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (brMatch) {
    const [, d, m, y, hh = '00', mm = '00', ss = '00'] = brMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[\sT](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = isoMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }

  const fallback = new Date(s);
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 2000) {
    return fallback.getTime();
  }
  return null;
}

function parseDurationMinutesWithAudit(
  val: unknown,
  maxReasonable = 2880
): { minutes: number | null; wasNegative: boolean; wasCapped: boolean } {
  if (val === null || val === undefined || val === '') {
    return { minutes: null, wasNegative: false, wasCapped: false };
  }
  if (val instanceof Date) {
    if (val.getFullYear() <= 1905) {
      const mins = val.getHours() * 60 + val.getMinutes() + val.getSeconds() / 60;
      if (mins < 0) return { minutes: null, wasNegative: true, wasCapped: false };
      if (mins > maxReasonable) return { minutes: null, wasNegative: false, wasCapped: true };
      return { minutes: Number(mins.toFixed(1)), wasNegative: false, wasCapped: false };
    }
    return { minutes: null, wasNegative: false, wasCapped: false };
  }
  if (typeof val === 'number') {
    if (val < 0) return { minutes: null, wasNegative: true, wasCapped: false };
    if (val >= 0 && val < 1) {
      const mins = val * 1440;
      if (mins > maxReasonable) return { minutes: null, wasNegative: false, wasCapped: true };
      return { minutes: Number(mins.toFixed(1)), wasNegative: false, wasCapped: false };
    }
    if (val > maxReasonable) return { minutes: null, wasNegative: false, wasCapped: true };
    return { minutes: Number(val.toFixed(1)), wasNegative: false, wasCapped: false };
  }
  const s = String(val).trim();
  if (!s) return { minutes: null, wasNegative: false, wasCapped: false };
  if (s.includes(':')) {
    if (s.startsWith('-')) return { minutes: null, wasNegative: true, wasCapped: false };
    const parts = s.split(':').map((p) => Number(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const mins = Math.abs(parts[0]) * 60 + parts[1] + (parts[2] && !isNaN(parts[2]) ? parts[2] / 60 : 0);
      if (mins > maxReasonable) return { minutes: null, wasNegative: false, wasCapped: true };
      return { minutes: Number(mins.toFixed(1)), wasNegative: false, wasCapped: false };
    }
  }
  const num = Number(s.replace(',', '.'));
  if (!isNaN(num)) {
    if (num < 0) return { minutes: null, wasNegative: true, wasCapped: false };
    if (num > maxReasonable) return { minutes: null, wasNegative: false, wasCapped: true };
    return { minutes: Number(num.toFixed(1)), wasNegative: false, wasCapped: false };
  }
  return { minutes: null, wasNegative: false, wasCapped: false };
}

function classifyCidCluster(cidRaw: string): string {
  const up = normalizeStr(cidRaw).toUpperCase();
  if (!up || up === 'NAN' || up === 'NAO INFORMADO') return 'Não Especificado / Outros';
  if (/VIAS AEREAS|NASOFARINGITE|SINUSITE|AMIGDALITE|FARINGITE|LARINGITE|GRIPE|INFLUENZA|TOSSE|PNEUMONIA|BRONQUITE|ASMA|DISPNEIA|RESPIRATORI/.test(up)) {
    return 'Síndromes Respiratórias / IVAS';
  }
  if (/DIARREIA|GASTROENTERITE|DOR ABDOMINAL|NAUSEA|VOMITO|GASTRITE|DISPEPSIA|CONSTIPACAO|APENDICITE|COLECISTITE|PANCREATITE|HEMORRAGIA DIGESTIVA/.test(up)) {
    return 'Gastrointestinal / Dor Abdominal';
  }
  if (/DOR LOMBAR|LUMBAGO|CIATICA|CERVICALGIA|DORSALGIA|ARTICULACAO|MEMBRO|OMBRO|JOELHO|FRATURA|ENTORSE|TRAUMA|QUEDA|CONTUSAO|MUSCULO|LUXACAO|FERIMENTO/.test(up)) {
    return 'Osteomuscular / Ortopedia / Trauma';
  }
  if (/CEFALEIA|ENXAQUECA|TONTURA|VERTIGEM|SINCOPE|CONVULSAO|EPILEPSIA|VASCULARES CEREBRAIS|AVC|ISQUEMICO|NEURO/.test(up)) {
    return 'Neurologia / Cefaleia / Vertigem / AVC';
  }
  if (/DOR TORACICA|ANGINA|INFARTO|HIPERTENSAO|ARRITMIA|FIBRILACAO|TAQUICARDIA|INSUFICIENCIA CARDIACA|PALPITAC/.test(up)) {
    return 'Cardiovascular / Dor Torácica / HAS';
  }
  if (/TRATO URINARIO|CISTITE|PIELONEFRITE|NEFRITE|CALCULOSE|COLICA NEFRITICA|RENAL|HEMATURIA|DISURIA/.test(up)) {
    return 'Urologia / Nefrologia / ITU / Cólica Renal';
  }
  if (/GESTACAO|PARTO|GRAVIDEZ|ABORT|PUERPER|UTERO|OVARIO|VAGIN|MAMA|GINECOL|OBSTET/.test(up)) {
    return 'Ginecologia & Obstetrícia / Materno';
  }
  if (/CELULITE|ABSCESSO|ERISIPELA|DERMATITE|URTICARIA|ALERGIA|FEBRE|DENGUE|VIROSE|SEPSE|INFECCAO/.test(up)) {
    return 'Infectologia / Pele & Partes Moles / Febre';
  }
  if (/ANSIEDADE|DEPRESS|PSIQUIATR|ESTRESSE|PANICO|AGITACAO/.test(up)) {
    return 'Saúde Mental / Ansiedade';
  }
  return 'Outras Condições Clínicas';
}

function getJsDayToMondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getWeekOfMonthLabel(dayOfMonth: number): string {
  if (dayOfMonth <= 7) return 'Semana 1 (01–07)';
  if (dayOfMonth <= 14) return 'Semana 2 (08–14)';
  if (dayOfMonth <= 21) return 'Semana 3 (15–21)';
  if (dayOfMonth <= 28) return 'Semana 4 (22–28)';
  return 'Semana 5 (29–31)';
}

function buildBedTypeBoardingBreakdown(
  bedType: 'UI' | 'UTI' | 'Surgical' | 'Clinical' | 'Global',
  label: string,
  list: NormalizedAttendanceRecord[],
  totalAdmissionsCount: number,
  totalDays: number
): BedTypeBoardingBreakdown {
  const n = list.length;
  const pct = totalAdmissionsCount > 0 ? Number(((n / totalAdmissionsCount) * 100).toFixed(1)) : 0;
  const uiCount = list.filter((r) => r.tipoLeito === 'UI').length;
  const utiCount = list.filter((r) => r.tipoLeito === 'UTI').length;
  const surg = list.filter((r) => r.isSurgicalProfile).length;
  const surgPct = n > 0 ? Number(((surg / n) * 100).toFixed(1)) : 0;
  const physCount = list.filter((r) => r.isPhysicalBedConfirmed).length;

  const t1Dec = computeStats(
    list.map((r) => (r.waitDecisionToVirtualMin ?? r.waitAguardoToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const t1Ag = computeStats(
    list.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const t2Phys = computeStats(
    list.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const totBoard = computeStats(
    list.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const stayDays = computeStats(
    list.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );
  const wastedBedHours = Number(
    (
      list.reduce((acc, r) => acc + (r.totalBoardingMin ?? r.waitDecisionToVirtualMin ?? 0), 0) / 60
    ).toFixed(1)
  );
  const equivalentBlockedBeds24h = Number(
    (wastedBedHours / Math.max(totalDays * 24, 24)).toFixed(2)
  );

  return {
    bedType,
    label,
    admittedCount: n,
    pctOfAdmissions: pct,
    uiCount,
    utiCount,
    surgicalCount: surg,
    surgicalPct: surgPct,
    physicalConfirmedCount: physCount,
    t1DecisionToVirtualStats: t1Dec,
    t1AguardoToVirtualStats: t1Ag,
    t2VirtualToPhysicalStats: t2Phys,
    totalBoardingStats: totBoard,
    hospitalStayDaysStats: stayDays,
    wastedBedHours,
    equivalentBlockedBeds24h,
  };
}

// ============================================================================
// CÁLCULO DE UM RECORTE DO VSM (MENSAL, SEMANAL, DIA DA SEMANA OU TURNO)
// ============================================================================

function buildVsmSlice(label: string, records: NormalizedAttendanceRecord[]): VsmSliceMetrics {
  const totalInput = records.length;
  const safePct = (n: number, base = totalInput) => (base > 0 ? Number(((n / base) * 100).toFixed(1)) : 0);

  const preMedEvasion = records.filter((r) => r.isPreMedEvasion);
  const attended = records.filter((r) => !r.isPreMedEvasion);

  const waitTotemToRecepStats = computeStats(records.map((r) => r.waitRecepMin!).filter((v) => v !== null));
  const recepRegistrationStats = computeStats(records.map((r) => r.atendRecepMin!).filter((v) => v !== null));
  const waitRecepToDocStats = computeStats(records.map((r) => r.waitRecepToDocMin!).filter((v) => v !== null));
  const doorToDocTotalStats = computeStats(records.map((r) => r.doorToDocMin!).filter((v) => v !== null));
  const firstConsultDurationStats = computeStats(records.map((r) => r.consultMin!).filter((v) => v !== null));

  const directDischarges = records.filter((r) => r.isDirectDischarge);
  const propLoop = records.filter((r) => r.hasAnyProp);
  const fastReavMedOnly = records.filter((r) => r.isFastReavMedOnly);
  const diagLoop = records.filter((r) => r.isDiagnosticExamsLoop);

  const medicated = records.filter((r) => r.hasMed);
  const labGroup = records.filter((r) => r.hasLab);
  const rxGroup = records.filter((r) => r.hasRx);
  const tcGroup = records.filter((r) => r.hasTc);
  const usgGroup = records.filter((r) => r.hasUsg);

  const waitLabCollectStats = computeStats(labGroup.map((r) => r.waitLabCollectMin!).filter((v) => v !== null));
  const waitLabReportStats = computeStats(labGroup.map((r) => r.waitLabReportMin!).filter((v) => v !== null && v > 0));
  const waitTcTotalStats = computeStats(tcGroup.map((r) => r.waitTcTotalMin!).filter((v) => v !== null));
  const waitTcExecStats = computeStats(tcGroup.map((r) => r.waitTcExecMin!).filter((v) => v !== null));
  const waitTcReportStats = computeStats(tcGroup.map((r) => r.waitTcReportMin!).filter((v) => v !== null && v > 0));
  const combinedExamReportWaitStats = computeStats(
    diagLoop.map((r) => r.combinedExamReportWaitMin!).filter((v) => v !== null && v > 0)
  );

  // Garante que waitLabReportStats nunca fique zerado se houver tempos de laudo combinados
  const effectiveLabReportStats =
    waitLabReportStats.count > 0 ? waitLabReportStats : combinedExamReportWaitStats;

  const postReportWaitList = records
    .map((r) => r.postLaudoReavalWaitMin!)
    .filter((v) => v !== null && v >= 0 && v <= 720);
  const postReportReavalWaitStats = computeStats(postReportWaitList);

  const sameDocGroup = records.filter((r) => r.medicoAnamnese && r.medicoUltimoAtend && r.isSameDoctor);
  const handoffDocGroup = records.filter((r) => r.medicoAnamnese && r.medicoUltimoAtend && !r.isSameDoctor);
  const validDocPairs = sameDocGroup.length + handoffDocGroup.length;

  const postPropDischarges = records.filter((r) => r.isPostPropDischarge);
  const postConsultEvasions = records.filter((r) => r.isPostMedEvasion);
  const admittedGroup = records.filter((r) => r.isAdmitted);
  const admittedUi = admittedGroup.filter((r) => r.tipoLeito === 'UI');
  const admittedUti = admittedGroup.filter((r) => r.tipoLeito === 'UTI');
  const admittedSurgical = admittedGroup.filter((r) => r.isSurgicalProfile);
  const admittedClinical = admittedGroup.filter((r) => !r.isSurgicalProfile);

  const t1DecisionStats = computeStats(
    admittedGroup.map((r) => (r.waitDecisionToVirtualMin ?? r.waitAguardoToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const t1AguardoStats = computeStats(
    admittedGroup.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const t2PhysicalStats = computeStats(
    admittedGroup.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const totalBoardingStats = computeStats(
    admittedGroup.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );

  // UI vs UTI
  const uiT1DecisionToVirtualStats = computeStats(
    admittedUi.map((r) => (r.waitDecisionToVirtualMin ?? r.waitAguardoToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const uiT1AguardoToVirtualStats = computeStats(
    admittedUi.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const uiT2VirtualToPhysicalStats = computeStats(
    admittedUi.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const uiBoardingStats = computeStats(
    admittedUi.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const uiHospitalStayDaysStats = computeStats(
    admittedUi.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );

  const utiT1DecisionToVirtualStats = computeStats(
    admittedUti.map((r) => (r.waitDecisionToVirtualMin ?? r.waitAguardoToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const utiT1AguardoToVirtualStats = computeStats(
    admittedUti.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const utiT2VirtualToPhysicalStats = computeStats(
    admittedUti.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const utiBoardingStats = computeStats(
    admittedUti.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const utiHospitalStayDaysStats = computeStats(
    admittedUti.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );

  // Cirúrgico vs Clínico Não Cirúrgico
  const surgicalT1VirtualStats = computeStats(
    admittedSurgical.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const surgicalT2PhysicalStats = computeStats(
    admittedSurgical.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const surgicalBoardingStats = computeStats(
    admittedSurgical.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const surgicalHospitalStayDaysStats = computeStats(
    admittedSurgical.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );

  const clinicalT1VirtualStats = computeStats(
    admittedClinical.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const clinicalT2PhysicalStats = computeStats(
    admittedClinical.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
  );
  const clinicalBoardingStats = computeStats(
    admittedClinical.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
  );
  const clinicalHospitalStayDaysStats = computeStats(
    admittedClinical.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );

  // Cálculo Lean PCE (Process Cycle Efficiency) Global e por Rota
  const cadMean = recepRegistrationStats.mean || 3.6;
  const consMean = firstConsultDurationStats.mean || 25.0;
  const infusMean = computeStats(medicated.map((r) => r.admMedMin!).filter((v) => v !== null)).mean || 22.0;
  const laudoMean = effectiveLabReportStats.mean || combinedExamReportWaitStats.mean || 54.0;

  const vaMean = cadMean + consMean + infusMean + 12.0;
  const nvaMean =
    (waitTotemToRecepStats.mean || 4.0) +
    (waitRecepToDocStats.mean || 31.0) +
    (waitLabCollectStats.mean || 18.0) +
    laudoMean +
    (postReportReavalWaitStats.mean || 75.0);
  const totalCycleMean = Number((vaMean + nvaMean).toFixed(1));
  const pceEfficiencyPct = totalCycleMean > 0 ? Number(((vaMean / totalCycleMean) * 100).toFixed(1)) : 0;

  // PCE estratificado por Rota
  const directLosStats = computeStats(directDischarges.map((r) => r.losMin!).filter((v) => v !== null));
  const fastMedLosStats = computeStats(fastReavMedOnly.map((r) => r.losMin!).filter((v) => v !== null));
  const diagLosStats = computeStats(diagLoop.map((r) => r.losMin!).filter((v) => v !== null));

  const pceRamoADirectPct =
    directLosStats.mean > 0 ? Number((Math.min(((cadMean + consMean) / directLosStats.mean) * 100, 95)).toFixed(1)) : 45.0;
  const pceRamoB1FastReavPct =
    fastMedLosStats.mean > 0
      ? Number((Math.min(((cadMean + consMean + infusMean + 10) / fastMedLosStats.mean) * 100, 92)).toFixed(1))
      : 38.0;
  const pceRamoB2DiagExamsPct =
    diagLosStats.mean > 0
      ? Number((Math.min(((cadMean + consMean + infusMean + 12) / diagLosStats.mean) * 100, 85)).toFixed(1))
      : 24.5;

  return {
    label,
    totalInput,
    preMedEvasionCount: preMedEvasion.length,
    preMedEvasionPct: safePct(preMedEvasion.length),
    attendedByDoctorCount: attended.length,
    attendedByDoctorPct: safePct(attended.length),
    waitTotemToRecepStats,
    recepRegistrationStats,
    waitRecepToDocStats,
    doorToDocTotalStats,
    firstConsultDurationStats,
    directDischargeCount: directDischarges.length,
    directDischargePct: safePct(directDischarges.length),
    directDischargeLosStats: directLosStats,
    propaedeuticLoopCount: propLoop.length,
    propaedeuticLoopPct: safePct(propLoop.length),
    propaedeuticLoopLosStats: computeStats(propLoop.map((r) => r.losMin!).filter((v) => v !== null)),
    fastReavMedOnlyCount: fastReavMedOnly.length,
    fastReavMedOnlyPct: safePct(fastReavMedOnly.length),
    fastReavMedOnlyLosStats: fastMedLosStats,
    diagnosticExamsLoopCount: diagLoop.length,
    diagnosticExamsLoopPct: safePct(diagLoop.length),
    diagnosticExamsLoopLosStats: diagLosStats,
    medicatedCount: medicated.length,
    medicatedPct: safePct(medicated.length),
    waitMedStartStats: computeStats(medicated.map((r) => r.waitMedMin!).filter((v) => v !== null)),
    medInfusionDurationStats: computeStats(medicated.map((r) => r.admMedMin!).filter((v) => v !== null)),
    labCount: labGroup.length,
    labPct: safePct(labGroup.length),
    waitLabCollectStats,
    waitLabReportStats: effectiveLabReportStats,
    rxCount: rxGroup.length,
    rxPct: safePct(rxGroup.length),
    waitRxExecStats: computeStats(rxGroup.map((r) => r.waitRxMin!).filter((v) => v !== null)),
    tcCount: tcGroup.length,
    tcPct: safePct(tcGroup.length),
    waitTcTotalStats,
    waitTcExecStats,
    waitTcReportStats,
    usgCount: usgGroup.length,
    usgPct: safePct(usgGroup.length),
    waitUsgTotalStats: computeStats(usgGroup.map((r) => r.waitUsgMin!).filter((v) => v !== null)),
    combinedExamReportWaitStats,
    postReportReavalWaitStats,
    sameDoctorCount: sameDocGroup.length,
    sameDoctorPct: safePct(sameDocGroup.length, validDocPairs),
    sameDoctorLosStats: computeStats(sameDocGroup.map((r) => r.losMin!).filter((v) => v !== null)),
    handoffDoctorCount: handoffDocGroup.length,
    handoffDoctorPct: safePct(handoffDocGroup.length, validDocPairs),
    handoffDoctorLosStats: computeStats(handoffDocGroup.map((r) => r.losMin!).filter((v) => v !== null)),
    postPropDischargeCount: postPropDischarges.length,
    postPropDischargePct: safePct(postPropDischarges.length),
    postPropDischargeLosStats: computeStats(postPropDischarges.map((r) => r.losMin!).filter((v) => v !== null)),
    postConsultEvasionCount: postConsultEvasions.length,
    postConsultEvasionPct: safePct(postConsultEvasions.length),
    admittedTotalCount: admittedGroup.length,
    admittedTotalPct: safePct(admittedGroup.length),
    admittedUiCount: admittedUi.length,
    admittedUiPct: safePct(admittedUi.length, admittedGroup.length),
    admittedUtiCount: admittedUti.length,
    admittedUtiPct: safePct(admittedUti.length, admittedGroup.length),
    admittedSurgicalCount: admittedSurgical.length,
    admittedSurgicalPct: safePct(admittedSurgical.length, admittedGroup.length),
    admittedClinicalCount: admittedClinical.length,
    admittedClinicalPct: safePct(admittedClinical.length, admittedGroup.length),
    admittedDirectNoPropCount: admittedGroup.filter((r) => !r.hasAnyProp).length,
    admittedWithPropCount: admittedGroup.filter((r) => r.hasAnyProp).length,
    admittedLosUntilDecisionStats: computeStats(admittedGroup.map((r) => r.losMin!).filter((v) => v !== null)),
    t1DecisionToVirtualBedStats: t1DecisionStats,
    t1AguardoToVirtualBedStats: t1AguardoStats,
    t2VirtualToPhysicalBedStats: t2PhysicalStats,
    totalBoardingStats,
    uiT1DecisionToVirtualStats,
    uiT1AguardoToVirtualStats,
    uiT2VirtualToPhysicalStats,
    uiBoardingStats,
    uiHospitalStayDaysStats,
    utiT1DecisionToVirtualStats,
    utiT1AguardoToVirtualStats,
    utiT2VirtualToPhysicalStats,
    utiBoardingStats,
    utiHospitalStayDaysStats,
    surgicalT1VirtualStats,
    surgicalT2PhysicalStats,
    surgicalBoardingStats,
    surgicalHospitalStayDaysStats,
    clinicalT1VirtualStats,
    clinicalT2PhysicalStats,
    clinicalBoardingStats,
    clinicalHospitalStayDaysStats,
    vaMinutesMean: Number(vaMean.toFixed(1)),
    nvaMinutesMean: Number(nvaMean.toFixed(1)),
    totalCycleMinutesMean: totalCycleMean,
    pceEfficiencyPct,
    pceRamoADirectPct,
    pceRamoB1FastReavPct,
    pceRamoB2DiagExamsPct,
  };
}

// ============================================================================
// RECONSTRUÇÃO DO CENSO SIMULTÂNEO (MÁQUINA DE ESTADOS CORRIGIDA + CICLO 07h–06h)
// ============================================================================

function computeSimultaneousCensus(records: NormalizedAttendanceRecord[]) {
  const uniqueOpDates = Array.from(new Set(records.map((r) => r.operationalDateStr))).sort();

  // Máquina de estados sem vazamento de Alta Direta para Giro de Exames
  const intervals = records.map((r) => {
    const tStart = r.entradaTs;
    const doorMin = r.doorToDocMin ?? 28;
    const consMin = Math.min(Math.max(r.consultMin ?? 15, 8), 60);
    const tDesfecho = Math.max(r.desfechoTs, tStart + 5 * 60000);

    // Se o paciente NÃO acionou propedêutica e NÃO internou (Alta Direta / Evasão),
    // ele permanece na camada 1 (Porta/Consultório) até sair do PS.
    const tEndPorta = !r.hasAnyProp && !r.isAdmitted
      ? tDesfecho
      : Math.min(tStart + (doorMin + consMin) * 60000, tDesfecho);

    let tBoardEnd = tDesfecho;
    if (r.isAdmitted) {
      const candidateEnd = r.physicalBedTs ?? r.virtualBedTs ?? (tDesfecho + (r.totalBoardingMin ?? 180) * 60000);
      tBoardEnd = Math.min(Math.max(candidateEnd, tDesfecho), tDesfecho + 48 * 3600000);
    }

    return {
      tStart,
      tEndPorta,
      tDesfecho,
      tBoardEnd,
      hasAnyProp: r.hasAnyProp,
      isFastReavOnly: r.isFastReavMedOnly,
      isAdmitted: r.isAdmitted,
    };
  });

  const gridPorta: Record<string, number[]> = {};
  const gridFastReav: Record<string, number[]> = {};
  const gridGiroExames: Record<string, number[]> = {};
  const gridBoarding: Record<string, number[]> = {};
  const gridTotal: Record<string, number[]> = {};
  const gridArrivals: Record<string, number[]> = {};

  for (let d = 0; d < 7; d++) {
    for (const h of HOURS_7_TO_6) {
      const k = `${d}_${h}`;
      gridPorta[k] = [];
      gridFastReav[k] = [];
      gridGiroExames[k] = [];
      gridBoarding[k] = [];
      gridTotal[k] = [];
      gridArrivals[k] = [];
    }
  }

  // Varre cada Dia Operacional de Plantão (07h00 do dia D até 06h59 do dia D+1)
  for (const opDateStr of uniqueOpDates) {
    const [yy, mm, dd] = opDateStr.split('-').map(Number);
    const baseOpDate = new Date(yy, mm - 1, dd, 0, 0, 0);
    const dayIdx = getJsDayToMondayIndex(baseOpDate.getDay());

    for (const h of HOURS_7_TO_6) {
      // Horas 00h..06h pertencem à madrugada do dia civil seguinte (D+1) dentro do mesmo plantão
      const dayOffset = h < 7 ? 1 : 0;
      const slotStart = new Date(yy, mm - 1, dd + dayOffset, h, 0, 0).getTime();
      const slotEnd = slotStart + 3600000;
      const probeTs = slotStart + 1800000; // Sonda no minuto :30

      let cArr = 0;
      let cPorta = 0;
      let cFastReav = 0;
      let cGiroExames = 0;
      let cBoard = 0;

      for (let i = 0; i < intervals.length; i++) {
        const it = intervals[i];
        if (it.tStart >= slotStart && it.tStart < slotEnd) {
          cArr++;
        }
        if (it.tStart <= probeTs && probeTs < it.tEndPorta) {
          cPorta++;
        } else if (it.hasAnyProp && it.tEndPorta <= probeTs && probeTs < it.tDesfecho) {
          if (it.isFastReavOnly) cFastReav++;
          else cGiroExames++;
        } else if (it.isAdmitted && it.tDesfecho <= probeTs && probeTs < it.tBoardEnd) {
          cBoard++;
        }
      }

      const key = `${dayIdx}_${h}`;
      gridArrivals[key].push(cArr);
      gridPorta[key].push(cPorta);
      gridFastReav[key].push(cFastReav);
      gridGiroExames[key].push(cGiroExames);
      gridBoarding[key].push(cBoard);
      gridTotal[key].push(cPorta + cFastReav + cGiroExames + cBoard);
    }
  }

  const censusHeatmap24x7: SimultaneousCensusCell[] = [];
  const hourlySimultaneousByDayOfWeek: Record<number, HourlySimultaneousPoint[]> = {};

  for (let d = 0; d < 7; d++) {
    hourlySimultaneousByDayOfWeek[d] = [];
    for (const h of HOURS_7_TO_6) {
      const key = `${d}_${h}`;
      const totStats = computeStats(gridTotal[key]);
      const portaStats = computeStats(gridPorta[key]);
      const fastStats = computeStats(gridFastReav[key]);
      const examStats = computeStats(gridGiroExames[key]);
      const boardStats = computeStats(gridBoarding[key]);
      const arrStats = computeStats(gridArrivals[key]);

      const recPorta = Math.max(1, Math.ceil((arrStats.mean + portaStats.mean * 0.5) / 3.2));
      const recGiro = Math.max(1, Math.ceil((fastStats.mean * 0.8 + examStats.mean * 0.6 + boardStats.mean * 0.4) / 6.5));

      censusHeatmap24x7.push({
        dayIndex: d,
        hour: h,
        totalStats: totStats,
        portaStats,
        fastReavMedStats: fastStats,
        giroExamesStats: examStats,
        boardingStats: boardStats,
        totalMean: totStats.mean,
        totalStdDev: totStats.stdDev,
        totalMedian: totStats.median,
        totalMin: totStats.min,
        totalMax: totStats.max,
        portaMean: portaStats.mean,
        fastReavMedMean: fastStats.mean,
        giroExamesMean: examStats.mean,
        boardingMean: boardStats.mean,
      });

      hourlySimultaneousByDayOfWeek[d].push({
        hour: h,
        label: `${String(h).padStart(2, '0')}h`,
        newArrivalsStats: arrStats,
        totalStats: totStats,
        portaStats,
        fastReavMedStats: fastStats,
        giroExamesStats: examStats,
        boardingStats: boardStats,
        recommendedDocsPorta: recPorta,
        recommendedDocsGiroReav: recGiro,
        recommendedDocsTotal: recPorta + recGiro,
        newArrivalsMean: arrStats.mean,
        newArrivalsMedian: arrStats.median,
        totalSimultaneousMean: totStats.mean,
        totalSimultaneousMedian: totStats.median,
        totalSimultaneousMax: totStats.max,
        portaMean: portaStats.mean,
        fastReavMedMean: fastStats.mean,
        giroExamesMean: examStats.mean,
        boardingMean: boardStats.mean,
      });
    }
  }

  const hourlySimultaneousOverall: HourlySimultaneousPoint[] = HOURS_7_TO_6.map((h) => {
    const allTot: number[] = [];
    const allPorta: number[] = [];
    const allFast: number[] = [];
    const allExam: number[] = [];
    const allBoard: number[] = [];
    const allArr: number[] = [];
    for (let d = 0; d < 7; d++) {
      const k = `${d}_${h}`;
      allTot.push(...gridTotal[k]);
      allPorta.push(...gridPorta[k]);
      allFast.push(...gridFastReav[k]);
      allExam.push(...gridGiroExames[k]);
      allBoard.push(...gridBoarding[k]);
      allArr.push(...gridArrivals[k]);
    }
    const stTot = computeStats(allTot);
    const stArr = computeStats(allArr);
    const stPorta = computeStats(allPorta);
    const stFast = computeStats(allFast);
    const stExam = computeStats(allExam);
    const stBoard = computeStats(allBoard);

    const recPorta = Math.max(1, Math.ceil((stArr.mean + stPorta.mean * 0.5) / 3.2));
    const recGiro = Math.max(1, Math.ceil((stFast.mean * 0.8 + stExam.mean * 0.6 + stBoard.mean * 0.4) / 6.5));

    return {
      hour: h,
      label: `${String(h).padStart(2, '0')}h`,
      newArrivalsStats: stArr,
      totalStats: stTot,
      portaStats: stPorta,
      fastReavMedStats: stFast,
      giroExamesStats: stExam,
      boardingStats: stBoard,
      recommendedDocsPorta: recPorta,
      recommendedDocsGiroReav: recGiro,
      recommendedDocsTotal: recPorta + recGiro,
      newArrivalsMean: stArr.mean,
      newArrivalsMedian: stArr.median,
      totalSimultaneousMean: stTot.mean,
      totalSimultaneousMedian: stTot.median,
      totalSimultaneousMax: stTot.max,
      portaMean: stPorta.mean,
      fastReavMedMean: stFast.mean,
      giroExamesMean: stExam.mean,
      boardingMean: stBoard.mean,
    };
  });

  return {
    hourlySimultaneousOverall,
    hourlySimultaneousByDayOfWeek,
    censusHeatmap24x7,
  };
}
// ============================================================================
// FAIXAS DE ENVELHECIMENTO (LOS AGING BUCKETS), PASSAGEM DE PLANTÃO E AUDITORIA
// ============================================================================

function computeLosAgingBuckets(records: NormalizedAttendanceRecord[]): LosAgingBucket[] {
  const total = Math.max(records.length, 1);
  const bucketsDef: { label: string; desc: string; min: number; max: number }[] = [
    { label: 'Até 1h (≤ 60m)', desc: 'Giro Rápido / Alta Imediata', min: 0, max: 60 },
    { label: '1h a 2h (61–120m)', desc: 'Medicação Rápida / Fast Reav', min: 60.01, max: 120 },
    { label: '2h a 4h (121–240m)', desc: 'Investigação Laboratorial / RX', min: 120.01, max: 240 },
    { label: '4h a 6h (241–360m)', desc: 'Tomografia / Reavaliação Complexa', min: 240.01, max: 360 },
    { label: '6h a 12h (361–720m)', desc: 'Observação Prolongada / Início Boarding', min: 360.01, max: 720 },
    { label: 'Acima de 12h (> 720m)', desc: 'Retenção Crítica / Boarding Hospitalar', min: 720.01, max: 99999 },
  ];

  return bucketsDef.map((b) => {
    const sub = records.filter((r) => {
      const los = r.losMin ?? 0;
      return los >= b.min && los <= b.max;
    });
    const st = computeStats(sub.map((r) => r.losMin!).filter((v) => v !== null));
    return {
      bucketLabel: b.label,
      rangeDescription: b.desc,
      count: sub.length,
      percentage: Number(((sub.length / total) * 100).toFixed(1)),
      directDischargeCount: sub.filter((r) => r.isDirectDischarge).length,
      fastReavCount: sub.filter((r) => r.isFastReavMedOnly).length,
      diagnosticExamsCount: sub.filter((r) => r.isDiagnosticExamsLoop && !r.isAdmitted).length,
      admittedCount: sub.filter((r) => r.isAdmitted).length,
      meanLos: st.mean,
    };
  });
}

function computeShiftChangeBottleneck(records: NormalizedAttendanceRecord[]): ShiftChangeBottleneckAnalytics {
  const withLaudo = records.filter((r) => r.lastExamReportTs !== null && r.postLaudoReavalWaitMin !== null);
  const morningRetained: number[] = [];
  const eveningRetained: number[] = [];

  for (const r of withLaudo) {
    const laudoDate = new Date(r.lastExamReportTs!);
    const desfDate = new Date(r.desfechoTs);
    const lHour = laudoDate.getHours() + laudoDate.getMinutes() / 60;
    const dHour = desfDate.getHours() + desfDate.getMinutes() / 60;
    const waitMin = r.postLaudoReavalWaitMin!;

    // Janela da manhã: laudo liberado entre 04h30 e 06h59, mas desfecho só após 07h05 (empurrado para o diurno)
    if (lHour >= 4.5 && lHour < 7.0 && (dHour >= 7.08 || desfDate.getDate() !== laudoDate.getDate()) && !r.isSameDoctor) {
      morningRetained.push(waitMin);
    }
    // Janela da noite: laudo liberado entre 16h30 e 18h59, mas desfecho só após 19h05 (empurrado para o noturno)
    if (lHour >= 16.5 && lHour < 19.0 && (dHour >= 19.08 || desfDate.getDate() !== laudoDate.getDate()) && !r.isSameDoctor) {
      eveningRetained.push(waitMin);
    }
  }

  const totalRetained = morningRetained.length + eveningRetained.length;
  return {
    morningWindowReadyBefore7hCount: morningRetained.length,
    morningWindowExtraWaitStats: computeStats(morningRetained),
    eveningWindowReadyBefore19hCount: eveningRetained.length,
    eveningWindowExtraWaitStats: computeStats(eveningRetained),
    totalShiftChangeRetainedCount: totalRetained,
    pctOfAllPostLaudoPatients:
      withLaudo.length > 0 ? Number(((totalRetained / withLaudo.length) * 100).toFixed(1)) : 0,
  };
}

function computeDataCompletenessAudit(
  records: NormalizedAttendanceRecord[],
  matched3493: number,
  matched3704: number
): DataCompletenessAudit {
  const n = Math.max(records.length, 1);
  const labPatients = records.filter((r) => r.hasLab);
  const tcPatients = records.filter((r) => r.hasTc);
  const admittedPatients = records.filter((r) => r.isAdmitted);
  const admCount = Math.max(admittedPatients.length, 1);

  const reconstructedLabCount = labPatients.filter((r) => r.isLabReportReconstructed).length;
  const nativeLabCount = labPatients.filter((r) => r.waitLabReportMin !== null && !r.isLabReportReconstructed).length;

  return {
    totalRecordsEvaluated: records.length,
    doorToDocCompletenessPct: Number(((records.filter((r) => r.doorToDocMin !== null).length / n) * 100).toFixed(1)),
    consultTimeCompletenessPct: Number(((records.filter((r) => r.consultMin !== null).length / n) * 100).toFixed(1)),
    labReportNativeColPct:
      labPatients.length > 0 ? Number(((nativeLabCount / labPatients.length) * 100).toFixed(1)) : 100,
    labReportReconstructedFromTsCount: reconstructedLabCount,
    tcReportCompletenessPct:
      tcPatients.length > 0
        ? Number(((tcPatients.filter((r) => r.waitTcTotalMin !== null || r.lastExamReportTs !== null).length / tcPatients.length) * 100).toFixed(1))
        : 100,
    losCompletenessPct: Number(((records.filter((r) => r.losMin !== null).length / n) * 100).toFixed(1)),
    negativeTimesPurgedCount: records.filter((r) => r.hadNegativeTimePurged).length,
    cappedOutliersCount: records.filter((r) => r.hadOutlierCapped).length,
    cate3493MatchRateOnAdmissionsPct: Number((Math.min((matched3493 / admCount) * 100, 100)).toFixed(1)),
    chaa3704MatchRateOnAdmissionsPct: Number((Math.min((matched3704 / admCount) * 100, 100)).toFixed(1)),
  };
}

// ============================================================================
// CONSOLIDAÇÃO COMPLETA A PARTIR DOS REGISTROS NORMALIZADOS (COM ESCOPO)
// ============================================================================

export function buildAnalyticsFromRecords(
  records: NormalizedAttendanceRecord[],
  fileName: string,
  hasCate3493Data = false,
  hasChaa3704Data = false,
  matched3493Count = 0,
  matched3704Count = 0,
  allGlobalRecords?: NormalizedAttendanceRecord[],
  selectedSectors?: string[],
  selectedClinics?: string[]
): EmergencyAnalyticsData {
  const globalPool = allGlobalRecords && allGlobalRecords.length > 0 ? allGlobalRecords : records;
  const sorted = [...records].sort((a, b) => a.entradaTs - b.entradaTs);
  const uniqueDates = Array.from(new Set(sorted.map((r) => r.dateStr))).sort();
  const uniqueOpDates = Array.from(new Set(sorted.map((r) => r.operationalDateStr))).sort();
  const totalDays = Math.max(uniqueDates.length, 1);

  // Inventário de Setores e Clínicas na base global
  const secCounts = new Map<string, number>();
  const cliCounts = new Map<string, number>();
  const pairMap = new Map<string, NormalizedAttendanceRecord[]>();

  for (const r of globalPool) {
    secCounts.set(r.setor, (secCounts.get(r.setor) || 0) + 1);
    cliCounts.set(r.clinica, (cliCounts.get(r.clinica) || 0) + 1);
    const pk = `${r.setor}|||${r.clinica}`;
    if (!pairMap.has(pk)) pairMap.set(pk, []);
    pairMap.get(pk)!.push(r);
  }

  const availableSectors = Array.from(secCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const availableClinics = Array.from(cliCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const sectorClinicBreakdown: SectorClinicSummaryRow[] = Array.from(pairMap.entries())
    .map(([pk, list]) => {
      const [setor, clinica] = pk.split('|||');
      const n = list.length;
      const adms = list.filter((x) => x.isAdmitted);
      return {
        setor,
        clinica,
        totalCount: n,
        pctOfGlobal: globalPool.length > 0 ? Number(((n / globalPool.length) * 100).toFixed(1)) : 0,
        dayCount: list.filter((x) => x.shift === 'Diurno').length,
        nightCount: list.filter((x) => x.shift === 'Noturno').length,
        directDischargePct: n > 0 ? Number(((list.filter((x) => x.isDirectDischarge).length / n) * 100).toFixed(1)) : 0,
        fastReavMedPct: n > 0 ? Number(((list.filter((x) => x.isFastReavMedOnly).length / n) * 100).toFixed(1)) : 0,
        diagnosticExamsPct: n > 0 ? Number(((list.filter((x) => x.isDiagnosticExamsLoop).length / n) * 100).toFixed(1)) : 0,
        admissionsCount: adms.length,
        uiCount: adms.filter((x) => x.tipoLeito === 'UI').length,
        utiCount: adms.filter((x) => x.tipoLeito === 'UTI').length,
        surgicalAdmissionsCount: adms.filter((x) => x.isSurgicalProfile).length,
        conversionRate: n > 0 ? Number(((adms.length / n) * 100).toFixed(1)) : 0,
        doorToDocStats: computeStats(list.map((x) => x.doorToDocMin!).filter((v) => v !== null)),
        losStats: computeStats(list.map((x) => x.losMin!).filter((v) => v !== null)),
        boardingTotalStats: computeStats(
          adms.map((x) => (x.totalBoardingMin ?? x.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  const activeSec = selectedSectors && selectedSectors.length > 0 ? selectedSectors : availableSectors.map((s) => s.name);
  const activeCli = selectedClinics && selectedClinics.length > 0 ? selectedClinics : availableClinics.map((c) => c.name);

  const isAllSectors = activeSec.length >= availableSectors.length;
  const isAllClinics = activeCli.length >= availableClinics.length;
  const activeScopeLabel =
    isAllSectors && isAllClinics
      ? `Consolidado Geral da Emergência (${availableSectors.length} Setor[es] / ${availableClinics.length} Clínica[s])`
      : `${activeSec.join(' + ')}  •  Clínica(s): ${activeCli.join(' + ')}`;

  const firstDate = uniqueDates[0] || '2026-10-01';
  const monthKey = firstDate.slice(0, 7);
  const [yy, mm] = monthKey.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodLabel = `${monthNames[(Number(mm) || 10) - 1]}/${yy}`;

  const totalAttendances = sorted.length;
  const admittedList = sorted.filter((r) => r.isAdmitted);
  const totalAdmissions = admittedList.length;
  const admittedUiList = admittedList.filter((r) => r.tipoLeito === 'UI');
  const admittedUtiList = admittedList.filter((r) => r.tipoLeito === 'UTI');
  const admittedSurgicalList = admittedList.filter((r) => r.isSurgicalProfile);
  const admittedClinicalList = admittedList.filter((r) => !r.isSurgicalProfile);

  const uiAdmissions = admittedUiList.length;
  const utiAdmissions = admittedUtiList.length;
  const surgicalAdmissions = admittedSurgicalList.length;
  const clinicalAdmissions = admittedClinicalList.length;
  const conversionRate = totalAttendances > 0 ? Number(((totalAdmissions / totalAttendances) * 100).toFixed(1)) : 0;

  const evasions = sorted.filter((r) => r.isPreMedEvasion || r.isPostMedEvasion);
  const evasionCount = evasions.length;
  const evasionRate = totalAttendances > 0 ? Number(((evasionCount / totalAttendances) * 100).toFixed(1)) : 0;

  const dayRecords = sorted.filter((r) => r.shift === 'Diurno');
  const nightRecords = sorted.filter((r) => r.shift === 'Noturno');

  const makeShiftBreakdown = (extractor: (r: NormalizedAttendanceRecord) => number | null): ShiftMetricBreakdown => ({
    overall: computeStats(sorted.map(extractor).filter((v): v is number => v !== null)),
    dayShift: computeStats(dayRecords.map(extractor).filter((v): v is number => v !== null)),
    nightShift: computeStats(nightRecords.map(extractor).filter((v): v is number => v !== null)),
  });

  // Série Diária (Civil e Operacional)
  const dailyMap = new Map<string, NormalizedAttendanceRecord[]>();
  const opDailyMap = new Map<string, NormalizedAttendanceRecord[]>();
  for (const r of sorted) {
    if (!dailyMap.has(r.dateStr)) dailyMap.set(r.dateStr, []);
    dailyMap.get(r.dateStr)!.push(r);

    if (!opDailyMap.has(r.operationalDateStr)) opDailyMap.set(r.operationalDateStr, []);
    opDailyMap.get(r.operationalDateStr)!.push(r);
  }

  const dailySeries = uniqueDates.map((dStr) => {
    const list = dailyMap.get(dStr) || [];
    const [y, m, d] = dStr.split('-').map(Number);
    const dtObj = new Date(y, m - 1, d);
    const dayIdx = getJsDayToMondayIndex(dtObj.getDay());
    return {
      date: dStr,
      label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      dayOfWeek: WEEKDAY_NAMES[dayIdx],
      total: list.length,
      dayShift: list.filter((x) => x.shift === 'Diurno').length,
      nightShift: list.filter((x) => x.shift === 'Noturno').length,
      admissions: list.filter((x) => x.isAdmitted).length,
      meanDoorToDoc: computeStats(list.map((x) => x.doorToDocMin!).filter((v) => v !== null)).mean,
      meanLos: computeStats(list.map((x) => x.losMin!).filter((v) => v !== null)).mean,
    };
  });

  const dailyVolume: ShiftMetricBreakdown = {
    overall: computeStats(dailySeries.map((d) => d.total)),
    dayShift: computeStats(dailySeries.map((d) => d.dayShift)),
    nightShift: computeStats(dailySeries.map((d) => d.nightShift)),
  };

  const doorToDoctor = makeShiftBreakdown((r) => r.doorToDocMin);
  const consultTime = makeShiftBreakdown((r) => r.consultMin);
  const medicationWait = makeShiftBreakdown((r) => r.waitMedMin);
  const medicationAdmTime = makeShiftBreakdown((r) => r.admMedMin);
  const labWait = makeShiftBreakdown((r) => r.waitLabCollectMin);
  const labReportWait = makeShiftBreakdown((r) => r.waitLabReportMin ?? r.combinedExamReportWaitMin);
  const rxWait = makeShiftBreakdown((r) => r.waitRxMin);
  const tcWait = makeShiftBreakdown((r) => r.waitTcTotalMin);
  const losOverall = makeShiftBreakdown((r) => r.losMin);

  const dischargedOnly = sorted.filter((r) => !r.isAdmitted);
  const losDischarge: ShiftMetricBreakdown = {
    overall: computeStats(dischargedOnly.map((r) => r.losMin!).filter((v) => v !== null)),
    dayShift: computeStats(dischargedOnly.filter((r) => r.shift === 'Diurno').map((r) => r.losMin!).filter((v) => v !== null)),
    nightShift: computeStats(dischargedOnly.filter((r) => r.shift === 'Noturno').map((r) => r.losMin!).filter((v) => v !== null)),
  };

  const losAdmissionWait: ShiftMetricBreakdown = {
    overall: computeStats(admittedList.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null)),
    dayShift: computeStats(admittedList.filter((r) => r.shift === 'Diurno').map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null)),
    nightShift: computeStats(admittedList.filter((r) => r.shift === 'Noturno').map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null)),
  };

  const labCount = sorted.filter((r) => r.hasLab).length;
  const rxCount = sorted.filter((r) => r.hasRx).length;
  const tcCount = sorted.filter((r) => r.hasTc).length;
  const usgCount = sorted.filter((r) => r.hasUsg).length;
  const medCount = sorted.filter((r) => r.hasMed).length;

  const validDoorRecords = sorted.filter((r) => r.doorToDocMin !== null);
  const withinSlaDoorToDocCount = validDoorRecords.filter((r) => (r.doorToDocMin ?? 999) <= 20).length;
  const withinSlaDoorToDocRate =
    validDoorRecords.length > 0 ? Number(((withinSlaDoorToDocCount / validDoorRecords.length) * 100).toFixed(1)) : 0;

  // Heatmap 24x7 de Chegadas na Porta alinhado ao Ciclo Operacional de Plantão (07h D -> 06h59 D+1)
  const heatmap24x7: HeatmapCellStat[] = [];
  for (let d = 0; d < 7; d++) {
    const opDatesForDay = uniqueOpDates.filter((dStr) => {
      const [yy2, mm2, dd2] = dStr.split('-').map(Number);
      return getJsDayToMondayIndex(new Date(yy2, mm2 - 1, dd2).getDay()) === d;
    });
    const occDays = Math.max(opDatesForDay.length, 1);

    for (const h of HOURS_7_TO_6) {
      const perDateCounts = opDatesForDay.map(
        (dStr) => (opDailyMap.get(dStr) || []).filter((r) => r.hour === h).length
      );
      const st = computeStats(perDateCounts);
      heatmap24x7.push({
        dayIndex: d,
        hour: h,
        totalCount: st.sum,
        OccurrencesDays: occDays,
        mean: st.mean,
        stdDev: st.stdDev,
        median: st.median,
        min: st.min,
        max: st.max,
      });
    }
  }

  const hourlyCurve = HOURS_7_TO_6.map((h) => {
    const perDateCounts = uniqueOpDates.map(
      (dStr) => (opDailyMap.get(dStr) || []).filter((r) => r.hour === h).length
    );
    const st = computeStats(perDateCounts);
    const hRecs = sorted.filter((r) => r.hour === h);
    return {
      hour: h,
      label: `${String(h).padStart(2, '0')}h`,
      total: hRecs.length,
      meanPerDay: st.mean,
      stdDevPerDay: st.stdDev,
      medianPerDay: st.median,
      minPerDay: st.min,
      maxPerDay: st.max,
      meanDoorToDoc: computeStats(hRecs.map((r) => r.doorToDocMin!).filter((v) => v !== null)).mean,
      meanLos: computeStats(hRecs.map((r) => r.losMin!).filter((v) => v !== null)).mean,
    };
  });

  const weekdayStats = WEEKDAY_NAMES.map((dayName, dIdx) => {
    const datesForDay = uniqueDates.filter((dStr) => {
      const [yy2, mm2, dd2] = dStr.split('-').map(Number);
      return getJsDayToMondayIndex(new Date(yy2, mm2 - 1, dd2).getDay()) === dIdx;
    });
    const dailyTotals = datesForDay.map((dStr) => (dailyMap.get(dStr) || []).length);
    const dayShiftTotals = datesForDay.map(
      (dStr) => (dailyMap.get(dStr) || []).filter((r) => r.shift === 'Diurno').length
    );
    const nightShiftTotals = datesForDay.map(
      (dStr) => (dailyMap.get(dStr) || []).filter((r) => r.shift === 'Noturno').length
    );
    const st = computeStats(dailyTotals);
    const wRecs = sorted.filter((r) => r.dayOfWeekIdx === dIdx);
    return {
      dayIndex: dIdx,
      dayName,
      total: wRecs.length,
      daysOccurred: datesForDay.length,
      meanPerDay: st.mean,
      stdDevPerDay: st.stdDev,
      medianPerDay: st.median,
      minPerDay: st.min,
      maxPerDay: st.max,
      dayShiftMean: computeStats(dayShiftTotals).mean,
      nightShiftMean: computeStats(nightShiftTotals).mean,
      meanDoorToDoc: computeStats(wRecs.map((r) => r.doorToDocMin!).filter((v) => v !== null)).mean,
      meanLos: computeStats(wRecs.map((r) => r.losMin!).filter((v) => v !== null)).mean,
    };
  });

  const weekLabels = ['Semana 1 (01–07)', 'Semana 2 (08–14)', 'Semana 3 (15–21)', 'Semana 4 (22–28)', 'Semana 5 (29–31)'];
  const weekOfMonthStats = weekLabels
    .map((wLabel) => {
      const wRecs = sorted.filter((r) => r.weekOfMonthLabel === wLabel);
      const wDates = Array.from(new Set(wRecs.map((r) => r.dateStr)));
      const perDayCounts = wDates.map((dStr) => (dailyMap.get(dStr) || []).length);
      const st = computeStats(perDayCounts);
      return {
        weekLabel: wLabel,
        daysCount: wDates.length,
        total: wRecs.length,
        meanPerDay: st.mean,
        stdDevPerDay: st.stdDev,
        medianPerDay: st.median,
        meanDoorToDoc: computeStats(wRecs.map((r) => r.doorToDocMin!).filter((v) => v !== null)).mean,
        meanLos: computeStats(wRecs.map((r) => r.losMin!).filter((v) => v !== null)).mean,
        admissions: wRecs.filter((r) => r.isAdmitted).length,
      };
    })
    .filter((w) => w.total > 0);

  // Top CIDs, Clusters e Matriz CID x Rota de Throughput
  const cidMap = new Map<string, NormalizedAttendanceRecord[]>();
  const clusterMap = new Map<string, NormalizedAttendanceRecord[]>();
  for (const r of sorted) {
    const cKey = r.cid || 'NÃO INFORMADO';
    if (!cidMap.has(cKey)) cidMap.set(cKey, []);
    cidMap.get(cKey)!.push(r);

    if (!clusterMap.has(r.clusterName)) clusterMap.set(r.clusterName, []);
    clusterMap.get(r.clusterName)!.push(r);
  }

  const topCids: CidStat[] = Array.from(cidMap.entries())
    .filter(([cid]) => cid !== 'NÃO INFORMADO')
    .map(([cid, list]) => {
      const losSt = computeStats(list.map((r) => r.losMin!).filter((v) => v !== null));
      return {
        cid,
        count: list.length,
        percentage: Number(((list.length / Math.max(totalAttendances, 1)) * 100).toFixed(1)),
        dayCount: list.filter((r) => r.shift === 'Diurno').length,
        nightCount: list.filter((r) => r.shift === 'Noturno').length,
        meanLos: losSt.mean,
        medianLos: losSt.median,
        admissionRate: Number(((list.filter((r) => r.isAdmitted).length / list.length) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  const cidClusters: CidClusterStat[] = Array.from(clusterMap.entries())
    .map(([clusterName, list]) => {
      const losSt = computeStats(list.map((r) => r.losMin!).filter((v) => v !== null));
      const subCidCounts = new Map<string, number>();
      list.forEach((r) => {
        if (r.cid && r.cid !== 'NÃO INFORMADO') {
          subCidCounts.set(r.cid, (subCidCounts.get(r.cid) || 0) + 1);
        }
      });
      const topSub = Array.from(subCidCounts.entries())
        .map(([cid, count]) => ({ cid, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return {
        clusterName,
        count: list.length,
        percentage: Number(((list.length / Math.max(totalAttendances, 1)) * 100).toFixed(1)),
        meanLos: losSt.mean,
        medianLos: losSt.median,
        labRate: Number(((list.filter((r) => r.hasLab).length / list.length) * 100).toFixed(1)),
        tcRate: Number(((list.filter((r) => r.hasTc).length / list.length) * 100).toFixed(1)),
        medRate: Number(((list.filter((r) => r.hasMed).length / list.length) * 100).toFixed(1)),
        admissionRate: Number(((list.filter((r) => r.isAdmitted).length / list.length) * 100).toFixed(1)),
        topCids: topSub,
      };
    })
    .sort((a, b) => b.count - a.count);

  const cidThroughputMatrix: CidThroughputRow[] = Array.from(cidMap.entries())
    .filter(([cid]) => cid !== 'NÃO INFORMADO')
    .map(([cid, list]) => {
      const n = list.length;
      const direct = list.filter((r) => r.isDirectDischarge).length;
      const fastMed = list.filter((r) => r.isFastReavMedOnly).length;
      const diag = list.filter((r) => r.isDiagnosticExamsLoop && !r.isAdmitted).length;
      const adm = list.filter((r) => r.isAdmitted).length;
      const losSt = computeStats(list.map((r) => r.losMin!).filter((v) => v !== null));
      return {
        cid,
        clusterName: list[0]?.clusterName || 'Outros',
        totalCount: n,
        pctOfTotalPs: Number(((n / Math.max(totalAttendances, 1)) * 100).toFixed(1)),
        directDischargeCount: direct,
        directDischargePct: Number(((direct / n) * 100).toFixed(1)),
        fastReavMedCount: fastMed,
        fastReavMedPct: Number(((fastMed / n) * 100).toFixed(1)),
        diagnosticGiroCount: diag,
        diagnosticGiroPct: Number(((diag / n) * 100).toFixed(1)),
        admittedCount: adm,
        admittedPct: Number(((adm / n) * 100).toFixed(1)),
        meanLos: losSt.mean,
        medianLos: losSt.median,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 25);

  // Produtividade por Médico e Matriz Dupla (1º Atendimento vs Último Atendimento)
  const docFirstMap = new Map<string, NormalizedAttendanceRecord[]>();
  const docLastMap = new Map<string, NormalizedAttendanceRecord[]>();
  const allDocNames = new Set<string>();

  for (const r of sorted) {
    if (r.medicoAnamnese && r.medicoAnamnese !== 'NÃO INFORMADO') {
      allDocNames.add(r.medicoAnamnese);
      if (!docFirstMap.has(r.medicoAnamnese)) docFirstMap.set(r.medicoAnamnese, []);
      docFirstMap.get(r.medicoAnamnese)!.push(r);
    }
    if (r.medicoUltimoAtend && r.medicoUltimoAtend !== 'NÃO INFORMADO') {
      allDocNames.add(r.medicoUltimoAtend);
      if (!docLastMap.has(r.medicoUltimoAtend)) docLastMap.set(r.medicoUltimoAtend, []);
      docLastMap.get(r.medicoUltimoAtend)!.push(r);
    }
  }

  const doctorProductivity: DoctorProductivity[] = Array.from(docFirstMap.entries())
    .map(([name, list]) => {
      const shiftMap = new Map<string, number>();
      list.forEach((r) => {
        const sKey = `${r.operationalDateStr}_${r.shift}`;
        shiftMap.set(sKey, (shiftMap.get(sKey) || 0) + 1);
      });
      const shiftCounts = Array.from(shiftMap.values());
      const shSt = computeStats(shiftCounts);
      const consSt = computeStats(list.map((r) => r.consultMin!).filter((v) => v !== null));
      const doorSt = computeStats(list.map((r) => r.doorToDocMin!).filter((v) => v !== null));
      const losSt = computeStats(list.map((r) => r.losMin!).filter((v) => v !== null));
      const n = list.length;

      return {
        name,
        totalAttendances: n,
        dayAttendances: list.filter((r) => r.shift === 'Diurno').length,
        nightAttendances: list.filter((r) => r.shift === 'Noturno').length,
        shiftsWorked: shiftCounts.length,
        meanPerShift: shSt.mean,
        stdDevPerShift: shSt.stdDev,
        medianPerShift: shSt.median,
        minPerShift: shSt.min,
        maxPerShift: shSt.max,
        meanConsultTime: consSt.mean,
        medianConsultTime: consSt.median,
        meanDoorToDoc: doorSt.mean,
        meanLos: losSt.mean,
        medianLos: losSt.median,
        labRate: Number(((list.filter((r) => r.hasLab).length / n) * 100).toFixed(1)),
        rxRate: Number(((list.filter((r) => r.hasRx).length / n) * 100).toFixed(1)),
        tcRate: Number(((list.filter((r) => r.hasTc).length / n) * 100).toFixed(1)),
        medRate: Number(((list.filter((r) => r.hasMed).length / n) * 100).toFixed(1)),
        admissionRate: Number(((list.filter((r) => r.isAdmitted).length / n) * 100).toFixed(1)),
        directDischargeRate: Number(((list.filter((r) => r.isDirectDischarge).length / n) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.totalAttendances - a.totalAttendances);

  const doctorConductMatrix: DoctorConductRow[] = Array.from(allDocNames)
    .map((name) => {
      const fList = docFirstMap.get(name) || [];
      const lList = docLastMap.get(name) || [];
      const n1 = fList.length;
      const nLast = lList.length;
      const p1 = (cnt: number) => (n1 > 0 ? Number(((cnt / n1) * 100).toFixed(1)) : 0);
      const pLast = (cnt: number) => (nLast > 0 ? Number(((cnt / nLast) * 100).toFixed(1)) : 0);

      const directCnt = fList.filter((r) => r.isDirectDischarge).length;
      const fastMedCnt = fList.filter((r) => r.isFastReavMedOnly).length;
      const admFromFirstCnt = fList.filter((r) => r.isAdmitted).length;
      const consSt = computeStats(fList.map((r) => r.consultMin!).filter((v) => v !== null));
      const losSt = computeStats(fList.map((r) => r.losMin!).filter((v) => v !== null));

      const ownClosedCnt = lList.filter((r) => r.isSameDoctor).length;
      const handoffClosedCnt = lList.filter((r) => !r.isSameDoctor).length;
      const postPropDiscCnt = lList.filter((r) => r.isPostPropDischarge).length;
      const admSignedCnt = lList.filter((r) => r.isAdmitted).length;

      return {
        name,
        firstAttendCount: n1,
        firstDayCount: fList.filter((r) => r.shift === 'Diurno').length,
        firstNightCount: fList.filter((r) => r.shift === 'Noturno').length,
        directDischargeCount: directCnt,
        directDischargePct: p1(directCnt),
        fastReavMedOnlyCount: fastMedCnt,
        fastReavMedOnlyPct: p1(fastMedCnt),
        medOrderedPct: p1(fList.filter((r) => r.hasMed).length),
        labOrderedPct: p1(fList.filter((r) => r.hasLab).length),
        rxOrderedPct: p1(fList.filter((r) => r.hasRx).length),
        tcOrderedPct: p1(fList.filter((r) => r.hasTc).length),
        usgOrderedPct: p1(fList.filter((r) => r.hasUsg).length),
        convertedToAdmissionCount: admFromFirstCnt,
        convertedToAdmissionPct: p1(admFromFirstCnt),
        firstAttendMeanConsultMin: consSt.mean,
        firstAttendMeanLosMin: losSt.mean,
        firstAttendMedianLosMin: losSt.median,
        lastAttendCount: nLast,
        lastDayCount: lList.filter((r) => r.shift === 'Diurno').length,
        lastNightCount: lList.filter((r) => r.shift === 'Noturno').length,
        closedOwnPatientsCount: ownClosedCnt,
        closedHandoffPatientsCount: handoffClosedCnt,
        handoffAbsorptionPct: pLast(handoffClosedCnt),
        postPropDischargeCount: postPropDiscCnt,
        postPropDischargePct: pLast(postPropDiscCnt),
        admissionsSignedCount: admSignedCnt,
        admissionsSignedPct: pLast(admSignedCnt),
        netReavalBalance: nLast - n1,
      };
    })
    .sort((a, b) => b.firstAttendCount + b.lastAttendCount - (a.firstAttendCount + a.lastAttendCount));

  // Recortes Multidimensionais do VSM (Mensal, Turnos, Semanas e Dias da Semana)
  const monthlyOverall = buildVsmSlice('Consolidado Mensal', sorted);
  const byShift = {
    day: buildVsmSlice('Plantão Diurno (07h–18h59)', dayRecords),
    night: buildVsmSlice('Plantão Noturno (19h–06h59)', nightRecords),
  };

  const byWeekOfMonth: Record<string, VsmSliceMetrics> = {};
  for (const wLabel of weekLabels) {
    const wRecs = sorted.filter((r) => r.weekOfMonthLabel === wLabel);
    if (wRecs.length > 0) {
      byWeekOfMonth[wLabel] = buildVsmSlice(wLabel, wRecs);
    }
  }

  const byDayOfWeek: Record<string, VsmSliceMetrics> = {};
  WEEKDAY_NAMES.forEach((dName, idx) => {
    const dRecs = sorted.filter((r) => r.dayOfWeekIdx === idx);
    byDayOfWeek[dName] = buildVsmSlice(dName, dRecs);
  });

  // Censo Simultâneo Horário e Heatmap 24x7 de Censo
  const { hourlySimultaneousOverall, hourlySimultaneousByDayOfWeek, censusHeatmap24x7 } =
    computeSimultaneousCensus(sorted);

  // Decomposição do Boarding em 5 Cortes: Global, UI, UTI, Cirúrgico e Clínico Não Cirúrgico
  const boardingByBedType = {
    global: buildBedTypeBoardingBreakdown('Global', 'Consolidado Geral (Todas as Internações)', admittedList, totalAdmissions, totalDays),
    ui: buildBedTypeBoardingBreakdown('UI', 'Enfermaria / Unidade de Internação (UI)', admittedUiList, totalAdmissions, totalDays),
    uti: buildBedTypeBoardingBreakdown('UTI', 'Unidade de Terapia Intensiva (UTI)', admittedUtiList, totalAdmissions, totalDays),
    surgical: buildBedTypeBoardingBreakdown('Surgical', 'Perfil Cirúrgico / Centro Cirúrgico (CC=S / Cirurgia / Ortopedia)', admittedSurgicalList, totalAdmissions, totalDays),
    clinical: buildBedTypeBoardingBreakdown('Clinical', 'Perfil Clínico Não Cirúrgico (CC=N)', admittedClinicalList, totalAdmissions, totalDays),
  };

  // Boarding por Convênio (Operadora de Saúde) com separação UI vs UTI e Cirúrgico vs Clínico
  const convMap = new Map<string, NormalizedAttendanceRecord[]>();
  for (const r of admittedList) {
    const cName = r.convenio || 'OUTROS / NÃO INFORMADO';
    if (!convMap.has(cName)) convMap.set(cName, []);
    convMap.get(cName)!.push(r);
  }

  const boardingByConvenio: ConvenioBoardingStat[] = Array.from(convMap.entries())
    .map(([convenio, list]) => {
      const uiSub = list.filter((r) => r.tipoLeito === 'UI');
      const utiSub = list.filter((r) => r.tipoLeito === 'UTI');
      const surgSub = list.filter((r) => r.isSurgicalProfile);
      const clinSub = list.filter((r) => !r.isSurgicalProfile);
      return {
        convenio,
        admittedCount: list.length,
        pctOfAdmissions: totalAdmissions > 0 ? Number(((list.length / totalAdmissions) * 100).toFixed(1)) : 0,
        uiCount: uiSub.length,
        utiCount: utiSub.length,
        ccCount: surgSub.length,
        clinicalCount: clinSub.length,
        t1VirtualApprovalStats: computeStats(
          list.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        t2PhysicalUploadStats: computeStats(
          list.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
        ),
        totalBoardingStats: computeStats(
          list.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        hospitalStayDaysStats: computeStats(list.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)),
        uiT1VirtualStats: computeStats(
          uiSub.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        uiT2PhysicalStats: computeStats(
          uiSub.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
        ),
        uiTotalBoardingStats: computeStats(
          uiSub.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        utiT1VirtualStats: computeStats(
          utiSub.map((r) => (r.waitAguardoToVirtualMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        utiT2PhysicalStats: computeStats(
          utiSub.map((r) => r.waitVirtualToPhysicalMin!).filter((v) => v !== null && v >= 0)
        ),
        utiTotalBoardingStats: computeStats(
          utiSub.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        surgicalTotalBoardingStats: computeStats(
          surgSub.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
        clinicalTotalBoardingStats: computeStats(
          clinSub.map((r) => (r.totalBoardingMin ?? r.waitDecisionToVirtualMin)!).filter((v) => v !== null && v >= 0)
        ),
      };
    })
    .sort((a, b) => b.admittedCount - a.admittedCount);

  const surgicalAdmissionsCount = admittedSurgicalList.length;
  const surgicalAdmissionsPct =
    totalAdmissions > 0 ? Number(((surgicalAdmissionsCount / totalAdmissions) * 100).toFixed(1)) : 0;
  const clinicalAdmissionsCount = admittedClinicalList.length;
  const clinicalAdmissionsPct =
    totalAdmissions > 0 ? Number(((clinicalAdmissionsCount / totalAdmissions) * 100).toFixed(1)) : 0;

  const hospitalStayDaysStats = computeStats(
    admittedList.map((r) => r.hospitalStayDays!).filter((v) => v !== null && v >= 0)
  );
  const wastedBedHoursInBoarding = boardingByBedType.global.wastedBedHours;
  const equivalentBlockedBeds24h = boardingByBedType.global.equivalentBlockedBeds24h;

  const losAgingBuckets = computeLosAgingBuckets(sorted);
  const shiftChangeBottleneck = computeShiftChangeBottleneck(sorted);
  const dataQualityAudit = computeDataCompletenessAudit(sorted, matched3493Count, matched3704Count);

  // Governança Diagnóstica (CHAA 3704: Diag entrada vs Diag saida)
  const eval3704 = admittedList.filter((r) => r.diagEntrada3704 && r.diagSaida3704);
  let exactMatchCount = 0;
  let sameChapterCount = 0;
  let crossChapterCount = 0;
  const pairCounter = new Map<string, DiagnosticChangePair>();

  for (const r of eval3704) {
    const rawIn = r.diagEntrada3704!.trim();
    const rawOut = r.diagSaida3704!.trim();
    const codeIn = rawIn.split('-')[0].trim().toUpperCase();
    const codeOut = rawOut.split('-')[0].trim().toUpperCase();

    if (codeIn === codeOut) {
      exactMatchCount++;
    } else {
      const chapIn = codeIn.charAt(0);
      const chapOut = codeOut.charAt(0);
      const isSameChap = chapIn === chapOut || (['R', 'Z'].includes(chapIn) && chapOut !== '');
      if (isSameChap) sameChapterCount++;
      else crossChapterCount++;

      const pKey = `${rawIn}|||${rawOut}`;
      const existing = pairCounter.get(pKey);
      if (existing) {
        existing.count++;
      } else {
        pairCounter.set(pKey, {
          cidIn: rawIn,
          cidOut: rawOut,
          count: 1,
          isSameChapter: isSameChap,
          classification: isSameChap ? 'Refinamento Fisiopatológico' : 'Mudança de Sistema/Capítulo',
        });
      }
    }
  }

  const evalCount = eval3704.length;
  const reclassifiedCount = evalCount - exactMatchCount;
  const diagnosticGovernance: DiagnosticGovernanceAnalytics = {
    hasChaa3704Data: hasChaa3704Data || evalCount > 0,
    evaluatedAdmissionsCount: evalCount,
    exactMatchCount,
    exactMatchPct: evalCount > 0 ? Number(((exactMatchCount / evalCount) * 100).toFixed(1)) : 0,
    reclassifiedCount,
    reclassifiedPct: evalCount > 0 ? Number(((reclassifiedCount / evalCount) * 100).toFixed(1)) : 0,
    sameChapterRefinementCount: sameChapterCount,
    sameChapterRefinementPct: evalCount > 0 ? Number(((sameChapterCount / evalCount) * 100).toFixed(1)) : 0,
    crossChapterDiscordanceCount: crossChapterCount,
    crossChapterDiscordancePct: evalCount > 0 ? Number(((crossChapterCount / evalCount) * 100).toFixed(1)) : 0,
    meanLosExactMatch: computeStats(
      eval3704
        .filter((r) => r.diagEntrada3704!.split('-')[0].trim() === r.diagSaida3704!.split('-')[0].trim())
        .map((r) => r.losMin!)
        .filter((v) => v !== null)
    ).mean,
    meanLosReclassified: computeStats(
      eval3704
        .filter((r) => r.diagEntrada3704!.split('-')[0].trim() !== r.diagSaida3704!.split('-')[0].trim())
        .map((r) => r.losMin!)
        .filter((v) => v !== null)
    ).mean,
    topReclassifications: Array.from(pairCounter.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
  };

  // Auditoria de Retorno Precoce (<48h e <72h via DT Últ Passagem PS)
  const withPrior = sorted.filter((r) => r.hoursSinceLastVisit !== null && r.hoursSinceLastVisit > 0.5);
  const ret48 = withPrior.filter((r) => r.hoursSinceLastVisit! <= 48);
  const ret72 = withPrior.filter((r) => r.hoursSinceLastVisit! <= 72);
  const ret48Adm = ret48.filter((r) => r.isAdmitted);
  const ret72Adm = ret72.filter((r) => r.isAdmitted);

  const retCidMap = new Map<string, { count: number; admittedCount: number }>();
  for (const r of ret72) {
    const c = r.cid || 'NÃO INFORMADO';
    if (c === 'NÃO INFORMADO') continue;
    const cur = retCidMap.get(c) || { count: 0, admittedCount: 0 };
    cur.count++;
    if (r.isAdmitted) cur.admittedCount++;
    retCidMap.set(c, cur);
  }

  const returnVisits: ReturnVisitAnalytics = {
    totalWithPriorVisitRecord: withPrior.length,
    return48hCount: ret48.length,
    return48hPct: totalAttendances > 0 ? Number(((ret48.length / totalAttendances) * 100).toFixed(2)) : 0,
    return48hAdmittedCount: ret48Adm.length,
    return48hAdmissionRate: ret48.length > 0 ? Number(((ret48Adm.length / ret48.length) * 100).toFixed(1)) : 0,
    return72hCount: ret72.length,
    return72hPct: totalAttendances > 0 ? Number(((ret72.length / totalAttendances) * 100).toFixed(2)) : 0,
    return72hAdmittedCount: ret72Adm.length,
    return72hAdmissionRate: ret72.length > 0 ? Number(((ret72Adm.length / ret72.length) * 100).toFixed(1)) : 0,
    topReturnCids: Array.from(retCidMap.entries())
      .map(([cid, v]) => ({ cid, count: v.count, admittedCount: v.admittedCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };

  return {
    fileName,
    periodLabel,
    monthKey,
    activeScopeLabel,
    selectedSectors: activeSec,
    selectedClinics: activeCli,
    availableSectors,
    availableClinics,
    sectorClinicBreakdown,
    totalGlobalAttendances: globalPool.length,
    totalDays,
    totalAttendances,
    totalAdmissions,
    uiAdmissions,
    utiAdmissions,
    surgicalAdmissions,
    clinicalAdmissions,
    conversionRate,
    evasionCount,
    evasionRate,
    dailyVolume,
    doorToDoctor,
    consultTime,
    medicationWait,
    medicationAdmTime,
    labWait,
    labReportWait,
    rxWait,
    tcWait,
    losOverall,
    losDischarge,
    losAdmissionWait,
    labCount,
    labRate: totalAttendances > 0 ? Number(((labCount / totalAttendances) * 100).toFixed(1)) : 0,
    rxCount,
    rxRate: totalAttendances > 0 ? Number(((rxCount / totalAttendances) * 100).toFixed(1)) : 0,
    tcCount,
    tcRate: totalAttendances > 0 ? Number(((tcCount / totalAttendances) * 100).toFixed(1)) : 0,
    usgCount,
    usgRate: totalAttendances > 0 ? Number(((usgCount / totalAttendances) * 100).toFixed(1)) : 0,
    medCount,
    medRate: totalAttendances > 0 ? Number(((medCount / totalAttendances) * 100).toFixed(1)) : 0,
    withinSlaDoorToDocCount,
    withinSlaDoorToDocRate,
    dailySeries,
    hourlyCurve,
    weekdayStats,
    weekOfMonthStats,
    heatmap24x7,
    topCids,
    cidClusters,
    doctorProductivity,
    vsm: {
      hasCate3493Data,
      hasChaa3704Data,
      matched3493Count,
      matched3704Count,
      monthlyOverall,
      byShift,
      byWeekOfMonth,
      byDayOfWeek,
      hourlySimultaneousOverall,
      hourlySimultaneousByDayOfWeek,
      censusHeatmap24x7,
      boardingByBedType,
      boardingByConvenio,
      surgicalAdmissionsCount,
      surgicalAdmissionsPct,
      clinicalAdmissionsCount,
      clinicalAdmissionsPct,
      hospitalStayDaysStats,
      wastedBedHoursInBoarding,
      equivalentBlockedBeds24h,
      losAgingBuckets,
      shiftChangeBottleneck,
      dataQualityAudit,
      doctorConductMatrix,
      cidThroughputMatrix,
      diagnosticGovernance,
      returnVisits,
    },
    sanitizedRecords: sorted,
    allSanitizedRecords: globalPool,
  };
}

// ============================================================================
// REFILTRAGEM INSTANTÂNEA EM MEMÓRIA POR SETOR E CLÍNICA (INDIVIDUAL OU AGREGADO)
// ============================================================================

export function filterAnalyticsBySectorAndClinic(
  currentData: EmergencyAnalyticsData,
  selectedSectors: string[],
  selectedClinics: string[]
): EmergencyAnalyticsData {
  const globalPool = currentData.allSanitizedRecords || currentData.sanitizedRecords;
  const secSet = new Set(selectedSectors);
  const cliSet = new Set(selectedClinics);

  const filtered = globalPool.filter(
    (r) =>
      (secSet.size === 0 || secSet.has(r.setor)) &&
      (cliSet.size === 0 || cliSet.has(r.clinica))
  );

  const recordsToUse = filtered.length > 0 ? filtered : globalPool;
  const matched3493 = recordsToUse.filter((r) => r.aguardoInternacaoTs !== null || r.physicalBedTs !== null).length;
  const matched3704 = recordsToUse.filter((r) => r.diagEntrada3704 !== null || r.diagSaida3704 !== null).length;

  return buildAnalyticsFromRecords(
    recordsToUse,
    currentData.fileName,
    currentData.vsm.hasCate3493Data,
    currentData.vsm.hasChaa3704Data,
    matched3493,
    matched3704,
    globalPool,
    selectedSectors,
    selectedClinics
  );
}

// ============================================================================
// LEITURA DE PLANILHA CATE 3333 (GLOBAL OU SEGMENTADA) EM MEMÓRIA RAM
// ============================================================================

export function extractRecordsFromCate3333Buffer(buffer: ArrayBuffer): NormalizedAttendanceRecord[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const records: NormalizedAttendanceRecord[] = [];

  for (const row of rawRows) {
    // Regra de Ouro LGPD: NUNCA ler Paciente, Email, Endereço, Numero, bairro ou Dt. Nascimento
    const atendId = Number(row['Atendimento']);
    const entradaTs = parseTimestampMs(row['Entrada']);
    if (!entradaTs || isNaN(atendId)) continue;

    const setor = standardizeSectorName(row['Setor']);
    const clinica = standardizeClinicName(row['Clínica'] ?? row['Clinica']);

    const entradaDate = new Date(entradaTs);
    const yyyy = entradaDate.getFullYear();
    const mm = String(entradaDate.getMonth() + 1).padStart(2, '0');
    const dd = String(entradaDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const hour = entradaDate.getHours();
    const shift: 'Diurno' | 'Noturno' = hour >= 7 && hour < 19 ? 'Diurno' : 'Noturno';
    const dayOfWeekIdx = getJsDayToMondayIndex(entradaDate.getDay());
    const dayOfWeekName = WEEKDAY_NAMES[dayOfWeekIdx];
    const weekOfMonthLabel = getWeekOfMonthLabel(entradaDate.getDate());

    // Data Operacional de Plantão (07h00 D -> 06h59 D+1): se hora < 7, pertence ao plantão iniciado no dia anterior
    const opDateObj = hour < 7 ? new Date(yyyy, entradaDate.getMonth(), entradaDate.getDate() - 1) : entradaDate;
    const opY = opDateObj.getFullYear();
    const opM = String(opDateObj.getMonth() + 1).padStart(2, '0');
    const opD = String(opDateObj.getDate()).padStart(2, '0');
    const operationalDateStr = `${opY}-${opM}-${opD}`;
    const operationalDayOfWeekIdx = getJsDayToMondayIndex(opDateObj.getDay());

    let hadNegative = false;
    let hadCapped = false;
    const parseDur = (v: unknown, cap: number): number | null => {
      const res = parseDurationMinutesWithAudit(v, cap);
      if (res.wasNegative) hadNegative = true;
      if (res.wasCapped) hadCapped = true;
      return res.minutes;
    };

    const waitRecepMin = parseDur(row['Espera Recepção'], 240);
    const atendRecepMin = parseDur(row['Atend. Recepção'], 240);
    const waitRecepToDocMin = parseDur(row['Esp. Recepção x Médico'], 600);
    const doorToDocMin =
      parseDur(row['Esp. Totem x Médico'], 600) ??
      parseDur(row['Tempo Esp. Atend. Ficha x Médico  '], 600) ??
      waitRecepToDocMin;
    const consultMin = parseDur(row['Atend. Médico'], 240);

    const waitMedMin =
      parseDur(row['Espera Medicamento'], 600) ??
      parseDur(row['Tempo Espera Medicamento'], 600);
    const admMedMin = parseDur(row['Tempo ADM Medicamento'], 600);

    const waitLabCollectMin = parseDur(row['Espera Laboratório'], 600);
    let waitLabReportMin = parseDur(row['Espera Laudo Laboratório'], 1440);
    const dtLaudoLabTs = parseTimestampMs(row['Dt Laudo Lab']);
    let isLabReportReconstructed = false;

    // Blindagem contra o Falso Zero em "7. Espera Laudo": reconstrói via timestamp Dt Laudo Lab quando a coluna vier vazia
    if ((waitLabReportMin === null || waitLabReportMin === 0) && dtLaudoLabTs) {
      const approxCollectTs =
        entradaTs + ((doorToDocMin ?? 30) + (consultMin ?? 15) + (waitLabCollectMin ?? 15)) * 60000;
      const diffLabMin = (dtLaudoLabTs - approxCollectTs) / 60000;
      if (diffLabMin > 2 && diffLabMin <= 1440) {
        waitLabReportMin = Number(diffLabMin.toFixed(1));
        isLabReportReconstructed = true;
      } else if (dtLaudoLabTs > entradaTs) {
        const fallbackLabMin = (dtLaudoLabTs - (entradaTs + (doorToDocMin ?? 30) * 60000)) / 60000;
        if (fallbackLabMin > 5 && fallbackLabMin <= 1440) {
          waitLabReportMin = Number(fallbackLabMin.toFixed(1));
          isLabReportReconstructed = true;
        }
      }
    }

    const waitRxMin =
      parseDur(row['Esp RX Presc x Exec'], 600) ??
      parseDur(row['Espera RX'], 600);

    const waitTcTotalMin = parseDur(row['Espera TC'], 1440);
    const waitTcExecMin = parseDur(row['Esp TC Presc x Exec'], 1440);
    let waitTcReportMin = parseDur(row['Espera Laudo TC'], 1440);
    const dtLaudoTcTs = parseTimestampMs(row['Dt Laudo TC']);

    if ((waitTcReportMin === null || waitTcReportMin === 0) && waitTcTotalMin !== null && waitTcExecMin !== null) {
      const diffTc = waitTcTotalMin - waitTcExecMin;
      if (diffTc > 1 && diffTc <= 1440) {
        waitTcReportMin = Number(diffTc.toFixed(1));
      }
    }

    const waitUsgMin =
      parseDur(row['Espera USG'], 1440) ??
      parseDur(row['Esp USG Presc x Exec'], 1440);
    const dtLaudoUsgTs = parseTimestampMs(row['Dt Laudo Usg']);

    // Tempo consolidado de espera de laudo (Lab / TC / USG) para o paciente
    const reportCandidates = [waitLabReportMin, waitTcReportMin ?? waitTcTotalMin, waitUsgMin].filter(
      (v): v is number => v !== null && v > 0
    );
    const combinedExamReportWaitMin =
      reportCandidates.length > 0 ? Number(Math.max(...reportCandidates).toFixed(1)) : null;

    const losRaw = Number(row['Qt Minutos Entrada- Desfecho']);
    let losMin: number | null = null;
    if (!isNaN(losRaw) && row['Qt Minutos Entrada- Desfecho'] !== null && row['Qt Minutos Entrada- Desfecho'] !== '') {
      if (losRaw < 0) hadNegative = true;
      else if (losRaw > 2880) hadCapped = true;
      else losMin = Number(losRaw.toFixed(1));
    }

    const desfechoParsedTs =
      parseTimestampMs(row['Data Desfecho']) ??
      parseTimestampMs(row['DT Alta Médico']) ??
      parseTimestampMs(row['Dt. Alta']);
    const desfechoTs = desfechoParsedTs ?? entradaTs + (losMin ?? 60) * 60000;

    const laudoTimestamps = [dtLaudoLabTs, dtLaudoTcTs, dtLaudoUsgTs].filter((t): t is number => t !== null);
    const lastExamReportTs = laudoTimestamps.length > 0 ? Math.max(...laudoTimestamps) : null;
    let postLaudoReavalWaitMin: number | null = null;
    if (lastExamReportTs && desfechoParsedTs) {
      const diffMin = (desfechoParsedTs - lastExamReportTs) / 60000;
      if (diffMin >= 0 && diffMin <= 720) {
        postLaudoReavalWaitMin = Number(diffMin.toFixed(1));
      }
    }

    const exLabFlag = String(row['Exame Laboratório'] ?? '').trim().toUpperCase() === 'S';
    const hasMed = waitMedMin !== null || admMedMin !== null;
    const hasLab = exLabFlag || waitLabCollectMin !== null || waitLabReportMin !== null || dtLaudoLabTs !== null;
    const hasRx = waitRxMin !== null;
    const hasTc = waitTcTotalMin !== null || waitTcExecMin !== null || dtLaudoTcTs !== null;
    const hasUsg = waitUsgMin !== null || dtLaudoUsgTs !== null;
    const hasAnyProp = hasMed || hasLab || hasRx || hasTc || hasUsg;

    const hasReceita = row['DT Receita'] !== null && row['DT Receita'] !== '';
    const hasAtestado = row['DT Atestado'] !== null && row['DT Atestado'] !== '';

    const medicoAnamnese = String(row['Medico Anamnese'] ?? '').trim();
    const medicoUltimoAtend = String(row['Médico Último Atend'] ?? '').trim();
    const isSameDoctor =
      Boolean(medicoAnamnese && medicoUltimoAtend) &&
      normalizeStr(medicoAnamnese).toUpperCase() === normalizeStr(medicoUltimoAtend).toUpperCase();

    const motivoAlta = normalizeStr(row['MOTIVO_ALTA']).toUpperCase();
    const isEvaded = /EVADIU|DESISTENCIA|CANCELADO|ABANDONO/.test(motivoAlta);
    const isPreMedEvasion = isEvaded && !medicoAnamnese && consultMin === null;
    const isPostMedEvasion = isEvaded && !isPreMedEvasion;

    const internadoFlag = String(row['Internado'] ?? '').trim().toUpperCase() === 'S';
    const isAdmitted = internadoFlag;

    const isDirectDischarge = !isAdmitted && !isEvaded && !hasAnyProp;
    const isFastReavMedOnly = hasMed && !hasLab && !hasRx && !hasTc && !hasUsg;
    const isDiagnosticExamsLoop = hasLab || hasRx || hasTc || hasUsg;
    const isPostPropDischarge = !isAdmitted && !isEvaded && hasAnyProp;

    const tipoLeitoRaw = normalizeStr(row['Tipo Leito Internação']).toUpperCase();
    const tipoLeito: 'UI' | 'UTI' | 'Outro' =
      tipoLeitoRaw === 'UI' ? 'UI' : tipoLeitoRaw === 'UTI' ? 'UTI' : 'Outro';

    const virtualBedTs = parseTimestampMs(row['Data Internação']);
    const waitDecisionToVirtualMin = parseDur(row['Espera Internação'], 4320);

    const cid = String(row['CID'] ?? '').trim() || 'NÃO INFORMADO';
    const clusterName = classifyCidCluster(cid);
    const convenio = String(row['Convênio'] ?? '').trim() || 'NÃO INFORMADO';
    const isSurgicalByClinic = /CIRURG|ORTOPED/i.test(normalizeStr(clinica));

    const ultPassagemTs = parseTimestampMs(row['DT Últ Passagem PS']);
    let hoursSinceLastVisit: number | null = null;
    if (ultPassagemTs && entradaTs > ultPassagemTs) {
      hoursSinceLastVisit = Number(((entradaTs - ultPassagemTs) / 3600000).toFixed(1));
    }

    records.push({
      atendimentoId: atendId,
      setor,
      clinica,
      entradaTs,
      desfechoTs,
      dateStr,
      operationalDateStr,
      dayOfWeekIdx,
      operationalDayOfWeekIdx,
      dayOfWeekName,
      weekOfMonthLabel,
      hour,
      shift,
      convenio,
      cid,
      clusterName,
      medicoAnamnese,
      medicoUltimoAtend,
      isSameDoctor,
      waitRecepMin,
      atendRecepMin,
      waitRecepToDocMin,
      doorToDocMin,
      consultMin,
      waitMedMin,
      admMedMin,
      waitLabCollectMin,
      waitLabReportMin,
      isLabReportReconstructed,
      waitRxMin,
      waitTcTotalMin,
      waitTcExecMin,
      waitTcReportMin,
      waitUsgMin,
      combinedExamReportWaitMin,
      lastExamReportTs,
      postLaudoReavalWaitMin,
      losMin,
      hasMed,
      hasLab,
      hasRx,
      hasTc,
      hasUsg,
      hasAnyProp,
      hasReceita,
      hasAtestado,
      isPreMedEvasion,
      isPostMedEvasion,
      isDirectDischarge,
      isFastReavMedOnly,
      isDiagnosticExamsLoop,
      isPostPropDischarge,
      isAdmitted,
      tipoLeito,
      virtualBedTs,
      aguardoInternacaoTs: null,
      physicalBedTs: null,
      unidFisicaNome: null,
      isPhysicalBedConfirmed: false,
      waitDecisionToVirtualMin,
      waitAguardoToVirtualMin: null,
      waitVirtualToPhysicalMin: null,
      totalBoardingMin: waitDecisionToVirtualMin,
      isCentroCirurgico: false,
      isSurgicalProfile: isSurgicalByClinic,
      hospitalStayDays: null,
      diagEntrada3704: null,
      diagSaida3704: null,
      hoursSinceLastVisit,
      hadNegativeTimePurged: hadNegative,
      hadOutlierCapped: hadCapped,
    });
  }

  return records;
}

export function parseEmergencyExcel(
  buffer: ArrayBuffer,
  fileName = 'CATE_3333.xls',
  buffer3493?: ArrayBuffer | null,
  buffer3704?: ArrayBuffer | null
): EmergencyAnalyticsData {
  const allRecords = extractRecordsFromCate3333Buffer(buffer);

  // Inicia no foco padrão (Clínica Médica se presente), mantendo 100% da base global em allSanitizedRecords para filtro instantâneo
  const allSectors = Array.from(new Set(allRecords.map((r) => r.setor)));
  const hasMedica = allRecords.some((r) => r.clinica === 'Médica');
  const initialClinics = hasMedica ? ['Médica'] : Array.from(new Set(allRecords.map((r) => r.clinica)));
  const initialRecords = allRecords.filter((r) => initialClinics.includes(r.clinica));

  let baseData = buildAnalyticsFromRecords(
    initialRecords.length > 0 ? initialRecords : allRecords,
    fileName,
    false,
    false,
    0,
    0,
    allRecords,
    allSectors,
    initialClinics
  );

  if (buffer3493 || buffer3704) {
    baseData = mergeVsmSupplementaryFiles(baseData, buffer3493, buffer3704);
  }

  return baseData;
}

// ============================================================================
// MESCLAGEM DE MÚLTIPLOS ARQUIVOS CATE 3333 SEGMENTADOS NO MESMO MÊS (DEDUPLICADO)
// ============================================================================

export function mergeSegmentedCate3333IntoMonth(
  existingMonth: EmergencyAnalyticsData,
  incomingMonth: EmergencyAnalyticsData
): EmergencyAnalyticsData {
  const recordMap = new Map<number, NormalizedAttendanceRecord>();
  (existingMonth.allSanitizedRecords || existingMonth.sanitizedRecords).forEach((r) =>
    recordMap.set(r.atendimentoId, { ...r })
  );
  (incomingMonth.allSanitizedRecords || incomingMonth.sanitizedRecords).forEach((r) =>
    recordMap.set(r.atendimentoId, { ...r })
  );

  const mergedAll = Array.from(recordMap.values()).sort((a, b) => a.entradaTs - b.entradaTs);
  const combinedFileName =
    existingMonth.fileName.includes(incomingMonth.fileName)
      ? existingMonth.fileName
      : `${existingMonth.fileName} + ${incomingMonth.fileName}`;

  const secSet = new Set([...existingMonth.selectedSectors, ...incomingMonth.selectedSectors]);
  const cliSet = new Set([...existingMonth.selectedClinics, ...incomingMonth.selectedClinics]);
  const activeList = mergedAll.filter((r) => secSet.has(r.setor) && cliSet.has(r.clinica));

  const matched3493 = activeList.filter((r) => r.aguardoInternacaoTs !== null || r.physicalBedTs !== null).length;
  const matched3704 = activeList.filter((r) => r.diagEntrada3704 !== null || r.diagSaida3704 !== null).length;

  return buildAnalyticsFromRecords(
    activeList.length > 0 ? activeList : mergedAll,
    combinedFileName,
    existingMonth.vsm.hasCate3493Data || incomingMonth.vsm.hasCate3493Data,
    existingMonth.vsm.hasChaa3704Data || incomingMonth.vsm.hasChaa3704Data,
    matched3493,
    matched3704,
    mergedAll,
    Array.from(secSet),
    Array.from(cliSet)
  );
}

// ============================================================================
// FUSÃO EM MEMÓRIA (LEFT JOIN POR ATENDIMENTO) COM CATE 3493 E CHAA 3704
// ============================================================================

export function mergeVsmSupplementaryFiles(
  currentData: EmergencyAnalyticsData,
  buffer3493?: ArrayBuffer | null,
  buffer3704?: ArrayBuffer | null
): EmergencyAnalyticsData {
  const sourceGlobal = currentData.allSanitizedRecords || currentData.sanitizedRecords;
  const clonedGlobal: NormalizedAttendanceRecord[] = sourceGlobal.map((r) => ({ ...r }));
  const byId = new Map<number, NormalizedAttendanceRecord>();
  clonedGlobal.forEach((r) => byId.set(r.atendimentoId, r));

  let has3493 = currentData.vsm.hasCate3493Data;
  let has3704 = currentData.vsm.hasChaa3704Data;

  // 1. Fusão com CATE 3493 (Boarding Físico UI/UTI, Dt ent aguard, Dt ent unid, CC e Tempo permanencia)
  if (buffer3493) {
    const wb3493 = XLSX.read(buffer3493, { type: 'array', cellDates: true });
    const sh3493 = wb3493.Sheets[wb3493.SheetNames[0]];
    const rows3493 = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh3493, { defval: null });
    let countMatch = 0;

    for (const row of rows3493) {
      const nrAtend = Number(row['Nr atendimento'] ?? row['Atendimento']);
      if (isNaN(nrAtend)) continue;
      const rec = byId.get(nrAtend);
      if (!rec) continue;

      countMatch++;
      rec.isAdmitted = true;

      const dtEntAguardTs = parseTimestampMs(row['Dt ent aguard']);
      const dtEntUnidTs = parseTimestampMs(row['Dt ent unid']);
      const dsSetorUnid = String(row['Ds setor unid'] ?? '').trim();
      const difAguardMin = Number(row['Dif aguardando/Ent. Unid']);
      const tempoPermDays = Number(row['Tempo permanencia']);
      const ccFlag = String(row['Cc'] ?? '').trim().toUpperCase() === 'S';
      const clin3493 = String(row['Clínica'] ?? row['Clinica'] ?? '').trim();
      const conv3493 = String(row['Convenio'] ?? '').trim();

      if (conv3493 && (!rec.convenio || rec.convenio === 'NÃO INFORMADO')) {
        rec.convenio = conv3493;
      }

      rec.aguardoInternacaoTs = dtEntAguardTs;
      rec.physicalBedTs = dtEntUnidTs;
      rec.unidFisicaNome = dsSetorUnid || null;
      rec.isPhysicalBedConfirmed =
        Boolean(dsSetorUnid) && !/LEITO DE ESPERA|NAN/i.test(normalizeStr(dsSetorUnid));
      rec.isCentroCirurgico = ccFlag;
      rec.isSurgicalProfile =
        ccFlag ||
        rec.isSurgicalProfile ||
        /CIRURG|ORTOPED/i.test(normalizeStr(clin3493));

      if (!isNaN(tempoPermDays) && tempoPermDays >= 0) {
        rec.hospitalStayDays = tempoPermDays;
      }

      if (rec.tipoLeito === 'Outro' && dsSetorUnid) {
        if (/UTI|SEMI INTENSIVA|USI/i.test(dsSetorUnid)) rec.tipoLeito = 'UTI';
        else if (/UI|ANDAR|MATERNIDADE/i.test(dsSetorUnid)) rec.tipoLeito = 'UI';
      }

      if (dtEntAguardTs && rec.virtualBedTs && rec.virtualBedTs >= dtEntAguardTs) {
        const t1Min = (rec.virtualBedTs - dtEntAguardTs) / 60000;
        if (t1Min <= 4320) rec.waitAguardoToVirtualMin = Number(t1Min.toFixed(1));
      }

      if (rec.isPhysicalBedConfirmed && dtEntUnidTs && rec.virtualBedTs && dtEntUnidTs >= rec.virtualBedTs) {
        const t2Min = (dtEntUnidTs - rec.virtualBedTs) / 60000;
        if (t2Min <= 4320) rec.waitVirtualToPhysicalMin = Number(t2Min.toFixed(1));
      }

      if (!isNaN(difAguardMin) && difAguardMin > 0 && difAguardMin <= 4320) {
        rec.totalBoardingMin = Number(difAguardMin.toFixed(1));
      } else if (dtEntAguardTs && dtEntUnidTs && dtEntUnidTs >= dtEntAguardTs) {
        const totMin = (dtEntUnidTs - dtEntAguardTs) / 60000;
        if (totMin <= 4320) rec.totalBoardingMin = Number(totMin.toFixed(1));
      }
    }

    if (countMatch > 0) {
      has3493 = true;
    }
  }

  // 2. Fusão com CHAA 3704 (Governança Clínica: Diag entrada vs Diag saida)
  if (buffer3704) {
    const wb3704 = XLSX.read(buffer3704, { type: 'array', cellDates: true });
    const sh3704 = wb3704.Sheets[wb3704.SheetNames[0]];
    const rows3704 = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh3704, { defval: null });
    let countMatch3704 = 0;

    for (const row of rows3704) {
      const nrAtend = Number(row['Atendimento']);
      if (isNaN(nrAtend)) continue;
      const rec = byId.get(nrAtend);
      if (!rec) continue;

      const diagIn = String(row['Diag entrada'] ?? '').trim();
      const diagOut = String(row['Diag saida'] ?? '').trim();
      if (diagIn || diagOut) {
        countMatch3704++;
        rec.diagEntrada3704 = diagIn || null;
        rec.diagSaida3704 = diagOut || null;
      }
    }

    if (countMatch3704 > 0) {
      has3704 = true;
    }
  }

  const secSet = new Set(currentData.selectedSectors);
  const cliSet = new Set(currentData.selectedClinics);
  const filteredActive = clonedGlobal.filter(
    (r) =>
      (secSet.size === 0 || secSet.has(r.setor)) &&
      (cliSet.size === 0 || cliSet.has(r.clinica))
  );
  const activeRecords = filteredActive.length > 0 ? filteredActive : clonedGlobal;

  const matched3493Active = activeRecords.filter((r) => r.aguardoInternacaoTs !== null || r.physicalBedTs !== null).length;
  const matched3704Active = activeRecords.filter((r) => r.diagEntrada3704 !== null || r.diagSaida3704 !== null).length;

  return buildAnalyticsFromRecords(
    activeRecords,
    currentData.fileName,
    has3493,
    has3704,
    matched3493Active,
    matched3704Active,
    clonedGlobal,
    currentData.selectedSectors,
    currentData.selectedClinics
  );
}