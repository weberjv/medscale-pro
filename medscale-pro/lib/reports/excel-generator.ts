import * as XLSX from 'xlsx';
import {
  EmergencyAnalyticsData,
  MetricStats,
  VsmSliceMetrics,
} from '../analytics/emergency-parser';

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS_7_TO_6 = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

function fmtStatFull(st: MetricStats, unit = 'min'): string {
  if (!st || st.count === 0) return '—';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit} [${st.min.toFixed(0)}–${st.max.toFixed(0)} | P90: ${st.p90.toFixed(1)}]`;
}

function fmtCensusStat(st: MetricStats): string {
  if (!st || st.count === 0) return '0.0 (±0.0) | Med: 0.0 [0–0]';
  return `${st.mean.toFixed(1)} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)} [${st.min.toFixed(0)}–${st.max.toFixed(0)} | P90: ${st.p90.toFixed(1)}]`;
}

function autoFitColumns(rows: unknown[][], minW = 12, maxW = 56): XLSX.ColInfo[] {
  if (!rows || rows.length === 0) return [];
  const colCount = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
  const widths: XLSX.ColInfo[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = minW;
    for (let r = 0; r < rows.length; r++) {
      const cell = rows[r]?.[c];
      if (cell !== null && cell !== undefined) {
        const str = String(cell);
        if (str.length > maxLen) maxLen = str.length;
      }
    }
    widths.push({ wch: Math.min(Math.max(maxLen + 3, minW), maxW) });
  }
  return widths;
}

function appendSheetFromAoA(wb: XLSX.WorkBook, name: string, aoa: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = autoFitColumns(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

// ============================================================================
// GERADOR DA ABA 9: NOTA TÉCNICA, METODOLOGIA ANALÍTICA E AUDITORIA DA BASE
// ============================================================================

function buildMethodologySheetAoA(data?: EmergencyAnalyticsData): unknown[][] {
  const dq = data?.vsm.dataQualityAudit;
  const mb = data?.vsm.monthlyOverall.massBalance;
  const periodInfo = data
    ? `Competência Auditada: ${data.periodLabel} | Escopo Ativo: ${data.activeScopeLabel} (N = ${data.totalAttendances} de ${data.totalGlobalAttendances} globais) | CATE 3493: ${
        data.vsm.hasCate3493Data ? `Integrado (${data.vsm.matched3493Count} pac.)` : 'Não anexado'
      } | CHAA 3704: ${data.vsm.hasChaa3704Data ? `Integrado (${data.vsm.matched3704Count} pac.)` : 'Não anexado'}`
    : 'Auditoria Multimensal Consolidada (MoM)';

  const rows: unknown[][] = [
    ['ANEXO TÉCNICO — MEMORIAL METODOLÓGICO, EQUAÇÃO DE CONSERVAÇÃO DE MASSA E AUDITORIA DE QUALIDADE DA BASE (HIS / TASY)'],
    [periodInfo],
    [],
  ];

  if (dq && data && mb) {
    rows.push(
      ['1. AUDITORIA DE COMPLETUDE, SANEAMENTO E PROVA REAL DA EQUAÇÃO DE CONSERVAÇÃO DE MASSA'],
      ['Métrica de Qualidade e Integridade do Prontuário (Tasy)', 'Resultado Auditado na Base', 'Explicação Técnica e Regra de Tratamento Aplicada'],
      [
        'Equação de Conservação de Massa (Balanço de Entradas vs. Saídas)',
        `Entrada: ${mb.totalFichasPorta} === Soma Desfechos: ${mb.auditSumCheck} (100,0%)`,
        `1. Evasão Pré (${mb.b1PreMedEvasionCount}) + 2. Alta 1ºAt (${mb.b2DirectDischarge1stAttendCount}) + 3. Alta Só Med (${mb.b3DischargeAfterMedOnlyCount}) + 4. Alta Exames (${mb.b4DischargeAfterExamsCount}) + 5. Internações (${mb.b5AdmittedTotalCount}) + 6. Evasão Pós (${mb.b6OtherPostAttendEvasionsCount}) + 7. Especiais/Sem Desfecho (${mb.b7TotalInconsistenciesAndSpecialCount}: ${mb.b7aAdminNoConsultCount} Adm s/ Consulta + ${mb.b7bPendingNoOutcomeAtCutoffCount} Sem Desfecho no Corte + ${mb.b7cTransferOrDeathCount} Transf/Óbito).`,
      ],
      [
        'Distinção entre [Medico Anamnese] e [Médico 1º Atend]',
        `Expurgadas ${mb.b7aAdminNoConsultCount} fichas adm. s/ consulta`,
        'No Tasy, [Médico 1º Atend] registra o Coordenador da Unidade na abertura da ficha, enquanto [Medico Anamnese] registra o plantonista que efetivamente examinou o paciente. Fichas administrativas (ex: EXAME MEDICO GERAL com LOS=0 e sem Medico Anamnese) são isoladas no bloco 7A para não distorcer a mediana médica.',
      ],
      [
        'Fechamento Aditivo do Boarding (Subida Física vs. Leito de Espera)',
        `${data.vsm.boardingByBedType.global.physicalConfirmedCount} subidas físicas | ${data.vsm.boardingByBedType.global.virtualWaitOnlyCount} em Leito de Espera`,
        'Nos pacientes com subida física confirmada p/ UI/UTI, Média(T1) + Média(T2) === Média(Boarding Total Físico). Nos pacientes alocados em "Leito de Espera UTI Adulto" no CATE 3493, o Tasy encerra o tempo na criação do leito virtual (T2 = 0). Separar as duas coortes elimina a distorção onde T1 + T2 parecia maior que o Total.',
      ],
      [
        'Preenchimento Nativo de [Espera Laudo Laboratório] vs. Reconstrução via Timestamp',
        `${dq.labReportNativeColPct}% nativo | ${dq.labReportReconstructedFromTsCount} reconstruídos`,
        'Quando a coluna [Espera Laudo Laboratório] vem vazia no CATE 3333, o motor subtrai [Dt Laudo Lab] - [Fim Estimado da Coleta] para eliminar o falso zero na Linha do Tempo Lean.',
      ],
      [
        'Expurgo de Tempos Negativos e Teto de Segurança (Capping)',
        `${dq.negativeTimesPurgedCount} negativos | ${dq.cappedOutliersCount} capped`,
        'Lançamentos retroativos (< 0 min) ou fichas esquecidas abertas (> teto operacional) têm apenas a micro-etapa inválida anulada, preservando 100% da contagem volumétrica.',
      ],
      []
    );
  }

  rows.push(
    ['2. DICIONÁRIO DE FÓRMULAS MATEMÁTICAS E MÁQUINA DE ESTADOS (COMO CADA INDICADOR É CALCULADO)'],
    ['Indicador / Nó do VSM', 'Fórmula Matemática / Regra Lógica Exata', 'Colunas Fontes Utilizadas', 'Interpretação Gerencial e Operacional'],
    [
      '2.1. Equação Geral do VSM (7 Categorias Mutuamente Exclusivas)',
      'Total_Fichas = (1) Evasão_Pré_Médica + (2) Alta_1ºAtend + (3) Alta_Só_Med + (4) Alta_Exames + (5) Internações + (6) Outras_Evasões_Pós + (7A) Ficha_Adm_Sem_Consulta + (7B) Sem_Desfecho_No_Corte + (7C) Transf_Óbito',
      '[Medico Anamnese], [Atend. Médico], [MOTIVO_ALTA], [Data Desfecho], [DT Alta Médico], [Internado], [Nr atendimento 3493]',
      'Garante que nenhum paciente seja contado duas vezes (ex: após fusão com CATE 3493) e que pacientes ainda em atendimento no momento do download da planilha sejam apontados transparentemente em 7B.',
    ],
    [
      '2.2. Ciclo Operacional de Plantão (07h00 D -> 06h59 D+1)',
      'Se Hora(Entrada) < 07h00, a Data Operacional pertence ao plantão iniciado às 07h00 do dia anterior (D-1). Diurno: 07h00–18h59 | Noturno: 19h00–06h59.',
      'Coluna [Entrada] do CATE 3333',
      'Garante que a madrugada (00h–06h) de segunda para terça seja contabilizada no fechamento do plantão noturno de segunda-feira.',
    ],
    [
      '2.3. Máquina de Estados do Censo Simultâneo (Sonda :30)',
      'Sonda em t_probe = DiaOperacional + Hora + 30min. Estado 1 (Porta): t_Entrada <= t_probe < t_FimPorta. Estado 2A (Fast Reav): t_FimPorta <= t_probe < t_Desfecho & Só Medicação. Estado 2B (Giro Exames): t_FimPorta <= t_probe < t_Desfecho & Com Exames. Estado 3 (Boarding): Internado & t_Desfecho <= t_probe < t_SaidaUnidadeFisica.',
      '[Entrada], [Esp. Totem x Médico], [Atend. Médico], [Data Desfecho], [Data Internação], [Dt ent unid]',
      'Reconstrói o estoque acumulado de pacientes presentes simultaneamente no PS em cada hora, exibindo Média, ±DP, Mediana, P90 e Amplitude [Mín–Máx] nas 4 frentes.',
    ],
    [
      '2.4. Boarding Físico (T1 + T2 = Total) vs. Leito de Espera Virtual',
      'Coorte Física (Ds setor unid != "Leito de Espera"): T1 = [Dt ent aguard -> Data Internação], T2 = [Data Internação -> Dt ent unid], Total Físico = T1 + T2. Coorte Leito de Espera: Retenção medida até alocação no Leito de Espera Virtual.',
      'CATE 3333 + CATE 3493 ([Tipo Leito Internação], [Ds setor unid], [Cc], [Dif aguardando/Ent. Unid])',
      'Explica com exatidão matemática o comportamento de Enfermaria (UI), UTI e Pacientes Cirúrgicos vs. Clínicos.',
    ]
  );

  return rows;
}

// ============================================================================
// GERADOR PRINCIPAL DO DOSSIÊ EXECUTIVO EM EXCEL (.XLSX — 9 ABAS COMPLETAS)
// ============================================================================

export function generateEmergencyExcel(data: EmergencyAnalyticsData): void {
  const wb = XLSX.utils.book_new();
  const vsm = data.vsm;
  const m = vsm.monthlyOverall;
  const mb = m.massBalance;
  const bbt = vsm.boardingByBedType;

  // --------------------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO, EQUAÇÃO DE MASSA 100%, AGING, IDADE & SLAS POR TURNO
  // --------------------------------------------------------------------------
  const sheet1: unknown[][] = [
    ['MEDSCALE PRO — DOSSIÊ EXECUTIVO DE INTELIGÊNCIA OPERACIONAL, JORNADA DO PACIENTE & VSM (LEAN HEALTHCARE)'],
    [
      `Competência: ${data.periodLabel}`,
      `Escopo Ativo: ${data.activeScopeLabel}`,
      `População Ativa: N = ${data.totalAttendances} (de ${data.totalGlobalAttendances} globais)`,
      `Dias Analisados: ${data.totalDays}`,
      `CATE 3493: ${vsm.hasCate3493Data ? `Integrado (${vsm.matched3493Count} pac.)` : 'Não anexado'}`,
      `CHAA 3704: ${vsm.hasChaa3704Data ? `Integrado (${vsm.matched3704Count} pac.)` : 'Não anexado'}`,
    ],
    [],
    ['1. EQUAÇÃO DE CONSERVAÇÃO DE MASSA DO FLUXO VSM (BALANÇO 100% FECHADO DE TODAS AS FICHAS ABERTAS NA PORTA)'],
    ['Componente da Equação (Categorias Mutuamente Exclusivas)', 'Pacientes (N)', '% sobre Total da Porta', 'Detalhamento Operacional e Tempos Associados'],
    ['(=) TOTAL DE FICHAS ABERTAS NA PORTA (INPUT BRUTO)', mb.totalFichasPorta, '100.0%', `Diurno: ${data.dailySeries.reduce((a, b) => a + b.dayShift, 0)} | Noturno: ${data.dailySeries.reduce((a, b) => a + b.nightShift, 0)} | Média: ${data.dailyVolume.overall.mean}/d (±${data.dailyVolume.overall.stdDev})`],
    ['1. (+) Evasão / Cancelamento Sem Ser Visto pelo Médico (Pré-Médico)', mb.b1PreMedEvasionCount, `${mb.b1PreMedEvasionPct}%`, 'Desistência ou cancelamento na recepção/triagem antes do atendimento médico inicial'],
    ['2. (+) Alta Direta Após 1º Atendimento (Ramo A — Sem Med / Sem Exames)', mb.b2DirectDischarge1stAttendCount, `${mb.b2DirectDischarge1stAttendPct}%`, `Resolução Single-Touch no consultório | LOS: ${fmtStatFull(m.directDischargeLosStats)} | PCE: ${m.pceRamoADirectPct}%`],
    ['3. (+) Alta Após Medicações — Fast Reav (Sub-ramo B1 c/ Alta)', mb.b3DischargeAfterMedOnlyCount, `${mb.b3DischargeAfterMedOnlyPct}%`, `Medicados s/ exames que receberam alta (Total que entrou em B1: ${m.fastReavMedOnlyCount}) | LOS: ${fmtStatFull(m.fastReavMedOnlyLosStats)}`],
    ['4. (+) Alta Após Exames Diagnósticos — Lab/RX/TC/USG (Sub-ramo B2 c/ Alta)', mb.b4DischargeAfterExamsCount, `${mb.b4DischargeAfterExamsPct}%`, `Investigados c/ exames que receberam alta (Total que entrou em B2: ${m.diagnosticExamsLoopCount}) | LOS: ${fmtStatFull(m.diagnosticExamsLoopLosStats)}`],
    ['5. (+) Internações Hospitalares Totais (Conversão Final 3333 + 3493)', mb.b5AdmittedTotalCount, `${mb.b5AdmittedTotalPct}%`, `UI: ${data.uiAdmissions} (${m.admittedUiPct}%) | UTI: ${data.utiAdmissions} (${m.admittedUtiPct}%) | Outros/Espera: ${data.otherBedAdmissions} (${m.admittedOtherBedPct}%) | Cirúrgicos: ${data.surgicalAdmissions}`],
    ['6. (+) Outras Evasões / Desistências Pós-Atendimento Inicial', mb.b6OtherPostAttendEvasionsCount, `${mb.b6OtherPostAttendEvasionsPct}%`, 'Pacientes avaliados pelo médico que evadiram ou assinaram desistência durante a espera de medicação/exames'],
    ['7. (+) Inconsistências Finais de Planilha & Desfechos Especiais (7A + 7B + 7C)', mb.b7TotalInconsistenciesAndSpecialCount, `${mb.b7TotalInconsistenciesAndSpecialPct}%`, `7A. Ficha Adm/Exame s/ Consulta (LOS=0): ${mb.b7aAdminNoConsultCount} | 7B. Em Curso s/ Desfecho no Corte da Planilha: ${mb.b7bPendingNoOutcomeAtCutoffCount} | 7C. Transferências/Óbitos: ${mb.b7cTransferOrDeathCount}`],
    ['(=) SOMA AUDITADA DOS DESFECHOS (PROVA REAL: 1+2+3+4+5+6+7)', mb.auditSumCheck, `${((mb.auditSumCheck / Math.max(mb.totalFichasPorta, 1)) * 100).toFixed(1)}%`, mb.auditSumCheck === mb.totalFichasPorta ? '✓ FECHAMENTO MATEMÁTICO EXATO (ZERO DUPLA CONTAGEM / ZERO PERDA)' : '⚠️ Verificar divergência'],
    [],
    ['2. FAIXAS DE ENVELHECIMENTO DE PERMANÊNCIA NO PS (LOS AGING BUCKETS — SOMA HORIZONTAL 100% FECHADA)'],
    [
      'Faixa de Permanência (LOS)',
      'Perfil Operacional Predominante',
      'Pacientes (N)',
      '% do Total PS',
      'Alta 1º Atend (N)',
      'Alta Só Med Fast Reav (N)',
      'Alta Pós-Exames (N)',
      'Internações (N)',
      'Evasões / Sem Desfecho / Adm (N)',
      'LOS Médio na Faixa (min)',
    ],
  ];

  for (const b of vsm.losAgingBuckets) {
    sheet1.push([
      b.bucketLabel,
      b.rangeDescription,
      b.count,
      `${b.percentage}%`,
      b.directDischargeCount,
      b.fastReavCount,
      b.diagnosticExamsCount,
      b.admittedCount,
      b.evasionsAndPendingCount,
      b.meanLos,
    ]);
  }

  sheet1.push(
    [],
    ['3. PERFIL ETÁRIO E IMPACTO GERIÁTRICO NA EMERGÊNCIA (CONSUMO DE EXAMES, PERMANÊNCIA E CONVERSÃO POR IDADE)'],
    [
      'Faixa Etária',
      'Pacientes (N)',
      '% da Porta',
      '% Alta Direta 1ºAt',
      '% Alta Só Med',
      '% Pedido Lab',
      '% Pedido Tomografia (TC)',
      'Internações (N / Taxa %)',
      'Divisão UI / UTI',
      'Permanência LOS (Média ±DP | Mediana)',
      'Boarding Total (Média ±DP | Mediana)',
    ]
  );

  for (const ag of vsm.ageBrackets) {
    sheet1.push([
      ag.bracketLabel,
      ag.count,
      `${ag.pctOfTotal}%`,
      `${ag.directDischargePct}%`,
      `${ag.fastReavMedPct}%`,
      `${ag.labRate}%`,
      `${ag.tcRate}%`,
      `${ag.admittedCount} (${ag.admissionRate}%)`,
      `${ag.uiCount} UI / ${ag.utiCount} UTI`,
      fmtStatFull(ag.losStats),
      fmtStatFull(ag.boardingStats),
    ]);
  }

  sheet1.push(
    [],
    ['4. DECOMPOSIÇÃO COMPLETA DE TEMPOS OPERACIONAIS E SLAS POR TURNO (MÉDIA, DP, MEDIANA, P90 E AMPLITUDE MÍN–MÁX)'],
    [
      'Etapa / Indicador de Tempo (minutos)',
      'N (24h)',
      'Média 24h',
      'DP (±)',
      'Mediana 24h',
      'P90 24h',
      'Mín–Máx 24h',
      'Diurno: Média (±DP)',
      'Diurno: Mediana (P90)',
      'Noturno: Média (±DP)',
      'Noturno: Mediana (P90)',
    ]
  );

  const timeMetricsRows: [string, MetricStats, MetricStats, MetricStats][] = [
    ['1. Fila Totem -> Guichê Recepção', m.waitTotemToRecepStats, vsm.byShift.day.waitTotemToRecepStats, vsm.byShift.night.waitTotemToRecepStats],
    ['2. Tempo de Cadastro / Abertura de Ficha na Recepção', m.recepRegistrationStats, vsm.byShift.day.recepRegistrationStats, vsm.byShift.night.recepRegistrationStats],
    ['3. Espera p/ Triagem de Enfermagem ([Espera Enfermagem])', vsm.nursingTriage.waitTriageStats, vsm.nursingTriage.waitTriageStats, vsm.nursingTriage.waitTriageStats],
    ['4. Duração da Triagem de Enfermagem ([Atend. Enfermagem])', vsm.nursingTriage.triageDurationStats, vsm.nursingTriage.triageDurationStats, vsm.nursingTriage.triageDurationStats],
    ['5. Espera Fim da Triagem -> Início da Consulta Médica', vsm.nursingTriage.waitPostTriageToDocStats, vsm.nursingTriage.waitPostTriageToDocStats, vsm.nursingTriage.waitPostTriageToDocStats],
    ['6. Fila Pós-Recepção -> 1º Atendimento Médico', m.waitRecepToDocStats, vsm.byShift.day.waitRecepToDocStats, vsm.byShift.night.waitRecepToDocStats],
    ['7. Tempo Porta-Médico Total (Totem -> Médico)', data.doorToDoctor.overall, data.doorToDoctor.dayShift, data.doorToDoctor.nightShift],
    ['8. Tempo de Consulta Médica Inicial (Anamnese)', data.consultTime.overall, data.consultTime.dayShift, data.consultTime.nightShift],
    ['9. Espera para Início da Medicação (Prescrição -> Checagem)', data.medicationWait.overall, data.medicationWait.dayShift, data.medicationWait.nightShift],
    ['10. Tempo de Administração / Infusão de Medicação', data.medicationAdmTime.overall, data.medicationAdmTime.dayShift, data.medicationAdmTime.nightShift],
    ['11. Espera Laboratório (Prescrição -> Coleta/Execução)', data.labWait.overall, data.labWait.dayShift, data.labWait.nightShift],
    ['12. Tempo de Laudo Laboratorial (Coleta -> Liberação Laudo)', m.waitLabReportStats, vsm.byShift.day.waitLabReportStats, vsm.byShift.night.waitLabReportStats],
    ['13. Espera Consolidada de Laudo Diagnóstico (Lab / TC / USG)', m.combinedExamReportWaitStats, vsm.byShift.day.combinedExamReportWaitStats, vsm.byShift.night.combinedExamReportWaitStats],
    ['14. Espera Raio-X (Prescrição -> Execução RX)', data.rxWait.overall, data.rxWait.dayShift, data.rxWait.nightShift],
    ['15. Ciclo Total de Tomografia - TC (Prescrição -> Laudo)', data.tcWait.overall, data.tcWait.dayShift, data.tcWait.nightShift],
    ['16. Ciclo de Ultrassonografia - USG', m.waitUsgTotalStats, vsm.byShift.day.waitUsgTotalStats, vsm.byShift.night.waitUsgTotalStats],
    ['17. Fila Invisível Pós-Laudo p/ Reavaliação (Desfecho - Último Laudo)', m.postReportReavalWaitStats, vsm.byShift.day.postReportReavalWaitStats, vsm.byShift.night.postReportReavalWaitStats],
    ['18. Permanência Total — Ramo A: Alta Direta no 1º Atendimento', m.directDischargeLosStats, vsm.byShift.day.directDischargeLosStats, vsm.byShift.night.directDischargeLosStats],
    ['19. Permanência Total — Ramo B1: Alta Após Medicação (Fast Reav)', m.fastReavMedOnlyLosStats, vsm.byShift.day.fastReavMedOnlyLosStats, vsm.byShift.night.fastReavMedOnlyLosStats],
    ['20. Permanência Total — Ramo B2: Alta Após Exames Diagnósticos', m.diagnosticExamsLoopLosStats, vsm.byShift.day.diagnosticExamsLoopLosStats, vsm.byShift.night.diagnosticExamsLoopLosStats],
    ['21. Permanência Geral no PS (Pacientes Válidos: Porta -> Desfecho)', data.losOverall.overall, data.losOverall.dayShift, data.losOverall.nightShift],
    ['22. Permanência Geral — Mesmo Médico (Sem Handoff)', m.sameDoctorLosStats, vsm.byShift.day.sameDoctorLosStats, vsm.byShift.night.sameDoctorLosStats],
    ['23. Permanência Geral — Com Troca de Médico (Pedágio de Handoff)', m.handoffDoctorLosStats, vsm.byShift.day.handoffDoctorLosStats, vsm.byShift.night.handoffDoctorLosStats],
    ['24. Boarding GERAL — Etapa 1 (Aprovação Plano / Leito Virtual)', m.t1AguardoToVirtualBedStats, vsm.byShift.day.t1AguardoToVirtualBedStats, vsm.byShift.night.t1AguardoToVirtualBedStats],
    ['25. Boarding GERAL — Etapa 2 (Leito Virtual -> Subida Física UI/UTI)', m.t2VirtualToPhysicalBedStats, vsm.byShift.day.t2VirtualToPhysicalBedStats, vsm.byShift.night.t2VirtualToPhysicalBedStats],
    ['26. Boarding GERAL FÍSICO (Coorte c/ Subida Física: T1 + T2 = Total)', m.physicalTotalBoardingStats, vsm.byShift.day.physicalTotalBoardingStats, vsm.byShift.night.physicalTotalBoardingStats],
    ['27. Boarding GERAL CONSOLIDADO (Incluindo Leito de Espera Virtual)', m.totalBoardingStats, vsm.byShift.day.totalBoardingStats, vsm.byShift.night.totalBoardingStats],
    ['28. Boarding ENFERMARIA (UI) — Etapa 1 (Aprovação Plano / Virtual)', m.uiT1AguardoToVirtualStats, vsm.byShift.day.uiT1AguardoToVirtualStats, vsm.byShift.night.uiT1AguardoToVirtualStats],
    ['29. Boarding ENFERMARIA (UI) — Etapa 2 (Virtual -> Subida Física Andar)', m.uiT2VirtualToPhysicalStats, vsm.byShift.day.uiT2VirtualToPhysicalStats, vsm.byShift.night.uiT2VirtualToPhysicalStats],
    ['30. Boarding ENFERMARIA (UI) — Total Real (T1 + T2 = Total UI)', m.uiBoardingStats, vsm.byShift.day.uiBoardingStats, vsm.byShift.night.uiBoardingStats],
    ['31. Boarding UTI — Etapa 1 (Aprovação Plano / Virtual)', m.utiT1AguardoToVirtualStats, vsm.byShift.day.utiT1AguardoToVirtualStats, vsm.byShift.night.utiT1AguardoToVirtualStats],
    ['32. Boarding UTI — Etapa 2 (Virtual -> Subida Física UTI)', m.utiT2VirtualToPhysicalStats, vsm.byShift.day.utiT2VirtualToPhysicalStats, vsm.byShift.night.utiT2VirtualToPhysicalStats],
    ['33. Boarding UTI FÍSICO (Coorte c/ Subida Física p/ UTI: T1 + T2)', m.utiPhysicalBoardingStats, vsm.byShift.day.utiPhysicalBoardingStats, vsm.byShift.night.utiPhysicalBoardingStats],
    ['34. Boarding UTI CONSOLIDADO (Incluindo Leito de Espera UTI)', m.utiBoardingStats, vsm.byShift.day.utiBoardingStats, vsm.byShift.night.utiBoardingStats],
    ['35. Boarding PERFIL CIRÚRGICO (CC=S / Cirurgia / Ortopedia) — Total', m.surgicalBoardingStats, vsm.byShift.day.surgicalBoardingStats, vsm.byShift.night.surgicalBoardingStats],
    ['36. Boarding PERFIL CLÍNICO NÃO CIRÚRGICO — Total', m.clinicalBoardingStats, vsm.byShift.day.clinicalBoardingStats, vsm.byShift.night.clinicalBoardingStats],
  ];

  for (const [label, stAll, stDay, stNight] of timeMetricsRows) {
    sheet1.push([
      label,
      stAll.count,
      stAll.mean,
      stAll.stdDev,
      stAll.median,
      stAll.p90,
      stAll.count > 0 ? `${stAll.min} – ${stAll.max}` : '—',
      stDay.count > 0 ? `${stDay.mean} (±${stDay.stdDev})` : '—',
      stDay.count > 0 ? `${stDay.median} (P90: ${stDay.p90})` : '—',
      stNight.count > 0 ? `${stNight.mean} (±${stNight.stdDev})` : '—',
      stNight.count > 0 ? `${stNight.median} (P90: ${stNight.p90})` : '—',
    ]);
  }

  appendSheetFromAoA(wb, '1_Resumo_KPIs_e_Aging', sheet1);

  // --------------------------------------------------------------------------
  // ABA 2: MATRIZ MULTI-SETOR/CLÍNICA, TRIAGEM ENFERMAGEM & ORIGEM GEOGRÁFICA
  // --------------------------------------------------------------------------
  const sheet2: unknown[][] = [
    ['MATRIZ COMPARATIVA MULTI-SETOR E MULTI-CLÍNICA (TODOS OS ATENDIMENTOS CARREGADOS NA BASE GLOBAL)'],
    [
      `Total Global Carregado em Memória: ${data.totalGlobalAttendances} atendimentos`,
      `Escopo Filtrado Ativo no Relatório: ${data.activeScopeLabel} (${data.totalAttendances} atendimentos)`,
      `Taxa Emissão Receita no Escopo: ${vsm.receitaRatePct}%`,
      `Taxa Emissão Atestado no Escopo: ${vsm.atestadoRatePct}%`,
    ],
    [],
    [
      'Setor de Emergência',
      'Clínica / Especialidade',
      'Volume Total (N)',
      '% do Global',
      'Diurno / Noturno',
      '% Triados Enferm.',
      'Espera Pós-Triagem -> Médico',
      'Porta-Médico Total (Média ±DP | Med)',
      '% Alta 1ºAt',
      '% Alta Só Med',
      '% Alta Exames',
      'Internações (N / %)',
      'UI / UTI (Cirúrgicos)',
      'Permanência LOS (Média ±DP | Mediana)',
      'Boarding Total (Média ±DP | Mediana)',
    ],
  ];

  for (const sc of data.sectorClinicBreakdown) {
    sheet2.push([
      sc.setor,
      sc.clinica,
      sc.totalCount,
      `${sc.pctOfGlobal}%`,
      `${sc.dayCount}D / ${sc.nightCount}N`,
      `${sc.triagedPct}%`,
      fmtStatFull(sc.triageToDocStats),
      fmtStatFull(sc.doorToDocStats),
      `${sc.directDischargePct}%`,
      `${sc.fastReavMedPct}%`,
      `${sc.diagnosticExamsPct}%`,
      `${sc.admissionsCount} (${sc.conversionRate}%)`,
      `${sc.uiCount} UI / ${sc.utiCount} UTI (${sc.surgicalAdmissionsCount} Cir.)`,
      fmtStatFull(sc.losStats),
      fmtStatFull(sc.boardingTotalStats),
    ]);
  }

  sheet2.push(
    [],
    ['CLASSIFICAÇÃO DE RISCO E TRIAGEM DE ENFERMAGEM NO ESCOPO ATIVO'],
    ['Nível de Urgência / Risco', 'Pacientes (N)', '% do Escopo', 'Porta-Médico Médio (min)', 'LOS Médio (min)', 'Taxa de Internação (%)']
  );

  for (const rl of vsm.nursingTriage.riskLevelBreakdown) {
    sheet2.push([rl.level, rl.count, `${rl.pct}%`, rl.meanDoorToDoc, rl.meanLos, `${rl.admissionRate}%`]);
  }

  sheet2.push(
    [],
    ['RAIO DE ATRAÇÃO GEOGRÁFICA — TOP MUNICÍPIOS DE ORIGEM DOS PACIENTES'],
    ['Município de Residência', 'Pacientes (N)', '% do Escopo', 'Taxa de Conversão em Internação (%)']
  );

  for (const mun of vsm.topMunicipalities) {
    sheet2.push([mun.municipio, mun.count, `${mun.pct}%`, `${mun.admissionRate}%`]);
  }

  appendSheetFromAoA(wb, '2_Setores_e_Clinicas', sheet2);

  // --------------------------------------------------------------------------
  // ABA 3: MAPA DA JORNADA DO PACIENTE & VSM MULTIDIMENSIONAL (100% FECHADO)
  // --------------------------------------------------------------------------
  const slices: VsmSliceMetrics[] = [
    vsm.monthlyOverall,
    vsm.byShift.day,
    vsm.byShift.night,
    ...Object.values(vsm.byWeekOfMonth),
    ...WEEKDAY_NAMES.map((d) => vsm.byDayOfWeek[d]).filter(Boolean),
  ];

  const sheet3: unknown[][] = [
    ['MAPA COMPLETO DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM) — COMPARATIVO MULTIDIMENSIONAL 100% FECHADO'],
    ['Métrica / Nó da Jornada Lean (Input -> Throughput -> Output -> Boarding)', ...slices.map((s) => s.label)],
    ['0. EQUAÇÃO DE CONSERVAÇÃO DE MASSA (SOMA DOS 7 BLOCOS = 100% DA PORTA)'],
    ['(=) Total de Fichas Abertas na Porta (N)', ...slices.map((s) => s.massBalance.totalFichasPorta)],
    ['1. (+) Evasão Pré-Médica s/ Consulta (N e %)', ...slices.map((s) => `${s.massBalance.b1PreMedEvasionCount} (${s.massBalance.b1PreMedEvasionPct}%)`)],
    ['2. (+) Alta Direta Após 1º Atendimento (N e %)', ...slices.map((s) => `${s.massBalance.b2DirectDischarge1stAttendCount} (${s.massBalance.b2DirectDischarge1stAttendPct}%)`)],
    ['3. (+) Alta Após Medicação — Fast Reav (N e %)', ...slices.map((s) => `${s.massBalance.b3DischargeAfterMedOnlyCount} (${s.massBalance.b3DischargeAfterMedOnlyPct}%)`)],
    ['4. (+) Alta Após Exames Diagnósticos (N e %)', ...slices.map((s) => `${s.massBalance.b4DischargeAfterExamsCount} (${s.massBalance.b4DischargeAfterExamsPct}%)`)],
    ['5. (+) Internações Hospitalares Totais (N e %)', ...slices.map((s) => `${s.massBalance.b5AdmittedTotalCount} (${s.massBalance.b5AdmittedTotalPct}%)`)],
    ['6. (+) Outras Evasões Pós-Atendimento (N e %)', ...slices.map((s) => `${s.massBalance.b6OtherPostAttendEvasionsCount} (${s.massBalance.b6OtherPostAttendEvasionsPct}%)`)],
    ['7. (+) Inconsistências / Sem Desfecho no Corte / Adm / Transf (N e %)', ...slices.map((s) => `${s.massBalance.b7TotalInconsistenciesAndSpecialCount} (${s.massBalance.b7TotalInconsistenciesAndSpecialPct}%) [Adm:${s.massBalance.b7aAdminNoConsultCount}|Corte:${s.massBalance.b7bPendingNoOutcomeAtCutoffCount}|Tr:${s.massBalance.b7cTransferOrDeathCount}]`)],
    ['(=) Prova Real da Soma dos Desfechos (N)', ...slices.map((s) => s.massBalance.auditSumCheck)],
    [],
    ['1. TEMPOS DE INPUT & ACOLHIMENTO NA PORTA'],
    ['Pacientes Efetivamente Atendidos pelo Médico (N e %)', ...slices.map((s) => `${s.attendedByDoctorCount} (${s.attendedByDoctorPct}%)`)],
    ['Fila Totem -> Recepção (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.waitTotemToRecepStats))],
    ['Tempo de Abertura de Ficha na Recepção (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.recepRegistrationStats))],
    ['Fila Pós-Recepção -> Médico (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.waitRecepToDocStats))],
    ['Tempo Porta-Médico Total (Média ±DP | Mediana | P90)', ...slices.map((s) => fmtStatFull(s.doorToDocTotalStats))],
    ['Tempo da 1ª Consulta Médica (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.firstConsultDurationStats))],
    [],
    ['2. BIFURCAÇÃO DE THROUGHPUT E TEMPOS DE PERMANÊNCIA POR ROTA'],
    ['Ramo A: Alta Direta no 1º Atendimento — Sem Exames/Medicação (N e %)', ...slices.map((s) => `${s.directDischargeCount} (${s.directDischargePct}%)`)],
    ['   • Tempo Total de Permanência no Ramo A (Alta Direta)', ...slices.map((s) => fmtStatFull(s.directDischargeLosStats))],
    ['Ramo B: Giro Propedêutico e Terapêutico Total Acionado (N e %)', ...slices.map((s) => `${s.propaedeuticLoopCount} (${s.propaedeuticLoopPct}%)`)],
    ['   • Tempo Total de Permanência no Ramo B (Propedêutica)', ...slices.map((s) => fmtStatFull(s.propaedeuticLoopLosStats))],
    ['Sub-Ramo B1: Fast Reav — Total Acionado vs. Alta Efetiva (N e %)', ...slices.map((s) => `Acionado: ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}%) -> Alta: ${s.fastReavDischargedCount} (${s.fastReavDischargedPct}%)`)],
    ['   • Tempo Total de Permanência nas Altas Fast Reav (Só Medicação)', ...slices.map((s) => fmtStatFull(s.fastReavMedOnlyLosStats))],
    ['Sub-Ramo B2: Giro Exames — Total Acionado vs. Alta Efetiva (N e %)', ...slices.map((s) => `Acionado: ${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}%) -> Alta: ${s.diagnosticExamsDischargedCount} (${s.diagnosticExamsDischargedPct}%)`)],
    ['   • Tempo Total de Permanência nas Altas Pós-Exames', ...slices.map((s) => fmtStatFull(s.diagnosticExamsLoopLosStats))],
    [],
    ['3. DETALHAMENTO DE EXAMES E MEDICAÇÃO NO THROUGHPUT'],
    ['Pacientes Medicados no PS (N e %)', ...slices.map((s) => `${s.medicatedCount} (${s.medicatedPct}%)`)],
    ['   • Espera p/ Início da Medicação (min)', ...slices.map((s) => fmtStatFull(s.waitMedStartStats))],
    ['   • Tempo de Administração/Infusão da Medicação (min)', ...slices.map((s) => fmtStatFull(s.medInfusionDurationStats))],
    ['Pacientes com Exame Laboratorial (N e %)', ...slices.map((s) => `${s.labCount} (${s.labPct}%)`)],
    ['   • Espera Prescrição -> Coleta/Execução Lab (min)', ...slices.map((s) => fmtStatFull(s.waitLabCollectStats))],
    ['   • Tempo até Liberação do Laudo Lab (Reconstruído s/ Falso Zero)', ...slices.map((s) => fmtStatFull(s.waitLabReportStats))],
    ['Pacientes com Raio-X - RX (N e %)', ...slices.map((s) => `${s.rxCount} (${s.rxPct}%)`)],
    ['   • Tempo Prescrição -> Execução RX (min)', ...slices.map((s) => fmtStatFull(s.waitRxExecStats))],
    ['Pacientes com Tomografia - TC (N e %)', ...slices.map((s) => `${s.tcCount} (${s.tcPct}%)`)],
    ['   • Ciclo Total TC: Prescrição -> Laudo (min)', ...slices.map((s) => fmtStatFull(s.waitTcTotalStats))],
    ['Pacientes com Ultrassonografia - USG (N e %)', ...slices.map((s) => `${s.usgCount} (${s.usgPct}%)`)],
    ['   • Ciclo Total USG (min)', ...slices.map((s) => fmtStatFull(s.waitUsgTotalStats))],
    [],
    ['4. GARGALOS OCULTOS: FILA INVISÍVEL PÓS-LAUDO & PEDÁGIO DE HANDOFF'],
    ['Fila Invisível Pós-Laudo p/ Reavaliação (Desfecho - Último Laudo Lab/TC)', ...slices.map((s) => fmtStatFull(s.postReportReavalWaitStats))],
    ['Atendimentos Conduzidos pelo Mesmo Médico do Início ao Fim (N e %)', ...slices.map((s) => `${s.sameDoctorCount} (${s.sameDoctorPct}%)`)],
    ['   • Permanência com Mesmo Médico (Sem Handoff)', ...slices.map((s) => fmtStatFull(s.sameDoctorLosStats))],
    ['Atendimentos com Troca de Médico entre Anamnese e Desfecho (Handoff N e %)', ...slices.map((s) => `${s.handoffDoctorCount} (${s.handoffDoctorPct}%)`)],
    ['   • Permanência com Troca de Médico (Com Handoff)', ...slices.map((s) => fmtStatFull(s.handoffDoctorLosStats))],
    [],
    ['5. DECOMPOSIÇÃO DO BOARDING (ENFERMARIA UI vs. UTI & CIRÚRGICO vs. CLÍNICO)'],
    ['Internações Hospitalares Totais (N e % sobre a Porta)', ...slices.map((s) => `${s.admittedTotalCount} (${s.admittedTotalPct}%)`)],
    ['   • Destino Leito: UI vs. UTI vs. Outros/Espera', ...slices.map((s) => `UI: ${s.admittedUiCount} (${s.admittedUiPct}%) | UTI: ${s.admittedUtiCount} (${s.admittedUtiPct}%) | Out: ${s.admittedOtherBedCount}`)],
    ['   • Perfil Especialidade: Cirúrgico vs. Clínico Não Cirúrgico', ...slices.map((s) => `Cirúrgico: ${s.admittedSurgicalCount} (${s.admittedSurgicalPct}%) | Clínico: ${s.admittedClinicalCount} (${s.admittedClinicalPct}%)`)],
    ['BOARDING GERAL — Etapa 1 (Solicitação -> Leito Virtual/Plano)', ...slices.map((s) => fmtStatFull(s.t1AguardoToVirtualBedStats))],
    ['BOARDING GERAL — Etapa 2 (Leito Virtual -> Subida Física UI/UTI)', ...slices.map((s) => fmtStatFull(s.t2VirtualToPhysicalBedStats))],
    ['BOARDING GERAL FÍSICO (Coorte c/ Subida Física: T1 + T2 = Total)', ...slices.map((s) => fmtStatFull(s.physicalTotalBoardingStats))],
    ['BOARDING GERAL CONSOLIDADO (Todos os Internados)', ...slices.map((s) => fmtStatFull(s.totalBoardingStats))],
    ['BOARDING ENFERMARIA (UI) — Etapa 1 (Aprovação Plano / Virtual)', ...slices.map((s) => fmtStatFull(s.uiT1AguardoToVirtualStats))],
    ['BOARDING ENFERMARIA (UI) — Etapa 2 (Virtual -> Subida Física Andar)', ...slices.map((s) => fmtStatFull(s.uiT2VirtualToPhysicalStats))],
    ['BOARDING ENFERMARIA (UI) — Total Real (T1 + T2 = Total UI)', ...slices.map((s) => fmtStatFull(s.uiBoardingStats))],
    ['BOARDING UTI — Etapa 1 (Aprovação Plano / Virtual)', ...slices.map((s) => fmtStatFull(s.utiT1AguardoToVirtualStats))],
    ['BOARDING UTI — Etapa 2 (Virtual -> Subida Física UTI)', ...slices.map((s) => fmtStatFull(s.utiT2VirtualToPhysicalStats))],
    ['BOARDING UTI FÍSICO (Coorte c/ Subida Física p/ UTI: T1 + T2)', ...slices.map((s) => fmtStatFull(s.utiPhysicalBoardingStats))],
    ['BOARDING UTI CONSOLIDADO (Incluindo Leito de Espera UTI)', ...slices.map((s) => fmtStatFull(s.utiBoardingStats))],
    ['BOARDING PERFIL CIRÚRGICO (CC=S / Cirurgia / Ortopedia) — Total', ...slices.map((s) => fmtStatFull(s.surgicalBoardingStats))],
    ['BOARDING PERFIL CLÍNICO NÃO CIRÚRGICO — Total', ...slices.map((s) => fmtStatFull(s.clinicalBoardingStats))],
  ];

  appendSheetFromAoA(wb, '3_Jornada_VSM_Lean', sheet3);

  // --------------------------------------------------------------------------
  // ABA 4: CENSO OCUPACIONAL SIMULTÂNEO (COM MÉDIA, DP, MEDIANA E AMPLITUDE NAS 4 FRENTES)
  // --------------------------------------------------------------------------
  const sheet4: unknown[][] = [
    ['CENSO OCUPACIONAL SIMULTÂNEO POR HORA (07h ÀS 06h) — COM MÉDIA, DESVIO-PADRÃO (±DP), MEDIANA, P90 E AMPLITUDE [MÍN–MÁX] POR FRENTE'],
    [
      'Faixa Horária',
      'Novas Chegadas na Porta (Média ±DP | Med [Mín–Máx])',
      'Frente 1: Porta / 1º Atendimento (Média ±DP | Med [Mín–Máx])',
      'Frente 2A: Fast Reav Só Medicação (Média ±DP | Med [Mín–Máx])',
      'Frente 2B: Giro Exames Lab/TC/RX (Média ±DP | Med [Mín–Máx])',
      'Frente 3: Boarding Internação UI/UTI (Média ±DP | Med [Mín–Máx])',
      'CENSO SIMULTÂNEO TOTAL NO PS (Média ±DP | Med [Mín–Máx])',
      'Dimensionamento Sugerido (Médicos Porta + Giro/Reaval)',
    ],
  ];

  for (const pt of vsm.hourlySimultaneousOverall) {
    sheet4.push([
      pt.label,
      fmtCensusStat(pt.newArrivalsStats),
      fmtCensusStat(pt.portaStats),
      fmtCensusStat(pt.fastReavMedStats),
      fmtCensusStat(pt.giroExamesStats),
      fmtCensusStat(pt.boardingStats),
      fmtCensusStat(pt.totalStats),
      `${pt.recommendedDocsTotal} méd. (${pt.recommendedDocsPorta} Porta + ${pt.recommendedDocsGiroReav} Giro/Reav)`,
    ]);
  }

  sheet4.push([]);
  sheet4.push(['HEATMAP 24x7 DE CENSO SIMULTÂNEO TOTAL ACUMULADO (CICLO OPERACIONAL DE PLANTÃO 07h -> 06h59 D+1 — MÉDIA ±DP | MEDIANA [MÍN–MÁX])']);
  sheet4.push(['Dia do Plantão \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = vsm.censusHeatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `${c.totalMean.toFixed(1)} (±${c.totalStdDev.toFixed(1)}) | Med:${c.totalMedian.toFixed(1)} [${c.totalMin.toFixed(0)}–${c.totalMax.toFixed(0)}]`;
    });
    sheet4.push([WEEKDAY_NAMES[d], ...rowCells]);
  }

  sheet4.push([]);
  sheet4.push(['HEATMAP 24x7 DE PRESSÃO DE ENTRADA NA PORTA (NOVAS FICHAS ABERTAS — CICLO OPERACIONAL 07h -> 06h59 D+1)']);
  sheet4.push(['Dia do Plantão \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = data.heatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `${c.mean.toFixed(1)} (±${c.stdDev.toFixed(1)}) | Med:${c.median.toFixed(1)} [${c.min}–${c.max}] | Σ=${c.totalCount}`;
    });
    sheet4.push([WEEKDAY_NAMES[d], ...rowCells]);
  }

  appendSheetFromAoA(wb, '4_Censo_Simultaneo_24x7', sheet4);

  // --------------------------------------------------------------------------
  // ABA 5: BOARDING DIFERENCIADO (FECHAMENTO EXATO T1+T2=TOTAL FÍSICO E UI+UTI+OUTROS=100%)
  // --------------------------------------------------------------------------
  const sheet5: unknown[][] = [
    ['RAIO-X ESTRATIFICADO DO BOARDING HOSPITALAR: FECHAMENTO EXATO (SUBIDA FÍSICA vs. LEITO DE ESPERA) E UI vs. UTI / CIRÚRGICO vs. CLÍNICO'],
    [
      `Total Internações: ${data.totalAdmissions} (100%)`,
      `Enfermaria (UI): ${data.uiAdmissions} (${m.admittedUiPct}%)`,
      `UTI: ${data.utiAdmissions} (${m.admittedUtiPct}%)`,
      `Leito Espera / Sem Tipo: ${data.otherBedAdmissions} (${m.admittedOtherBedPct}%)`,
      `Perfil Cirúrgico: ${data.surgicalAdmissions} (${vsm.surgicalAdmissionsPct}%)`,
      `Horas-Maca Retidas: ${vsm.wastedBedHoursInBoarding}h (${vsm.equivalentBlockedBeds24h} macas bloqueadas 24h/dia)`,
    ],
    [],
    ['1. COMPARATIVO DE GARGALOS DE BOARDING (PROVA REAL: NA COORTE COM SUBIDA FÍSICA, ETAPA 1 + ETAPA 2 = BOARDING TOTAL FÍSICO)'],
    [
      'Recorte / Perfil de Internação',
      'Total Internados (N / %)',
      'Subida Física (N) vs. Leito Espera (N)',
      'Etapa 1 Geral: Solicitação -> Leito Virtual (Todos)',
      'Etapa 1 (Coorte Física) + Etapa 2 (Subida Física)',
      'BOARDING TOTAL FÍSICO (= T1 Físico + T2 Físico)',
      'BOARDING TOTAL CONSOLIDADO (Incluindo Leito Espera)',
      'Horas-Maca Consumidas no PS',
      'Macas Físicas Bloqueadas 24h/dia',
      'Permanência Hospitalar Pós-Subida (Dias)',
    ],
  ];

  const boardingProfiles = [bbt.global, bbt.ui, bbt.uti, bbt.otherBed, bbt.surgical, bbt.clinical].filter(
    (p) => p.admittedCount > 0 || p.bedType === 'Global'
  );

  for (const prof of boardingProfiles) {
    sheet5.push([
      prof.label,
      `${prof.admittedCount} (${prof.pctOfAdmissions}%)`,
      `Físico: ${prof.physicalConfirmedCount} | Espera: ${prof.virtualWaitOnlyCount}`,
      fmtStatFull(prof.t1AguardoToVirtualStats),
      prof.physicalConfirmedCount > 0
        ? `T1: ${prof.t1PhysicalCohortStats.mean}m + T2: ${prof.t2VirtualToPhysicalStats.mean}m (Med T2: ${prof.t2VirtualToPhysicalStats.median}m)`
        : '—',
      prof.physicalConfirmedCount > 0 ? fmtStatFull(prof.physicalTotalBoardingStats) : '—',
      fmtStatFull(prof.totalBoardingStats),
      `${prof.wastedBedHours} h`,
      `${prof.equivalentBlockedBeds24h} macas/dia`,
      prof.hospitalStayDaysStats.count > 0
        ? `${prof.hospitalStayDaysStats.mean}d (±${prof.hospitalStayDaysStats.stdDev}) | Med: ${prof.hospitalStayDaysStats.median}d`
        : '—',
    ]);
  }

  sheet5.push(
    [],
    ['2. RANKING DE BOARDING POR OPERADORA DE SAÚDE (COM FECHAMENTO EXATO UI vs. UTI FÍSICO vs. UTI GERAL E CIRÚRGICO vs. CLÍNICO)'],
    [
      'Operadora / Convênio',
      'Internações (N / %)',
      'UI / UTI / Outros',
      'Físico vs. Leito Espera',
      'Etapa 1 Geral (Plano/Virtual)',
      'Etapa 2 Geral (Subida Física)',
      'Boarding Total Físico (= T1+T2) vs. Consolidado Geral',
      'Boarding ENFERMARIA (UI): T1 + T2 = Total UI',
      'Boarding UTI: T1 | T2 | Total Físico (vs. Geral c/ Espera)',
      'Boarding CIRÚRGICO vs. CLÍNICO (Consolidado)',
      'Permanência Hospitalar (Dias)',
    ]
  );

  for (const c of vsm.boardingByConvenio) {
    sheet5.push([
      c.convenio,
      `${c.admittedCount} (${c.pctOfAdmissions}%)`,
      `${c.uiCount} UI / ${c.utiCount} UTI${c.otherBedCount > 0 ? ` / ${c.otherBedCount} Out` : ''}`,
      `${c.physicalConfirmedCount} Fís. / ${c.virtualWaitOnlyCount} Esp.`,
      fmtStatFull(c.t1VirtualApprovalStats),
      fmtStatFull(c.t2PhysicalUploadStats),
      `Físico: ${c.physicalTotalBoardingStats.mean}m (Med ${c.physicalTotalBoardingStats.median}m) | Geral: ${c.totalBoardingStats.mean}m (Med ${c.totalBoardingStats.median}m)`,
      c.uiCount > 0
        ? `T1: ${c.uiT1VirtualStats.mean}m + T2: ${c.uiT2PhysicalStats.mean}m = Tot: ${c.uiTotalBoardingStats.mean}m (Med ${c.uiTotalBoardingStats.median}m)`
        : '—',
      c.utiCount > 0
        ? `T1: ${c.utiT1VirtualStats.mean}m | T2: ${c.utiT2PhysicalStats.mean}m | Fís: ${c.utiPhysicalTotalStats.mean}m | Geral: ${c.utiTotalBoardingStats.mean}m (Med ${c.utiTotalBoardingStats.median}m)`
        : '—',
      `Cir: ${c.surgicalTotalBoardingStats.count > 0 ? `${c.surgicalTotalBoardingStats.mean}m (Med ${c.surgicalTotalBoardingStats.median}m)` : '—'} | Clín: ${
        c.clinicalTotalBoardingStats.count > 0 ? `${c.clinicalTotalBoardingStats.mean}m (Med ${c.clinicalTotalBoardingStats.median}m)` : '—'
      }`,
      c.hospitalStayDaysStats.count > 0
        ? `${c.hospitalStayDaysStats.mean}d (Med: ${c.hospitalStayDaysStats.median}d)`
        : '—',
    ]);
  }

  appendSheetFromAoA(wb, '5_Boarding_UI_UTI_Cirurg', sheet5);

  // --------------------------------------------------------------------------
  // ABA 6: MATRIZ DUPLA DE CONDUTAS MÉDICAS (1º ATENDIMENTO vs. FECHAMENTO)
  // --------------------------------------------------------------------------
  const sheet6: unknown[][] = [
    ['MATRIZ DE CONDUTAS E DESFECHOS POR MÉDICO: 1º ATENDIMENTO (GATEKEEPER) vs. ÚLTIMO ATENDIMENTO (CLOSER / REAVALIADOR)'],
    [
      'Profissional Médico (Medico Anamnese / Último Atend)',
      '1º Atend: Total (Porta)',
      '1º Atend: Diurno / Noturno',
      '% Alta Direta no 1º Atend',
      '% Alta Só Med (Fast Reav)',
      '% Prescrição Medicação',
      '% Pedido Laboratório',
      '% Pedido Raio-X',
      '% Pedido Tomografia (TC)',
      '% Receita Emitida',
      '% Atestado Emitido',
      '% Conversão Internação (Origem)',
      'Tempo Consulta 1º Atend (Média)',
      'LOS Médio / Mediano Pacientes Abertos',
      'Último Atend: Total Fechamentos',
      'Fechamentos Próprios (Sem Handoff)',
      'Fechamentos Herdado de Colega (Handoff)',
      '% Absorção de Passivo (Handoff)',
      'Altas Pós-Propedêutica Assinadas (N e %)',
      'Internações Assinadas no Fechamento (N e %)',
      'Saldo Líquido de Reavaliação (Último - 1º Atend)',
    ],
  ];

  for (const d of vsm.doctorConductMatrix) {
    sheet6.push([
      d.name,
      d.firstAttendCount,
      `${d.firstDayCount}D / ${d.firstNightCount}N`,
      `${d.directDischargePct}% (${d.directDischargeCount})`,
      `${d.fastReavMedOnlyPct}% (${d.fastReavMedOnlyCount})`,
      `${d.medOrderedPct}%`,
      `${d.labOrderedPct}%`,
      `${d.rxOrderedPct}%`,
      `${d.tcOrderedPct}%`,
      `${d.receitaPct}%`,
      `${d.atestadoPct}%`,
      `${d.convertedToAdmissionPct}% (${d.convertedToAdmissionCount})`,
      d.firstAttendMeanConsultMin,
      `${d.firstAttendMeanLosMin}m / Med ${d.firstAttendMedianLosMin}m`,
      d.lastAttendCount,
      d.closedOwnPatientsCount,
      d.closedHandoffPatientsCount,
      `${d.handoffAbsorptionPct}%`,
      `${d.postPropDischargeCount} (${d.postPropDischargePct}%)`,
      `${d.admissionsSignedCount} (${d.admissionsSignedPct}%)`,
      d.netReavalBalance > 0 ? `+${d.netReavalBalance}` : `${d.netReavalBalance}`,
    ]);
  }

  appendSheetFromAoA(wb, '6_Condutas_Medicas_1eUlt', sheet6);

  // --------------------------------------------------------------------------
  // ABA 7: MATRIZ CID x THROUGHPUT (100% FECHADA), CLUSTERS, CHAA 3704 & RETORNO <48H
  // --------------------------------------------------------------------------
  const dg = vsm.diagnosticGovernance;
  const rv = vsm.returnVisits;

  const sheet7: unknown[][] = [
    ['MATRIZ CID x ROTA DE THROUGHPUT (PARTIÇÃO 100% FECHADA HORIZONTALMENTE POR DIAGNÓSTICO)'],
    [
      'Diagnóstico (CID)',
      'Cluster Sindrômico',
      'Volume Total (N)',
      '% do PS',
      'Rota 1: Alta Direta no 1º Atend (N e %)',
      'Rota 2: Alta Só Medicação / Fast Reav (N e %)',
      'Rota 3: Alta Pós-Exames Lab/Imagem (N e %)',
      'Rota 4: Internação Hospitalar (N e %)',
      'Rota 5: Evasões / Sem Desfecho / Adm (N e %)',
      'Tempo Permanência Médio (min)',
      'Tempo Permanência Mediano (min)',
    ],
  ];

  for (const row of vsm.cidThroughputMatrix) {
    sheet7.push([
      row.cid,
      row.clusterName,
      row.totalCount,
      `${row.pctOfTotalPs}%`,
      `${row.directDischargeCount} (${row.directDischargePct}%)`,
      `${row.fastReavMedCount} (${row.fastReavMedPct}%)`,
      `${row.diagnosticGiroCount} (${row.diagnosticGiroPct}%)`,
      `${row.admittedCount} (${row.admittedPct}%)`,
      `${row.otherOutcomesCount} (${row.otherOutcomesPct}%)`,
      row.meanLos,
      row.medianLos,
    ]);
  }

  sheet7.push([]);
  sheet7.push(['AGRUPAMENTO POR CLUSTERS SINDRÔMICOS DA EMERGÊNCIA']);
  sheet7.push([
    'Cluster Clínico',
    'Atendimentos (N)',
    '% do Total',
    'Permanência Média (min)',
    'Permanência Mediana (min)',
    '% Medicação',
    '% Laboratório',
    '% Tomografia (TC)',
    '% Conversão em Internação',
  ]);

  for (const cl of data.cidClusters) {
    sheet7.push([
      cl.clusterName,
      cl.count,
      `${cl.percentage}%`,
      cl.meanLos,
      cl.medianLos,
      `${cl.medRate}%`,
      `${cl.labRate}%`,
      `${cl.tcRate}%`,
      `${cl.admissionRate}%`,
    ]);
  }

  sheet7.push([]);
  sheet7.push(['GOVERNANÇA CLÍNICA & ASSERTIVIDADE DIAGNÓSTICA NA INTERNAÇÃO (CHAA 3704: CID ENTRADA vs. CID SAÍDA)']);
  sheet7.push([
    'Pacientes Internados Avaliados (CHAA 3704)',
    'Concordância Exata de CID (Entrada = Saída)',
    'Reclassificação Diagnóstica Total (Mudança de CID pós-exames)',
    '   • Refinamento Fisiopatológico (Mesmo Capítulo/Sistema)',
    '   • Mudança de Sistema / Capítulo Clínico (Discordância)',
    'LOS Médio nos Casos Concordantes vs. Reclassificados',
  ]);
  sheet7.push([
    dg.evaluatedAdmissionsCount,
    `${dg.exactMatchCount} (${dg.exactMatchPct}%)`,
    `${dg.reclassifiedCount} (${dg.reclassifiedPct}%)`,
    `${dg.sameChapterRefinementCount} (${dg.sameChapterRefinementPct}%)`,
    `${dg.crossChapterDiscordanceCount} (${dg.crossChapterDiscordancePct}%)`,
    `Concordantes: ${dg.meanLosExactMatch}m | Reclassificados: ${dg.meanLosReclassified}m`,
  ]);

  if (dg.topReclassifications.length > 0) {
    sheet7.push([]);
    sheet7.push(['PRINCIPAIS PARES DE RECLASSIFICAÇÃO DIAGNÓSTICA ENTRE A PORTA E A SOLICITAÇÃO DE INTERNAÇÃO']);
    sheet7.push(['Hipótese Inicial na Porta (Diag entrada)', 'Diagnóstico na Solicitação de Internação (Diag saida)', 'Casos (N)', 'Classificação de Governança']);
    for (const pair of dg.topReclassifications) {
      sheet7.push([pair.cidIn, pair.cidOut, pair.count, pair.classification]);
    }
  }

  sheet7.push([]);
  sheet7.push(['AUDITORIA DE RETORNO PRECOCE À EMERGÊNCIA (< 48 HORAS E < 72 HORAS)']);
  sheet7.push([
    'Retornos em <= 48h (N e % do PS)',
    'Internações no Retorno <= 48h (N e % Conversão)',
    'Retornos em <= 72h (N e % do PS)',
    'Internações no Retorno <= 72h (N e % Conversão)',
  ]);
  sheet7.push([
    `${rv.return48hCount} (${rv.return48hPct}%)`,
    `${rv.return48hAdmittedCount} (${rv.return48hAdmissionRate}% de internação no retorno)`,
    `${rv.return72hCount} (${rv.return72hPct}%)`,
    `${rv.return72hAdmittedCount} (${rv.return72hAdmissionRate}% de internação no retorno)`,
  ]);

  appendSheetFromAoA(wb, '7_CIDs_Rotas_e_Governanca', sheet7);

  // --------------------------------------------------------------------------
  // ABA 8: SÉRIE DIÁRIA COMPLETA, SEMANAS DO MÊS (S1–S5) E DIAS DA SEMANA
  // --------------------------------------------------------------------------
  const sheet8: unknown[][] = [
    ['CONSOLIDAÇÃO POR SEMANA DO MÊS (SEMANAS 1 A 5)'],
    ['Semana do Mês', 'Dias', 'Total Atendimentos', 'Média Diária', 'DP (±)', 'Mediana Diária', 'Porta-Médico Médio (min)', 'Permanência Média (min)', 'Internações (N)'],
  ];

  for (const w of data.weekOfMonthStats) {
    sheet8.push([w.weekLabel, w.daysCount, w.total, w.meanPerDay, w.stdDevPerDay, w.medianPerDay, w.meanDoorToDoc, w.meanLos, w.admissions]);
  }

  sheet8.push([]);
  sheet8.push(['CONSOLIDAÇÃO POR DIA DA SEMANA (SEGUNDA A DOMINGO)']);
  sheet8.push([
    'Dia da Semana',
    'Ocorrências no Mês',
    'Volume Acumulado',
    'Média por Dia',
    'DP (±)',
    'Mediana',
    'Mín–Máx',
    'Média Plantão Diurno',
    'Média Plantão Noturno',
    'Porta-Médico Médio (min)',
    'Permanência Média (min)',
  ]);

  for (const wd of data.weekdayStats) {
    sheet8.push([
      wd.dayName,
      wd.daysOccurred,
      wd.total,
      wd.meanPerDay,
      wd.stdDevPerDay,
      wd.medianPerDay,
      `${wd.minPerDay} – ${wd.maxPerDay}`,
      wd.dayShiftMean,
      wd.nightShiftMean,
      wd.meanDoorToDoc,
      wd.meanLos,
    ]);
  }

  sheet8.push([]);
  sheet8.push(['SÉRIE HISTÓRICA DIÁRIA COMPLETA']);
  sheet8.push(['Data', 'Dia da Semana', 'Volume Total (24h)', 'Plantão Diurno (07h–18h59)', 'Plantão Noturno (19h–06h59)', 'Internações (N)', 'Porta-Médico Médio (min)', 'Permanência Média (min)']);

  for (const d of data.dailySeries) {
    sheet8.push([d.label, d.dayOfWeek, d.total, d.dayShift, d.nightShift, d.admissions, d.meanDoorToDoc, d.meanLos]);
  }

  appendSheetFromAoA(wb, '8_Serie_Diaria_e_Semanas', sheet8);

  // --------------------------------------------------------------------------
  // ABA 9: NOTA TÉCNICA, METODOLOGIA ANALÍTICA E AUDITORIA DA BASE
  // --------------------------------------------------------------------------
  const sheet9 = buildMethodologySheetAoA(data);
  appendSheetFromAoA(wb, '9_Metodologia_e_Auditoria', sheet9);

  const safePeriod = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Dossie_VSM_Jornada_PS_${safePeriod}.xlsx`);
}

// ============================================================================
// COMPARATIVO MULTIMENSAL (MOM) EM EXCEL (+ ABA METODOLÓGICA)
// ============================================================================

export function generateComparisonExcel(months: EmergencyAnalyticsData[]): void {
  if (!months || months.length === 0) return;
  const wb = XLSX.utils.book_new();
  const sorted = [...months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  const aoa: unknown[][] = [
    ['COMPARATIVO HISTÓRICO MULTIMENSAL (MOM) — INDICADORES DE PORTA, THROUGHPUT, VSM E BOARDING DIFERENCIADO'],
    ['Indicador Estratégico', ...sorted.map((m) => `${m.periodLabel} (${m.activeScopeLabel})`)],
    ['Volume Total no Escopo (N)', ...sorted.map((m) => m.totalAttendances)],
    ['Média Diária (±DP)', ...sorted.map((m) => `${m.dailyVolume.overall.mean} (±${m.dailyVolume.overall.stdDev})`)],
    ['Mediana Diária [Mín–Máx]', ...sorted.map((m) => `${m.dailyVolume.overall.median} [${m.dailyVolume.overall.min}–${m.dailyVolume.overall.max}]`)],
    ['Tempo Porta-Médico: Média (±DP) | Mediana (P90)', ...sorted.map((m) => fmtStatFull(m.doorToDoctor.overall))],
    ['% Dentro da Meta Porta-Médico (<= 20 min)', ...sorted.map((m) => `${m.withinSlaDoorToDocRate}%`)],
    ['% Ramo A: Alta Direta no 1º Atendimento', ...sorted.map((m) => `${m.vsm.monthlyOverall.directDischargePct}% (${m.vsm.monthlyOverall.directDischargeCount})`)],
    ['% Sub-ramo B1: Alta Após Medicação (Fast Reav)', ...sorted.map((m) => `${m.vsm.monthlyOverall.fastReavDischargedPct}% (${m.vsm.monthlyOverall.fastReavDischargedCount})`)],
    ['% Sub-ramo B2: Alta Após Exames Diagnósticos', ...sorted.map((m) => `${m.vsm.monthlyOverall.diagnosticExamsDischargedPct}% (${m.vsm.monthlyOverall.diagnosticExamsDischargedCount})`)],
    ['Espera Consolidada de Laudo (Lab/TC)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.waitLabReportStats))],
    ['Fila Invisível Pós-Laudo p/ Reavaliação', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.postReportReavalWaitStats))],
    ['Taxa de Handoff Interno (Troca de Médico)', ...sorted.map((m) => `${m.vsm.monthlyOverall.handoffDoctorPct}%`)],
    ['Taxa de Conversão em Internação (%)', ...sorted.map((m) => `${m.conversionRate}% (${m.totalAdmissions})`)],
    ['Boarding Total FÍSICO (Coorte c/ Subida Física: T1+T2)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.physicalTotalBoardingStats))],
    ['Boarding Total GERAL (Incluindo Leito de Espera)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.totalBoardingStats))],
    ['Boarding Total ENFERMARIA (UI)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.uiBoardingStats))],
    ['Boarding Total UTI (Físico vs. Geral)', ...sorted.map((m) => `Fís: ${m.vsm.monthlyOverall.utiPhysicalBoardingStats.mean}m | Geral: ${m.vsm.monthlyOverall.utiBoardingStats.mean}m`)],
    ['Boarding Total PERFIL CIRÚRGICO', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.surgicalBoardingStats))],
    ['Boarding Total PERFIL CLÍNICO', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.clinicalBoardingStats))],
    ['Macas Físicas Bloqueadas 24h/dia em Boarding', ...sorted.map((m) => `${m.vsm.equivalentBlockedBeds24h} macas/d (${m.vsm.wastedBedHoursInBoarding}h)`)],
    ['Eficiência Lean Global (PCE %)', ...sorted.map((m) => `${m.vsm.monthlyOverall.pceEfficiencyPct}%`)],
  ];

  appendSheetFromAoA(wb, '1_Comparativo_Mensal_VSM', aoa);
  appendSheetFromAoA(wb, '2_Metodologia_e_Auditoria', buildMethodologySheetAoA(sorted[sorted.length - 1]));
  XLSX.writeFile(wb, `Comparativo_Multimensal_VSM_PS.xlsx`);
}

export const exportEmergencyExcel = generateEmergencyExcel;
export const downloadEmergencyExcel = generateEmergencyExcel;
export const exportComparisonExcel = generateComparisonExcel;