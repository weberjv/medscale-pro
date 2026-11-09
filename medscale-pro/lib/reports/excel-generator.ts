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

function autoFitColumns(rows: unknown[][], minW = 12, maxW = 54): XLSX.ColInfo[] {
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
// GERADOR DA ABA DE NOTA TÉCNICA, METODOLOGIA ANALÍTICA E AUDITORIA DE DADOS
// ============================================================================

function buildMethodologySheetAoA(data?: EmergencyAnalyticsData): unknown[][] {
  const periodInfo = data
    ? `Competência Auditada: ${data.periodLabel} | N = ${data.totalAttendances} atendimentos | CATE 3493: ${
        data.vsm.hasCate3493Data ? `Integrado (${data.vsm.matched3493Count} pac.)` : 'Não anexado'
      } | CHAA 3704: ${data.vsm.hasChaa3704Data ? `Integrado (${data.vsm.matched3704Count} pac.)` : 'Não anexado'}`
    : 'Auditoria Multimensal Consolidada (MoM)';

  return [
    ['ANEXO TÉCNICO — MEMORIAL METODOLÓGICO, RASTREABILIDADE DE FÓRMULAS E GOVERNANÇA DE DADOS (AUDITORIA EXECUTIVA)'],
    [periodInfo],
    [],
    ['1. ARQUITETURA DE FUSÃO DETERMINÍSTICA E FONTES PRIMÁRIAS DO SISTEMA HOSPITALAR (HIS / TASY)'],
    ['Componente / Relatório', 'Chave Primária de Cruzamento', 'Escopo e Filtro Populacional', 'Variáveis Extraídas e Papel Analítico'],
    [
      '1.1. Relatório CATE 3333 (Base Mestra Obrigatória)',
      'Coluna [Atendimento] (ID numérico único da passagem)',
      'Filtro estrito: [Setor] contendo "PS ADULTO" e [Clínica] contendo "MEDICA" (normalizado sem acentos)',
      'Timestamps de Entrada, Recepção, Consulta, Medicação, Coleta/Laudo Lab, RX, TC, USG, Data Desfecho, Data Internação (Leito Virtual), Médico Anamnese, Médico Último Atend, CID, Convênio e DT Últ Passagem PS.',
    ],
    [
      '1.2. Relatório CATE 3493 (Boarding Físico & Desfecho Hospitalar)',
      'Left Join determinístico 1:1: [CATE 3333.Atendimento] === [CATE 3493.Nr atendimento]',
      'Pacientes oriundos da emergência com solicitação e alocação de leito hospitalar',
      'Extrai [Dt ent aguard] (início do aguardo), [Dt ent unid] (subida física ao leito), [Ds setor unid] (UI vs UTI real, diferenciando de "Leito de Espera"), [Dif aguardando/Ent. Unid], [Cc] (Centro Cirúrgico S/N) e [Tempo permanencia] (dias).',
    ],
    [
      '1.3. Relatório CHAA 3704 (Governança Clínica & Assertividade CID)',
      'Left Join determinístico 1:1: [CATE 3333.Atendimento] === [CHAA 3704.Atendimento]',
      'Pacientes internados via Pronto-Socorro com registro duplo de CID',
      'Extrai [Diag entrada] (hipótese diagnóstica na porta do PS) e [Diag saida] (diagnóstico consolidado no ato da solicitação de internação pós-propedêutica).',
    ],
    [],
    ['2. CONFORMIDADE COM A LGPD (LEI Nº 13.709/2018) E PROCESSAMENTO STATELESS (ZERO PERSISTÊNCIA DE PII)'],
    ['Diretriz de Segurança', 'Regra Técnica Implementada no Código', 'Garantia de Auditoria Institucional'],
    [
      '2.1. Descarte Imediato em RAM (Drop PII)',
      'As colunas [Paciente], [Nm paciente], [Nome], [Email], [Endereço], [Numero], [bairro], [Dt. Nascimento] e [Dt nasc] nunca são lidas nem armazenadas nos objetos TypeScript.',
      'Impossibilidade técnica de vazamento de dados sensíveis de pacientes nos relatórios Excel, PDF ou PNG exportados.',
    ],
    [
      '2.2. Execução 100% Client-Side (Navegador Local)',
      'A leitura do ArrayBuffer (.xls/.xlsx) e os cálculos matriciais ocorrem exclusivamente na memória RAM local da estação de trabalho do gestor.',
      'Nenhum arquivo bruto do hospital trafega pela rede ou fica salvo em banco de dados externo.',
    ],
    [],
    ['3. DICIONÁRIO DE FÓRMULAS MATEMÁTICAS E REGRAS DE NEGÓCIO (COMO CADA INDICADOR É CALCULADO)'],
    ['Indicador / Nó do VSM', 'Fórmula Matemática / Regra Lógica Exata', 'Colunas Fontes Utilizadas', 'Interpretação Gerencial e Operacional'],
    [
      '3.1. Classificação de Turno (Diurno vs. Noturno)',
      'Diurno: 07h00min00s <= Hora(Entrada) <= 18h59min59s | Noturno: 19h00min00s <= Hora(Entrada) <= 06h59min59s',
      'Coluna [Entrada] do CATE 3333',
      'Respeita exatamente a grade de plantão de 12 horas da emergência (07h–19h e 19h–07h).',
    ],
    [
      '3.2. Ciclo Pré-Médico e Tempo Porta-Médico (SLA <= 20m)',
      'Fila Guichê = [Espera Recepção] | Cadastro = [Atend. Recepção] | Fila Pós-Recepção = [Esp. Recepção x Médico] | Porta-Médico Total = [Esp. Totem x Médico] (fallback para [Tempo Esp. Atend. Ficha x Médico])',
      'Colunas de recepção e porta do CATE 3333',
      'Separa atrasos administrativos de guichê do tempo real de espera pela chamada médica. SLA institucional avalia % de pacientes com Porta-Médico <= 20 min.',
    ],
    [
      '3.3. Ramo A: Alta Direta no 1º Atendimento (Single-Touch)',
      'Internado != "S" AND Evasão == Falso AND Sem Medicação AND Sem Lab AND Sem RX AND Sem TC AND Sem USG',
      '[Internado], [MOTIVO_ALTA], [Espera Medicamento], [Tempo ADM Medicamento], [Exame Laboratório], [Espera RX], [Espera TC], [Espera USG]',
      'Mede a resolutividade imediata de consultório (pacientes resolvidos em toque único sem consumir poltrona de medicação ou exames complementares).',
    ],
    [
      '3.4. Ramo B: Giro Propedêutico e Terapêutico Total',
      'Pacientes com acionamento de pelo menos 1 recurso interno: (HasMed OR HasLab OR HasRX OR HasTC OR HasUSG) == Verdadeiro',
      'Mesmas colunas de recursos diagnósticos e terapêuticos do CATE 3333',
      'Representa o volume real que permanece circulando internamente no PS após os minutos iniciais da anamnese.',
    ],
    [
      '3.5. Sub-Ramo B1: Fast Reav (Giro Terapêutico — Só Medicação)',
      'HasMed == Verdadeiro AND HasLab == Falso AND HasRX == Falso AND HasTC == Falso AND HasUSG == Falso',
      '[Espera Medicamento], [Tempo ADM Medicamento] vs. colunas de Lab/Imagem',
      'Isola os pacientes que receberam apenas medicação/analgesia sem depender de laudos externos. São os candidatos diretos à frente de Reavaliação Rápida (Fast Reav) para giro de poltronas e ganho de NPS.',
    ],
    [
      '3.6. Sub-Ramo B2: Giro Diagnóstico (Com Exames Lab/Imagem)',
      '(HasLab OR HasRX OR HasTC OR HasUSG) == Verdadeiro (independentemente de terem recebido medicação concomitante)',
      '[Exame Laboratório], [Dt Laudo Lab], [Espera RX], [Espera TC], [Dt Laudo TC], [Espera USG], [Dt Laudo Usg]',
      'Isola os pacientes cujo tempo de permanência depende do ciclo de coleta/execução e liberação de laudo de apoio diagnóstico.',
    ],
    [
      '3.7. Fila Invisível Pós-Laudo p/ Reavaliação Médica',
      'Delta_T = [Data Desfecho] - Máximo([Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]), contabilizado quando 0 <= Delta_T <= 720 min',
      '[Data Desfecho], [Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]',
      'Mede o tempo exato em que o paciente já está com todos os exames laudados no sistema, aguardando apenas a reavaliação médica para definição de alta ou internação.',
    ],
    [
      '3.8. Pedágio de Handoff (Troca de Médico Anamnese vs. Fechamento)',
      'Mesmo Médico: Upper(Trim([Medico Anamnese])) === Upper(Trim([Médico Último Atend])) | Handoff (Troca): Quando os profissionais diferem.',
      '[Medico Anamnese], [Médico Último Atend], [Qt Minutos Entrada- Desfecho]',
      'Quantifica o impacto na mediana e na média de permanência quando o paciente não é finalizado pelo mesmo plantonista que o atendeu na porta.',
    ],
    [
      '3.9. Decomposição do Boarding Hospitalar em 2 Etapas',
      'Etapa 1 (Aprovação Plano / Leito Virtual): [Espera Internação] ou ([Data Internação] - [Dt ent aguard]) | Etapa 2 (Subida Física UI/UTI): ([Dt ent unid] - [Data Internação]) quando [Ds setor unid] != "Leito de Espera" | Boarding Total Real: [Dif aguardando/Ent. Unid] do CATE 3493.',
      '[Data Internação], [Espera Internação] (3333) + [Dt ent aguard], [Dt ent unid], [Ds setor unid], [Dif aguardando/Ent. Unid] (3493)',
      'Separa a retenção burocrática/operadora (até a criação do leito virtual) da retenção física hospitalar (até a saída física da maca do PS para o andar ou UTI).',
    ],
    [
      '3.10. Algoritmo de Censo Simultâneo Horário e Heatmap 24x7 (Sonda Temporal)',
      'Para cada dia d do mês e cada hora h (07h às 06h), posiciona-se uma sonda exata em t_probe = d + h + 30min. Cada paciente presente no PS nesse minuto é classificado em: (1) Porta se t_Entrada <= t_probe < t_Fim1aConsulta; (2A) Fast Reav se t_Fim1aConsulta <= t_probe < t_Desfecho e Só Medicação; (2B) Giro Exames se t_Fim1aConsulta <= t_probe < t_Desfecho e Com Exames; (3) Boarding se Internado e t_Desfecho <= t_probe < t_SaidaUnidadeFisica.',
      '[Entrada], [Esp. Totem x Médico], [Atend. Médico], [Data Desfecho], [Data Internação], [Dt ent unid]',
      'Reconstrói a lotação real simultânea dentro do PS a cada hora, provando matematicamente o efeito acumulativo ("bola de neve") sobre a equipe médica e de enfermagem.',
    ],
    [
      '3.11. Eficiência do Ciclo de Processo Lean (PCE — Process Cycle Efficiency)',
      'VA (Valor Agregado) = Média(Cadastro Recepção) + Média(1ª Consulta) + Média(Infusão Med) + 12m (Reavaliação/Decisão) | NVA (Não Valor Agregado) = Fila Totem + Fila Porta-Médico + Fila Coleta Lab + Espera Laudo Lab + Fila Pós-Laudo | PCE (%) = [VA / (VA + NVA)] * 100',
      'Médias auditadas das micro-etapas do CATE 3333',
      'Métrica padrão Lean Healthcare que demonstra qual fração da jornada do paciente corresponde a cuidado assistencial ativo versus espera sistêmica.',
    ],
    [
      '3.12. Governança Diagnóstica (CHAA 3704) e Retorno Precoce (<48h e <72h)',
      'Concordância Exata: Código CID Entrada === Código CID Saída | Refinamento Fisiopatológico: Mesmo Capítulo CID (letra inicial igual ou evolução de código R/Z para etiológico) | Mudança de Capítulo: Letras iniciais distintas. Retorno Precoce: 0.5h < ([Entrada] - [DT Últ Passagem PS]) <= 48h (ou 72h).',
      '[Diag entrada], [Diag saida] (CHAA 3704) e [Entrada], [DT Últ Passagem PS], [Internado] (CATE 3333)',
      'Audita a evolução diagnóstica entre a porta e a internação e monitora a segurança da alta através da taxa de retorno precoce e conversão no retorno.',
    ],
    [],
    ['4. SANEAMENTO ESTATÍSTICO, TRATAMENTO DE OUTLIERS E RIGOR MATEMÁTICO'],
    ['Regra de Qualidade de Dados', 'Parâmetro / Limite Técnico Aplicado', 'Justificativa Estatística'],
    [
      '4.1. Expurgo de Tempos Negativos',
      'Qualquer micro-etapa com valor < 0 min é convertida em nulo (NaN) apenas naquela micro-etapa, mantendo o atendimento na contagem volumétrica global.',
      'Evita que lançamentos retroativos manuais no prontuário distorçam artificialmente a média para baixo.',
    ],
    [
      '4.2. Tetos de Segurança Operacional (Capping)',
      'Recepção/Consulta <= 240 min | Porta-Médico/Coleta/RX <= 600 min | Laudos/TC/USG <= 1.440 min | Permanência Geral <= 2.880 min | Boarding <= 4.320 min (e teto de 48h no censo simultâneo).',
      'Impede que fichas esquecidas abertas no sistema por vários dias contaminem o desvio-padrão e a ocupação horária.',
    ],
    [
      '4.3. Exposição Multivariada Completa',
      'Todos os tempos são reportados simultaneamente com: N válido, Média Aritmética, Desvio-Padrão Populacional (±DP), Mediana (P50), Percentil 90 (P90) e Amplitude [Mín–Máx].',
      'Como tempos hospitalares possuem distribuição assimétrica à direita (cauda longa), a exibição conjunta de Média (±DP) e Mediana (P90) garante transparência absoluta contra questionamentos.',
    ],
  ];
}

// ============================================================================
// GERADOR PRINCIPAL DO DOSSIÊ EXECUTIVO EM EXCEL (.XLSX — 8 ABAS COMPLETAS)
// ============================================================================

export function generateEmergencyExcel(data: EmergencyAnalyticsData): void {
  const wb = XLSX.utils.book_new();
  const vsm = data.vsm;
  const m = vsm.monthlyOverall;

  // --------------------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO & KPIS GERAIS (POR TURNO E DISPERSÃO COMPLETA)
  // --------------------------------------------------------------------------
  const sheet1: unknown[][] = [
    ['MEDSCALE PRO — DOSSIÊ EXECUTIVO DE INTELIGÊNCIA OPERACIONAL, JORNADA DO PACIENTE & VSM (LEAN HEALTHCARE)'],
    [
      `Competência: ${data.periodLabel}`,
      `Arquivo Base: ${data.fileName}`,
      `Dias Analisados: ${data.totalDays}`,
      `CATE 3493 (Boarding Físico): ${vsm.hasCate3493Data ? `Integrado (${vsm.matched3493Count} pac.)` : 'Não anexado (Apenas Leito Virtual 3333)'}`,
      `CHAA 3704 (CID Entrada x Saída): ${vsm.hasChaa3704Data ? `Integrado (${vsm.matched3704Count} pac.)` : 'Não anexado'}`,
    ],
    [],
    ['1. INDICADORES VOLUMÉTRICOS E DESFECHOS MACRO'],
    ['Indicador Executivo', 'Valor Absoluto (N)', 'Participação (%)', 'Referência / Observação Operacional'],
    ['Volume Total de Atendimentos (PS Adulto - Clínica Médica)', data.totalAttendances, '100,0%', `${data.dailyVolume.overall.mean}/dia (±${data.dailyVolume.overall.stdDev}) | Mediana: ${data.dailyVolume.overall.median}/dia`],
    ['Atendimentos no Plantão Diurno (07h00 às 18h59)', data.dailySeries.reduce((a, b) => a + b.dayShift, 0), `${((data.dailySeries.reduce((a, b) => a + b.dayShift, 0) / Math.max(data.totalAttendances, 1)) * 100).toFixed(1)}%`, `Média Diurna: ${data.dailyVolume.dayShift.mean}/dia (±${data.dailyVolume.dayShift.stdDev}) | Mediana: ${data.dailyVolume.dayShift.median}`],
    ['Atendimentos no Plantão Noturno (19h00 às 06h59)', data.dailySeries.reduce((a, b) => a + b.nightShift, 0), `${((data.dailySeries.reduce((a, b) => a + b.nightShift, 0) / Math.max(data.totalAttendances, 1)) * 100).toFixed(1)}%`, `Média Noturna: ${data.dailyVolume.nightShift.mean}/dia (±${data.dailyVolume.nightShift.stdDev}) | Mediana: ${data.dailyVolume.nightShift.median}`],
    ['Ramo A — Alta Direta no 1º Atendimento (Sem Exames/Medicação)', m.directDischargeCount, `${m.directDischargePct}%`, `Resolução Single-Touch | Permanência Média: ${m.directDischargeLosStats.mean}m (Med: ${m.directDischargeLosStats.median}m)`],
    ['Ramo B — Giro Propedêutico / Terapêutico Interno (Exames e/ou Medicação)', m.propaedeuticLoopCount, `${m.propaedeuticLoopPct}%`, `Permanência Média: ${m.propaedeuticLoopLosStats.mean}m (Med: ${m.propaedeuticLoopLosStats.median}m)`],
    ['   • Sub-ramo B1: Fast Reav / Giro Terapêutico (Apenas Medicação, sem Exames)', m.fastReavMedOnlyCount, `${m.fastReavMedOnlyPct}%`, `Candidatos a Fast Reav | Permanência Média: ${m.fastReavMedOnlyLosStats.mean}m (Med: ${m.fastReavMedOnlyLosStats.median}m)`],
    ['   • Sub-ramo B2: Giro Diagnóstico (Laboratório e/ou Imagem RX/TC/USG)', m.diagnosticExamsLoopCount, `${m.diagnosticExamsLoopPct}%`, `Dependentes de Laudo Externo | Permanência Média: ${m.diagnosticExamsLoopLosStats.mean}m (Med: ${m.diagnosticExamsLoopLosStats.median}m)`],
    ['Alta Pós-Propedêutica / Reavaliação Médica', m.postPropDischargeCount, `${m.postPropDischargePct}%`, `Permanência Média: ${m.postPropDischargeLosStats.mean}m (Med: ${m.postPropDischargeLosStats.median}m)`],
    ['Internações Hospitalares Totais (Conversão da Porta)', data.totalAdmissions, `${data.conversionRate}%`, `UI (Enfermaria): ${data.uiAdmissions} (${m.admittedUiPct}%) | UTI: ${data.utiAdmissions} (${m.admittedUtiPct}%)`],
    ['Evasões / Desistências Totais', data.evasionCount, `${data.evasionRate}%`, `Pré-Médico (Porta): ${m.preMedEvasionCount} (${m.preMedEvasionPct}%) | Pós-Consulta: ${m.postConsultEvasionCount} (${m.postConsultEvasionPct}%)`],
    ['Atendimentos Dentro da Meta Porta-Médico (<= 20 min)', data.withinSlaDoorToDocCount, `${data.withinSlaDoorToDocRate}%`, 'Meta Institucional de Acolhimento Médico <= 20 min'],
    ['Horas-Leito de Emergência Consumidas em Boarding de Internação', `${vsm.wastedBedHoursInBoarding} h`, `${(vsm.wastedBedHoursInBoarding / 24).toFixed(1)} leitos-dia`, 'Sobrecarga assistencial retida na emergência aguardando convênio/vaga física'],
    ['Eficiência de Ciclo do Processo Lean (PCE = Valor Agregado / Tempo Total)', `${m.pceEfficiencyPct}%`, `${(100 - m.pceEfficiencyPct).toFixed(1)}% Espera (NVA)`, `Tempo Valor Agregado (VA): ${m.vaMinutesMean}m vs. Esperas/Desperdício (NVA): ${m.nvaMinutesMean}m`],
    [],
    ['2. TEMPOS OPERACIONAIS E SLAS POR TURNO (MÉDIA, DESVIO-PADRÃO, MEDIANA, P90 E AMPLITUDE MÍN–MÁX)'],
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
    ],
  ];

  const timeMetricsRows: [string, MetricStats, MetricStats, MetricStats][] = [
    ['1. Fila Totem -> Guichê Recepção', m.waitTotemToRecepStats, vsm.byShift.day.waitTotemToRecepStats, vsm.byShift.night.waitTotemToRecepStats],
    ['2. Tempo de Cadastro / Abertura de Ficha na Recepção', m.recepRegistrationStats, vsm.byShift.day.recepRegistrationStats, vsm.byShift.night.recepRegistrationStats],
    ['3. Fila Pós-Recepção -> 1º Atendimento Médico', m.waitRecepToDocStats, vsm.byShift.day.waitRecepToDocStats, vsm.byShift.night.waitRecepToDocStats],
    ['4. Tempo Porta-Médico Total (Totem -> Médico)', data.doorToDoctor.overall, data.doorToDoctor.dayShift, data.doorToDoctor.nightShift],
    ['5. Tempo de Consulta Médica Inicial (Anamnese)', data.consultTime.overall, data.consultTime.dayShift, data.consultTime.nightShift],
    ['6. Espera para Início da Medicação (Prescrição -> Checagem)', data.medicationWait.overall, data.medicationWait.dayShift, data.medicationWait.nightShift],
    ['7. Tempo de Administração / Infusão de Medicação', data.medicationAdmTime.overall, data.medicationAdmTime.dayShift, data.medicationAdmTime.nightShift],
    ['8. Espera Laboratório (Prescrição -> Coleta/Execução)', data.labWait.overall, data.labWait.dayShift, data.labWait.nightShift],
    ['9. Tempo de Laudo Laboratorial (Coleta -> Liberação Laudo)', data.labReportWait.overall, data.labReportWait.dayShift, data.labReportWait.nightShift],
    ['10. Espera Raio-X (Prescrição -> Execução RX)', data.rxWait.overall, data.rxWait.dayShift, data.rxWait.nightShift],
    ['11. Ciclo Total de Tomografia - TC (Prescrição -> Laudo)', data.tcWait.overall, data.tcWait.dayShift, data.tcWait.nightShift],
    ['12. Ciclo de Ultrassonografia - USG', m.waitUsgTotalStats, vsm.byShift.day.waitUsgTotalStats, vsm.byShift.night.waitUsgTotalStats],
    ['13. Fila Invisível Pós-Laudo p/ Reavaliação (Desfecho - Último Laudo)', m.postReportReavalWaitStats, vsm.byShift.day.postReportReavalWaitStats, vsm.byShift.night.postReportReavalWaitStats],
    ['14. Permanência Total — Alta Direta no 1º Atendimento (Ramo A)', m.directDischargeLosStats, vsm.byShift.day.directDischargeLosStats, vsm.byShift.night.directDischargeLosStats],
    ['15. Permanência Total — Fast Reav (Apenas Medicação, sem Exames)', m.fastReavMedOnlyLosStats, vsm.byShift.day.fastReavMedOnlyLosStats, vsm.byShift.night.fastReavMedOnlyLosStats],
    ['16. Permanência Total — Giro Diagnóstico (Com Exames Lab/Imagem)', m.diagnosticExamsLoopLosStats, vsm.byShift.day.diagnosticExamsLoopLosStats, vsm.byShift.night.diagnosticExamsLoopLosStats],
    ['17. Permanência Geral no PS (Todos os Pacientes: Porta -> Desfecho)', data.losOverall.overall, data.losOverall.dayShift, data.losOverall.nightShift],
    ['18. Permanência Geral — Mesmo Médico (Sem Handoff)', m.sameDoctorLosStats, vsm.byShift.day.sameDoctorLosStats, vsm.byShift.night.sameDoctorLosStats],
    ['19. Permanência Geral — Com Troca de Médico (Pedágio de Handoff)', m.handoffDoctorLosStats, vsm.byShift.day.handoffDoctorLosStats, vsm.byShift.night.handoffDoctorLosStats],
    ['20. Boarding Etapa 1 (Desfecho Médico -> Leito Virtual / Aprovação Plano)', m.t1DecisionToVirtualBedStats, vsm.byShift.day.t1DecisionToVirtualBedStats, vsm.byShift.night.t1DecisionToVirtualBedStats],
    ['21. Boarding Etapa 1B (Abertura Aguardo 3493 -> Leito Virtual)', m.t1AguardoToVirtualBedStats, vsm.byShift.day.t1AguardoToVirtualBedStats, vsm.byShift.night.t1AguardoToVirtualBedStats],
    ['22. Boarding Etapa 2 (Leito Virtual -> Subida Física Leito Definitivo UI/UTI)', m.t2VirtualToPhysicalBedStats, vsm.byShift.day.t2VirtualToPhysicalBedStats, vsm.byShift.night.t2VirtualToPhysicalBedStats],
    ['23. Boarding Total Real na Emergência (Solicitação/Aguardo -> Leito Físico Unid)', m.totalBoardingStats, vsm.byShift.day.totalBoardingStats, vsm.byShift.night.totalBoardingStats],
  ];

  for (const [label, stAll, stDay, stNight] of timeMetricsRows) {
    sheet1.push([
      label,
      stAll.count,
      stAll.mean,
      stAll.stdDev,
      stAll.median,
      stAll.p90,
      `${stAll.min} – ${stAll.max}`,
      `${stDay.mean} (±${stDay.stdDev})`,
      `${stDay.median} (P90: ${stDay.p90})`,
      `${stNight.mean} (±${stNight.stdDev})`,
      `${stNight.median} (P90: ${stNight.p90})`,
    ]);
  }

  appendSheetFromAoA(wb, '1_Resumo_Geral_KPIs', sheet1);

  // --------------------------------------------------------------------------
  // ABA 2: MAPA DA JORNADA DO PACIENTE & VSM MULTIDIMENSIONAL (MÊS, TURNO, SEMANA, DIA)
  // --------------------------------------------------------------------------
  const slices: VsmSliceMetrics[] = [
    vsm.monthlyOverall,
    vsm.byShift.day,
    vsm.byShift.night,
    ...Object.values(vsm.byWeekOfMonth),
    ...WEEKDAY_NAMES.map((d) => vsm.byDayOfWeek[d]).filter(Boolean),
  ];

  const sheet2: unknown[][] = [
    ['MAPA COMPLETO DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM) — COMPARATIVO MULTIDIMENSIONAL'],
    ['Métrica / Nó da Jornada Lean (Input -> Throughput -> Output -> Boarding)', ...slices.map((s) => s.label)],
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
    ['2. BIFURCAÇÃO DE THROUGHPUT (RAMO A vs. RAMO B E SUB-ROTAS)'],
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
    ['   • Tempo até Liberação do Laudo Lab (min)', ...slices.map((s) => fmtStatFull(s.waitLabReportStats))],
    ['Pacientes com Raio-X - RX (N e %)', ...slices.map((s) => `${s.rxCount} (${s.rxPct}%)`)],
    ['   • Tempo Prescrição -> Execução RX (min)', ...slices.map((s) => fmtStatFull(s.waitRxExecStats))],
    ['Pacientes com Tomografia - TC (N e %)', ...slices.map((s) => `${s.tcCount} (${s.tcPct}%)`)],
    ['   • Ciclo Total TC: Prescrição -> Laudo (min)', ...slices.map((s) => fmtStatFull(s.waitTcTotalStats))],
    ['Pacientes com Ultrassonografia - USG (N e %)', ...slices.map((s) => `${s.usgCount} (${s.usgPct}%)`)],
    ['   • Ciclo Total USG (min)', ...slices.map((s) => fmtStatFull(s.waitUsgTotalStats))],
    [],
    ['4. GARGALOS OCULTOS: FILA INVISÍVEL PÓS-LAUDO & PEDÁGIO DE HANDOFF (TROCA DE MÉDICO)'],
    ['Fila Invisível Pós-Laudo p/ Reavaliação (Desfecho - Último Laudo Lab/TC)', ...slices.map((s) => fmtStatFull(s.postReportReavalWaitStats))],
    ['Atendimentos Conduzidos pelo Mesmo Médico do Início ao Fim (N e %)', ...slices.map((s) => `${s.sameDoctorCount} (${s.sameDoctorPct}%)`)],
    ['   • Permanência com Mesmo Médico (Sem Handoff)', ...slices.map((s) => fmtStatFull(s.sameDoctorLosStats))],
    ['Atendimentos com Troca de Médico entre Anamnese e Desfecho (Handoff N e %)', ...slices.map((s) => `${s.handoffDoctorCount} (${s.handoffDoctorPct}%)`)],
    ['   • Permanência com Troca de Médico (Com Handoff)', ...slices.map((s) => fmtStatFull(s.handoffDoctorLosStats))],
    [],
    ['5. OUTPUTS FINAIS, INTERNAÇÃO E DECOMPOSIÇÃO DO BOARDING REAL'],
    ['Alta Pós-Propedêutica / Reavaliação (N e %)', ...slices.map((s) => `${s.postPropDischargeCount} (${s.postPropDischargePct}%)`)],
    ['   • Permanência Total nas Altas Pós-Propedêutica', ...slices.map((s) => fmtStatFull(s.postPropDischargeLosStats))],
    ['Evasão / Desistência Pós-Consulta (N e %)', ...slices.map((s) => `${s.postConsultEvasionCount} (${s.postConsultEvasionPct}%)`)],
    ['Internações Hospitalares Totais (N e % sobre a Porta)', ...slices.map((s) => `${s.admittedTotalCount} (${s.admittedTotalPct}%)`)],
    ['   • Internações em Enfermaria / UI (N e % dos Internados)', ...slices.map((s) => `${s.admittedUiCount} (${s.admittedUiPct}%)`)],
    ['   • Internações em UTI (N e % dos Internados)', ...slices.map((s) => `${s.admittedUtiCount} (${s.admittedUtiPct}%)`)],
    ['   • Internações Diretas (Sem Exames/Med na Porta) vs. Pós-Propedêutica', ...slices.map((s) => `Direta: ${s.admittedDirectNoPropCount} | Pós-Exames: ${s.admittedWithPropCount}`)],
    ['   • Etapa 1 (Desfecho Médico -> Leito Virtual / Aprovação do Plano)', ...slices.map((s) => fmtStatFull(s.t1DecisionToVirtualBedStats))],
    ['   • Etapa 1B (Abertura Aguardo 3493 -> Leito Virtual / Aprovação do Plano)', ...slices.map((s) => fmtStatFull(s.t1AguardoToVirtualBedStats))],
    ['   • Etapa 2 (Leito Virtual -> Subida Física ao Leito Definitivo UI/UTI)', ...slices.map((s) => fmtStatFull(s.t2VirtualToPhysicalBedStats))],
    ['   • Boarding Total na Emergência (Aguardo -> Entrada Física Unidade)', ...slices.map((s) => fmtStatFull(s.totalBoardingStats))],
    ['   • Boarding Total — Pacientes de Enfermaria (UI)', ...slices.map((s) => fmtStatFull(s.uiBoardingStats))],
    ['   • Boarding Total — Pacientes de UTI', ...slices.map((s) => fmtStatFull(s.utiBoardingStats))],
    [],
    ['6. LINHA DO TEMPO LEAN (VALOR AGREGADO vs. DESPERDÍCIO / ESPERA)'],
    ['Tempo Médio de Valor Agregado - VA (Atendimento Ativo)', ...slices.map((s) => `${s.vaMinutesMean} min`)],
    ['Tempo Médio de Não Valor Agregado - NVA (Filas e Esperas)', ...slices.map((s) => `${s.nvaMinutesMean} min`)],
    ['Eficiência de Ciclo do Processo Lean (PCE = VA / Ciclo Total)', ...slices.map((s) => `${s.pceEfficiencyPct}%`)],
  ];

  appendSheetFromAoA(wb, '2_Jornada_VSM_Lean', sheet2);

  // --------------------------------------------------------------------------
  // ABA 3: CENSO OCUPACIONAL SIMULTÂNEO & HEATMAPS 24x7 (PORTA, FAST REAV, EXAMES, BOARDING)
  // --------------------------------------------------------------------------
  const sheet3: unknown[][] = [
    ['CENSO OCUPACIONAL SIMULTÂNEO POR HORA (07h ÀS 06h) — DIMENSIONAMENTO DE ESCALA POR FRENTE DE TRABALHO'],
    [
      'Faixa Horária',
      'Chegadas Novas na Porta (Média/h)',
      'Chegadas Novas (Mediana/h)',
      '1. Porta / 1º Atendimento (Média Simultânea)',
      '2A. Fast Reav: Só Medicação (Média Simultânea)',
      '2B. Giro Diagnóstico: Lab/Imagem/Reaval (Média Simultânea)',
      '3. Boarding de Internação UI/UTI (Média Simultânea)',
      'CENSO SIMULTÂNEO TOTAL NO PS (Média)',
      'CENSO SIMULTÂNEO (Mediana)',
      'PICO MÁXIMO SIMULTÂNEO NO MÊS',
    ],
  ];

  for (const pt of vsm.hourlySimultaneousOverall) {
    sheet3.push([
      pt.label,
      pt.newArrivalsMean,
      pt.newArrivalsMedian,
      pt.portaMean,
      pt.fastReavMedMean,
      pt.giroExamesMean,
      pt.boardingMean,
      pt.totalSimultaneousMean,
      pt.totalSimultaneousMedian,
      pt.totalSimultaneousMax,
    ]);
  }

  sheet3.push([]);
  sheet3.push(['HEATMAP 24x7 DE CENSO SIMULTÂNEO TOTAL (LOTAÇÃO REAL DENTRO DO PS — MÉDIA ±DP | MEDIANA [MÍN–MÁX])']);
  sheet3.push(['Dia da Semana \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = vsm.censusHeatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `${c.totalMean.toFixed(1)} (±${c.totalStdDev.toFixed(1)}) | Med:${c.totalMedian.toFixed(1)} [${c.totalMin.toFixed(0)}–${c.totalMax.toFixed(0)}]`;
    });
    sheet3.push([WEEKDAY_NAMES[d], ...rowCells]);
  }

  sheet3.push([]);
  sheet3.push(['HEATMAP 24x7 ESTRATIFICADO POR FRENTE OPERACIONAL (PORTA | FAST REAV SÓ MED | GIRO EXAMES | BOARDING)']);
  sheet3.push(['Dia da Semana \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = vsm.censusHeatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `Tot:${c.totalMean.toFixed(1)} (P:${c.portaMean.toFixed(1)} | Med:${c.fastReavMedMean.toFixed(1)} | Ex:${c.giroExamesMean.toFixed(1)} | Int:${c.boardingMean.toFixed(1)})`;
    });
    sheet3.push([WEEKDAY_NAMES[d], ...rowCells]);
  }

  sheet3.push([]);
  sheet3.push(['HEATMAP 24x7 DE CHEGADAS NA PORTA (FICHAS ABERTAS — MÉDIA ±DP | MEDIANA [MÍN–MÁX] | TOTAL MENSAL)']);
  sheet3.push(['Dia da Semana \\ Faixa Horária', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`)]);

  for (let d = 0; d < 7; d++) {
    const rowCells = HOURS_7_TO_6.map((h) => {
      const c = data.heatmap24x7.find((x) => x.dayIndex === d && x.hour === h);
      if (!c) return '—';
      return `${c.mean.toFixed(1)} (±${c.stdDev.toFixed(1)}) | Med:${c.median.toFixed(1)} [${c.min}–${c.max}] | Σ=${c.totalCount}`;
    });
    sheet3.push([WEEKDAY_NAMES[d], ...rowCells]);
  }

  appendSheetFromAoA(wb, '3_Censo_Simultaneo_24x7', sheet3);

  // --------------------------------------------------------------------------
  // ABA 4: DECOMPOSIÇÃO DO BOARDING REAL & RANKING POR OPERADORA (CONVÊNIO)
  // --------------------------------------------------------------------------
  const sheet4: unknown[][] = [
    ['RAIO-X DO BOARDING HOSPITALAR E RETENÇÃO DE LEITOS POR OPERADORA DE SAÚDE (CATE 3333 + CATE 3493)'],
    [
      `Total de Internações: ${data.totalAdmissions}`,
      `Enfermaria (UI): ${data.uiAdmissions}`,
      `UTI: ${data.utiAdmissions}`,
      `Pacientes Cirúrgicos (Cc=S): ${vsm.surgicalAdmissionsCount} (${vsm.surgicalAdmissionsPct}%)`,
      `Permanência Hospitalar Média: ${vsm.hospitalStayDaysStats.mean} dias (Mediana: ${vsm.hospitalStayDaysStats.median}d)`,
      `Total Horas-Maca Perdidas em Boarding: ${vsm.wastedBedHoursInBoarding} horas`,
    ],
    [],
    [
      'Operadora / Convênio',
      'Internações (N)',
      '% das Internações',
      'UI (N)',
      'UTI (N)',
      'Centro Cirúrgico (Cc=S)',
      'Etapa 1: Solicitação -> Leito Virtual/Plano (Média ±DP)',
      'Etapa 1: Mediana (P90)',
      'Etapa 2: Leito Virtual -> Leito Físico UI/UTI (Média ±DP)',
      'Etapa 2: Mediana (P90)',
      'Boarding Total: Aguardo -> Leito Unidade (Média ±DP)',
      'Boarding Total: Mediana (P90 | Mín–Máx)',
      'Permanência Hospitalar (Dias: Média | Mediana)',
    ],
  ];

  for (const c of vsm.boardingByConvenio) {
    sheet4.push([
      c.convenio,
      c.admittedCount,
      `${c.pctOfAdmissions}%`,
      c.uiCount,
      c.utiCount,
      c.ccCount,
      c.t1VirtualApprovalStats.count > 0 ? `${c.t1VirtualApprovalStats.mean}m (±${c.t1VirtualApprovalStats.stdDev})` : '—',
      c.t1VirtualApprovalStats.count > 0 ? `${c.t1VirtualApprovalStats.median}m (P90: ${c.t1VirtualApprovalStats.p90}m)` : '—',
      c.t2PhysicalUploadStats.count > 0 ? `${c.t2PhysicalUploadStats.mean}m (±${c.t2PhysicalUploadStats.stdDev})` : '—',
      c.t2PhysicalUploadStats.count > 0 ? `${c.t2PhysicalUploadStats.median}m (P90: ${c.t2PhysicalUploadStats.p90}m)` : '—',
      c.totalBoardingStats.count > 0 ? `${c.totalBoardingStats.mean}m (±${c.totalBoardingStats.stdDev})` : '—',
      c.totalBoardingStats.count > 0
        ? `${c.totalBoardingStats.median}m (P90: ${c.totalBoardingStats.p90}m | ${c.totalBoardingStats.min}–${c.totalBoardingStats.max}m)`
        : '—',
      c.hospitalStayDaysStats.count > 0
        ? `${c.hospitalStayDaysStats.mean}d (Med: ${c.hospitalStayDaysStats.median}d)`
        : '—',
    ]);
  }

  appendSheetFromAoA(wb, '4_Boarding_e_Convenios', sheet4);

  // --------------------------------------------------------------------------
  // ABA 5: MATRIZ DUPLA DE CONDUTAS MÉDICAS (1º ATENDIMENTO vs. FECHAMENTO)
  // --------------------------------------------------------------------------
  const sheet5: unknown[][] = [
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
    sheet5.push([
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

  appendSheetFromAoA(wb, '5_Condutas_Medicas_1eUlt', sheet5);

  // --------------------------------------------------------------------------
  // ABA 6: MATRIZ CID x THROUGHPUT, CLUSTERS, ASSERTIVIDADE (CHAA 3704) & RETORNO <48H
  // --------------------------------------------------------------------------
  const dg = vsm.diagnosticGovernance;
  const rv = vsm.returnVisits;

  const sheet6: unknown[][] = [
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
    sheet6.push([
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

  sheet6.push([]);
  sheet6.push(['AGRUPAMENTO POR CLUSTERS SINDRÔMICOS DA EMERGÊNCIA']);
  sheet6.push([
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
    sheet6.push([
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

  sheet6.push([]);
  sheet6.push(['GOVERNANÇA CLÍNICA & ASSERTIVIDADE DIAGNÓSTICA NA INTERNAÇÃO (CHAA 3704: CID ENTRADA vs. CID SAÍDA)']);
  sheet6.push([
    'Pacientes Internados Avaliados (CHAA 3704)',
    'Concordância Exata de CID (Entrada = Saída)',
    'Reclassificação Diagnóstica Total (Mudança de CID pós-exames)',
    '   • Refinamento Fisiopatológico (Mesmo Capítulo/Sistema)',
    '   • Mudança de Sistema / Capítulo Clínico (Discordância)',
    'LOS Médio nos Casos Concordantes vs. Reclassificados',
  ]);
  sheet6.push([
    dg.evaluatedAdmissionsCount,
    `${dg.exactMatchCount} (${dg.exactMatchPct}%)`,
    `${dg.reclassifiedCount} (${dg.reclassifiedPct}%)`,
    `${dg.sameChapterRefinementCount} (${dg.sameChapterRefinementPct}%)`,
    `${dg.crossChapterDiscordanceCount} (${dg.crossChapterDiscordancePct}%)`,
    `Concordantes: ${dg.meanLosExactMatch}m | Reclassificados: ${dg.meanLosReclassified}m`,
  ]);

  if (dg.topReclassifications.length > 0) {
    sheet6.push([]);
    sheet6.push(['PRINCIPAIS PARES DE RECLASSIFICAÇÃO DIAGNÓSTICA ENTRE A PORTA E A SOLICITAÇÃO DE INTERNAÇÃO']);
    sheet6.push(['Hipótese Inicial na Porta (Diag entrada)', 'Diagnóstico na Solicitação de Internação (Diag saida)', 'Casos (N)', 'Classificação de Governança']);
    for (const pair of dg.topReclassifications) {
      sheet6.push([pair.cidIn, pair.cidOut, pair.count, pair.classification]);
    }
  }

  sheet6.push([]);
  sheet6.push(['AUDITORIA DE RETORNO PRECOCE À EMERGÊNCIA (< 48 HORAS E < 72 HORAS)']);
  sheet6.push([
    'Retornos em <= 48h (N e % do PS)',
    'Internações no Retorno <= 48h (N e % Conversão)',
    'Retornos em <= 72h (N e % do PS)',
    'Internações no Retorno <= 72h (N e % Conversão)',
  ]);
  sheet6.push([
    `${rv.return48hCount} (${rv.return48hPct}%)`,
    `${rv.return48hAdmittedCount} (${rv.return48hAdmissionRate}% de internação no retorno)`,
    `${rv.return72hCount} (${rv.return72hPct}%)`,
    `${rv.return72hAdmittedCount} (${rv.return72hAdmissionRate}% de internação no retorno)`,
  ]);

  appendSheetFromAoA(wb, '6_CIDs_Rotas_e_Governanca', sheet6);

  // --------------------------------------------------------------------------
  // ABA 7: SÉRIE DIÁRIA COMPLETA, SEMANAS DO MÊS (S1–S5) E DIAS DA SEMANA
  // --------------------------------------------------------------------------
  const sheet7: unknown[][] = [
    ['CONSOLIDAÇÃO POR SEMANA DO MÊS (SEMANAS 1 A 5)'],
    ['Semana do Mês', 'Dias', 'Total Atendimentos', 'Média Diária', 'DP (±)', 'Mediana Diária', 'Porta-Médico Médio (min)', 'Permanência Média (min)', 'Internações (N)'],
  ];

  for (const w of data.weekOfMonthStats) {
    sheet7.push([w.weekLabel, w.daysCount, w.total, w.meanPerDay, w.stdDevPerDay, w.medianPerDay, w.meanDoorToDoc, w.meanLos, w.admissions]);
  }

  sheet7.push([]);
  sheet7.push(['CONSOLIDAÇÃO POR DIA DA SEMANA (SEGUNDA A DOMINGO)']);
  sheet7.push([
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
    sheet7.push([
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

  sheet7.push([]);
  sheet7.push(['SÉRIE HISTÓRICA DIÁRIA COMPLETA']);
  sheet7.push(['Data', 'Dia da Semana', 'Volume Total (24h)', 'Plantão Diurno (07h–18h59)', 'Plantão Noturno (19h–06h59)', 'Internações (N)', 'Porta-Médico Médio (min)', 'Permanência Média (min)']);

  for (const d of data.dailySeries) {
    sheet7.push([d.label, d.dayOfWeek, d.total, d.dayShift, d.nightShift, d.admissions, d.meanDoorToDoc, d.meanLos]);
  }

  appendSheetFromAoA(wb, '7_Serie_Diaria_e_Semanas', sheet7);

  // --------------------------------------------------------------------------
  // ABA 8: NOTA TÉCNICA, METODOLOGIA ANALÍTICA E GOVERNANÇA DE DADOS
  // --------------------------------------------------------------------------
  const sheet8 = buildMethodologySheetAoA(data);
  appendSheetFromAoA(wb, '8_Metodologia_e_Auditoria', sheet8);

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
    ['COMPARATIVO HISTÓRICO MULTIMENSAL (MOM) — INDICADORES DE PORTA, THROUGHPUT, VSM E BOARDING'],
    ['Indicador Estratégico', ...sorted.map((m) => m.periodLabel)],
    ['Volume Total Mensal (N)', ...sorted.map((m) => m.totalAttendances)],
    ['Média Diária (±DP)', ...sorted.map((m) => `${m.dailyVolume.overall.mean} (±${m.dailyVolume.overall.stdDev})`)],
    ['Mediana Diária [Mín–Máx]', ...sorted.map((m) => `${m.dailyVolume.overall.median} [${m.dailyVolume.overall.min}–${m.dailyVolume.overall.max}]`)],
    ['Tempo Porta-Médico: Média (±DP) | Mediana (P90)', ...sorted.map((m) => fmtStatFull(m.doorToDoctor.overall))],
    ['% Dentro da Meta Porta-Médico (<= 20 min)', ...sorted.map((m) => `${m.withinSlaDoorToDocRate}%`)],
    ['% Ramo A: Alta Direta no 1º Atendimento', ...sorted.map((m) => `${m.vsm.monthlyOverall.directDischargePct}% (${m.vsm.monthlyOverall.directDischargeCount})`)],
    ['% Sub-ramo B1: Fast Reav (Apenas Medicação)', ...sorted.map((m) => `${m.vsm.monthlyOverall.fastReavMedOnlyPct}% (${m.vsm.monthlyOverall.fastReavMedOnlyCount})`)],
    ['% Sub-ramo B2: Giro Diagnóstico (Lab/Imagem)', ...sorted.map((m) => `${m.vsm.monthlyOverall.diagnosticExamsLoopPct}% (${m.vsm.monthlyOverall.diagnosticExamsLoopCount})`)],
    ['Fila Invisível Pós-Laudo p/ Reavaliação (Média | Mediana)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.postReportReavalWaitStats))],
    ['Taxa de Handoff Interno (Troca de Médico)', ...sorted.map((m) => `${m.vsm.monthlyOverall.handoffDoctorPct}%`)],
    ['Taxa de Conversão em Internação (%)', ...sorted.map((m) => `${m.conversionRate}% (${m.totalAdmissions})`)],
    ['Boarding Total Real (Média ±DP | Mediana)', ...sorted.map((m) => fmtStatFull(m.vsm.monthlyOverall.totalBoardingStats))],
    ['Eficiência Lean do Processo (PCE %)', ...sorted.map((m) => `${m.vsm.monthlyOverall.pceEfficiencyPct}%`)],
  ];

  appendSheetFromAoA(wb, '1_Comparativo_Mensal_VSM', aoa);
  appendSheetFromAoA(wb, '2_Metodologia_e_Auditoria', buildMethodologySheetAoA());
  XLSX.writeFile(wb, `Comparativo_Multimensal_VSM_PS.xlsx`);
}

// Aliases de exportação para compatibilidade total
export const exportEmergencyExcel = generateEmergencyExcel;
export const downloadEmergencyExcel = generateEmergencyExcel;
export const exportComparisonExcel = generateComparisonExcel;