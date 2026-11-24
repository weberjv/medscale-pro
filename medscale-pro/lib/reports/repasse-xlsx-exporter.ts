// ============================================================================
// EXPORTADOR ESTILIZADO DE PLANILHA DE REPASSE (.XLSX) - PADRÃO SEGMENTAÇÃO
// ============================================================================
import ExcelJS from 'exceljs';

export interface ExportRepasseXlsxInput {
  config: any;
  payrollRows: any[];
  competenceMonth: string;
  effectiveWindow: { startStr: string; endStr: string };
  holidayDates?: string[];
}

function colIndexToLetter(colIdx1Based: number): string {
  let temp = colIdx1Based;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

function parseIsoDateLocal(isoStr: string): Date {
  const [y, m, d] = String(isoStr).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0);
}

function addDaysIsoLocal(isoStr: string, days: number): string {
  const dt = parseIsoDateLocal(isoStr);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().split('T')[0];
}

function splitShiftIntoMTN(
  startTime: string,
  endTime: string
): { M: number; T: number; N: number } {
  const [sh, sm] = String(startTime || '07:00').split(':').map(Number);
  const [eh, em] = String(endTime || '19:00').split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return { M: 0, T: 0, N: 0 };

  const toCycleMinutes = (h: number, m: number) => {
    const total = h * 60 + (m || 0);
    return total >= 7 * 60 ? total - 7 * 60 : total + 17 * 60;
  };

  const startMin = toCycleMinutes(sh, sm);
  let endMin = toCycleMinutes(eh, em);
  if (endMin <= startMin) endMin += 24 * 60;

  const overlapHours = (winStart: number, winEnd: number) => {
    const a = Math.max(startMin, winStart);
    const b = Math.min(endMin, winEnd);
    return b > a ? Math.round(((b - a) / 60) * 100) / 100 : 0;
  };

  return {
    M: overlapHours(0, 360),
    T: overlapHours(360, 720),
    N: overlapHours(720, 1440)
  };
}

function mapPositionLabel(doc: any): string {
  const roleStr = String(doc?.role || 'Plantonista').trim();
  const low = roleStr.toLowerCase();
  if (low.includes('coordenad')) return 'COORDENADOR';
  if (low.includes('supervis')) return 'SUPERVISÃO';
  if (low.includes('rotina') || low.includes('sênior') || low.includes('senior')) {
    return 'Rotina';
  }
  return 'PLANTONISTA';
}

const solidFill = (argb: string): ExcelJS.FillPattern => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb }
});

const thinSide: Partial<ExcelJS.Border> = {
  style: 'thin',
  color: { argb: 'FFCBD5E1' }
};

const medDarkSide: Partial<ExcelJS.Border> = {
  style: 'medium',
  color: { argb: 'FF1F3864' }
};

export async function exportRepasseMonthlyXlsx(input: ExportRepasseXlsxInput) {
  if (typeof window === 'undefined') return;

  const {
    config = {},
    payrollRows = [],
    competenceMonth = '2026-11',
    effectiveWindow = { startStr: '2026-10-26', endStr: '2026-11-25' },
    holidayDates = []
  } = input;

  const holidaySet = new Set(holidayDates);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Segmentação', {
    views: [{ state: 'frozen', xSplit: 9, ySplit: 8, showGridLines: true }]
  });

  const hospitalName = config?.hospitalUnitName || "Hospital Glória D'Or";
  const sectorName = config?.sectorUnitName || 'Emergência Adulto';

  // Alturas das linhas
  ws.getRow(1).height = 6;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 15;
  ws.getRow(5).height = 16;
  ws.getRow(6).height = 16;
  ws.getRow(7).height = 20;
  ws.getRow(8).height = 18;

  // Estilo institucional nas colunas B..I (linhas 2..7)
  for (let r = 2; r <= 7; r++) {
    for (let c = 2; c <= 9; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = solidFill('FF1F3864');
      cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: r === 2 ? medDarkSide : undefined,
        bottom: r === 7 ? medDarkSide : undefined,
        left: c === 2 ? medDarkSide : undefined,
        right: c === 9 ? medDarkSide : undefined
      };
    }
  }

  ws.getCell('B2').value = hospitalName;
  ws.getCell('B2').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };

  ws.getCell('B3').value = sectorName;
  ws.getCell('B3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };

  ws.getCell('B5').value = 'EMPRESAS = ';
  ws.getCell('B6').value = 'MÉDICOS = ';

  const startDateObj = parseIsoDateLocal(effectiveWindow.startStr);
  const endDateObj = parseIsoDateLocal(effectiveWindow.endStr);

  ws.getCell('I2').value = 'Vigência';
  ws.getCell('I2').alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell('I3').value = startDateObj;
  ws.getCell('I3').numFmt = 'dd/mm/yyyy';
  ws.getCell('I3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getCell('I4').value = {
    formula: 'DATE(YEAR(I3),MONTH(I3)+1,DAY(I3)-1)',
    result: endDateObj
  };
  ws.getCell('I4').numFmt = 'dd/mm/yyyy';
  ws.getCell('I4').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getCell('I6').value = 'Pagamento';
  ws.getCell('I6').alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell('I7').value = {
    formula:
      'IF(WEEKDAY(DATE(YEAR(I4),MONTH(I4)+1,15))=1,DATE(YEAR(I4),MONTH(I4)+1,15)+1,IF(WEEKDAY(DATE(YEAR(I4),MONTH(I4)+1,15))=7,DATE(YEAR(I4),MONTH(I4)+1,15)+2,DATE(YEAR(I4),MONTH(I4)+1,15)))'
  };
  ws.getCell('I7').numFmt = 'dd/mm/yyyy';
  ws.getCell('I7').alignment = { vertical: 'middle', horizontal: 'center' };

  // Cabeçalhos cadastrais (B8:I8)
  const cadHeaders = [
    'PROFISSIONAL',
    'COD CONSELHO',
    'EMPRESA',
    'CNPJ',
    'EMAIL NF',
    'ESPECIALIDADE',
    'SETOR',
    'POSIÇÃO'
  ];
  cadHeaders.forEach((h, idx) => {
    const c = 2 + idx;
    const cell = ws.getCell(8, c);
    cell.value = h;
    cell.fill = solidFill('FF1F3864');
    cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: medDarkSide,
      bottom: medDarkSide,
      left: thinSide,
      right: thinSide
    };
  });

  // ==========================================================================
  // GRADE DIÁRIA: 31 BLOCOS DE 3 COLUNAS (J..CX) COM FÓRMULA CONDICIONAL ATÉ $I$4
  // ==========================================================================
  const MAX_DAYS = 31;
  const GRID_START_COL = 10; // J
  const GRID_END_COL = GRID_START_COL + MAX_DAYS * 3 - 1; // CX (col 102)
  const gridEndColLetter = colIndexToLetter(GRID_END_COL);

  const dateToBlockCols: Record<string, { colM: number; colT: number; colN: number }> = {};

  for (let dayIdx = 0; dayIdx < MAX_DAYS; dayIdx++) {
    const colM = GRID_START_COL + dayIdx * 3;
    const colT = colM + 1;
    const colN = colM + 2;

    const letM = colIndexToLetter(colM);
    const letT = colIndexToLetter(colT);
    const letN = colIndexToLetter(colN);

    const dayIso = addDaysIsoLocal(effectiveWindow.startStr, dayIdx);
    const isInsideWindow = dayIso <= effectiveWindow.endStr;
    const dayDateVal = parseIsoDateLocal(dayIso);

    if (isInsideWindow) {
      dateToBlockCols[dayIso] = { colM, colT, colN };
    }

    // Mescla M e T na linha 5 para a data
    ws.mergeCells(5, colM, 5, colT);

    const cM5 = ws.getCell(5, colM);
    const cN5 = ws.getCell(5, colN);

    if (dayIdx === 0) {
      cM5.value = {
        formula: 'IF($I$3<=$I$4,$I$3,"")',
        result: isInsideWindow ? startDateObj : ''
      };
      cN5.value = {
        formula: `IF(${letM}5="","",${letM}5)`,
        result: isInsideWindow ? startDateObj : ''
      };
    } else {
      const prevLetM = colIndexToLetter(colM - 3);
      const prevLetN = colIndexToLetter(colN - 3);
      cM5.value = {
        formula: `IF(${prevLetM}5="","",IF(${prevLetM}5+1<=$I$4,${prevLetM}5+1,""))`,
        result: isInsideWindow ? dayDateVal : ''
      };
      cN5.value = {
        formula: `IF(${prevLetN}5="","",IF(${prevLetN}5+1<=$I$4,${prevLetN}5+1,""))`,
        result: isInsideWindow ? dayDateVal : ''
      };
    }

    cM5.numFmt = '[$-416]d\\-mmm';
    cN5.numFmt = 'ddd';

    [cM5, ws.getCell(5, colT), cN5].forEach((cell, iSub) => {
      cell.fill = solidFill('FF1F3864');
      cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: thinSide,
        bottom: thinSide,
        left: iSub === 0 ? medDarkSide : thinSide,
        right: thinSide
      };
    });

    // Linha 6: Turnos M, T, N
    const shiftsLabels: [number, string][] = [
      [colM, 'M'],
      [colT, 'T'],
      [colN, 'N']
    ];
    shiftsLabels.forEach(([cIdx, lbl]) => {
      const cell = ws.getCell(6, cIdx);
      cell.value = lbl;
      cell.fill = solidFill('FFE2E8F0');
      cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: thinSide,
        bottom: medDarkSide,
        left: thinSide,
        right: thinSide
      };
    });

    // Linhas 2, 3, 4 e 8
    [
      [colM, letM],
      [colT, letT],
      [colN, letN]
    ].forEach(([cIdx, cLet]: any) => {
      const r2 = ws.getCell(2, cIdx);
      const r3 = ws.getCell(3, cIdx);
      const r4 = ws.getCell(4, cIdx);
      const r8 = ws.getCell(8, cIdx);

      if (cIdx === colN) {
        r2.value = { formula: `=IF(${letN}5="","",TEXT(${letN}5,"[$-416]ddd"))` };
      } else if (cIdx === colT) {
        r2.value = { formula: `=${letN}2` };
      } else {
        r2.value = { formula: `=${letT}2` };
      }

      r3.value = { formula: `=IF(${cLet}2="","",CONCATENATE(${cLet}6,${cLet}2))` };
      r4.value = {
        formula: `=IF(${cLet}2="","",IF(${cLet}8="",TEXT(CONCATENATE(${cLet}6,${cLet}2),""),TEXT(CONCATENATE("F",${cLet}2),"")))`
      };

      if (isInsideWindow && holidaySet.has(dayIso)) {
        r8.value = 'F';
      }

      [r2, r3, r4, r8].forEach(cObj => {
        cObj.font = { name: 'Calibri', size: 8, bold: cObj === r8, color: { argb: 'FF334155' } };
        cObj.alignment = { vertical: 'middle', horizontal: 'center' };
        cObj.border = {
          top: thinSide,
          bottom: cObj === r8 ? medDarkSide : thinSide,
          left: thinSide,
          right: thinSide
        };
      });
    });
  }

  // ==========================================================================
  // COLUNAS DE CONSOLIDAÇÃO (CZ..DN -> 104..118) COM ESTILO ORIGINAL
  // ==========================================================================
  const colWeekHrs = GRID_END_COL + 2; // 104 (CZ)
  const colWkndHrs = colWeekHrs + 1; // 105 (DA)
  const colTotalHrs = colWeekHrs + 3; // 107 (DC)
  const colShifts12h = colWeekHrs + 4; // 108 (DD)
  const colTotalFixed = colWeekHrs + 5; // 109 (DE)
  const col13th = colWeekHrs + 6; // 110 (DF)
  const colWkndAdd = colWeekHrs + 7; // 111 (DG)
  const colSubTotal = colWeekHrs + 8; // 112 (DH)
  const colChefia = colWeekHrs + 9; // 113 (DI)
  const colFerias = colWeekHrs + 10; // 114 (DJ)
  const colExtraCov = colWeekHrs + 11; // 115 (DK)
  const colObs = colWeekHrs + 12; // 116 (DL)
  const colGrossPay = colWeekHrs + 14; // 118 (DN)

  const letWeekHrs = colIndexToLetter(colWeekHrs);
  const letWkndHrs = colIndexToLetter(colWkndHrs);
  const letTotalHrs = colIndexToLetter(colTotalHrs);
  const letShifts12h = colIndexToLetter(colShifts12h);
  const letTotalFixed = colIndexToLetter(colTotalFixed);
  const let13th = colIndexToLetter(col13th);
  const letWkndAdd = colIndexToLetter(colWkndAdd);
  const letSubTotal = colIndexToLetter(colSubTotal);
  const letChefia = colIndexToLetter(colChefia);
  const letFerias = colIndexToLetter(colFerias);
  const letExtraCov = colIndexToLetter(colExtraCov);
  const letGrossPay = colIndexToLetter(colGrossPay);

  const summaryConfig: [number, string, string, string][] = [
    [colWeekHrs, 'SEMANA\nTOTAL HORAS', 'FF2F5496', 'FFFFFFFF'],
    [colWkndHrs, 'FDS\nTOTAL HORAS ', 'FF2F5496', 'FFFFFFFF'],
    [colTotalHrs, 'TOTAL \nHORAS', 'FFFF6D6D', 'FF0F172A'],
    [colShifts12h, 'PLANTÃO 12HS', 'FFFF6D6D', 'FF0F172A'],
    [colTotalFixed, 'TOTAL FIXO', 'FF2F5496', 'FFFFFFFF'],
    [col13th, '13 salário 1/12 avos', 'FF2F5496', 'FFFFFFFF'],
    [colWkndAdd, 'Adicional Final de semana ou Feriado', 'FF2F5496', 'FFFFFFFF'],
    [colSubTotal, 'TOTAL \nR$', 'FFFF6D6D', 'FF0F172A'],
    [colChefia, 'Chefia', 'FF2F5496', 'FFFFFFFF'],
    [colFerias, 'Férias ou licença', 'FF2F5496', 'FFFFFFFF'],
    [colExtraCov, 'Cobertura extra', 'FF2F5496', 'FFFFFFFF'],
    [colObs, 'Obs', 'FF2F5496', 'FFFFFFFF'],
    [colGrossPay, 'VALOR BRUTO A PAGAR', 'FF333F4F', 'FFFFFFFF']
  ];

  summaryConfig.forEach(([cIdx, title, bgHex, txtHex]) => {
    ws.mergeCells(7, cIdx, 8, cIdx);
    const cell = ws.getCell(7, cIdx);
    cell.value = title;
    cell.fill = solidFill(bgHex);
    cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: txtHex } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: thinSide,
      bottom: medDarkSide,
      left: thinSide,
      right: cIdx === colGrossPay ? medDarkSide : thinSide
    };
  });

  // Destaque superior VALOR BRUTO NOTA FISCAL
  ws.mergeCells(3, colGrossPay, 4, colGrossPay);
  const nfHeaderCell = ws.getCell(3, colGrossPay);
  nfHeaderCell.value = 'VALOR BRUTO\nNOTA FISCAL';
  nfHeaderCell.fill = solidFill('FFFFFF00');
  nfHeaderCell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FFFF0000' } };
  nfHeaderCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  nfHeaderCell.border = {
    top: thinSide,
    bottom: thinSide,
    left: thinSide,
    right: medDarkSide
  };

  // ==========================================================================
  // LINHAS DOS MÉDICOS (A PARTIR DA LINHA 9)
  // ==========================================================================
  const rowsToExport = payrollRows.filter(
    r => Number(r?.shiftsCount || 0) > 0 || Number(r?.netTotal || 0) > 0
  );

  const startDataRow = 9;
  const endDataRow = Math.max(startDataRow, startDataRow + rowsToExport.length - 1);
  const totalFooterRow = endDataRow + 1;

  const weekdayKeys = [
    'Mseg', 'Mter', 'Mqua', 'Mqui', 'Msex',
    'Tseg', 'Tter', 'Tqua', 'Tqui', 'Tsex',
    'Nseg', 'Nter', 'Nqua', 'Nqui', 'Nsex'
  ];
  const weekendAndHolidayKeys = [
    'Msáb', 'Mdom', 'Tsáb', 'Tdom', 'Nsáb', 'Ndom',
    'Fseg', 'Fter', 'Fqua', 'Fqui', 'Fsex', 'Fsáb', 'Fdom'
  ];

  const currencyFmt = '"R$"\\ #,##0.00';

  rowsToExport.forEach((row, idx) => {
    const r = startDataRow + idx;
    ws.getRow(r).height = 16;
    const doc = row.doctor || {};
    const isEven = idx % 2 === 1;
    const zebraFill = isEven ? solidFill('FFF8FAFC') : undefined;

    const cadValues: [number, string, boolean][] = [
      [2, String(doc.name || '').toUpperCase(), true],
      [3, String(doc.crm || '—'), false],
      [4, String(doc.razaoSocial || '—').toUpperCase(), false],
      [5, String(doc.cnpj || '—'), false],
      [6, String(doc.email || ''), false],
      [7, String(doc.specialty || 'Medicina de Emergência'), false],
      [8, sectorName, false],
      [9, mapPositionLabel(doc), true]
    ];

    cadValues.forEach(([cIdx, valStr, isBold]) => {
      const cell = ws.getCell(r, cIdx);
      cell.value = valStr;
      if (zebraFill) cell.fill = zebraFill;
      cell.font = { name: 'Calibri', size: 8.5, bold: isBold, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 2 || cIdx === 4 || cIdx === 6 ? 'left' : 'center'
      };
      cell.border = {
        top: thinSide,
        bottom: thinSide,
        left: cIdx === 2 ? medDarkSide : thinSide,
        right: cIdx === 9 ? medDarkSide : thinSide
      };
    });

    // Grade M/T/N
    const gridAccumulator: Record<string, { M: number; T: number; N: number }> = {};
    const dailyList: any[] = Array.isArray(row.dailyWorkedScheduleList)
      ? row.dailyWorkedScheduleList
      : [];

    dailyList.forEach(sh => {
      const dStr = String(sh?.date || '');
      if (!dateToBlockCols[dStr]) return;
      if (!gridAccumulator[dStr]) {
        gridAccumulator[dStr] = { M: 0, T: 0, N: 0 };
      }
      const split = splitShiftIntoMTN(sh.startTime, sh.endTime);
      gridAccumulator[dStr].M = Math.round((gridAccumulator[dStr].M + split.M) * 100) / 100;
      gridAccumulator[dStr].T = Math.round((gridAccumulator[dStr].T + split.T) * 100) / 100;
      gridAccumulator[dStr].N = Math.round((gridAccumulator[dStr].N + split.N) * 100) / 100;
    });

    for (let c = GRID_START_COL; c <= GRID_END_COL; c++) {
      const cell = ws.getCell(r, c);
      if (zebraFill) cell.fill = zebraFill;
      cell.font = { name: 'Calibri', size: 8, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: thinSide,
        bottom: thinSide,
        left: thinSide,
        right: thinSide
      };
      cell.numFmt = '#,##0.0';
    }

    Object.entries(gridAccumulator).forEach(([dStr, mtn]) => {
      const cols = dateToBlockCols[dStr];
      if (!cols) return;
      if (mtn.M > 0) ws.getCell(r, cols.colM).value = mtn.M;
      if (mtn.T > 0) ws.getCell(r, cols.colT).value = mtn.T;
      if (mtn.N > 0) ws.getCell(r, cols.colN).value = mtn.N;
    });

    // Fórmulas de horas
    const rangeRow = `J${r}:${gridEndColLetter}${r}`;
    const rangeHeader = `$J$4:$${gridEndColLetter}$4`;

    const weekFormula = weekdayKeys
      .map(k => `SUMIF(${rangeHeader},"${k}",${rangeRow})`)
      .join('+');
    const wkndFormula = weekendAndHolidayKeys
      .map(k => `SUMIF(${rangeHeader},"${k}",${rangeRow})`)
      .join('+');

    const cWeek = ws.getCell(r, colWeekHrs);
    cWeek.value = { formula: weekFormula };
    cWeek.numFmt = '#,##0.0';

    const cWknd = ws.getCell(r, colWkndHrs);
    cWknd.value = { formula: wkndFormula };
    cWknd.numFmt = '#,##0.0';

    const cTotHrs = ws.getCell(r, colTotalHrs);
    cTotHrs.value = { formula: `SUM(${letWeekHrs}${r}:${letWkndHrs}${r})` };
    cTotHrs.numFmt = '#,##0.0';

    const c12h = ws.getCell(r, colShifts12h);
    c12h.value = { formula: `${letTotalHrs}${r}/12` };
    c12h.numFmt = '#,##0.00';

    // Valores financeiros
    const fixedNet = Math.max(
      0,
      Number(row.fixedBaseSubtotal || 0) - Number(row.totalPassagensDiscounts || 0)
    );
    const additionals: any[] = Array.isArray(row.evaluatedAdditionals)
      ? row.evaluatedAdditionals
      : [];

    let weekendAddTotal = 0;
    let chefiaAddTotal = 0;
    let otherAddsTotal = 0;

    additionals.forEach(add => {
      const amt = Number(add?.totalAmount || 0);
      if (amt === 0) return;
      const nameLow = String(add?.name || '').toLowerCase();
      if (
        add?.isWeekendFixedQuotaAdditional ||
        add?.applicationTarget === 'weekend_fixed_quota' ||
        nameLow.includes('fim de semana') ||
        nameLow.includes('final de semana')
      ) {
        weekendAddTotal += amt;
      } else if (
        add?.isThirteenthInstallment ||
        add?.applicationTarget === 'thirteenth_1_12_fixed' ||
        nameLow.includes('13') ||
        nameLow.includes('décimo')
      ) {
        // Calculado pela fórmula =TOTAL_FIXO/12
      } else if (
        add?.isNightLeaderAdditional ||
        add?.applicationTarget === 'night_leader_shift' ||
        nameLow.includes('chefia') ||
        nameLow.includes('líder') ||
        nameLow.includes('lider')
      ) {
        chefiaAddTotal += amt;
      } else {
        otherAddsTotal += amt;
      }
    });

    const extraCoverageTotal = Math.max(
      0,
      Number(row.extraBaseSubtotal || 0) +
        otherAddsTotal +
        Number(row.manualAdjustmentsNet || 0)
    );

    const obsNotes: string[] = [];
    if (Number(row.totalPassagensDiscounts || 0) > 0) {
      obsNotes.push(
        `Descontos trocas/férias: R$ ${Number(row.totalPassagensDiscounts).toFixed(2)}`
      );
    }
    if (Number(row.nightLeaderShiftsCount || 0) > 0) {
      obsNotes.push(`Líder Noturno (${row.nightLeaderShiftsCount}x)`);
    }
    if (Array.isArray(row.manualAdjustmentsList) && row.manualAdjustmentsList.length > 0) {
      row.manualAdjustmentsList.forEach((adj: any) => {
        if (adj?.description) obsNotes.push(adj.description);
      });
    }

    const cFixed = ws.getCell(r, colTotalFixed);
    cFixed.value = Math.round(fixedNet * 100) / 100;
    cFixed.numFmt = currencyFmt;

    const c13 = ws.getCell(r, col13th);
    c13.value = {
      formula: row.isFixedScheduleDoctor ? `${letTotalFixed}${r}/12` : '0'
    };
    c13.numFmt = currencyFmt;

    const cWkndAdd = ws.getCell(r, colWkndAdd);
    cWkndAdd.value = Math.round(weekendAddTotal * 100) / 100;
    cWkndAdd.numFmt = currencyFmt;

    const cSub = ws.getCell(r, colSubTotal);
    cSub.value = { formula: `SUM(${letTotalFixed}${r}:${letWkndAdd}${r})` };
    cSub.numFmt = currencyFmt;

    const cChef = ws.getCell(r, colChefia);
    cChef.value = Math.round(chefiaAddTotal * 100) / 100;
    cChef.numFmt = currencyFmt;

    const cFer = ws.getCell(r, colFerias);
    cFer.value = 0;
    cFer.numFmt = currencyFmt;

    const cExt = ws.getCell(r, colExtraCov);
    cExt.value = Math.round(extraCoverageTotal * 100) / 100;
    cExt.numFmt = currencyFmt;

    const cObs = ws.getCell(r, colObs);
    cObs.value = obsNotes.join(' | ');
    cObs.alignment = { vertical: 'middle', horizontal: 'left' };

    const cGross = ws.getCell(r, colGrossPay);
    cGross.value = { formula: `SUM(${letSubTotal}${r}:${letExtraCov}${r})` };
    cGross.numFmt = currencyFmt;

    [
      cWeek,
      cWknd,
      cTotHrs,
      c12h,
      cFixed,
      c13,
      cWkndAdd,
      cSub,
      cChef,
      cFer,
      cExt,
      cObs,
      cGross
    ].forEach(cell => {
      if (zebraFill) cell.fill = zebraFill;
      cell.font = {
        name: 'Calibri',
        size: 8.5,
        bold: cell === cGross || cell === cSub,
        color: { argb: 'FF0F172A' }
      };
      if (cell !== cObs) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
      cell.border = {
        top: thinSide,
        bottom: thinSide,
        left: thinSide,
        right: cell === cGross ? medDarkSide : thinSide
      };
    });
  });

  // ==========================================================================
  // LINHA DE TOTAIS NO RODAPÉ + VALOR BRUTO NOTA FISCAL NO TOPO
  // ==========================================================================
  ws.getRow(totalFooterRow).height = 20;
  const cTotLabel = ws.getCell(totalFooterRow, 2);
  cTotLabel.value = 'TOTAL';
  cTotLabel.fill = solidFill('FFE2E8F0');
  cTotLabel.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  cTotLabel.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 2; c <= colGrossPay; c++) {
    const cell = ws.getCell(totalFooterRow, c);
    cell.fill = solidFill('FFE2E8F0');
    cell.border = {
      top: thinSide,
      bottom: medDarkSide,
      left: thinSide,
      right: thinSide
    };
    if (c >= GRID_START_COL && c <= GRID_END_COL) {
      const colLet = colIndexToLetter(c);
      cell.value = { formula: `SUM(${colLet}${startDataRow}:${colLet}${endDataRow})` };
      cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.numFmt = '#,##0.0';
    }
  }

  const footerSumCols: [number, boolean][] = [
    [colWeekHrs, false],
    [colWkndHrs, false],
    [colTotalHrs, false],
    [colShifts12h, false],
    [colTotalFixed, true],
    [col13th, true],
    [colWkndAdd, true],
    [colSubTotal, true],
    [colChefia, true],
    [colFerias, true],
    [colExtraCov, true],
    [colGrossPay, true]
  ];

  footerSumCols.forEach(([cIdx, isCurr]) => {
    const colLet = colIndexToLetter(cIdx);
    const cell = ws.getCell(totalFooterRow, cIdx);
    cell.value = { formula: `SUM(${colLet}${startDataRow}:${colLet}${endDataRow})` };
    cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.numFmt = isCurr ? currencyFmt : '#,##0.0';
  });

  const nfTotalCell = ws.getCell(5, colGrossPay);
  nfTotalCell.value = { formula: `${letGrossPay}${totalFooterRow}` };
  nfTotalCell.fill = solidFill('FFFEF9C3');
  nfTotalCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  nfTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
  nfTotalCell.numFmt = currencyFmt;
  nfTotalCell.border = {
    top: thinSide,
    bottom: medDarkSide,
    left: thinSide,
    right: medDarkSide
  };

  // Larguras de colunas
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 34;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 22;
  ws.getColumn(8).width = 20;
  ws.getColumn(9).width = 16;

  for (let c = GRID_START_COL; c <= GRID_END_COL; c++) {
    ws.getColumn(c).width = 6.2;
  }

  for (let c = GRID_END_COL + 1; c <= colGrossPay; c++) {
    ws.getColumn(c).width = c === colObs ? 40 : c === colGrossPay ? 20 : 15;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeMonth = String(competenceMonth || '2026-11').replace(/[^0-9-]/g, '');
  link.href = url;
  link.setAttribute('download', `Repasse_Medico_Segmentacao_${safeMonth}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}