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
  const periodInfo = data
    ? `Competência Auditada: ${data.periodLabel} | Escopo Ativo: ${data.activeScopeLabel} (N = ${data.totalAttendances} de ${data.totalGlobalAttendances} globais) | CATE 3493: ${
        data.vsm.hasCate3493Data ? `Integrado (${data.vsm.matched3493Count} pac.)` : 'Não anexado'
      } | CHAA 3704: ${data.vsm.hasChaa3704Data ? `Integrado (${data.vsm.matched3704Count} pac.)` : 'Não anexado'}`
    : 'Auditoria Multimensal Consolidada (MoM)';

  const rows: unknown[][] = [
    ['ANEXO TÉCNICO — MEMORIAL METODOLÓGICO, RASTREABILIDADE DE FÓRMULAS E AUDITORIA DE QUALIDADE DA BASE (HIS / TASY)'],
    [periodInfo],
    [],
  ];

  if (dq && data) {
    rows.push(
      ['1. AUDITORIA DE COMPLETUDE E SANEAMENTO DA BASE BRUTA NESTA COMPETÊNCIA (TRANSPARÊNCIA TOTAL DE DADOS)'],
      ['Métrica de Qualidade e Integridade do Prontuário (Tasy)', 'Resultado Auditado na Base', 'Explicação Técnica e Regra de Tratamento Aplicada'],
      ['Total de Atendimentos Avaliados no Escopo Ativo', `${dq.totalRecordsEvaluated} fichas`, `População total filtrada a partir de ${data.totalGlobalAttendances} atendimentos brutos carregados.`],
      ['Completude do Tempo Porta-Médico ([Esp. Totem x Médico])', `${dq.doorToDocCompletenessPct}% preenchido`, 'Quando ausente, utiliza fallback determinístico para [Tempo Esp. Atend. Ficha x Médico] ou [Esp. Recepção x Médico].'],
      ['Completude do Tempo de 1ª Consulta ([Atend. Médico])', `${dq.consultTimeCompletenessPct}% preenchido`, 'Mede o tempo efetivo de anamnese e exame físico inicial no consultório.'],
      ['Preenchimento Nativo de [Espera Laudo Laboratório] vs. Reconstrução via Timestamp', `${dq.labReportNativeColPct}% nativo | ${dq.labReportReconstructedFromTsCount} reconstruídos`, 'Para eliminar o falso zero quando a coluna [Espera Laudo Laboratório] vem vazia no CATE 3333, o motor subtrai [Dt Laudo Lab] - [Fim Estimado da Coleta].'],
      ['Completude do Ciclo de Tomografia ([Espera TC] / [Dt Laudo TC])', `${dq.tcReportCompletenessPct}% preenchido`, 'Calcula o ciclo completo Prescrição -> Execução ([Esp TC Presc x Exec]) e Execução -> Laudo ([Espera TC] - [Esp TC Presc x Exec]).'],
      ['Completude do Tempo de Permanência Geral ([Qt Minutos Entrada- Desfecho])', `${dq.losCompletenessPct}% preenchido`, 'Intervalo total entre a abertura da ficha e a alta ou decisão de internação no PS.'],
      ['Registros com Micro-Tempos Negativos Expurgados', `${dq.negativeTimesPurgedCount} ocorrências`, 'Lançamentos retroativos manuais (< 0 min) têm apenas a micro-etapa inválida anulada (null), sem excluir o paciente da contagem de volume.'],
      ['Registros com Outliers Extremos Limitados por Teto de Segurança (Capping)', `${dq.cappedOutliersCount} ocorrências`, 'Impede que fichas esquecidas abertas no sistema por dias distorçam a média e o desvio-padrão da equipe.'],
      ['Taxa de Cruzamento Determinístico CATE 3493 (Boarding Físico)', `${dq.cate3493MatchRateOnAdmissionsPct}% dos internados`, 'Cruzamento exato 1:1 via [Atendimento] === [Nr atendimento].'],
      ['Taxa de Cruzamento Determinístico CHAA 3704 (Governança CID)', `${dq.chaa3704MatchRateOnAdmissionsPct}% dos internados`, 'Cruzamento exato 1:1 via [Atendimento] === [Atendimento].'],
      []
    );
  }

  rows.push(
    ['2. ARQUITETURA DE FUSÃO DETERMINÍSTICA MULTI-SETOR / MULTI-CLÍNICA E CONFORMIDADE LGPD STATELESS'],
    ['Componente / Relatório', 'Chave Primária de Cruzamento', 'Escopo de Setores e Clínicas', 'Variáveis Extraídas e Papel Analítico'],
    [
      '2.1. Relatório CATE 3333 (Global ou Segmentado)',
      'Coluna [Atendimento] (Deduplicação automática 1:1 ao somar arquivos segmentados)',
      'Suporta todos os Setores (PS Adulto, PSGO, PS Infantil) e Clínicas (Médica, Ortopédica, Cirúrgica, Obstetrícia, Pediátrica, Cardiologia, etc.)',
      'Timestamps de Entrada, Recepção, Consulta, Medicação, Coleta/Laudo Lab, RX, TC, USG, Data Desfecho, Data Internação (Leito Virtual), Médico Anamnese, Médico Último Atend, CID, Convênio e DT Últ Passagem PS.',
    ],
    [
      '2.2. Relatório CATE 3493 (Boarding Físico & Perfil Cirúrgico)',
      'Left Join determinístico 1:1: [CATE 3333.Atendimento] === [CATE 3493.Nr atendimento]',
      'Pacientes oriundos das emergências com solicitação e alocação de leito hospitalar',
      'Extrai [Dt ent aguard], [Dt ent unid] (subida física real UI/UTI, diferenciando de "Leito de Espera"), [Dif aguardando/Ent. Unid], [Cc] (Centro Cirúrgico S/N) e [Tempo permanencia] (dias).',
    ],
    [
      '2.3. Relatório CHAA 3704 (Governança Clínica & Assertividade CID)',
      'Left Join determinístico 1:1: [CATE 3333.Atendimento] === [CHAA 3704.Atendimento]',
      'Pacientes internados via Pronto-Socorro com registro duplo de CID',
      'Extrai [Diag entrada] (hipótese diagnóstica na porta do PS) e [Diag saida] (diagnóstico consolidado no ato da solicitação de internação pós-propedêutica).',
    ],
    [
      '2.4. Conformidade LGPD Stateless (Lei nº 13.709/2018)',
      'Execução 100% Client-Side em Memória RAM',
      'Descarte Imediato de PII na Leitura',
      'As colunas [Paciente], [Nm paciente], [Nome], [Email], [Endereço], [Numero], [bairro], [Dt. Nascimento] e [Dt nasc] jamais são lidas ou armazenadas.',
    ],
    [],
    ['3. DICIONÁRIO DE FÓRMULAS MATEMÁTICAS E MÁQUINA DE ESTADOS (COMO CADA INDICADOR É CALCULADO)'],
    ['Indicador / Nó do VSM', 'Fórmula Matemática / Regra Lógica Exata', 'Colunas Fontes Utilizadas', 'Interpretação Gerencial e Operacional'],
    [
      '3.1. Ciclo Operacional de Plantão (07h00 D -> 06h59 D+1)',
      'Se Hora(Entrada) < 07h00, a Data Operacional pertence ao plantão iniciado às 07h00 do dia anterior (D-1). Diurno: 07h00–18h59 | Noturno: 19h00–06h59.',
      'Coluna [Entrada] do CATE 3333',
      'Garante que a madrugada (00h–06h) de segunda-feira para terça-feira seja contabilizada corretamente no fechamento do plantão noturno de segunda-feira.',
    ],
    [
      '3.2. Máquina de Estados do Censo Simultâneo (Sonda :30)',
      'Sonda em t_probe = DiaOperacional + Hora + 30min. Estado 1 (Porta): t_Entrada <= t_probe < t_FimPorta (onde t_FimPorta = t_Desfecho p/ Alta Direta, ou t_Entrada + PortaMédico + 1aConsulta p/ quem faz propedêutica). Estado 2A (Fast Reav): t_FimPorta <= t_probe < t_Desfecho & Só Medicação. Estado 2B (Giro Exames): t_FimPorta <= t_probe < t_Desfecho & Com Exames. Estado 3 (Boarding): Internado & t_Desfecho <= t_probe < t_SaidaUnidadeFisica.',
      '[Entrada], [Esp. Totem x Médico], [Atend. Médico], [Data Desfecho], [Data Internação], [Dt ent unid]',
      'Elimina qualquer vazamento de pacientes de Alta Direta para o Giro de Exames e calcula Média, ±DP, Mediana, P90 e Amplitude [Mín–Máx] para cada uma das 4 frentes.',
    ],
    [
      '3.3. Reconstrução Real do Tempo de Espera de Laudo (Sem Falso Zero)',
      'Se [Espera Laudo Laboratório] > 0, usa valor nativo; se nulo/zero e [Dt Laudo Lab] presente, calcula [Dt Laudo Lab] - ([Entrada] + [Porta-Médico] + [1ª Consulta] + [Espera Coleta]). Para TC: [Espera TC] - [Esp TC Presc x Exec].',
      '[Espera Laudo Laboratório], [Dt Laudo Lab], [Espera TC], [Esp TC Presc x Exec], [Dt Laudo TC]',
      'Garante que a etapa "7. Espera Laudo" na Linha do Tempo Lean VSM reflita fielmente o tempo de processamento diagnóstico.',
    ],
    [
      '3.4. Boarding Diferenciado: UI vs. UTI e Cirúrgico vs. Clínico',
      'Etapa 1 (Plano/Virtual) = [Dt ent aguard -> Data Internação] ou [Espera Internação] | Etapa 2 (Subida Física) = [Data Internação -> Dt ent unid] (quando Ds setor unid != Leito de Espera) | Total = [Dif aguardando/Ent. Unid]. Perfil Cirúrgico = (Cc == "S") OR (Clínica in [Cirúrgica, Ortopédica]). Macas Bloqueadas 24h = Soma(Horas Boarding) / (Dias * 24).',
      'CATE 3333 + CATE 3493 ([Tipo Leito Internação], [Ds setor unid], [Cc], [Clínica])',
      'Quantifica separadamente o gargalo de Enfermaria (UI) vs. UTI e revela a retenção superior dos pacientes cirúrgicos frente aos clínicos.',
    ],
    [
      '3.5. Eficiência Lean (PCE) Global e Estratificada por Rota',
      'PCE Global = VA / (VA + NVA) | PCE Ramo A = (Cadastro + 1ªConsulta) / LOS_RamoA | PCE Ramo B1 (Fast Reav) = (Cadastro + 1ªConsulta + InfusãoMed + Reaval) / LOS_RamoB1 | PCE Ramo B2 (Exames) = VA_Total / LOS_RamoB2.',
      'Médias auditadas das micro-etapas por rota de throughput',
      'Permite auditar a eficiência de fluxo separadamente para fichas de baixa, média e alta complexidade propedêutica.',
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
  const bbt = vsm.boardingByBedType;

  // --------------------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO, KPIS, FAIXAS DE PERMANÊNCIA (AGING) & SLAS POR TURNO
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
    ['1. INDICADORES VOLUMÉTRICOS E DESFECHOS MACRO DO ESCOPO ATIVO'],
    ['Indicador Executivo', 'Valor Absoluto (N)', 'Participação (%)', 'Referência / Dispersão Operacional'],
    ['Volume Total no Escopo Selecionado', data.totalAttendances, `${((data.totalAttendances / Math.max(data.totalGlobalAttendances, 1)) * 100).toFixed(1)}% do Global`, `${data.dailyVolume.overall.mean}/dia (±${data.dailyVolume.overall.stdDev}) | Mediana: ${data.dailyVolume.overall.median}/dia [${data.dailyVolume.overall.min}–${data.dailyVolume.overall.max}]`],
    ['Atendimentos no Plantão Diurno (07h00 às 18h59)', data.dailySeries.reduce((a, b) => a + b.dayShift, 0), `${((data.dailySeries.reduce((a, b) => a + b.dayShift, 0) / Math.max(data.totalAttendances, 1)) * 100).toFixed(1)}%`, `Média Diurna: ${data.dailyVolume.dayShift.mean}/dia (±${data.dailyVolume.dayShift.stdDev}) | Mediana: ${data.dailyVolume.dayShift.median}`],
    ['Atendimentos no Plantão Noturno (19h00 às 06h59)', data.dailySeries.reduce((a, b) => a + b.nightShift, 0), `${((data.dailySeries.reduce((a, b) => a + b.nightShift, 0) / Math.max(data.totalAttendances, 1)) * 100).toFixed(1)}%`, `Média Noturna: ${data.dailyVolume.nightShift.mean}/dia (±${data.dailyVolume.nightShift.stdDev}) | Mediana: ${data.dailyVolume.nightShift.median}`],
    ['Ramo A — Alta Direta no 1º Atendimento (Sem Exames/Medicação)', m.directDischargeCount, `${m.directDischargePct}%`, `LOS: ${fmtStatFull(m.directDischargeLosStats)} | PCE Ramo A: ${m.pceRamoADirectPct}%`],
    ['Ramo B — Giro Propedêutico / Terapêutico Interno Total', m.propaedeuticLoopCount, `${m.propaedeuticLoopPct}%`, `LOS: ${fmtStatFull(m.propaedeuticLoopLosStats)}`],
    ['   • Sub-ramo B1: Fast Reav / Giro Terapêutico (Apenas Medicação)', m.fastReavMedOnlyCount, `${m.fastReavMedOnlyPct}%`, `LOS: ${fmtStatFull(m.fastReavMedOnlyLosStats)} | PCE Fast Reav: ${m.pceRamoB1FastReavPct}%`],
    ['   • Sub-ramo B2: Giro Diagnóstico (Com Exames Lab/RX/TC/USG)', m.diagnosticExamsLoopCount, `${m.diagnosticExamsLoopPct}%`, `LOS: ${fmtStatFull(m.diagnosticExamsLoopLosStats)} | PCE Giro Exames: ${m.pceRamoB2DiagExamsPct}%`],
    ['Alta Pós-Propedêutica / Reavaliação Médica', m.postPropDischargeCount, `${m.postPropDischargePct}%`, `LOS: ${fmtStatFull(m.postPropDischargeLosStats)}`],
    ['Internações Hospitalares Totais (Conversão da Porta)', data.totalAdmissions, `${data.conversionRate}%`, `Enfermaria (UI): ${data.uiAdmissions} (${m.admittedUiPct}%) | UTI: ${data.utiAdmissions} (${m.admittedUtiPct}%)`],
    ['   • Internações por Perfil: Cirúrgico vs. Clínico Não Cirúrgico', `Cirúrgico: ${data.surgicalAdmissions}`, `Clínico: ${data.clinicalAdmissions}`, `Boarding Cirúrgico Méd: ${m.surgicalBoardingStats.mean}m (Med ${m.surgicalBoardingStats.median}m) vs. Clínico Méd: ${m.clinicalBoardingStats.mean}m (Med ${m.clinicalBoardingStats.median}m)`],
    ['Horas-Maca Consumidas em Boarding e Macas Físicas Bloqueadas 24h/dia', `${vsm.wastedBedHoursInBoarding} horas`, `${vsm.equivalentBlockedBeds24h} macas 24h/d`, `UI bloqueia ${bbt.ui.equivalentBlockedBeds24h} macas/d (${bbt.ui.wastedBedHours}h) | UTI bloqueia ${bbt.uti.equivalentBlockedBeds24h} macas/d (${bbt.uti.wastedBedHours}h)`],
    ['Retenção de Passagem de Plantão (Laudos prontos antes das 07h ou 19h c/ Handoff)', vsm.shiftChangeBottleneck.totalShiftChangeRetainedCount, `${vsm.shiftChangeBottleneck.pctOfAllPostLaudoPatients}% dos pós-laudo`, `Manhã (04h30–06h59 -> pós 07h): ${vsm.shiftChangeBottleneck.morningWindowReadyBefore7hCount} pac. | Noite (16h30–18h59 -> pós 19h): ${vsm.shiftChangeBottleneck.eveningWindowReadyBefore19hCount} pac.`],
    ['Eficiência Lean Global (PCE) e por Rota', `${m.pceEfficiencyPct}% Global`, `VA: ${m.vaMinutesMean}m / NVA: ${m.nvaMinutesMean}m`, `Ramo A: ${m.pceRamoADirectPct}% | Ramo B1 (Fast Reav): ${m.pceRamoB1FastReavPct}% | Ramo B2 (Exames): ${m.pceRamoB2DiagExamsPct}%`],
    [],
    ['2. FAIXAS DE ENVELHECIMENTO DE PERMANÊNCIA NO PS (LOS AGING BUCKETS — ONDE NASCEM AS LONGAS PERMANÊNCIAS)'],
    ['Faixa de Permanência (LOS)', 'Perfil Operacional Predominante', 'Pacientes (N)', '% do Total PS', 'Alta Direta 1ºAt (N)', 'Fast Reav Só Med (N)', 'Giro Exames c/ Alta (N)', 'Internações (N)', 'LOS Médio na Faixa (min)'],
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
      b.meanLos,
    ]);
  }

  sheet1.push(
    [],
    ['3. DECOMPOSIÇÃO COMPLETA DE TEMPOS OPERACIONAIS E SLAS POR TURNO (MÉDIA, DP, MEDIANA, P90 E AMPLITUDE MÍN–MÁX)'],
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
    ['3. Fila Pós-Recepção -> 1º Atendimento Médico', m.waitRecepToDocStats, vsm.byShift.day.waitRecepToDocStats, vsm.byShift.night.waitRecepToDocStats],
    ['4. Tempo Porta-Médico Total (Totem -> Médico)', data.doorToDoctor.overall, data.doorToDoctor.dayShift, data.doorToDoctor.nightShift],
    ['5. Tempo de Consulta Médica Inicial (Anamnese)', data.consultTime.overall, data.consultTime.dayShift, data.consultTime.nightShift],
    ['6. Espera para Início da Medicação (Prescrição -> Checagem)', data.medicationWait.overall, data.medicationWait.dayShift, data.medicationWait.nightShift],
    ['7. Tempo de Administração / Infusão de Medicação', data.medicationAdmTime.overall, data.medicationAdmTime.dayShift, data.medicationAdmTime.nightShift],
    ['8. Espera Laboratório (Prescrição -> Coleta/Execução)', data.labWait.overall, data.labWait.dayShift, data.labWait.nightShift],
    ['9. Tempo de Laudo Laboratorial (Coleta -> Liberação Laudo)', m.waitLabReportStats, vsm.byShift.day.waitLabReportStats, vsm.byShift.night.waitLabReportStats],
    ['10. Espera Consolidada de Laudo Diagnóstico (Lab / TC / USG)', m.combinedExamReportWaitStats, vsm.byShift.day.combinedExamReportWaitStats, vsm.byShift.night.combinedExamReportWaitStats],
    ['11. Espera Raio-X (Prescrição -> Execução RX)', data.rxWait.overall, data.rxWait.dayShift, data.rxWait.nightShift],
    ['12. Ciclo Total de Tomografia - TC (Prescrição -> Laudo)', data.tcWait.overall, data.tcWait.dayShift, data.tcWait.nightShift],
    ['13. Ciclo de Ultrassonografia - USG', m.waitUsgTotalStats, vsm.byShift.day.waitUsgTotalStats, vsm.byShift.night.waitUsgTotalStats],
    ['14. Fila Invisível Pós-Laudo p/ Reavaliação (Desfecho - Último Laudo)', m.postReportReavalWaitStats, vsm.byShift.day.postReportReavalWaitStats, vsm.byShift.night.postReportReavalWaitStats],
    ['15. Permanência Total — Ramo A: Alta Direta no 1º Atendimento', m.directDischargeLosStats, vsm.byShift.day.directDischargeLosStats, vsm.byShift.night.directDischargeLosStats],
    ['16. Permanência Total — Ramo B1: Fast Reav (Apenas Medicação)', m.fastReavMedOnlyLosStats, vsm.byShift.day.fastReavMedOnlyLosStats, vsm.byShift.night.fastReavMedOnlyLosStats],
    ['17. Permanência Total — Ramo B2: Giro Diagnóstico (Com Exames)', m.diagnosticExamsLoopLosStats, vsm.byShift.day.diagnosticExamsLoopLosStats, vsm.byShift.night.diagnosticExamsLoopLosStats],
    ['18. Permanência Geral no PS (Todos os Pacientes: Porta -> Desfecho)', data.losOverall.overall, data.losOverall.dayShift, data.losOverall.nightShift],
    ['19. Permanência Geral — Mesmo Médico (Sem Handoff)', m.sameDoctorLosStats, vsm.byShift.day.sameDoctorLosStats, vsm.byShift.night.sameDoctorLosStats],
    ['20. Permanência Geral — Com Troca de Médico (Pedágio de Handoff)', m.handoffDoctorLosStats, vsm.byShift.day.handoffDoctorLosStats, vsm.byShift.night.handoffDoctorLosStats],
    ['21. Boarding GERAL — Etapa 1 (Aprovação Plano / Leito Virtual)', m.t1AguardoToVirtualBedStats, vsm.byShift.day.t1AguardoToVirtualBedStats, vsm.byShift.night.t1AguardoToVirtualBedStats],
    ['22. Boarding GERAL — Etapa 2 (Leito Virtual -> Subida Física UI/UTI)', m.t2VirtualToPhysicalBedStats, vsm.byShift.day.t2VirtualToPhysicalBedStats, vsm.byShift.night.t2VirtualToPhysicalBedStats],
    ['23. Boarding GERAL — Total Real (Aguardo -> Entrada Física Unidade)', m.totalBoardingStats, vsm.byShift.day.totalBoardingStats, vsm.byShift.night.totalBoardingStats],
    ['24. Boarding ENFERMARIA (UI) — Etapa 1 (Aprovação Plano / Virtual)', m.uiT1AguardoToVirtualStats, vsm.byShift.day.uiT1AguardoToVirtualStats, vsm.byShift.night.uiT1AguardoToVirtualStats],
    ['25. Boarding ENFERMARIA (UI) — Etapa 2 (Virtual -> Subida Física Andar)', m.uiT2VirtualToPhysicalStats, vsm.byShift.day.uiT2VirtualToPhysicalStats, vsm.byShift.night.uiT2VirtualToPhysicalStats],
    ['26. Boarding ENFERMARIA (UI) — Total Real (Aguardo -> Leito UI)', m.uiBoardingStats, vsm.byShift.day.uiBoardingStats, vsm.byShift.night.uiBoardingStats],
    ['27. Boarding UTI — Etapa 1 (Aprovação Plano / Virtual)', m.utiT1AguardoToVirtualStats, vsm.byShift.day.utiT1AguardoToVirtualStats, vsm.byShift.night.utiT1AguardoToVirtualStats],
    ['28. Boarding UTI — Etapa 2 (Virtual -> Subida Física UTI)', m.utiT2VirtualToPhysicalStats, vsm.byShift.day.utiT2VirtualToPhysicalStats, vsm.byShift.night.utiT2VirtualToPhysicalStats],
    ['29. Boarding UTI — Total Real (Aguardo -> Leito UTI)', m.utiBoardingStats, vsm.byShift.day.utiBoardingStats, vsm.byShift.night.utiBoardingStats],
    ['30. Boarding PERFIL CIRÚRGICO (CC=S / Cirurgia / Ortopedia) — Total Real', m.surgicalBoardingStats, vsm.byShift.day.surgicalBoardingStats, vsm.byShift.night.surgicalBoardingStats],
    ['31. Boarding PERFIL CLÍNICO NÃO CIRÚRGICO — Total Real', m.clinicalBoardingStats, vsm.byShift.day.clinicalBoardingStats, vsm.byShift.night.clinicalBoardingStats],
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
  // ABA 2: MATRIZ COMPARATIVA MULTI-SETOR E MULTI-CLÍNICA (VISÃO HOSPITALAR GLOBAL)
  // --------------------------------------------------------------------------
  const sheet2: unknown[][] = [
    ['MATRIZ COMPARATIVA MULTI-SETOR E MULTI-CLÍNICA (TODOS OS ATENDIMENTOS CARREGADOS NA BASE GLOBAL)'],
    [
      `Total Global Carregado em Memória: ${data.totalGlobalAttendances} atendimentos`,
      `Escopo Filtrado Ativo no Relatório: ${data.activeScopeLabel} (${data.totalAttendances} atendimentos)`,
    ],
    [],
    [
      'Setor de Emergência',
      'Clínica / Especialidade',
      'Volume Total (N)',
      '% do Global',
      'Diurno (N)',
      'Noturno (N)',
      '% Alta Direta 1ºAt',
      '% Fast Reav (Só Med)',
      '% Giro Exames',
      'Internações Totais (N / %)',
      'UI / UTI / Cirúrgicas',
      'Porta-Médico (Média ±DP | Mediana)',
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
      sc.dayCount,
      sc.nightCount,
      `${sc.directDischargePct}%`,
      `${sc.fastReavMedPct}%`,
      `${sc.diagnosticExamsPct}%`,
      `${sc.admissionsCount} (${sc.conversionRate}%)`,
      `${sc.uiCount} UI / ${sc.utiCount} UTI (${sc.surgicalAdmissionsCount} Cir.)`,
      fmtStatFull(sc.doorToDocStats),
      fmtStatFull(sc.losStats),
      fmtStatFull(sc.boardingTotalStats),
    ]);
  }

  appendSheetFromAoA(wb, '2_Setores_e_Clinicas', sheet2);

  // --------------------------------------------------------------------------
  // ABA 3: MAPA DA JORNADA DO PACIENTE & VSM MULTIDIMENSIONAL
  // --------------------------------------------------------------------------
  const slices: VsmSliceMetrics[] = [
    vsm.monthlyOverall,
    vsm.byShift.day,
    vsm.byShift.night,
    ...Object.values(vsm.byWeekOfMonth),
    ...WEEKDAY_NAMES.map((d) => vsm.byDayOfWeek[d]).filter(Boolean),
  ];

  const sheet3: unknown[][] = [
    ['MAPA COMPLETO DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM) — COMPARATIVO MULTIDIMENSIONAL'],
    ['Métrica / Nó da Jornada Lean (Input -> Throughput -> Output -> Boarding UI/UTI/Cirúrgico)', ...slices.map((s) => s.label)],
    ['1. INPUT & ACOLHIMENTO NA PORTA'],
    ['Total de Pacientes na Porta (N Absoluto)', ...slices.map((s) => s.totalInput)],
    ['Evasão Pré-Médica (N e %)', ...slices.map((s) => `${s.preMedEvasionCount} (${s.preMedEvasionPct}%)`)],
    ['Pacientes Efetivamente Atendidos pelo Médico (N e %)', ...slices.map((s) => `${s.attendedByDoctorCount} (${s.attendedByDoctorPct}%)`)],
    ['Fila Totem -> Recepção (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.waitTotemToRecepStats))],
    ['Tempo de Abertura de Ficha na Recepção (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.recepRegistrationStats))],
    ['Fila Pós-Recepção -> Médico (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.waitRecepToDocStats))],
    ['Tempo Porta-Médico Total (Média ±DP | Mediana | P90)', ...slices.map((s) => fmtStatFull(s.doorToDocTotalStats))],
    ['Tempo da 1ª Consulta Médica (Média ±DP | Mediana)', ...slices.map((s) => fmtStatFull(s.firstConsultDurationStats))],
    [],
    ['2. BIFURCAÇÃO DE THROUGHPUT (RAMO A vs. RAMO B1 FAST REAV vs. RAMO B2 GIRO EXAMES)'],
    ['Ramo A: Alta Direta no 1º Atendimento — Sem Exames/Medicação (N e %)', ...slices.map((s) => `${s.directDischargeCount} (${s.directDischargePct}%)`)],
    ['   • Tempo Total de Permanência no Ramo A (Alta Direta)', ...slices.map((s) => fmtStatFull(s.directDischargeLosStats))],
    ['Ramo B: Giro Propedêutico e Terapêutico Total (N e %)', ...slices.map((s) => `${s.propaedeuticLoopCount} (${s.propaedeuticLoopPct}%)`)],
    ['   • Tempo Total de Permanência no Ramo B (Propedêutica)', ...slices.map((s) => fmtStatFull(s.propaedeuticLoopLosStats))],
    ['Sub-Ramo B1: Fast Reav / Giro Terapêutico — Apenas Medicação (N e %)', ...slices.map((s) => `${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}%)`)],
    ['   • Tempo Total de Permanência no Fast Reav (Só Medicação)', ...slices.map((s) => fmtStatFull(s.fastReavMedOnlyLosStats))],
    ['Sub-Ramo B2: Giro Diagnóstico — Com Exames Lab/Imagem (N e %)', ...slices.map((s) => `${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}%)`)],
    ['   • Tempo Total de Permanência no Giro Diagnóstico (Exames)', ...slices.map((s) => fmtStatFull(s.diagnosticExamsLoopLosStats))],
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
    ['5. OUTPUTS FINAIS E DECOMPOSIÇÃO DO BOARDING (ENFERMARIA UI vs. UTI & CIRÚRGICO vs. CLÍNICO)'],
    ['Alta Pós-Propedêutica / Reavaliação (N e %)', ...slices.map((s) => `${s.postPropDischargeCount} (${s.postPropDischargePct}%)`)],
    ['   • Permanência Total nas Altas Pós-Propedêutica', ...slices.map((s) => fmtStatFull(s.postPropDischargeLosStats))],
    ['Internações Hospitalares Totais (N e % sobre a Porta)', ...slices.map((s) => `${s.admittedTotalCount} (${s.admittedTotalPct}%)`)],
    ['   • Destino Leito: Enfermaria (UI) vs. UTI', ...slices.map((s) => `UI: ${s.admittedUiCount} (${s.admittedUiPct}%) | UTI: ${s.admittedUtiCount} (${s.admittedUtiPct}%)`)],
    ['   • Perfil Especialidade: Cirúrgico vs. Clínico Não Cirúrgico', ...slices.map((s) => `Cirúrgico: ${s.admittedSurgicalCount} (${s.admittedSurgicalPct}%) | Clínico: ${s.admittedClinicalCount} (${s.admittedClinicalPct}%)`)],
    ['BOARDING GERAL — Etapa 1 (Solicitação -> Leito Virtual/Plano)', ...slices.map((s) => fmtStatFull(s.t1AguardoToVirtualBedStats))],
    ['BOARDING GERAL — Etapa 2 (Leito Virtual -> Subida Física UI/UTI)', ...slices.map((s) => fmtStatFull(s.t2VirtualToPhysicalBedStats))],
    ['BOARDING GERAL — Total Real (Aguardo -> Entrada Física Unidade)', ...slices.map((s) => fmtStatFull(s.totalBoardingStats))],
    ['BOARDING ENFERMARIA (UI) — Etapa 1 (Aprovação Plano / Virtual)', ...slices.map((s) => fmtStatFull(s.uiT1AguardoToVirtualStats))],
    ['BOARDING ENFERMARIA (UI) — Etapa 2 (Virtual -> Subida Física Andar)', ...slices.map((s) => fmtStatFull(s.uiT2VirtualToPhysicalStats))],
    ['BOARDING ENFERMARIA (UI) — Total Real (Aguardo -> Leito UI)', ...slices.map((s) => fmtStatFull(s.uiBoardingStats))],
    ['BOARDING UTI — Etapa 1 (Aprovação Plano / Virtual)', ...slices.map((s) => fmtStatFull(s.utiT1AguardoToVirtualStats))],
    ['BOARDING UTI — Etapa 2 (Virtual -> Subida Física UTI)', ...slices.map((s) => fmtStatFull(s.utiT2VirtualToPhysicalStats))],
    ['BOARDING UTI — Total Real (Aguardo -> Leito UTI)', ...slices.map((s) => fmtStatFull(s.utiBoardingStats))],
    ['BOARDING PERFIL CIRÚRGICO (CC=S / Cirurgia / Ortopedia) — Total Real', ...slices.map((s) => fmtStatFull(s.surgicalBoardingStats))],
    ['BOARDING PERFIL CLÍNICO NÃO CIRÚRGICO — Total Real', ...slices.map((s) => fmtStatFull(s.clinicalBoardingStats))],
    [],
    ['6. EFICIÊNCIA LEAN (PCE GLOBAL E ESTRATIFICADA POR ROTA DE THROUGHPUT)'],
    ['Tempo Médio de Valor Agregado - VA (Atendimento Ativo)', ...slices.map((s) => `${s.vaMinutesMean} min`)],
    ['Tempo Médio de Não Valor Agregado - NVA (Filas e Esperas)', ...slices.map((s) => `${s.nvaMinutesMean} min`)],
    ['Eficiência Lean Global (PCE Global)', ...slices.map((s) => `${s.pceEfficiencyPct}%`)],
    ['Eficiência Lean — Ramo A (Alta Direta 1º Atendimento)', ...slices.map((s) => `${s.pceRamoADirectPct}%`)],
    ['Eficiência Lean — Sub-ramo B1 (Fast Reav Só Medicação)', ...slices.map((s) => `${s.pceRamoB1FastReavPct}%`)],
    ['Eficiência Lean — Sub-ramo B2 (Giro Diagnóstico Exames)', ...slices.map((s) => `${s.pceRamoB2DiagExamsPct}%`)],
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
  sheet4.push(['HEATMAP 24x7 ESTRATIFICADO POR FRENTE OPERACIONAL (MÉDIA E [MÍN–MÁX] DE PORTA | FAST REAV | EXAMES | BOARDING)']);
  sheet4.push(['Dia do Plantão \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = vsm.censusHeatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `Tot:${c.totalMean.toFixed(1)} | P:${c.portaMean.toFixed(1)}[${c.portaStats.min.toFixed(0)}-${c.portaStats.max.toFixed(0)}] | Med:${c.fastReavMedMean.toFixed(1)}[${c.fastReavMedStats.min.toFixed(0)}-${c.fastReavMedStats.max.toFixed(0)}] | Ex:${c.giroExamesMean.toFixed(1)}[${c.giroExamesStats.min.toFixed(0)}-${c.giroExamesStats.max.toFixed(0)}] | Int:${c.boardingMean.toFixed(1)}[${c.boardingStats.min.toFixed(0)}-${c.boardingStats.max.toFixed(0)}]`;
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
  // ABA 5: BOARDING DIFERENCIADO (UI vs. UTI & CIRÚRGICO vs. CLÍNICO) + CONVÊNIOS
  // --------------------------------------------------------------------------
  const sheet5: unknown[][] = [
    ['RAIO-X ESTRATIFICADO DO BOARDING HOSPITALAR: ENFERMARIA (UI) vs. UTI E PERFIL CIRÚRGICO vs. CLÍNICO (CATE 3333 + CATE 3493)'],
    [
      `Total Internações: ${data.totalAdmissions}`,
      `Enfermaria (UI): ${data.uiAdmissions} (${m.admittedUiPct}%)`,
      `UTI: ${data.utiAdmissions} (${m.admittedUtiPct}%)`,
      `Perfil Cirúrgico: ${data.surgicalAdmissions} (${vsm.surgicalAdmissionsPct}%)`,
      `Perfil Clínico: ${data.clinicalAdmissions} (${vsm.clinicalAdmissionsPct}%)`,
      `Horas-Maca Retidas: ${vsm.wastedBedHoursInBoarding}h (${vsm.equivalentBlockedBeds24h} macas bloqueadas 24h/dia)`,
    ],
    [],
    ['1. COMPARATIVO DIRETO DE GARGALOS DE BOARDING POR TIPO DE LEITO (UI vs. UTI) E PERFIL (CIRÚRGICO vs. CLÍNICO)'],
    [
      'Recorte / Perfil de Internação',
      'Pacientes (N / %)',
      'Divisão UI / UTI',
      'Cirúrgicos (N / %)',
      'Etapa 1: Solicitação -> Leito Virtual / Aprovação Plano (Média ±DP | Med | P90)',
      'Etapa 2: Leito Virtual -> Subida Física Unidade (Média ±DP | Med | P90)',
      'BOARDING TOTAL REAL: Aguardo -> Leito Físico (Média ±DP | Med [Mín–Máx] | P90)',
      'Horas-Maca Consumidas no PS',
      'Macas Físicas Bloqueadas 24h/dia',
      'Permanência Hospitalar Pós-Subida (Dias)',
    ],
  ];

  for (const prof of [bbt.global, bbt.ui, bbt.uti, bbt.surgical, bbt.clinical]) {
    sheet5.push([
      prof.label,
      `${prof.admittedCount} (${prof.pctOfAdmissions}%)`,
      `${prof.uiCount} UI / ${prof.utiCount} UTI`,
      `${prof.surgicalCount} (${prof.surgicalPct}%)`,
      fmtStatFull(prof.t1AguardoToVirtualStats),
      fmtStatFull(prof.t2VirtualToPhysicalStats),
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
    ['2. RANKING DE BOARDING POR OPERADORA DE SAÚDE (COM ABERTURA INTERNA UI vs. UTI E CIRÚRGICO vs. CLÍNICO)'],
    [
      'Operadora / Convênio',
      'Internações (N / %)',
      'UI / UTI',
      'Cirúrgico / Clínico',
      'Etapa 1 Geral: Aprovação Plano / Virtual',
      'Etapa 2 Geral: Virtual -> Leito Físico',
      'Boarding Total Geral (Média ±DP | Med | P90)',
      'Boarding ENFERMARIA (UI): Etapa 1 | Etapa 2 | Total',
      'Boarding UTI: Etapa 1 | Etapa 2 | Total',
      'Boarding CIRÚRGICO vs. CLÍNICO (Total)',
      'Permanência Hospitalar (Dias)',
    ]
  );

  for (const c of vsm.boardingByConvenio) {
    sheet5.push([
      c.convenio,
      `${c.admittedCount} (${c.pctOfAdmissions}%)`,
      `${c.uiCount} UI / ${c.utiCount} UTI`,
      `${c.ccCount} Cir. / ${c.clinicalCount} Clín.`,
      fmtStatFull(c.t1VirtualApprovalStats),
      fmtStatFull(c.t2PhysicalUploadStats),
      fmtStatFull(c.totalBoardingStats),
      c.uiCount > 0
        ? `T1: ${c.uiT1VirtualStats.mean}m | T2: ${c.uiT2PhysicalStats.mean}m | Tot: ${c.uiTotalBoardingStats.mean}m (Med ${c.uiTotalBoardingStats.median}m)`
        : '—',
      c.utiCount > 0
        ? `T1: ${c.utiT1VirtualStats.mean}m | T2: ${c.utiT2PhysicalStats.mean}m | Tot: ${c.utiTotalBoardingStats.mean}m (Med ${c.utiTotalBoardingStats.median}m)`
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
      'Profissional Médico',
      '1º Atend: Total (Porta)',
      '1º Atend: Diurno',
      '1º Atend: Noturno',
      '% Alta Direta no 1º Atend',
      '% Fast Reav (Só Medicação)',
      '% Prescrição Medicação',
      '% Pedido Laboratório',
      '% Pedido Raio-X',
      '% Pedido Tomografia (TC)',
      '% Pedido USG',
      '% Conversão Internação (Origem)',
      'Tempo Consulta 1º Atend (Média)',
      'LOS Médio Pacientes Abertos (min)',
      'LOS Mediano Pacientes Abertos (min)',
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
      d.firstDayCount,
      d.firstNightCount,
      `${d.directDischargePct}% (${d.directDischargeCount})`,
      `${d.fastReavMedOnlyPct}% (${d.fastReavMedOnlyCount})`,
      `${d.medOrderedPct}%`,
      `${d.labOrderedPct}%`,
      `${d.rxOrderedPct}%`,
      `${d.tcOrderedPct}%`,
      `${d.usgOrderedPct}%`,
      `${d.convertedToAdmissionPct}% (${d.convertedToAdmissionCount})`,
      d.firstAttendMeanConsultMin,
      d.firstAttendMeanLosMin,
      d.firstAttendMedianLosMin,
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
  // ABA 7: MATRIZ CID x THROUGHPUT, CLUSTERS, ASSERTIVIDADE (CHAA 3704) & RETORNO <48H
  // --------------------------------------------------------------------------
  const dg = vsm.diagnosticGovernance;
  const rv = vsm.returnVisits;

  const sheet7: unknown[][] = [
    ['MATRIZ CID x ROTA DE THROUGHPUT (AUDITORIA DE PERTINÊNCIA PROPEDÊUTICA POR DIAGNÓSTICO)'],
    [
      'Diagnóstico (CID)',
      'Cluster Sindrômico',
      'Volume Total (N)',
      '% do PS',
      'Rota 1: Alta Direta no 1º Atend (N e %)',
      'Rota 2: Fast Reav / Só Medicação (N e %)',
      'Rota 3: Giro de Exames Lab/Imagem c/ Alta (N e %)',
      'Rota 4: Internação Hospitalar (N e %)',
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
    ['% Sub-ramo B1: Fast Reav (Apenas Medicação)', ...sorted.map((m) => `${m.vsm.monthlyOverall.fastReavMedOnlyPct}% (${m.vsm.monthlyOverall.fastReavMedOnlyCount})`)],
    ['% Sub-ramo B2: Giro Diagnóstico (Lab/Imagem)', ...sorted.map((m) => `${m.vsm.monthlyOverall.diagnosticExamsLoopPct}% (${m.vsm.monthlyOverall.diagnosticExamsLoopCount})`)],
    ['Espera Consolidada de Laudo (Lab/TC)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.waitLabReportStats))],
    ['Fila Invisível Pós-Laudo p/ Reavaliação', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.postReportReavalWaitStats))],
    ['Taxa de Handoff Interno (Troca de Médico)', ...sorted.map((m) => `${m.vsm.monthlyOverall.handoffDoctorPct}%`)],
    ['Taxa de Conversão em Internação (%)', ...sorted.map((m) => `${m.conversionRate}% (${m.totalAdmissions})`)],
    ['Boarding Total GERAL (Média ±DP | Mediana)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.totalBoardingStats))],
    ['Boarding Total ENFERMARIA (UI)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.uiBoardingStats))],
    ['Boarding Total UTI', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.utiBoardingStats))],
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