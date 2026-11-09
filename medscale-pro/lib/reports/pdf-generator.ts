import jsPDF from 'jspdf';
import {
  EmergencyAnalyticsData,
  MetricStats,
  VsmSliceMetrics,
} from '../analytics/emergency-parser';

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS_7_TO_6 = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

function fmtStatShort(st: MetricStats, unit = 'm'): string {
  if (!st || st.count === 0) return '—';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit}`;
}

// ============================================================================
// MOTOR NATIVO DE TABELAS VETORIAIS (ZERO DEPENDÊNCIAS EXTERNAS / 100% TIPADO)
// ============================================================================

interface CellStyleOverride {
  fillColor?: [number, number, number];
  textColor?: [number, number, number];
  fontStyle?: 'normal' | 'bold';
  halign?: 'left' | 'center' | 'right';
}

interface VectorTableOptions {
  startY: number;
  marginLeft?: number;
  tableWidth?: number;
  head: string[];
  body: (string | number)[][];
  colWidths?: number[];
  headFillColor?: [number, number, number];
  alternateRowFillColor?: [number, number, number];
  fontSize?: number;
  headFontSize?: number;
  rowHeight?: number;
  headHeight?: number;
  defaultHalign?: 'left' | 'center' | 'right';
  leftAlignCols?: number[];
  boldCols?: number[];
  cellStyler?: (rowIndex: number, colIndex: number, rawValue: string | number) => CellStyleOverride | null;
}

function fitTextToWidth(doc: jsPDF, text: string, maxWidthMm: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidthMm) return text;
  let trimmed = text;
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidthMm) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawVectorTable(doc: jsPDF, opts: VectorTableOptions): number {
  const marginLeft = opts.marginLeft ?? 10;
  const tableWidth = opts.tableWidth ?? 277;
  const colCount = Math.max(opts.head.length, 1);
  const fontSize = opts.fontSize ?? 6.2;
  const headFontSize = opts.headFontSize ?? fontSize;
  const rowHeight = opts.rowHeight ?? 4.5;
  const headHeight = opts.headHeight ?? 5.4;
  const headFill = opts.headFillColor ?? [15, 23, 42];
  const altFill = opts.alternateRowFillColor ?? [248, 250, 252];
  const defaultHalign = opts.defaultHalign ?? 'center';
  const leftCols = new Set(opts.leftAlignCols ?? [0]);
  const boldCols = new Set(opts.boldCols ?? [0]);

  let colWidths: number[];
  if (opts.colWidths && opts.colWidths.length === colCount) {
    const sumW = opts.colWidths.reduce((a, b) => a + b, 0);
    colWidths = opts.colWidths.map((w) => (w / sumW) * tableWidth);
  } else {
    colWidths = Array(colCount).fill(tableWidth / colCount);
  }

  let curY = opts.startY;

  // Cabeçalho
  doc.setFillColor(headFill[0], headFill[1], headFill[2]);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(marginLeft, curY, tableWidth, headHeight, 'FD');

  let curX = marginLeft;
  for (let c = 0; c < colCount; c++) {
    const cw = colWidths[c];
    const align: 'left' | 'center' | 'right' = leftCols.has(c) ? 'left' : defaultHalign;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(headFontSize);
    doc.setTextColor(255, 255, 255);

    const txt = fitTextToWidth(doc, String(opts.head[c] ?? ''), cw - 2.2);
    const tx = align === 'left' ? curX + 1.3 : align === 'right' ? curX + cw - 1.3 : curX + cw / 2;
    doc.text(txt, tx, curY + headHeight * 0.68, { align });
    curX += cw;
  }

  curY += headHeight;

  // Linhas do Corpo
  for (let r = 0; r < opts.body.length; r++) {
    const row = opts.body[r];
    let cellX = marginLeft;

    for (let c = 0; c < colCount; c++) {
      const cw = colWidths[c];
      const rawVal = row[c] ?? '';
      const customStyle = opts.cellStyler ? opts.cellStyler(r, c, rawVal) : null;

      const bg: [number, number, number] =
        customStyle?.fillColor ?? (r % 2 === 1 ? altFill : [255, 255, 255]);
      const fg: [number, number, number] = customStyle?.textColor ?? [15, 23, 42];
      const fStyle: 'normal' | 'bold' =
        customStyle?.fontStyle ?? (boldCols.has(c) ? 'bold' : 'normal');
      const align: 'left' | 'center' | 'right' =
        customStyle?.halign ?? (leftCols.has(c) ? 'left' : defaultHalign);

      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.18);
      doc.rect(cellX, curY, cw, rowHeight, 'FD');

      doc.setFont('helvetica', fStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(fg[0], fg[1], fg[2]);

      const txt = fitTextToWidth(doc, String(rawVal), cw - 2.0);
      const tx = align === 'left' ? cellX + 1.2 : align === 'right' ? cellX + cw - 1.2 : cellX + cw / 2;
      doc.text(txt, tx, curY + rowHeight * 0.68, { align });

      cellX += cw;
    }

    curY += rowHeight;
  }

  return curY;
}

// ============================================================================
// COMPONENTES VISUAIS VETORIAIS DO DOSSIÊ EXECUTIVO
// ============================================================================

function drawHeaderBanner(
  doc: jsPDF,
  title: string,
  subtitle: string,
  periodLabel: string,
  pageNum: number,
  totalPages: number
) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 18, 'F');

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 17.2, 297, 0.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(`MEDSCALE PRO  |  ${title}`, 10, 7.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(subtitle, 10, 13.5);

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(235, 3.2, 52, 11.5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`COMPETÊNCIA: ${periodLabel}`, 261, 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(147, 197, 253);
  doc.text(`Página ${pageNum} de ${totalPages} • LGPD Stateless`, 261, 12.5, { align: 'center' });
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  mainValue: string,
  subValue: string,
  accentRgb: [number, number, number]
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(x, y, 2.2, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4.5, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(mainValue, x + 4.5, y + 11.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(71, 85, 105);
  doc.text(subValue, x + 4.5, y + 16);
}

function drawVsmNodeBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  line1: string,
  line2: string,
  line3: string,
  line4: string,
  headerRgb: [number, number, number],
  bgRgb: [number, number, number],
  borderRgb: [number, number, number]
) {
  doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.roundedRect(x, y, w, 6.2, 1.5, 1.5, 'F');
  doc.rect(x, y + 3.2, w, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + w / 2, y + 4.3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(line1, x + w / 2, y + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text(line2, x + w / 2, y + 15.5, { align: 'center' });
  doc.text(line3, x + w / 2, y + 19.8, { align: 'center' });

  if (line4) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    doc.text(line4, x + w / 2, y + 24.2, { align: 'center' });
  }
}

function drawVectorArrow(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  rgb: [number, number, number]
) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.55);
  doc.line(x1, y1, x2, y2);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 2.2;
  const ax = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const ay = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const bx = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const by = y2 - headLen * Math.sin(angle + Math.PI / 6);
  doc.line(x2, y2, ax, ay);
  doc.line(x2, y2, bx, by);

  if (label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(label, (x1 + x2) / 2, (y1 + y2) / 2 - 1.5, { align: 'center' });
  }
}

// ============================================================================
// PÁGINA VETORIAL DE ANEXO METODOLÓGICO E GOVERNANÇA DE DADOS (PÁGINA 7)
// ============================================================================

function drawMethodologyAnnexPage(
  doc: jsPDF,
  periodLabel: string,
  pageNum: number,
  totalPages: number,
  data?: EmergencyAnalyticsData
) {
  drawHeaderBanner(
    doc,
    'ANEXO I — NOTA TÉCNICA, METODOLOGIA ANALÍTICA E GOVERNANÇA DE DADOS',
    'Memorial de Cálculo, Rastreabilidade Determinística de Fontes (HIS/Tasy), Regras Lean Healthcare e Conformidade LGPD',
    periodLabel,
    pageNum,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '1. ARQUITETURA DE FUSÃO DETERMINÍSTICA (1:1 POR Nº DE ATENDIMENTO) E PROTEÇÃO DE DADOS (LGPD STATELESS)',
    10,
    22.5
  );

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [48, 45, 58, 126],
    leftAlignCols: [0, 1, 2, 3],
    head: [
      'Fonte Primária / Diretriz',
      'Chave de Cruzamento (Join)',
      'Filtro / Regra de Escopo',
      'Variáveis Auditadas e Garantia de Integridade',
    ],
    body: [
      [
        '1.1. Relatório CATE 3333 (Master)',
        'Chave Primária: [Atendimento]',
        'Setor = "PS ADULTO" & Clínica = "MEDICA"',
        'Timestamps de Totem, Recepção, Consulta, Medicação, Lab, RX, TC, USG, Desfecho, Leito Virtual, Médicos (Anamnese/Último), CID e Últ. Passagem.',
      ],
      [
        '1.2. Relatório CATE 3493 (Boarding)',
        'Left Join 1:1: [Nr atendimento]',
        'Pacientes internados via Pronto-Socorro',
        'Extrai [Dt ent aguard], [Dt ent unid] (subida física real UI/UTI vs Leito Espera), [Dif aguardando/Ent. Unid], [Cc] (Cirúrgico) e [Tempo permanencia].',
      ],
      [
        '1.3. Relatório CHAA 3704 (CIDs)',
        'Left Join 1:1: [Atendimento]',
        'Internados com duplo registo diagnóstico',
        'Compara [Diag entrada] (hipótese diagnóstica inicial da porta) vs [Diag saida] (diagnóstico consolidado no ato da solicitação de internação).',
      ],
      [
        '1.4. Conformidade LGPD Stateless',
        'Processamento Local (RAM Browser)',
        'Descarte imediato de PII na leitura',
        'Colunas [Paciente], [Nome], [Email], [Endereço] e [Dt. Nascimento] são ignoradas na origem. Nenhum dado sensível é transmitido ou salvo em banco.',
      ],
    ],
    headFillColor: [15, 23, 42],
    fontSize: 5.9,
    rowHeight: 4.5,
    headHeight: 5.0,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. DICIONÁRIO DE FÓRMULAS MATEMÁTICAS E REGRAS DE NEGÓCIO (COMO CADA INDICADOR É CALCULADO)',
    10,
    51.5
  );

  drawVectorTable(doc, {
    startY: 53,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [48, 86, 55, 88],
    leftAlignCols: [0, 1, 2, 3],
    head: [
      'Indicador / Nó do VSM',
      'Fórmula Matemática / Regra Lógica Exata',
      'Colunas Fontes (Tasy / CATE)',
      'Interpretação Executiva e Operacional',
    ],
    body: [
      [
        'Turnos (Diurno vs. Noturno)',
        'Diurno: 07h00 <= Hora(Entrada) <= 18h59 | Noturno: 19h00 <= Hora(Entrada) <= 06h59',
        'Coluna [Entrada] (CATE 3333)',
        'Respeita estritamente a janela operacional de plantão de 12h da unidade (07h–19h e 19h–07h).',
      ],
      [
        'Ciclo Recepção e Porta-Médico',
        'Fila Guichê=[Espera Recepção] | Cadastro=[Atend. Recepção] | Porta-Méd=[Esp. Totem x Médico]',
        'Colunas de Recepção e Porta (3333)',
        'Separa o tempo administrativo de abertura de ficha da espera médica real. SLA avalia % <= 20 min.',
      ],
      [
        'Ramo A: Alta Direta 1º Atend.',
        'Internado != "S" & Sem Evasão & Sem Medicação & Sem Lab & Sem RX & Sem TC & Sem USG',
        '[Internado], [Espera Medicamento], [Exame Laboratório], [Espera RX/TC/USG]',
        'Resolução Single-Touch no consultório: paciente avaliado, orientado/receitado e liberado sem giro interno.',
      ],
      [
        'Sub-Ramo B1: Fast Reav (Só Med)',
        'HasMed == Verdadeiro & HasLab == Falso & HasRX == Falso & HasTC == Falso & HasUSG == Falso',
        '[Espera Medicamento], [Tempo ADM Medicamento] s/ exames',
        'Pacientes em analgesia/medicação rápida que não dependem de laudo externo (foco de giro rápido e NPS).',
      ],
      [
        'Sub-Ramo B2: Giro Diagnóstico',
        '(HasLab OR HasRX OR HasTC OR HasUSG) == Verdadeiro (com ou sem medicação associada)',
        '[Exame Laboratório], [Dt Laudo Lab], [Espera RX/TC/USG], [Dt Laudo TC/Usg]',
        'Pacientes cujo tempo de permanência depende da execução e liberação de laudos de apoio diagnóstico.',
      ],
      [
        'Fila Invisível Pós-Laudo',
        'Delta_T = [Data Desfecho] - Máximo([Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]) (0..720m)',
        '[Data Desfecho], [Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]',
        'Tempo ocioso em que todos os exames já estão prontos no sistema aguardando reavaliação médica.',
      ],
      [
        'Pedágio de Handoff (Troca Méd.)',
        'Compara Upper([Medico Anamnese]) vs Upper([Médico Último Atend]) no mesmo atendimento',
        '[Medico Anamnese], [Médico Último Atend], [Qt Minutos Entrada- Desfecho]',
        'Mede o acréscimo de permanência (mediana e média) quando o caso muda de titularidade/plantão.',
      ],
      [
        'Boarding Real em 2 Etapas',
        'T1 (Plano/Virtual)=[Espera Internação] | T2 (Físico)=[Dt ent unid]-[Data Internação] | Total=[Dif aguardando/Ent. Unid]',
        'CATE 3333 + CATE 3493 ([Ds setor unid] != Leito Espera)',
        'Desmembra o atraso de autorização da operadora (Leito Virtual) da espera por vaga física em UI/UTI.',
      ],
      [
        'Censo Simultâneo (Sonda :30)',
        'Sonda em t = Dia + Hora + 30min verifica interseção [t_Entrada, t_Fim1aCons, t_Desfecho, t_SaidaUnid]',
        'Timestamps de Entrada, Consulta, Desfecho e Saída Física',
        'Contabiliza exatamente quantos pacientes estão presentes simultaneamente no PS em cada uma das 4 frentes.',
      ],
      [
        'Eficiência Lean (PCE %)',
        'VA = Cadastro + 1ªConsulta + InfusãoMed + 12m(Reaval) | NVA = Filas + Laudos + Pós-Laudo | PCE = VA/(VA+NVA)',
        'Médias auditadas das micro-etapas do processo',
        'Demonstra a proporção de tempo em cuidado ativo (Valor Agregado) frente às esperas sistêmicas (NVA).',
      ],
      [
        'Governança CID & Retorno <48h',
        'Compara código CID Entrada vs Saída (3704) | Retorno: 0.5h < ([Entrada] - [DT Últ Passagem PS]) <= 48h/72h',
        '[Diag entrada], [Diag saida] (3704) e [DT Últ Passagem PS] (3333)',
        'Audita o refinamento diagnóstico pós-exames na internação e a taxa de revisita precoce c/ internação.',
      ],
    ],
    headFillColor: [30, 58, 138],
    fontSize: 5.7,
    rowHeight: 4.4,
    headHeight: 5.0,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '3. SANEAMENTO ESTATÍSTICO, TRATAMENTO DE OUTLIERS (CAPPING) E CERTIFICAÇÃO DE AUDITORIA',
    10,
    110.5
  );

  drawVectorTable(doc, {
    startY: 112,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [55, 85, 137],
    leftAlignCols: [0, 1, 2],
    head: [
      'Regra de Qualidade Estatística',
      'Parâmetro Técnico Aplicado no Motor',
      'Justificativa Metodológica e Blindagem contra Distorções',
    ],
    body: [
      [
        '3.1. Expurgo de Tempos Negativos',
        'Qualquer micro-etapa com duração < 0 min é tratada como nula (NaN)',
        'Impede que baixas retroativas manuais no sistema reduzam artificialmente as médias operacionais da unidade.',
      ],
      [
        '3.2. Tetos Operacionais (Capping)',
        'Consulta <=240m | Porta/Coleta/RX <=600m | Laudo/TC <=1440m | LOS <=2880m | Boarding <=4320m',
        'Evita que fichas esquecidas abertas no sistema por dias contaminem o desvio-padrão e o censo simultâneo.',
      ],
      [
        '3.3. Exposição Multivariada',
        'Reporte simultâneo de N, Média, Desvio-Padrão (±DP), Mediana (P50), P90 e [Mín–Máx]',
        'Tempos de saúde possuem assimetria positiva (cauda longa); exibir Média e Mediana lado a lado garante rigor absoluto.',
      ],
    ],
    headFillColor: [13, 148, 136],
    alternateRowFillColor: [240, 253, 250],
    fontSize: 5.9,
    rowHeight: 4.6,
    headHeight: 5.0,
  });

  // Quadro de Certificação Executiva no Rodapé da Página 7
  const certY = 135;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, certY, 277, 26, 2, 2, 'FD');

  doc.setFillColor(15, 23, 42);
  doc.rect(10, certY, 3, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'DECLARAÇÃO DE RASTREABILIDADE E INTEGRIDADE ANALÍTICA (AUDITORIA DE ALTA GESTÃO)',
    16,
    certY + 6
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(51, 65, 85);
  const auditLine1 = data
    ? `• Base Auditada: Competência ${data.periodLabel} (${data.fileName}) contendo N = ${data.totalAttendances} atendimentos validados de PS Adulto / Clínica Médica em ${data.totalDays} dias.`
    : '• Base Auditada: Consolidado Multimensal (MoM) processado de forma determinística a partir dos relatórios originais CATE/CHAA.';
  const auditLine2 = data
    ? `• Status de Integração Multi-Relatórios: CATE 3493 (Boarding Físico): ${
        data.vsm.hasCate3493Data ? `ATIVO (${data.vsm.matched3493Count} internações cruzadas)` : 'NÃO ANEXADO'
      }  |  CHAA 3704 (Governança CID): ${
        data.vsm.hasChaa3704Data ? `ATIVO (${data.vsm.matched3704Count} internações cruzadas)` : 'NÃO ANEXADO'
      }.`
    : '• Status de Integração: Cruzamento determinístico pelo código único de Atendimento em memória RAM.';
  const auditLine3 =
    '• Todos os indicadores deste dossiê são reprodutíveis diretamente a partir das planilhas brutas extraídas do sistema hospitalar, sem qualquer inferência subjetiva ou amostragem parcial.';

  doc.text(auditLine1, 16, certY + 11.8);
  doc.text(auditLine2, 16, certY + 16.8);
  doc.text(auditLine3, 16, certY + 21.8);
}

// ============================================================================
// GERADOR PRINCIPAL DO DOSSIÊ EXECUTIVO EM PDF VETORIAL (7 PÁGINAS A4 PAISAGEM)
// ============================================================================

export function generateEmergencyPdf(
  data: EmergencyAnalyticsData,
  customSlice?: VsmSliceMetrics
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalPages = 7;
  const vsm = data.vsm;
  const s = customSlice || vsm.monthlyOverall;

  // ==========================================================================
  // PÁGINA 1: KPIS EXECUTIVOS + DIAGRAMA VSM LEAN + LINHA DENTE DE SERRA (PCE)
  // ==========================================================================
  drawHeaderBanner(
    doc,
    'MAPA DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM - LEAN HEALTHCARE)',
    `Recorte Ativo: ${s.label}  •  Cruzamento CATE 3333 + ${vsm.hasCate3493Data ? 'CATE 3493 (Boarding Físico)' : 'Leito Virtual'} + ${vsm.hasChaa3704Data ? 'CHAA 3704 (CIDs)' : 'CID Porta'}`,
    data.periodLabel,
    1,
    totalPages
  );

  const cardW = 44.8;
  const cardH = 18.5;
  const gap = 1.6;
  const startX = 10;
  const topY = 21.5;

  drawKpiCard(
    doc,
    startX,
    topY,
    cardW,
    cardH,
    '1. Input Porta (Volume)',
    `${s.totalInput} pac.`,
    `Méd: ${data.dailyVolume.overall.mean}/d (±${data.dailyVolume.overall.stdDev}) | Med: ${data.dailyVolume.overall.median}`,
    [37, 99, 235]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 1,
    topY,
    cardW,
    cardH,
    '2. Porta-Médico (SLA <=20m)',
    `${s.doorToDocTotalStats.mean} min`,
    `Med: ${s.doorToDocTotalStats.median}m | P90: ${s.doorToDocTotalStats.p90}m | Meta: ${data.withinSlaDoorToDocRate}%`,
    s.doorToDocTotalStats.mean <= 20 ? [22, 163, 74] : [220, 38, 38]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 2,
    topY,
    cardW,
    cardH,
    '3. Alta 1º Atend vs Giro',
    `${s.directDischargePct}% / ${s.propaedeuticLoopPct}%`,
    `Alta 1ºAt: ${s.directDischargeCount} | FastReav Med: ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}%)`,
    [13, 148, 136]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 3,
    topY,
    cardW,
    cardH,
    '4. Fila Invisível Pós-Laudo',
    `${s.postReportReavalWaitStats.mean} min`,
    `Mediana: ${s.postReportReavalWaitStats.median}m (±${s.postReportReavalWaitStats.stdDev}m) aguard. médico`,
    [217, 119, 6]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 4,
    topY,
    cardW,
    cardH,
    '5. Pedágio de Handoff',
    `${s.handoffDoctorPct}% trocam`,
    `Mesmo Méd: Med ${s.sameDoctorLosStats.median}m vs Troca: Med ${s.handoffDoctorLosStats.median}m`,
    [124, 58, 237]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 5,
    topY,
    cardW,
    cardH,
    '6. Boarding Real (UI/UTI)',
    `${s.totalBoardingStats.mean} min`,
    `Med: ${s.totalBoardingStats.median}m | ${s.admittedTotalCount} int. (${vsm.wastedBedHoursInBoarding}h retidas)`,
    [225, 29, 72]
  );

  const vsmY = 43;
  const vsmH = 108;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, vsmY, 277, vsmH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `FLUXOGRAMA DE VALOR LEAN HEALTHCARE (INPUT -> THROUGHPUT ESTRATIFICADO -> OUTPUT & BOARDING REAL) — ${s.label.toUpperCase()}`,
    14,
    vsmY + 5.8
  );

  drawVsmNodeBox(
    doc,
    13,
    vsmY + 26,
    46,
    28,
    '1. INPUT: TOTEM & RECEPÇÃO',
    `N = ${s.totalInput} (100% Porta)`,
    `Fila Totem->Guichê: Méd ${s.waitTotemToRecepStats.mean}m (Med ${s.waitTotemToRecepStats.median}m)`,
    `Cadastro Ficha: Méd ${s.recepRegistrationStats.mean}m (Med ${s.recepRegistrationStats.median}m)`,
    `Evasão Pré-Médica: ${s.preMedEvasionCount} (${s.preMedEvasionPct}%)`,
    [15, 23, 42],
    [248, 250, 252],
    [148, 163, 184]
  );

  drawVectorArrow(
    doc,
    59.5,
    vsmY + 40,
    70.5,
    vsmY + 40,
    `Fila: ${s.waitRecepToDocStats.mean}m`,
    [220, 38, 38]
  );

  drawVsmNodeBox(
    doc,
    71,
    vsmY + 26,
    49,
    28,
    '2. 1º ATENDIMENTO (GATEKEEPER)',
    `N = ${s.attendedByDoctorCount} (${s.attendedByDoctorPct}% Atendidos)`,
    `Porta-Médico: Méd ${s.doorToDocTotalStats.mean}m | P90 ${s.doorToDocTotalStats.p90}m`,
    `1ª Consulta: Méd ${s.firstConsultDurationStats.mean}m (Med ${s.firstConsultDurationStats.median}m)`,
    `Meta SLA <=20m: ${data.withinSlaDoorToDocRate}% na meta`,
    [29, 78, 216],
    [239, 246, 255],
    [96, 165, 250]
  );

  drawVectorArrow(doc, 120.5, vsmY + 32, 133.5, vsmY + 20, `${s.directDischargePct}% Alta 1ºAt`, [22, 163, 74]);
  drawVectorArrow(doc, 120.5, vsmY + 40, 133.5, vsmY + 49, `${s.fastReavMedOnlyPct}% Só Med`, [217, 119, 6]);
  drawVectorArrow(doc, 120.5, vsmY + 48, 133.5, vsmY + 80, `${s.diagnosticExamsLoopPct}% Exames`, [180, 83, 9]);

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 9,
    68,
    25,
    'RAMO A: ALTA DIRETA NO 1º ATENDIMENTO (SINGLE-TOUCH)',
    `N = ${s.directDischargeCount} (${s.directDischargePct}% do PS) — Sem Exames/Med`,
    `Permanência Total: Méd ${s.directDischargeLosStats.mean}m (±${s.directDischargeLosStats.stdDev}m)`,
    `Mediana: ${s.directDischargeLosStats.median}m | P90: ${s.directDischargeLosStats.p90}m`,
    'Resolução Direta no Consultório (Sem Handoff)',
    [21, 128, 61],
    [240, 253, 244],
    [74, 222, 128]
  );

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 37,
    68,
    27,
    'RAMO B1: FAST REAV / GIRO TERAPÊUTICO (SÓ MEDICAÇÃO)',
    `N = ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}% do PS) — Sem Lab/Imagem`,
    `Espera Início Med: ${s.waitMedStartStats.mean}m | Infusão ADM: ${s.medInfusionDurationStats.mean}m`,
    `Permanência Total: Méd ${s.fastReavMedOnlyLosStats.mean}m (Med ${s.fastReavMedOnlyLosStats.median}m)`,
    `Total Medicados (c/ ou s/ exames): ${s.medicatedCount} (${s.medicatedPct}%)`,
    [217, 119, 6],
    [255, 251, 235],
    [251, 191, 36]
  );

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 67,
    68,
    36,
    'RAMO B2: GIRO DIAGNÓSTICO (LAB / TC / RX / USG)',
    `N = ${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}% do PS em Exames)`,
    `• Lab: ${s.labCount} (${s.labPct}%) [Coleta ${s.waitLabCollectStats.mean}m + Laudo ${s.waitLabReportStats.mean}m]`,
    `• TC: ${s.tcCount} (${s.tcPct}%) [Ciclo ${s.waitTcTotalStats.mean}m] | RX: ${s.rxCount} (${s.rxPct}%) [${s.waitRxExecStats.mean}m]`,
    `• USG: ${s.usgCount} (${s.usgPct}%) | LOS Médio c/ Exames: ${s.diagnosticExamsLoopLosStats.mean}m (Med ${s.diagnosticExamsLoopLosStats.median}m)`,
    [180, 83, 9],
    [254, 243, 199],
    [245, 158, 11]
  );

  drawVectorArrow(
    doc,
    202.5,
    vsmY + 50,
    214.5,
    vsmY + 32,
    `Pós-Laudo: ${s.postReportReavalWaitStats.mean}m`,
    [3, 105, 161]
  );
  drawVectorArrow(
    doc,
    202.5,
    vsmY + 82,
    214.5,
    vsmY + 75,
    `${s.admittedTotalPct}% Internam`,
    [190, 18, 60]
  );

  drawVsmNodeBox(
    doc,
    215,
    vsmY + 9,
    69,
    38,
    'OUTPUT 1: ALTA PÓS-PROPEDÊUTICA / REAVALIAÇÃO',
    `N = ${s.postPropDischargeCount} (${s.postPropDischargePct}% do PS) + ${s.postConsultEvasionCount} Evasões`,
    `Permanência: Méd ${s.postPropDischargeLosStats.mean}m (Med ${s.postPropDischargeLosStats.median}m | P90 ${s.postPropDischargeLosStats.p90}m)`,
    `Fila Pós-Laudo p/ Reavaliação: Méd ${s.postReportReavalWaitStats.mean}m (Med ${s.postReportReavalWaitStats.median}m)`,
    `Handoff (${s.handoffDoctorPct}%): Mediana ${s.sameDoctorLosStats.median}m -> ${s.handoffDoctorLosStats.median}m`,
    [3, 105, 161],
    [240, 249, 255],
    [56, 189, 248]
  );

  drawVsmNodeBox(
    doc,
    215,
    vsmY + 51,
    69,
    52,
    'OUTPUT 2: INTERNAÇÃO & BOARDING REAL (UI / UTI)',
    `N = ${s.admittedTotalCount} (${s.admittedTotalPct}%) -> UI: ${s.admittedUiCount} | UTI: ${s.admittedUtiCount}`,
    `• Etapa 1 (Desfecho -> Leito Virtual/Plano): Méd ${s.t1DecisionToVirtualBedStats.mean}m (P90 ${s.t1DecisionToVirtualBedStats.p90}m)`,
    `• Etapa 2 (Virtual -> Leito Físico UI/UTI): Méd +${s.t2VirtualToPhysicalBedStats.mean}m (Med ${s.t2VirtualToPhysicalBedStats.median}m)`,
    `• Boarding Total (Aguardo->Unid): Méd ${s.totalBoardingStats.mean}m (Med ${s.totalBoardingStats.median}m) | CID Mudou: ${vsm.diagnosticGovernance.reclassifiedPct}%`,
    [190, 18, 60],
    [255, 241, 242],
    [244, 63, 94]
  );

  const sawY = 154;
  const sawH = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, sawY, 277, sawH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'LINHA DO TEMPO LEAN VSM (DENTE DE SERRA): TEMPO DE VALOR AGREGADO (VA - CUIDADO ATIVO) vs. DESPERDÍCIO / ESPERA SISTÊMICA (NVA)',
    14,
    sawY + 5.5
  );

  const sawSteps: { title: string; val: string; isVa: boolean }[] = [
    { title: '1. Fila Totem', val: `${s.waitTotemToRecepStats.mean}m (NVA)`, isVa: false },
    { title: '2. Recepção', val: `${s.recepRegistrationStats.mean}m (VA)`, isVa: true },
    { title: '3. Fila Médico', val: `${s.waitRecepToDocStats.mean}m (NVA)`, isVa: false },
    { title: '4. 1ª Consulta', val: `${s.firstConsultDurationStats.mean}m (VA)`, isVa: true },
    { title: '5. Fila Coleta/Med', val: `${s.waitLabCollectStats.mean}m (NVA)`, isVa: false },
    { title: '6. ADM Med/Exame', val: `${s.medInfusionDurationStats.mean}m (VA)`, isVa: true },
    { title: '7. Espera Laudo', val: `${s.waitLabReportStats.mean}m (NVA)`, isVa: false },
    { title: '8. Fila Pós-Laudo', val: `${s.postReportReavalWaitStats.mean}m (NVA)`, isVa: false },
    { title: '9. Reaval/Desfecho', val: `12.0m (VA)`, isVa: true },
    { title: '10. Boarding Plano+Leito', val: `${s.totalBoardingStats.mean}m (NVA Int)`, isVa: false },
  ];

  const stepW = 22.8;
  const stepGap = 1.6;
  let curX = 13;

  sawSteps.forEach((st, idx) => {
    const boxY = st.isVa ? sawY + 9 : sawY + 23;
    const fillRgb: [number, number, number] = st.isVa ? [220, 252, 231] : [254, 226, 226];
    const strokeRgb: [number, number, number] = st.isVa ? [22, 163, 74] : [220, 38, 38];
    const txtRgb: [number, number, number] = st.isVa ? [21, 128, 61] : [185, 28, 28];

    doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
    doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(curX, boxY, stepW, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(st.title, curX + stepW / 2, boxY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(txtRgb[0], txtRgb[1], txtRgb[2]);
    doc.text(st.val, curX + stepW / 2, boxY + 10.2, { align: 'center' });

    if (idx < sawSteps.length - 1) {
      const nextIsVa = sawSteps[idx + 1].isVa;
      const yA = boxY + 6.5;
      const yB = (nextIsVa ? sawY + 9 : sawY + 23) + 6.5;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.line(curX + stepW, yA, curX + stepW + stepGap, yB);
    }

    curX += stepW + stepGap;
  });

  doc.setFillColor(219, 234, 254);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.45);
  doc.roundedRect(258, sawY + 9, 26, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 58, 138);
  doc.text('EFICIÊNCIA LEAN', 271, sawY + 14.5, { align: 'center' });
  doc.text('(PCE DO GIRO)', 271, sawY + 18, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text(`${s.pceEfficiencyPct}% VA`, 271, sawY + 24.5, { align: 'center' });

  doc.setFontSize(6.2);
  doc.setTextColor(185, 28, 28);
  doc.text(`VA: ${s.vaMinutesMean}m ativos`, 271, sawY + 29.5, { align: 'center' });
  doc.text(`NVA: ${s.nvaMinutesMean}m espera`, 271, sawY + 33.5, { align: 'center' });

  // ==========================================================================
  // PÁGINA 2: GRÁFICO VETORIAL DE CENSO SIMULTÂNEO EMPILHADO + SEMANAS & DIAS
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawHeaderBanner(
    doc,
    'PRESSÃO ASSISTENCIAL REAL: CENSO SIMULTÂNEO POR HORA vs. CHEGADAS NA PORTA',
    'Decomposição nas 4 Frentes Operacionais: Porta (1º Atend) + Fast Reav (Só Med) + Giro Exames (Lab/TC/RX) + Boarding (UI/UTI)',
    data.periodLabel,
    2,
    totalPages
  );

  const chartX = 10;
  const chartY = 22;
  const chartW = 277;
  const chartH = 78;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'CURVA DE LOTAÇÃO SIMULTÂNEA DENTRO DO PS POR HORA (07h–06h) vs. NOVAS CHEGADAS NA PORTA (MÉDIA DIÁRIA)',
    chartX + 4,
    chartY + 6
  );

  const legItems: { label: string; rgb: [number, number, number] }[] = [
    { label: '1. Porta / 1º Atend', rgb: [59, 130, 246] },
    { label: '2A. Fast Reav (Só Med)', rgb: [251, 191, 36] },
    { label: '2B. Giro Exames (Lab/TC)', rgb: [217, 119, 6] },
    { label: '3. Boarding (UI/UTI)', rgb: [225, 29, 72] },
    { label: 'Linha: Chegadas/h', rgb: [15, 23, 42] },
  ];
  let lx = chartX + 132;
  legItems.forEach((it) => {
    doc.setFillColor(it.rgb[0], it.rgb[1], it.rgb[2]);
    doc.rect(lx, chartY + 2.8, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(51, 65, 85);
    doc.text(it.label, lx + 4, chartY + 5.3);
    lx += it.label.length * 1.42 + 6.5;
  });

  const plotX = chartX + 12;
  const plotY = chartY + 12;
  const plotW = chartW - 18;
  const plotH = chartH - 22;

  const pts = vsm.hourlySimultaneousOverall;
  const maxVal = Math.max(...pts.map((p) => p.totalSimultaneousMean), ...pts.map((p) => p.newArrivalsMean), 10) * 1.18;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const gy = plotY + plotH - (g / 4) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    const gVal = ((g / 4) * maxVal).toFixed(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(gVal, plotX - 2, gy + 1, { align: 'right' });
  }

  const slotW = plotW / 24;
  const barW = slotW * 0.64;
  const arrivalCoords: { x: number; y: number; val: number }[] = [];

  pts.forEach((pt, idx) => {
    const bx = plotX + idx * slotW + (slotW - barW) / 2;
    const hPorta = (pt.portaMean / maxVal) * plotH;
    const hFast = (pt.fastReavMedMean / maxVal) * plotH;
    const hExam = (pt.giroExamesMean / maxVal) * plotH;
    const hBoard = (pt.boardingMean / maxVal) * plotH;

    let curBottom = plotY + plotH;

    if (hPorta > 0) {
      doc.setFillColor(59, 130, 246);
      doc.rect(bx, curBottom - hPorta, barW, hPorta, 'F');
      curBottom -= hPorta;
    }
    if (hFast > 0) {
      doc.setFillColor(251, 191, 36);
      doc.rect(bx, curBottom - hFast, barW, hFast, 'F');
      curBottom -= hFast;
    }
    if (hExam > 0) {
      doc.setFillColor(217, 119, 6);
      doc.rect(bx, curBottom - hExam, barW, hExam, 'F');
      curBottom -= hExam;
    }
    if (hBoard > 0) {
      doc.setFillColor(225, 29, 72);
      doc.rect(bx, curBottom - hBoard, barW, hBoard, 'F');
      curBottom -= hBoard;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(pt.totalSimultaneousMean.toFixed(1), bx + barW / 2, curBottom - 1.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(pt.label, bx + barW / 2, plotY + plotH + 4.5, { align: 'center' });

    const arrY = plotY + plotH - (pt.newArrivalsMean / maxVal) * plotH;
    arrivalCoords.push({ x: bx + barW / 2, y: arrY, val: pt.newArrivalsMean });
  });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  for (let i = 0; i < arrivalCoords.length - 1; i++) {
    doc.line(arrivalCoords[i].x, arrivalCoords[i].y, arrivalCoords[i + 1].x, arrivalCoords[i + 1].y);
  }
  arrivalCoords.forEach((c) => {
    doc.setFillColor(15, 23, 42);
    doc.circle(c.x, c.y, 0.9, 'F');
  });

  drawVectorTable(doc, {
    startY: 105,
    marginLeft: 10,
    tableWidth: 132,
    colWidths: [28, 10, 14, 24, 14, 14, 14, 14],
    head: ['Semana do Mês', 'Dias', 'Total', 'Média/d (±DP)', 'Mediana', 'Porta-Méd', 'LOS Méd', 'Intern.'],
    body: data.weekOfMonthStats.map((w) => [
      w.weekLabel,
      w.daysCount,
      w.total,
      `${w.meanPerDay} (±${w.stdDevPerDay})`,
      w.medianPerDay,
      `${w.meanDoorToDoc}m`,
      `${w.meanLos}m`,
      w.admissions,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.4,
    rowHeight: 5.0,
  });

  drawVectorTable(doc, {
    startY: 105,
    marginLeft: 146,
    tableWidth: 141,
    colWidths: [20, 13, 24, 26, 14, 14, 15, 15],
    head: ['Dia da Semana', 'Total', 'Média/d (±DP)', 'Mediana [Mín–Máx]', 'Diurno', 'Noturno', 'Porta-Méd', 'LOS Méd'],
    body: data.weekdayStats.map((wd) => [
      wd.dayName,
      wd.total,
      `${wd.meanPerDay} (±${wd.stdDevPerDay})`,
      `${wd.medianPerDay} [${wd.minPerDay}–${wd.maxPerDay}]`,
      wd.dayShiftMean,
      wd.nightShiftMean,
      `${wd.meanDoorToDoc}m`,
      `${wd.meanLos}m`,
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.4,
    rowHeight: 5.0,
  });

  // ==========================================================================
  // PÁGINA 3: DUPLO HEATMAP 24x7 (CHEGADAS NA PORTA vs. CENSO SIMULTÂNEO REAL)
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawHeaderBanner(
    doc,
    'MAPAS DE CALOR 24x7 (SEGUNDA A DOMINGO, 07h ÀS 06h): CHEGADAS NA PORTA vs. CENSO SIMULTÂNEO',
    'Comparativo Direto entre o Fluxo de Entrada (Fichas Abertas/h) e a Lotação Acumulada Real Dentro da Emergência',
    data.periodLabel,
    3,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('1. HEATMAP 24x7 DE CHEGADAS NA PORTA (MÉDIA DE NOVOS PACIENTES POR HORA — SEGUNDA A DOMINGO, 07h ÀS 06h)', 10, 23);

  const heatColWidths = [19, ...Array(24).fill(10.1), 15.6];
  const heatHoursHeader = ['Dia \\ Hora', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`), 'Média/d'];

  const arrivalHeatBody = WEEKDAY_NAMES.map((dName, dIdx) => {
    const rowVals = HOURS_7_TO_6.map((h) => {
      const cell = data.heatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
      return cell ? cell.mean.toFixed(1) : '0.0';
    });
    const wdStat = data.weekdayStats.find((w) => w.dayIndex === dIdx);
    return [dName, ...rowVals, wdStat ? wdStat.meanPerDay.toFixed(1) : '—'];
  });

  drawVectorTable(doc, {
    startY: 25,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: heatColWidths,
    head: heatHoursHeader,
    body: arrivalHeatBody,
    headFillColor: [15, 23, 42],
    fontSize: 6.1,
    rowHeight: 5.4,
    cellStyler: (_rIdx: number, cIdx: number, rawVal: string | number): CellStyleOverride | null => {
      if (cIdx >= 1 && cIdx <= 24) {
        const val = parseFloat(String(rawVal));
        if (!isNaN(val)) {
          if (val >= 10) {
            return { fillColor: [254, 202, 202], textColor: [153, 27, 27], fontStyle: 'bold' };
          }
          if (val >= 7) {
            return { fillColor: [254, 240, 138], textColor: [133, 77, 14], fontStyle: 'bold' };
          }
          if (val >= 4) {
            return { fillColor: [219, 234, 254], textColor: [30, 64, 175] };
          }
        }
      }
      return null;
    },
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. HEATMAP 24x7 DE CENSO OCUPACIONAL SIMULTÂNEO (TOTAL DE PACIENTES DENTRO DO PS: PORTA + FAST REAV + EXAMES + BOARDING)',
    10,
    112
  );

  const censusHeatBody = WEEKDAY_NAMES.map((dName, dIdx) => {
    const rowVals = HOURS_7_TO_6.map((h) => {
      const cell = vsm.censusHeatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
      return cell ? cell.totalMean.toFixed(1) : '0.0';
    });
    const peakVal = Math.max(
      ...HOURS_7_TO_6.map((h) => vsm.censusHeatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h)?.totalMean || 0)
    );
    return [dName, ...rowVals, peakVal.toFixed(1)];
  });

  drawVectorTable(doc, {
    startY: 114,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: heatColWidths,
    head: ['Dia \\ Hora', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`), 'Pico/d'],
    body: censusHeatBody,
    headFillColor: [185, 28, 28],
    fontSize: 6.1,
    rowHeight: 5.4,
    cellStyler: (_rIdx: number, cIdx: number, rawVal: string | number): CellStyleOverride | null => {
      if (cIdx >= 1 && cIdx <= 24) {
        const val = parseFloat(String(rawVal));
        if (!isNaN(val)) {
          if (val >= 22) {
            return { fillColor: [254, 202, 202], textColor: [153, 27, 27], fontStyle: 'bold' };
          }
          if (val >= 15) {
            return { fillColor: [254, 240, 138], textColor: [133, 77, 14], fontStyle: 'bold' };
          }
          if (val >= 8) {
            return { fillColor: [224, 242, 254], textColor: [3, 105, 161] };
          }
        }
      }
      return null;
    },
  });

  // ==========================================================================
  // PÁGINA 4: DIMENSIONAMENTO POR FRENTE DE TRABALHO & TABELA COMPLETA DE TEMPOS
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawHeaderBanner(
    doc,
    'CENSO ESTRATIFICADO POR FRENTE DE TRABALHO & DECOMPOSIÇÃO DE TEMPOS POR TURNO',
    'Ferramenta Direta para Alocação de Escala Médica (Porta vs. Fast Reav Medicação vs. Giro Exames vs. Boarding)',
    data.periodLabel,
    4,
    totalPages
  );

  drawVectorTable(doc, {
    startY: 22,
    marginLeft: 10,
    tableWidth: 125,
    colWidths: [13, 15, 15, 17, 17, 17, 16, 15],
    head: ['Hora', 'Cheg/h', '1.Porta', '2A.FastMed', '2B.Exames', '3.Boarding', 'Total Sim.', 'Pico Máx'],
    body: vsm.hourlySimultaneousOverall.map((pt) => [
      pt.label,
      pt.newArrivalsMean.toFixed(1),
      pt.portaMean.toFixed(1),
      pt.fastReavMedMean.toFixed(1),
      pt.giroExamesMean.toFixed(1),
      pt.boardingMean.toFixed(1),
      pt.totalSimultaneousMean.toFixed(1),
      pt.totalSimultaneousMax.toFixed(0),
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 5.9,
    rowHeight: 3.6,
    headHeight: 4.8,
  });

  const timeBreakdownRows: [string, MetricStats, MetricStats, MetricStats][] = [
    ['Fila Totem -> Recepção', s.waitTotemToRecepStats, vsm.byShift.day.waitTotemToRecepStats, vsm.byShift.night.waitTotemToRecepStats],
    ['Cadastro na Recepção', s.recepRegistrationStats, vsm.byShift.day.recepRegistrationStats, vsm.byShift.night.recepRegistrationStats],
    ['Fila Pós-Recepção -> Médico', s.waitRecepToDocStats, vsm.byShift.day.waitRecepToDocStats, vsm.byShift.night.waitRecepToDocStats],
    ['Porta-Médico Total (SLA <=20m)', s.doorToDocTotalStats, vsm.byShift.day.doorToDocTotalStats, vsm.byShift.night.doorToDocTotalStats],
    ['1ª Consulta Médica (Anamnese)', s.firstConsultDurationStats, vsm.byShift.day.firstConsultDurationStats, vsm.byShift.night.firstConsultDurationStats],
    ['Espera p/ Início Medicação', s.waitMedStartStats, vsm.byShift.day.waitMedStartStats, vsm.byShift.night.waitMedStartStats],
    ['Tempo Infusão/ADM Medicação', s.medInfusionDurationStats, vsm.byShift.day.medInfusionDurationStats, vsm.byShift.night.medInfusionDurationStats],
    ['Espera Coleta Laboratório', s.waitLabCollectStats, vsm.byShift.day.waitLabCollectStats, vsm.byShift.night.waitLabCollectStats],
    ['Tempo Laudo Laboratório', s.waitLabReportStats, vsm.byShift.day.waitLabReportStats, vsm.byShift.night.waitLabReportStats],
    ['Espera Execução Raio-X (RX)', s.waitRxExecStats, vsm.byShift.day.waitRxExecStats, vsm.byShift.night.waitRxExecStats],
    ['Ciclo Total Tomografia (TC)', s.waitTcTotalStats, vsm.byShift.day.waitTcTotalStats, vsm.byShift.night.waitTcTotalStats],
    ['Ciclo Total Ultrassom (USG)', s.waitUsgTotalStats, vsm.byShift.day.waitUsgTotalStats, vsm.byShift.night.waitUsgTotalStats],
    ['Fila Pós-Laudo p/ Reavaliação', s.postReportReavalWaitStats, vsm.byShift.day.postReportReavalWaitStats, vsm.byShift.night.postReportReavalWaitStats],
    ['LOS: Ramo A (Alta 1º Atend)', s.directDischargeLosStats, vsm.byShift.day.directDischargeLosStats, vsm.byShift.night.directDischargeLosStats],
    ['LOS: Ramo B1 (Fast Reav Só Med)', s.fastReavMedOnlyLosStats, vsm.byShift.day.fastReavMedOnlyLosStats, vsm.byShift.night.fastReavMedOnlyLosStats],
    ['LOS: Ramo B2 (Giro Exames)', s.diagnosticExamsLoopLosStats, vsm.byShift.day.diagnosticExamsLoopLosStats, vsm.byShift.night.diagnosticExamsLoopLosStats],
    ['LOS: Mesmo Médico (Sem Handoff)', s.sameDoctorLosStats, vsm.byShift.day.sameDoctorLosStats, vsm.byShift.night.sameDoctorLosStats],
    ['LOS: Troca Médico (Com Handoff)', s.handoffDoctorLosStats, vsm.byShift.day.handoffDoctorLosStats, vsm.byShift.night.handoffDoctorLosStats],
    ['Boarding T1 (Desfecho->Virtual)', s.t1DecisionToVirtualBedStats, vsm.byShift.day.t1DecisionToVirtualBedStats, vsm.byShift.night.t1DecisionToVirtualBedStats],
    ['Boarding T2 (Virtual->Físico)', s.t2VirtualToPhysicalBedStats, vsm.byShift.day.t2VirtualToPhysicalBedStats, vsm.byShift.night.t2VirtualToPhysicalBedStats],
    ['Boarding Total (Aguardo->Unid)', s.totalBoardingStats, vsm.byShift.day.totalBoardingStats, vsm.byShift.night.totalBoardingStats],
  ];

  drawVectorTable(doc, {
    startY: 22,
    marginLeft: 139,
    tableWidth: 148,
    colWidths: [48, 12, 24, 20, 22, 22],
    head: ['Etapa / Indicador (min)', 'N', '24h: Méd (±DP)', 'Med (P90)', 'Diurno: Méd|Med', 'Noturno: Méd|Med'],
    body: timeBreakdownRows.map(([lbl, stAll, stD, stN]) => [
      lbl,
      stAll.count,
      `${stAll.mean} (±${stAll.stdDev})`,
      `${stAll.median} (${stAll.p90})`,
      stD.count > 0 ? `${stD.mean}m | ${stD.median}m` : '—',
      stN.count > 0 ? `${stN.mean}m | ${stN.median}m` : '—',
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.0,
    rowHeight: 4.1,
    headHeight: 4.8,
  });

  // ==========================================================================
  // PÁGINA 5: BOARDING POR CONVÊNIO + GOVERNANÇA DIAGNÓSTICA (CHAA 3704) & RETORNO <48H
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawHeaderBanner(
    doc,
    'RAIO-X DO BOARDING POR OPERADORA (CONVÊNIO) & GOVERNANÇA CLÍNICA (CHAA 3704 + RETORNO <48H)',
    'Auditoria Comercial de Retenção de Leitos por Plano de Saúde e Assertividade/Reclassificação Diagnóstica na Internação',
    data.periodLabel,
    5,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `1. RANKING DE BOARDING POR OPERADORA DE SAÚDE (TOTAL: ${data.totalAdmissions} INTERNAÇÕES | ${vsm.wastedBedHoursInBoarding} HORAS-LEITO CONSUMIDAS NO PS)`,
    10,
    23
  );

  drawVectorTable(doc, {
    startY: 25,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [38, 24, 24, 18, 48, 48, 53, 24],
    head: [
      'Operadora / Convênio',
      'Intern. (N / %)',
      'UI / UTI',
      'Cirúrg. (CC)',
      'Etapa 1: Aprovação Plano / Virtual',
      'Etapa 2: Virtual -> Leito Físico UI/UTI',
      'Boarding Total (Aguardo -> Unidade)',
      'Perm. Hosp (Dias)',
    ],
    body: vsm.boardingByConvenio.slice(0, 10).map((c) => [
      c.convenio,
      `${c.admittedCount} (${c.pctOfAdmissions}%)`,
      `${c.uiCount} UI / ${c.utiCount} UTI`,
      `${c.ccCount}`,
      fmtStatShort(c.t1VirtualApprovalStats),
      fmtStatShort(c.t2PhysicalUploadStats),
      `${fmtStatShort(c.totalBoardingStats)} [P90: ${c.totalBoardingStats.p90}m]`,
      c.hospitalStayDaysStats.count > 0 ? `${c.hospitalStayDaysStats.mean}d (Med ${c.hospitalStayDaysStats.median}d)` : '—',
    ]),
    headFillColor: [190, 18, 60],
    alternateRowFillColor: [255, 241, 242],
    fontSize: 6.1,
    rowHeight: 4.6,
  });

  const dg = vsm.diagnosticGovernance;
  const rv = vsm.returnVisits;

  drawVectorTable(doc, {
    startY: 110,
    marginLeft: 10,
    tableWidth: 142,
    colWidths: [48, 48, 12, 34],
    leftAlignCols: [0, 1],
    head: ['Hipótese Porta (Diag Entrada)', 'Diagnóstico Internação (Diag Saída)', 'N', 'Classificação Governança'],
    body:
      dg.topReclassifications.length > 0
        ? dg.topReclassifications.slice(0, 9).map((p) => [
            p.cidIn.slice(0, 36),
            p.cidOut.slice(0, 36),
            p.count,
            p.classification,
          ])
        : [['CHAA 3704 não anexado nesta sessão', 'Anexe o CHAA 3704 para ver pares de CID', '—', '—']],
    headFillColor: [15, 23, 42],
    fontSize: 5.9,
    rowHeight: 4.5,
  });

  drawVectorTable(doc, {
    startY: 110,
    marginLeft: 156,
    tableWidth: 131,
    colWidths: [74, 57],
    leftAlignCols: [0, 1],
    head: ['Indicador de Governança Clínica & Segurança do Paciente', 'Resultado Auditado'],
    body: [
      ['Pacientes Internados Avaliados no CHAA 3704', `${dg.evaluatedAdmissionsCount} pacientes`],
      ['Concordância Diagnóstica Exata (CID Porta = CID Internação)', `${dg.exactMatchCount} (${dg.exactMatchPct}%) — LOS Médio: ${dg.meanLosExactMatch}m`],
      ['Reclassificação Diagnóstica Pós-Propedêutica (Mudança de CID)', `${dg.reclassifiedCount} (${dg.reclassifiedPct}%) — LOS Médio: ${dg.meanLosReclassified}m`],
      ['   • Refinamento Fisiopatológico (Mesmo Capítulo CID)', `${dg.sameChapterRefinementCount} (${dg.sameChapterRefinementPct}%)`],
      ['   • Mudança de Sistema Orgânico / Capítulo CID', `${dg.crossChapterDiscordanceCount} (${dg.crossChapterDiscordancePct}%)`],
      ['Retorno Precoce à Emergência em <= 48 horas', `${rv.return48hCount} casos (${rv.return48hPct}% do PS)`],
      ['Taxa de Internação nos Retornos <= 48 horas', `${rv.return48hAdmittedCount} internados (${rv.return48hAdmissionRate}% vs ${data.conversionRate}% geral)`],
      ['Retorno Precoce à Emergência em <= 72 horas', `${rv.return72hCount} casos (${rv.return72hPct}% do PS) — ${rv.return72hAdmittedCount} int.`],
    ],
    headFillColor: [13, 148, 136],
    alternateRowFillColor: [240, 253, 250],
    fontSize: 6.1,
    rowHeight: 4.8,
  });

  // ==========================================================================
  // PÁGINA 6: MATRIZ DUPLA DE CONDUTAS MÉDICAS & MATRIZ CID x THROUGHPUT
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawHeaderBanner(
    doc,
    'GOVERNANÇA DE EQUIPE: CONDUTAS POR MÉDICO (1º ATEND vs. FECHAMENTO) & CID x THROUGHPUT',
    'Perfil de Solicitação Propedêutica na Porta (Gatekeeper), Absorção de Passivo (Closer) e Rotas por Diagnóstico',
    data.periodLabel,
    6,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('1. MATRIZ DE CONDUTAS MÉDICAS: 1º ATENDIMENTO (ANAMNESE) vs. ÚLTIMO ATENDIMENTO (REAVALIAÇÃO / FECHAMENTO)', 10, 22.5);

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [45, 24, 17, 18, 17, 15, 15, 15, 16, 18, 22, 33, 22],
    head: [
      'Médico (Top Volume)',
      '1º Atend (D/N)',
      '% Alta 1ºAt',
      '% Só Med',
      '% Med Tot',
      '% Lab',
      '% RX',
      '% TC',
      '% Intern.',
      'LOS Med.',
      'Últ. Atend',
      'Fech. Herdado (Handoff)',
      'Saldo Reav.',
    ],
    body: vsm.doctorConductMatrix.slice(0, 14).map((d) => [
      d.name.slice(0, 28),
      `${d.firstAttendCount} (${d.firstDayCount}D/${d.firstNightCount}N)`,
      `${d.directDischargePct}%`,
      `${d.fastReavMedOnlyPct}%`,
      `${d.medOrderedPct}%`,
      `${d.labOrderedPct}%`,
      `${d.rxOrderedPct}%`,
      `${d.tcOrderedPct}%`,
      `${d.convertedToAdmissionPct}%`,
      `${d.firstAttendMedianLosMin}m`,
      `${d.lastAttendCount}`,
      `${d.closedHandoffPatientsCount} (${d.handoffAbsorptionPct}%)`,
      d.netReavalBalance > 0 ? `+${d.netReavalBalance}` : `${d.netReavalBalance}`,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.0,
    rowHeight: 4.2,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('2. MATRIZ CID x ROTA DE THROUGHPUT (ONDE OS PRINCIPAIS DIAGNÓSTICOS CONSOMEM RECURSOS NO PS)', 10, 116);

  drawVectorTable(doc, {
    startY: 118,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [64, 46, 24, 30, 30, 30, 25, 28],
    leftAlignCols: [0, 1],
    head: [
      'Diagnóstico (Top CIDs)',
      'Cluster Sindrômico',
      'Volume (% PS)',
      'Rota 1: Alta 1º Atend',
      'Rota 2: Fast Reav Só Med',
      'Rota 3: Giro Exames',
      'Rota 4: Internação',
      'LOS Méd / Mediano',
    ],
    body: vsm.cidThroughputMatrix.slice(0, 10).map((r) => [
      r.cid.slice(0, 40),
      r.clusterName.slice(0, 28),
      `${r.totalCount} (${r.pctOfTotalPs}%)`,
      `${r.directDischargeCount} (${r.directDischargePct}%)`,
      `${r.fastReavMedCount} (${r.fastReavMedPct}%)`,
      `${r.diagnosticGiroCount} (${r.diagnosticGiroPct}%)`,
      `${r.admittedCount} (${r.admittedPct}%)`,
      `${r.meanLos}m / Med ${r.medianLos}m`,
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.0,
    rowHeight: 4.3,
  });

  // ==========================================================================
  // PÁGINA 7: ANEXO I — NOTA TÉCNICA, METODOLOGIA ANALÍTICA E GOVERNANÇA
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  drawMethodologyAnnexPage(doc, data.periodLabel, 7, totalPages, data);

  const safePeriod = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Dossie_Executivo_VSM_Jornada_PS_${safePeriod}.pdf`);
}

// ============================================================================
// EXPORTADOR DE IMAGEM PNG EM ALTA RESOLUÇÃO DO MAPA VSM (PARA SLIDES PPTX)
// ============================================================================

export function generateVsmPngImage(
  data: EmergencyAnalyticsData,
  customSlice?: VsmSliceMetrics
): void {
  if (typeof document === 'undefined') return;
  const s = customSlice || data.vsm.monthlyOverall;
  const vsm = data.vsm;

  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 1480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 2400, 115);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 110, 2400, 6);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(
    `MedScale Pro  |  MAPA DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM - LEAN HEALTHCARE)`,
    40,
    52
  );
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(
    `Competência: ${data.periodLabel}  •  Recorte: ${s.label} (N = ${s.totalInput})  •  CATE 3333 + ${vsm.hasCate3493Data ? 'CATE 3493 (Boarding Físico)' : 'Leito Virtual'} + ${vsm.hasChaa3704Data ? 'CHAA 3704 (CIDs)' : 'CID Porta'}`,
    40,
    90
  );

  const drawBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    lines: string[],
    footer: string,
    hdrColor: string,
    bgColor: string,
    borderColor: string
  ) => {
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hdrColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 48, [14, 14, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 31);

    ctx.fillStyle = '#0f172a';
    lines.forEach((ln, idx) => {
      ctx.font = idx === 0 ? 'bold 23px Inter, Segoe UI, Arial, sans-serif' : '19px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillStyle = idx === 0 ? '#0f172a' : '#334155';
      ctx.fillText(ln, x + w / 2, y + 84 + idx * 34);
    });

    if (footer) {
      ctx.font = 'bold 19px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillStyle = hdrColor;
      ctx.fillText(footer, x + w / 2, y + h - 18);
    }
    ctx.textAlign = 'left';
  };

  const drawArrowCanvas = (x1: number, y1: number, x2: number, y2: number, label: string, color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 16;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 12);
      ctx.textAlign = 'left';
    }
  };

  drawBox(
    40,
    270,
    380,
    240,
    '1. INPUT: TOTEM & RECEPÇÃO',
    [
      `N = ${s.totalInput} (100% Porta)`,
      `Fila Totem->Guichê: Méd ${s.waitTotemToRecepStats.mean}m (Med ${s.waitTotemToRecepStats.median}m)`,
      `Cadastro Ficha: Méd ${s.recepRegistrationStats.mean}m (Med ${s.recepRegistrationStats.median}m)`,
    ],
    `Evasão Pré-Médica: ${s.preMedEvasionCount} (${s.preMedEvasionPct}%)`,
    '#0f172a',
    '#ffffff',
    '#64748b'
  );

  drawArrowCanvas(425, 390, 515, 390, `Fila: ${s.waitRecepToDocStats.mean}m`, '#dc2626');

  drawBox(
    520,
    270,
    410,
    240,
    '2. 1º ATENDIMENTO (GATEKEEPER)',
    [
      `N = ${s.attendedByDoctorCount} (${s.attendedByDoctorPct}% Atendidos)`,
      `Porta-Médico: Méd ${s.doorToDocTotalStats.mean}m | P90 ${s.doorToDocTotalStats.p90}m`,
      `1ª Consulta: Méd ${s.firstConsultDurationStats.mean}m (Med ${s.firstConsultDurationStats.median}m)`,
    ],
    `SLA <= 20 min: ${data.withinSlaDoorToDocRate}% na meta`,
    '#1d4ed8',
    '#eff6ff',
    '#3b82f6'
  );

  drawArrowCanvas(935, 330, 1055, 235, `${s.directDischargePct}% Alta 1ºAt`, '#16a34a');
  drawArrowCanvas(935, 390, 1055, 470, `${s.fastReavMedOnlyPct}% Só Med`, '#d97706');
  drawArrowCanvas(935, 450, 1055, 735, `${s.diagnosticExamsLoopPct}% Exames`, '#b45309');

  drawBox(
    1060,
    140,
    580,
    205,
    'RAMO A: ALTA DIRETA NO 1º ATENDIMENTO (SINGLE-TOUCH)',
    [
      `N = ${s.directDischargeCount} (${s.directDischargePct}% do PS) — Sem Exames/Med`,
      `Permanência Total: Méd ${s.directDischargeLosStats.mean}m (±${s.directDischargeLosStats.stdDev}m)`,
      `Mediana: ${s.directDischargeLosStats.median}m | P90: ${s.directDischargeLosStats.p90}m`,
    ],
    'Resolução Direta no Consultório (Sem Handoff)',
    '#15803d',
    '#f0fdf4',
    '#22c55e'
  );

  drawBox(
    1060,
    370,
    580,
    215,
    'RAMO B1: FAST REAV / GIRO TERAPÊUTICO (SÓ MEDICAÇÃO)',
    [
      `N = ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}% do PS) — Sem Lab/Imagem`,
      `Espera Início Med: ${s.waitMedStartStats.mean}m | Infusão ADM: ${s.medInfusionDurationStats.mean}m`,
      `Permanência Total: Méd ${s.fastReavMedOnlyLosStats.mean}m (Med ${s.fastReavMedOnlyLosStats.median}m)`,
    ],
    `Total Medicados no PS: ${s.medicatedCount} (${s.medicatedPct}%)`,
    '#d97706',
    '#fffbeb',
    '#f59e0b'
  );

  drawBox(
    1060,
    610,
    580,
    255,
    'RAMO B2: GIRO DIAGNÓSTICO (LAB / TC / RX / USG)',
    [
      `N = ${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}% do PS em Exames)`,
      `Lab: ${s.labCount} (${s.labPct}%) [Coleta ${s.waitLabCollectStats.mean}m + Laudo ${s.waitLabReportStats.mean}m]`,
      `TC: ${s.tcCount} (${s.tcPct}%) [Ciclo ${s.waitTcTotalStats.mean}m] | RX: ${s.rxCount} (${s.rxPct}%) | USG: ${s.usgCount}`,
    ],
    `LOS Médio c/ Exames: ${s.diagnosticExamsLoopLosStats.mean}m (Med ${s.diagnosticExamsLoopLosStats.median}m)`,
    '#b45309',
    '#fef3c7',
    '#d97706'
  );

  drawArrowCanvas(1645, 480, 1765, 310, `Pós-Laudo: ${s.postReportReavalWaitStats.mean}m`, '#0369a1');
  drawArrowCanvas(1645, 735, 1765, 650, `${s.admittedTotalPct}% Internam`, '#be123c');

  drawBox(
    1770,
    140,
    590,
    310,
    'OUTPUT 1: ALTA PÓS-PROPEDÊUTICA & EFEITO HANDOFF',
    [
      `N = ${s.postPropDischargeCount} (${s.postPropDischargePct}% do PS) + ${s.postConsultEvasionCount} Evasões`,
      `Permanência: Méd ${s.postPropDischargeLosStats.mean}m (Med ${s.postPropDischargeLosStats.median}m | P90 ${s.postPropDischargeLosStats.p90}m)`,
      `Fila Pós-Laudo p/ Reavaliação: Méd ${s.postReportReavalWaitStats.mean}m (Med ${s.postReportReavalWaitStats.median}m)`,
      `Troca de Médico (Handoff em ${s.handoffDoctorPct}% dos casos):`,
    ],
    `Mesmo Médico: Med ${s.sameDoctorLosStats.median}m  vs.  Com Handoff: Med ${s.handoffDoctorLosStats.median}m`,
    '#0369a1',
    '#f0f9ff',
    '#38bdf8'
  );

  drawBox(
    1770,
    490,
    590,
    375,
    'OUTPUT 2: INTERNAÇÃO & BOARDING REAL (UI / UTI)',
    [
      `N = ${s.admittedTotalCount} (${s.admittedTotalPct}%) -> UI: ${s.admittedUiCount} (${s.admittedUiPct}%) | UTI: ${s.admittedUtiCount} (${s.admittedUtiPct}%)`,
      `Etapa 1 (Desfecho -> Leito Virtual/Plano): Méd ${s.t1DecisionToVirtualBedStats.mean}m (P90 ${s.t1DecisionToVirtualBedStats.p90}m)`,
      `Etapa 2 (Virtual -> Leito Físico UI/UTI): Méd +${s.t2VirtualToPhysicalBedStats.mean}m (Med ${s.t2VirtualToPhysicalBedStats.median}m)`,
      `Boarding Total (Aguardo->Unid): Méd ${s.totalBoardingStats.mean}m (Med ${s.totalBoardingStats.median}m)`,
    ],
    `Mudança CID: ${vsm.diagnosticGovernance.reclassifiedPct}% | CC: ${vsm.surgicalAdmissionsPct}% | Horas Retidas: ${vsm.wastedBedHoursInBoarding}h`,
    '#be123c',
    '#fff1f2',
    '#f43f5e'
  );

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(40, 910, 2320, 520, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(
    `LINHA DO TEMPO LEAN VSM (VALOR AGREGADO VA: ${s.vaMinutesMean}m [${s.pceEfficiencyPct}%] vs. ESPERA SISTÊMICA NVA: ${s.nvaMinutesMean}m) & CENSO SIMULTÂNEO HORÁRIO (07h–06h)`,
    70,
    955
  );

  const pts = vsm.hourlySimultaneousOverall;
  const maxSim = Math.max(...pts.map((p) => p.totalSimultaneousMean), 10) * 1.2;
  const gX = 90;
  const gY = 1000;
  const gW = 2220;
  const gH = 360;
  const slotW = gW / 24;
  const bW = slotW * 0.65;

  pts.forEach((pt, idx) => {
    const bx = gX + idx * slotW + (slotW - bW) / 2;
    const h1 = (pt.portaMean / maxSim) * gH;
    const h2 = (pt.fastReavMedMean / maxSim) * gH;
    const h3 = (pt.giroExamesMean / maxSim) * gH;
    const h4 = (pt.boardingMean / maxSim) * gH;

    let by = gY + gH;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(bx, by - h1, bW, h1);
    by -= h1;

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(bx, by - h2, bW, h2);
    by -= h2;

    ctx.fillStyle = '#d97706';
    ctx.fillRect(bx, by - h3, bW, h3);
    by -= h3;

    ctx.fillStyle = '#e11d48';
    ctx.fillRect(bx, by - h4, bW, h4);
    by -= h4;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pt.totalSimultaneousMean.toFixed(1), bx + bW / 2, by - 8);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 16px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(pt.label, bx + bW / 2, gY + gH + 28);
  });
  ctx.textAlign = 'left';

  const safePeriod = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = document.createElement('a');
  link.download = `Mapa_Jornada_VSM_Lean_PS_${safePeriod}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============================================================================
// GERADOR DE PDF COMPARATIVO MULTIMENSAL (MOM — 2 PÁGINAS C/ ANEXO TÉCNICO)
// ============================================================================

export function generateComparisonPdf(months: EmergencyAnalyticsData[]): void {
  if (!months || months.length === 0) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const sorted = [...months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  drawHeaderBanner(
    doc,
    'COMPARATIVO MULTIMENSAL (MOM) — JORNADA DO PACIENTE, VSM LEAN & BOARDING',
    `Evolução Histórica entre Competências (${sorted.map((m) => m.periodLabel).join(' vs. ')})`,
    `${sorted.length} Meses`,
    1,
    2
  );

  const mCount = sorted.length;
  const firstColW = 75;
  const remW = (277 - firstColW) / Math.max(mCount, 1);

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [firstColW, ...Array(mCount).fill(remW)],
    head: ['Indicador Executivo / Nó do VSM', ...sorted.map((m) => m.periodLabel)],
    body: [
      ['Volume Total de Atendimentos (N)', ...sorted.map((m) => `${m.totalAttendances}`)],
      ['Média Diária (±DP) | Mediana', ...sorted.map((m) => `${m.dailyVolume.overall.mean}/d (±${m.dailyVolume.overall.stdDev}) | Med: ${m.dailyVolume.overall.median}`)],
      ['Porta-Médico: Média (±DP) | Mediana (P90)', ...sorted.map((m) => fmtStatShort(m.doorToDoctor.overall))],
      ['% Dentro da Meta Porta-Médico (<= 20 min)', ...sorted.map((m) => `${m.withinSlaDoorToDocRate}%`)],
      ['Ramo A: Alta Direta no 1º Atendimento (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.directDischargePct}% (${m.vsm.monthlyOverall.directDischargeCount})`)],
      ['Sub-Ramo B1: Fast Reav — Apenas Medicação (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.fastReavMedOnlyPct}% (${m.vsm.monthlyOverall.fastReavMedOnlyCount})`)],
      ['Sub-Ramo B2: Giro Diagnóstico — Lab/Imagem (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.diagnosticExamsLoopPct}% (${m.vsm.monthlyOverall.diagnosticExamsLoopCount})`)],
      ['Fila Invisível Pós-Laudo p/ Reavaliação', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.postReportReavalWaitStats))],
      ['Taxa de Handoff Interno (Troca de Médico)', ...sorted.map((m) => `${m.vsm.monthlyOverall.handoffDoctorPct}%`)],
      ['Taxa de Conversão em Internação (%)', ...sorted.map((m) => `${m.conversionRate}% (${m.totalAdmissions})`)],
      ['Boarding Total Real (Média ±DP | Mediana)', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.totalBoardingStats))],
      ['Eficiência Lean do Processo (PCE %)', ...sorted.map((m) => `${m.vsm.monthlyOverall.pceEfficiencyPct}%`)],
    ],
    headFillColor: [15, 23, 42],
    fontSize: 7.0,
    rowHeight: 6.2,
  });

  // Página 2 do Comparativo: Anexo Técnico e Metodologia
  doc.addPage('a4', 'landscape');
  drawMethodologyAnnexPage(doc, `${sorted.length} Meses`, 2, 2);

  doc.save('Comparativo_Multimensal_VSM_PS.pdf');
}

export const exportEmergencyPdf = generateEmergencyPdf;
export const downloadEmergencyPdf = generateEmergencyPdf;
export const exportComparisonPdf = generateComparisonPdf;
export const exportVsmPngImage = generateVsmPngImage;