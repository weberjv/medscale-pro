'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, Sliders, Plus, Trash2, Edit3, CheckCircle,
  UserCheck, Award, Briefcase, Download, ShieldCheck, Stethoscope,
  RotateCcw, Clock, Layers, Table, FileSpreadsheet, ChevronDown,
  ChevronUp, FileText, Printer, History, ShieldAlert, Percent, Save
} from 'lucide-react';

export default function StaffAndFinanceViews(props: any) {
  const {
    currentView = 'staff',
    config = {},
    setConfig,
    isAdmin = false,
    currentUser = {},
    setCurrentUser,
    doctors = [],
    setDoctors,
    activeDoctors = [],
    pendingDoctors = [],
    shifts = [],
    setShifts,
    vacations = [],
    setVacations,
    courses = [],
    setCourses,
    competenceMonth = '2026-10',
    setCompetenceMonth,
    competenceWindow = { startStr: '2026-09-26', endStr: '2026-10-25' },
    payrollReport = [],
    dynamicCategories = [],
    recordAction,
    setIsDoctorModalOpen,
    setEditingDoctor
  } = props || {};

  // Wrappers seguros
  const safeSetConfig = (updater: any) => {
    if (typeof setConfig === 'function') setConfig(updater);
  };
  const safeSetDoctors = (updater: any) => {
    if (typeof setDoctors === 'function') setDoctors(updater);
  };
  const safeSetShifts = (updater: any) => {
    if (typeof setShifts === 'function') setShifts(updater);
  };
  const safeSetVacations = (updater: any) => {
    if (typeof setVacations === 'function') setVacations(updater);
  };
  const safeSetCourses = (updater: any) => {
    if (typeof setCourses === 'function') setCourses(updater);
  };
  const safeSetCompetenceMonth = (val: string) => {
    if (typeof setCompetenceMonth === 'function') setCompetenceMonth(val);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeOpenDoctorModal = (doc: any | null) => {
    if (typeof setEditingDoctor === 'function') setEditingDoctor(doc);
    if (typeof setIsDoctorModalOpen === 'function') setIsDoctorModalOpen(true);
  };

  // Listas blindadas
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors =
    Array.isArray(activeDoctors) && activeDoctors.length > 0
      ? activeDoctors
      : safeDoctors.filter((d: any) => d?.status === 'Ativo');
  const safePendingDoctors =
    Array.isArray(pendingDoctors) && pendingDoctors.length > 0
      ? pendingDoctors
      : safeDoctors.filter((d: any) => d?.status === 'Pendente');
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safePayroll = Array.isArray(payrollReport) ? payrollReport : [];

  // Especialidades dinâmicas da Emergência
  const registeredSpecialtiesList: { id: string; name: string }[] =
    Array.isArray(config?.registeredSpecialties) && config.registeredSpecialties.length > 0
      ? config.registeredSpecialties
      : [
          { id: 'esp_1', name: 'Clínica Médica' },
          { id: 'esp_2', name: 'Emergência Médica' },
          { id: 'esp_3', name: 'Cardiologia' },
          { id: 'esp_4', name: 'Cirurgia Geral' },
          { id: 'esp_5', name: 'Ortopedia' },
          { id: 'esp_6', name: 'Pediatria' },
          { id: 'esp_7', name: 'Terapia Intensiva' }
        ];

  // Tipos de Cursos Cadastrados
  const registeredCourseTypes: { id: string; name: string }[] =
    Array.isArray(config?.courseTypes) && config.courseTypes.length > 0
      ? config.courseTypes
      : [
          { id: 'ct_acls', name: 'ACLS' },
          { id: 'ct_atls', name: 'ATLS' },
          { id: 'ct_pals', name: 'PALS' },
          { id: 'ct_bls', name: 'BLS' },
          { id: 'ct_pocus', name: 'POCUS / Ultrassom' }
        ];

  const allCourseNamesForExport = Array.from(
    new Set([
      ...registeredCourseTypes.map(c => c.name),
      ...safeCourses.map((c: any) => c?.courseName || c?.name).filter(Boolean)
    ])
  );

  // Funções cadastradas na Tabela de Remuneração
  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  // Estados locais para a aba de Corpo Clínico
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Todas');
  const [approvalLevels, setApprovalLevels] = useState<Record<number, number>>({});
  const [approvalSpecialties, setApprovalSpecialties] = useState<Record<number, string>>({});
  const [expandedFichaByDocId, setExpandedFichaByDocId] = useState<Record<number, boolean>>({});

  // Estados para adicionar Histórico de Trabalho e Ocorrências Individuais direto no cartão do médico
  const [historyDraftByDoc, setHistoryDraftByDoc] = useState<
    Record<number, { type: string; date: string; endDate: string; details: string }>
  >({});
  const [occDraftByDoc, setOccDraftByDoc] = useState<
    Record<number, { date: string; severity: string; title: string; description: string }>
  >({});

  // Estados locais para a aba de Tabela de Remuneração
  const [newSpecialtyName, setNewSpecialtyName] = useState<string>('');
  const [newFunctionForm, setNewFunctionForm] = useState({
    name: '',
    description: '',
    requiresSchedule: true,
    applyLeveling: true,
    fixedRate12h: 1500,
    extraWeekday12h: 1650,
    extraWeekend12h: 1850,
    monthlyFixedValue: 5000
  });

  // Estado para o Catálogo Avançado de Adicionais & Bonificações (Com % e Regra de Aplicação)
  const [newAdditionalForm, setNewAdditionalForm] = useState({
    name: '',
    incidence: 'shift' as 'shift' | 'monthly',
    calcMode: 'fixed' as 'fixed' | 'percent',
    applicationTarget: 'final_payroll' as 'final_payroll' | 'specific_function' | 'shift_base',
    targetFunctionName: allFunctionNames[0] || 'Plantonista',
    value12h: 250,
    percentValue: 10
  });

  // Estado para Edição do Próprio Cadastro pelo Médico (na aba "Meu Cadastro PJ" / profile)
  const myLoggedDoc =
    safeDoctors.find((d: any) => Number(d?.id) === Number(currentUser?.id)) || currentUser;

  const [isEditingMyProfile, setIsEditingMyProfile] = useState<boolean>(false);
  const [myProfileSavedMsg, setMyProfileSavedMsg] = useState<string>('');
  const [myProfileForm, setMyProfileForm] = useState({
    name: '',
    cpf: '',
    birthDate: '',
    rqe: '',
    email: '',
    phone: '',
    razaoSocial: '',
    cnpj: '',
    password: ''
  });

  useEffect(() => {
    if (myLoggedDoc) {
      setMyProfileForm({
        name: myLoggedDoc.name || '',
        cpf: myLoggedDoc.cpf || '',
        birthDate: myLoggedDoc.birthDate || '',
        rqe: myLoggedDoc.rqe || '',
        email: myLoggedDoc.email || '',
        phone: myLoggedDoc.phone || '',
        razaoSocial: myLoggedDoc.razaoSocial || '',
        cnpj: myLoggedDoc.cnpj || '',
        password: myLoggedDoc.password || '123'
      });
    }
  }, [myLoggedDoc?.id, currentView]);

  // ============================================================================
  // HELPER DE CÁLCULO DE HORAS E TAXAS (COM OU SEM NIVELAMENTO + DIA DE SEMANA VS FDS)
  // ============================================================================
  const getShiftHours = (s: any): number => {
    if (typeof s?.hours === 'number' && s.hours > 0) return s.hours;
    const st = String(s?.startTime || '07:00');
    const et = String(s?.endTime || '19:00');
    const [sh, sm] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 12;
    let diff = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
    if (diff <= 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const isWeekendDate = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return false;
    const day = d.getDay();
    return day === 0 || day === 6; // Domingo (0) ou Sábado (6)
  };

  const getFunctionEffectiveRates = (fnName: string, levelNum: number) => {
    const fnObj = functionRatesObj[fnName] || functionRatesObj[allFunctionNames[0]] || {};
    const requiresSchedule = fnObj.requiresSchedule !== false;
    const applyLeveling = fnObj.applyLeveling !== false;

    if (!applyLeveling) {
      // Sem nivelamento: valores fixos diretos da função (diferenciando Dia de Semana e Fim de Semana)
      const fixed12hRef = Number(fnObj.fixed ?? 1500);
      const extraWeekday12hRef = Number(fnObj.extraWeekday ?? fnObj.extra ?? 1650);
      const extraWeekend12hRef = Number(
        fnObj.extraWeekend ?? fnObj.extraWeekday ?? (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
      );
      const monthlyAdminRef = Number(fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000);
      return {
        applyLeveling: false,
        requiresSchedule,
        fixed12hRef,
        extraWeekday12hRef,
        extraWeekend12hRef,
        monthlyAdminRef
      };
    }

    // Com nivelamento (Nível 1 a 4)
    const lvlKey = `level${Math.min(4, Math.max(1, Number(levelNum || 1)))}` as
      | 'level1'
      | 'level2'
      | 'level3'
      | 'level4';
    const lvlData = fnObj?.levels?.[lvlKey] || {};
    const fixed12hRef = Number(lvlData.fixed ?? fnObj.fixed ?? 1500);
    const extraWeekday12hRef = Number(
      lvlData.extraWeekday ?? lvlData.extra ?? fnObj.extraWeekday ?? fnObj.extra ?? 1650
    );
    const extraWeekend12hRef = Number(
      lvlData.extraWeekend ??
        lvlData.extra ??
        fnObj.extraWeekend ??
        fnObj.extra ??
        extraWeekday12hRef
    );
    const monthlyAdminRef = Number(
      lvlData.monthlyFixedValue ?? fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000
    );

    return {
      applyLeveling: true,
      requiresSchedule,
      fixed12hRef,
      extraWeekday12hRef,
      extraWeekend12hRef,
      monthlyAdminRef
    };
  };

  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // ============================================================================
  // MANIPULAÇÃO DO CORPO CLÍNICO, HISTÓRICO DE TRABALHO, OCORRÊNCIAS INDIVIDUAIS E DOSSIÊ PDF
  // ============================================================================
  const handleUpdateDoctorLevelInline = (docId: number, newLevel: number) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const updatedRoles = Array.isArray(d.accumulatedRoles)
          ? d.accumulatedRoles.map((r: any) => ({ ...r, level: newLevel }))
          : [];
        return {
          ...d,
          remunerationLevel: newLevel,
          accumulatedRoles: updatedRoles
        };
      })
    );
    const targetDoc = safeDoctors.find((d: any) => Number(d?.id) === Number(docId));
    safeRecordAction(
      `Nível de senioridade de ${targetDoc?.name || 'Médico'} atualizado para Nível ${newLevel}`
    );
  };

  const handleUpdateDoctorSpecialtyInline = (docId: number, newSpec: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) =>
        Number(d?.id) === Number(docId) ? { ...d, specialty: newSpec } : d
      )
    );
    const targetDoc = safeDoctors.find((d: any) => Number(d?.id) === Number(docId));
    safeRecordAction(`Especialidade de ${targetDoc?.name || 'Médico'} alterada para ${newSpec}`);
  };

  // Adicionar registo ao Histórico de Trabalho do Médico
  const handleAddDoctorWorkHistory = (docId: number, docName: string) => {
    if (!isAdmin) return;
    const draft = historyDraftByDoc[docId] || {
      type: 'Início de Função',
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      details: ''
    };
    if (!draft.date) {
      alert('Informe a data do registo histórico.');
      return;
    }

    const newItem = {
      id: `wh_${Date.now()}`,
      type: draft.type,
      date: draft.date,
      endDate: draft.endDate || '',
      details: draft.details.trim() || draft.type
    };

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const curr = Array.isArray(d.workHistory) ? d.workHistory : [];
        return { ...d, workHistory: [newItem, ...curr] };
      })
    );

    setHistoryDraftByDoc(prev => ({
      ...prev,
      [docId]: {
        type: 'Início de Função',
        date: new Date().toISOString().split('T')[0],
        endDate: '',
        details: ''
      }
    }));
    safeRecordAction(`Histórico de trabalho (${newItem.type}) adicionado na ficha de ${docName}`);
  };

  const handleRemoveDoctorWorkHistory = (docId: number, itemId: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        return {
          ...d,
          workHistory: (Array.isArray(d.workHistory) ? d.workHistory : []).filter(
            (x: any) => x.id !== itemId
          )
        };
      })
    );
  };

  // Adicionar Ocorrência Individual na Ficha do Médico
  const handleAddDoctorIndividualOccurrence = (docId: number, docName: string) => {
    if (!isAdmin) return;
    const draft = occDraftByDoc[docId] || {
      date: new Date().toISOString().split('T')[0],
      severity: 'Apontamento Operacional',
      title: '',
      description: ''
    };
    if (!draft.description.trim() && !draft.title.trim()) {
      alert('Descreva a ocorrência individual do plantonista.');
      return;
    }

    const newOcc = {
      id: `ind_occ_${Date.now()}`,
      date: draft.date || new Date().toISOString().split('T')[0],
      severity: draft.severity,
      title: draft.title.trim() || draft.severity,
      description: draft.description.trim(),
      registeredBy: currentUser?.name || 'Gestor'
    };

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const curr = Array.isArray(d.individualOccurrences) ? d.individualOccurrences : [];
        return { ...d, individualOccurrences: [newOcc, ...curr] };
      })
    );

    setOccDraftByDoc(prev => ({
      ...prev,
      [docId]: {
        date: new Date().toISOString().split('T')[0],
        severity: 'Apontamento Operacional',
        title: '',
        description: ''
      }
    }));
    safeRecordAction(`Ocorrência individual registada na ficha do médico ${docName}`);
  };

  const handleRemoveDoctorIndividualOccurrence = (docId: number, occId: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        return {
          ...d,
          individualOccurrences: (Array.isArray(d.individualOccurrences)
            ? d.individualOccurrences
            : []
          ).filter((x: any) => x.id !== occId)
        };
      })
    );
  };

  // ============================================================================
  // GERADOR DE DOCUMENTO INDIVIDUAL DO PLANTONISTA (PDF / IMPRESSÃO COMPLETA)
  // ============================================================================
  const handleDownloadIndividualDoctorDossier = (doc: any) => {
    if (typeof window === 'undefined' || !doc) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const docId = Number(doc.id);
    const docCourses = safeCourses.filter((c: any) => Number(c?.doctorId) === docId);
    const docVacations = safeVacations.filter((v: any) => Number(v?.doctorId) === docId);
    const workHistoryList: any[] = Array.isArray(doc.workHistory) ? doc.workHistory : [];
    const indOccurrencesList: any[] = Array.isArray(doc.individualOccurrences)
      ? doc.individualOccurrences
      : [];

    const workHistoryHtml =
      workHistoryList.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum marco de histórico de trabalho registado.</td></tr>`
        : workHistoryList
            .map(
              wh => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${wh.type}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">
                  ${formatBrDate(wh.date)}${wh.endDate ? ` a ${formatBrDate(wh.endDate)}` : ''}
                </td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${wh.details || '—'}</td>
              </tr>
            `
            )
            .join('');

    const vacationsHtml =
      docVacations.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum registo de férias ou licença no sistema.</td></tr>`
        : docVacations
            .map(
              v => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${v.requestType || 'Férias'} (${v.status || 'Aprovado'})</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${formatBrDate(v.startDate)} a ${formatBrDate(v.endDate)}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${v.reason || '—'}</td>
              </tr>
            `
            )
            .join('');

    const coursesHtml =
      docCourses.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum curso ou certificado registado.</td></tr>`
        : docCourses
            .map(c => {
              const exp = String(c.expirationDate || c.validUntil || '');
              const isExp = exp && exp < todayStr;
              return `
                <tr>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${c.courseName || c.name}</td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;color:${isExp ? '#991b1b' : '#166534'};font-weight:bold;">
                    ${isExp ? 'DESATUALIZADO (VENCIDO)' : 'ATUALIZADO (EM DIA)'}
                  </td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;">Vencimento: ${formatBrDate(exp)}</td>
                </tr>
              `;
            })
            .join('');

    const indOccHtml =
      indOccurrencesList.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhuma ocorrência individual registada para este plantonista.</td></tr>`
        : indOccurrencesList
            .map(
              oc => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${formatBrDate(oc.date)}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${oc.severity} — ${oc.title || ''}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${oc.description}</td>
              </tr>
            `
            )
            .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Dossie Individual - ${doc.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; margin: 0; padding: 0; }
          h1, h2, h3 { margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; }
          .section-title { background: #0f172a; color: #ffffff; padding: 6px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; border-radius: 4px; margin-top: 10px; }
          .grid-table td { padding: 6px 8px; border: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px;">
          <div>
            <h1 style="font-size:16px;text-transform:uppercase;">${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}</h1>
            <p style="margin:2px 0 0 0;color:#475569;font-size:11px;">Ficha Cadastral Completa, Histórico de Trabalho, Cursos & Ocorrências Individuais</p>
          </div>
          <div style="text-align:right;font-size:10px;color:#475569;">
            Emitido em: <strong>${formatBrDate(todayStr)}</strong>
          </div>
        </div>

        <div class="section-title">1. Dados Cadastrais, Especialidade e Vínculo PJ</div>
        <table class="grid-table">
          <tr>
            <td><strong>Nome Completo:</strong> ${doc.name || '—'}</td>
            <td><strong>CRM / RQE:</strong> ${doc.crm || '—'} ${doc.rqe ? `• RQE ${doc.rqe}` : ''}</td>
            <td><strong>Nível Senioridade:</strong> Nível ${doc.remunerationLevel || 1}</td>
          </tr>
          <tr>
            <td><strong>CPF:</strong> ${doc.cpf || '—'}</td>
            <td><strong>Data de Nascimento:</strong> ${formatBrDate(doc.birthDate)}</td>
            <td><strong>Especialidade:</strong> ${doc.specialty || 'Clínica Médica'}</td>
          </tr>
          <tr>
            <td><strong>E-mail:</strong> ${doc.email || '—'}</td>
            <td><strong>Telefone / WhatsApp:</strong> ${doc.phone || '—'}</td>
            <td><strong>Função / Modalidade:</strong> ${doc.role || 'Plantonista'} (${doc.contractType || 'Fixo Mensal'})</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Razão Social PJ:</strong> ${doc.razaoSocial || '—'}</td>
            <td><strong>CNPJ:</strong> ${doc.cnpj || '—'}</td>
          </tr>
        </table>

        <div class="section-title">2. Histórico de Trabalho (Início de Função, Mudanças de Carga Horária e Férias Passadas)</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Evento / Marco</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:22%;">Data / Período</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Detalhamento</th>
            </tr>
          </thead>
          <tbody>
            ${workHistoryHtml}
          </tbody>
        </table>

        <div class="section-title">3. Registos de Férias e Licenças no Sistema</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Tipo / Status</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:22%;">Período</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Observações</th>
            </tr>
          </thead>
          <tbody>
            ${vacationsHtml}
          </tbody>
        </table>

        <div class="section-title">4. Certificações e Cursos (ACLS, ATLS, PALS, etc.)</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Curso</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:30%;">Situação</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Validade</th>
            </tr>
          </thead>
          <tbody>
            ${coursesHtml}
          </tbody>
        </table>

        <div class="section-title">5. Ocorrências Individuais Registadas</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:18%;">Data</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;width:32%;">Classificação / Título</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${indOccHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
    safeRecordAction(`Documento individual (Dossiê PDF) emitido para ${doc.name}`);
  };

  // ============================================================================
  // APROVAÇÃO, EXCLUSÃO E EXPORTAÇÃO XLS DE TODA A EQUIPA (+ CURSOS + HISTÓRICO + OCORRÊNCIAS)
  // ============================================================================
  const handleApprovePendingDoctor = (doc: any) => {
    if (!isAdmin) return;
    const assignedLevel = Number(approvalLevels[doc.id] || doc.remunerationLevel || 1);
    const assignedSpecialty =
      approvalSpecialties[doc.id] ||
      doc.specialty ||
      registeredSpecialtiesList[0]?.name ||
      'Clínica Médica';

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) =>
        Number(d?.id) === Number(doc.id)
          ? {
              ...d,
              status: 'Ativo',
              remunerationLevel: assignedLevel,
              specialty: assignedSpecialty
            }
          : d
      )
    );
    safeRecordAction(
      `Cadastro de ${doc.name} aprovado pelo gestor como Nível ${assignedLevel} (${assignedSpecialty})`
    );
  };

  const handleRejectPendingDoctor = (docId: number) => {
    if (!isAdmin) return;
    if (!confirm('Deseja recusar e remover esta solicitação de cadastro?')) return;
    safeSetDoctors((prev: any[]) =>
      Array.isArray(prev) ? prev.filter((d: any) => Number(d?.id) !== Number(docId)) : []
    );
    safeRecordAction(`Solicitação de cadastro #${docId} recusada`);
  };

  const handleDeleteSingleDoctor = (doc: any) => {
    if (!isAdmin) return;
    if (
      !confirm(
        `Tem a certeza de que deseja EXCLUIR "${doc.name}" do Corpo Clínico? Os plantões, férias e certificados vinculados a este médico também serão removidos.`
      )
    ) {
      return;
    }

    const docId = Number(doc.id);
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((d: any) => Number(d?.id) !== docId)
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((s: any) => Number(s?.doctorId) !== docId)
    );
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((v: any) => Number(v?.doctorId) !== docId)
    );
    safeSetCourses((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((c: any) => Number(c?.doctorId) !== docId)
    );
    safeSetConfig((prev: any) => ({ ...prev, demoDoctorsCleared: true }));
    safeRecordAction(`Médico ${doc.name} excluído do Corpo Clínico pelo gestor.`);
  };

  const demoNames = [
    'dr. carlos eduardo mendes',
    'dra. ana clara souza',
    'dr. roberto almeida',
    'dra. juliana costa'
  ];
  const hasDemoDoctorsPresent = safeDoctors.some(
    (d: any) =>
      [1, 2, 3, 4].includes(Number(d?.id)) ||
      demoNames.includes(String(d?.name || '').trim().toLowerCase())
  );

  const handleClearInitialDemoDoctors = () => {
    if (!isAdmin) return;
    if (
      !confirm(
        'Deseja remover de uma só vez os médicos fictícios da programação inicial (Dr. Carlos Eduardo, Dra. Ana Clara, Dr. Roberto Almeida e Dra. Juliana Costa)? Os médicos reais serão 100% preservados!'
      )
    ) {
      return;
    }

    const demoIdsToRemove = new Set(
      safeDoctors
        .filter(
          (d: any) =>
            [1, 2, 3, 4].includes(Number(d?.id)) ||
            demoNames.includes(String(d?.name || '').trim().toLowerCase())
        )
        .map((d: any) => Number(d.id))
    );

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((d: any) => !demoIdsToRemove.has(Number(d?.id)))
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (s: any) => !demoIdsToRemove.has(Number(s?.doctorId))
      )
    );
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (v: any) => !demoIdsToRemove.has(Number(v?.doctorId))
      )
    );
    safeSetCourses((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (c: any) => !demoIdsToRemove.has(Number(c?.doctorId))
      )
    );
    safeSetConfig((prev: any) => ({ ...prev, demoDoctorsCleared: true }));
    safeRecordAction('Médicos fictícios iniciais removidos definitivamente pelo gestor.');
  };

  // Exportação XLS Completa (Cadastro sem senha + Cursos + Histórico de Trabalho + Férias + Ocorrências Individuais)
  const handleDownloadFullTeamXLS = () => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];

    const courseHeadersHtml = allCourseNamesForExport
      .map(
        cName => `
          <th style="background:#1e3a8a;color:#ffffff;padding:8px;border:1px solid #cbd5e1;">${cName} — Status</th>
          <th style="background:#1e3a8a;color:#ffffff;padding:8px;border:1px solid #cbd5e1;">${cName} — Vencimento</th>
        `
      )
      .join('');

    const rowsHtml = safeDoctors
      .map((doc: any) => {
        const docId = Number(doc?.id);
        const docCourses = safeCourses.filter((c: any) => Number(c?.doctorId) === docId);
        const docVacations = safeVacations.filter((v: any) => Number(v?.doctorId) === docId);
        const workHistoryList: any[] = Array.isArray(doc?.workHistory) ? doc.workHistory : [];
        const indOccList: any[] = Array.isArray(doc?.individualOccurrences)
          ? doc.individualOccurrences
          : [];

        const allowedFns =
          Array.isArray(doc?.allowedFunctions) && doc.allowedFunctions.length > 0
            ? doc.allowedFunctions.join(', ')
            : doc?.role || 'Plantonista';

        const workHistorySummary =
          workHistoryList.length === 0
            ? '—'
            : workHistoryList
                .map(
                  wh =>
                    `[${wh.type}: ${formatBrDate(wh.date)}${
                      wh.endDate ? ' a ' + formatBrDate(wh.endDate) : ''
                    } - ${wh.details || ''}]`
                )
                .join(' | ');

        const vacationsSummary =
          docVacations.length === 0
            ? '—'
            : docVacations
                .map(
                  v =>
                    `[${v.requestType || 'Férias'}: ${formatBrDate(v.startDate)} a ${formatBrDate(
                      v.endDate
                    )} (${v.status || 'Aprovado'})]`
                )
                .join(' | ');

        const indOccSummary =
          indOccList.length === 0
            ? 'Nenhuma ocorrência'
            : indOccList
                .map(
                  oc =>
                    `[${formatBrDate(oc.date)} - ${oc.severity}: ${oc.title || ''} ${
                      oc.description || ''
                    }]`
                )
                .join(' | ');

        const courseCellsHtml = allCourseNamesForExport
          .map(cName => {
            const foundCourse = docCourses.find(
              (c: any) =>
                String(c?.courseName || c?.name || '')
                  .trim()
                  .toLowerCase() === String(cName).trim().toLowerCase()
            );

            if (!foundCourse) {
              return `
                <td style="padding:6px;border:1px solid #cbd5e1;color:#64748b;text-align:center;">Não Cadastrado</td>
                <td style="padding:6px;border:1px solid #cbd5e1;color:#64748b;text-align:center;">—</td>
              `;
            }

            const expDate = String(foundCourse.expirationDate || foundCourse.validUntil || '');
            const isExpired = expDate && expDate < todayStr;
            const statusLabel = isExpired ? 'DESATUALIZADO (VENCIDO)' : 'ATUALIZADO (EM DIA)';
            const bg = isExpired ? '#fee2e2' : '#dcfce7';
            const color = isExpired ? '#991b1b' : '#166534';

            return `
              <td style="padding:6px;border:1px solid #cbd5e1;background:${bg};color:${color};font-weight:bold;text-align:center;">
                ${statusLabel}
              </td>
              <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">
                ${formatBrDate(expDate)}
              </td>
            `;
          })
          .join('');

        return `
          <tr>
            <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${doc?.name || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.status || 'Ativo'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.crm || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.rqe || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.cpf || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${formatBrDate(doc?.birthDate)}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${doc?.specialty || 'Clínica Médica'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">Nível ${doc?.remunerationLevel || 1}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.role || 'Plantonista'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${allowedFns}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.contractType || 'Fixo Mensal'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.razaoSocial || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.cnpj || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.email || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.phone || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${workHistorySummary}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${vacationsSummary}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${indOccSummary}</td>
            ${courseCellsHtml}
          </tr>
        `;
      })
      .join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">
          <thead>
            <tr>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Nome Completo</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Status</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CRM</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">RQE</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CPF</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Data de Nascimento</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Especialidade</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Nível Senioridade</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Função Principal</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Funções Habilitadas</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Modalidade / Vínculo</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Razão Social PJ</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CNPJ</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">E-mail</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Telefone / WhatsApp</th>
              <th style="background:#312e81;color:#ffffff;padding:8px;">Histórico de Trabalho (Início Função / Mudança Carga / Férias Passadas)</th>
              <th style="background:#312e81;color:#ffffff;padding:8px;">Férias e Licenças no Sistema</th>
              <th style="background:#7f1d1d;color:#ffffff;padding:8px;">Ocorrências Individuais Registadas</th>
              ${courseHeadersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Corpo_Clinico_Completo_Cursos_Historico_${todayStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    safeRecordAction(
      'Planilha completa da equipa (com cursos, histórico de trabalho e ocorrências individuais) exportada (.XLS)'
    );
  };

  // ============================================================================
  // 1. ABA: CORPO CLÍNICO (STAFF)
  // ============================================================================
  if (currentView === 'staff') {
    const filteredActiveDocs = safeActiveDoctors.filter((d: any) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (d?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.crm || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.cpf || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpec = specialtyFilter === 'Todas' || d?.specialty === specialtyFilter;
      return matchesSearch && matchesSpec;
    });

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              Corpo Clínico, Histórico Profissional, Ocorrências & Vínculos PJ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registe histórico de trabalho e ocorrências individuais por plantonista, baixe o dossiê individual em PDF ou a planilha XLS completa da equipa.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleDownloadFullTeamXLS}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet size={16} /> Baixar Planilha Equipa + Cursos + Histórico (.XLS)
              </button>

              {hasDemoDoctorsPresent && (
                <button
                  type="button"
                  onClick={handleClearInitialDemoDoctors}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-3.5 py-2.5 rounded-xl font-extrabold flex items-center gap-1.5"
                >
                  <Trash2 size={15} className="text-amber-800" /> Limpar Médicos Fictícios Iniciais
                </button>
              )}

              <button
                type="button"
                onClick={() => safeOpenDoctorModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={16} /> Cadastrar Novo Médico
              </button>
            </div>
          )}
        </div>

        {/* Fila de Aprovação de Novos Médicos */}
        {isAdmin && safePendingDoctors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="text-amber-700" size={20} />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Solicitações de Cadastro Aguardando Homologação do Gestor ({safePendingDoctors.length})
              </h3>
            </div>

            <div className="space-y-3">
              {safePendingDoctors.map((pDoc: any) => {
                const currentLevel = approvalLevels[pDoc.id] || pDoc.remunerationLevel || 1;
                const currentSpec =
                  approvalSpecialties[pDoc.id] ||
                  pDoc.specialty ||
                  registeredSpecialtiesList[0]?.name ||
                  'Clínica Médica';

                return (
                  <div
                    key={pDoc.id}
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-extrabold text-slate-900">
                          {pDoc.name}
                        </strong>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          CRM: {pDoc.crm}
                        </span>
                        {pDoc.rqe && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 font-bold text-indigo-800">
                            RQE: {pDoc.rqe}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        <strong>CPF:</strong> {pDoc.cpf || '—'} • <strong>Nascimento:</strong>{' '}
                        {formatBrDate(pDoc.birthDate)} • <strong>Tel:</strong> {pDoc.phone || '—'} •{' '}
                        <strong>E-mail:</strong> {pDoc.email || '—'}
                      </p>
                      <p className="text-slate-600">
                        <strong>Razão Social PJ:</strong> {pDoc.razaoSocial || 'Não informada'} •{' '}
                        <strong>CNPJ:</strong> {pDoc.cnpj || 'Não informado'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Especialidade:
                        </label>
                        <select
                          value={currentSpec}
                          onChange={e =>
                            setApprovalSpecialties(prev => ({
                              ...prev,
                              [pDoc.id]: e.target.value
                            }))
                          }
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-800"
                        >
                          {registeredSpecialtiesList.map(sp => (
                            <option key={sp.id} value={sp.name}>
                              {sp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">
                          Atribuir Nível (Gestor):
                        </label>
                        <select
                          value={currentLevel}
                          onChange={e =>
                            setApprovalLevels(prev => ({
                              ...prev,
                              [pDoc.id]: Number(e.target.value)
                            }))
                          }
                          className="border-2 border-blue-400 rounded-lg px-2.5 py-1.5 bg-blue-50/50 font-extrabold text-blue-900"
                        >
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                          <option value={3}>Nível 3</option>
                          <option value={4}>Nível 4</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3">
                        <button
                          type="button"
                          onClick={() => handleApprovePendingDoctor(pDoc)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={14} /> Aprovar Médico
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPendingDoctor(pDoc.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl font-bold"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Busca e Filtro */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <input
            type="text"
            placeholder="Buscar médico por nome, CRM, CPF ou Razão Social PJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-96 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-slate-600 shrink-0">Filtrar Especialidade:</span>
            <select
              value={specialtyFilter}
              onChange={e => setSpecialtyFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
            >
              <option value="Todas">Todas as Especialidades ({safeActiveDoctors.length})</option>
              {registeredSpecialtiesList.map(sp => (
                <option key={sp.id} value={sp.name}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade de Cartões do Corpo Clínico Ativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActiveDocs.map((doc: any) => {
            const docShiftsCount = safeShifts.filter(
              (s: any) => Number(s?.doctorId) === Number(doc.id)
            ).length;
            const docCoursesList = safeCourses.filter(
              (c: any) => Number(c?.doctorId) === Number(doc.id)
            );
            const workHistoryList: any[] = Array.isArray(doc.workHistory) ? doc.workHistory : [];
            const indOccList: any[] = Array.isArray(doc.individualOccurrences)
              ? doc.individualOccurrences
              : [];
            const currentLevel = Number(doc.remunerationLevel || 1);
            const isFichaOpen = Boolean(expandedFichaByDocId[doc.id]);

            const whDraft = historyDraftByDoc[doc.id] || {
              type: 'Início de Função',
              date: new Date().toISOString().split('T')[0],
              endDate: '',
              details: ''
            };

            const occDraft = occDraftByDoc[doc.id] || {
              date: new Date().toISOString().split('T')[0],
              severity: 'Apontamento Operacional',
              title: '',
              description: ''
            };

            return (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">{doc.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                          {doc.crm}
                        </span>
                        {doc.rqe && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold">
                            RQE: {doc.rqe}
                          </span>
                        )}
                        {doc.hasManagerAccess && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                            ★ Perfil Gestor
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        <strong>PJ:</strong> {doc.razaoSocial || '—'} • <strong>CNPJ:</strong>{' '}
                        {doc.cnpj || '—'}
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadIndividualDoctorDossier(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1"
                          title="Baixar documento individual completo deste plantonista (PDF/Impressão)"
                        >
                          <Printer size={13} /> Baixar Doc Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => safeOpenDoctorModal(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold flex items-center gap-1"
                        >
                          <Edit3 size={13} /> Editar Ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleDoctor(doc)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                          title="Excluir médico"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Controles Diretos Exclusivos do Gestor: Nível (1 a 4) e Especialidade */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        Especialidade na Emergência:
                      </label>
                      {isAdmin ? (
                        <select
                          value={doc.specialty || 'Clínica Médica'}
                          onChange={e =>
                            handleUpdateDoctorSpecialtyInline(doc.id, e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-900"
                        >
                          {registeredSpecialtiesList.map(sp => (
                            <option key={sp.id} value={sp.name}>
                              {sp.name}
                            </option>
                          ))}
                          {!registeredSpecialtiesList.some(sp => sp.name === doc.specialty) &&
                            doc.specialty && (
                              <option value={doc.specialty}>{doc.specialty}</option>
                            )}
                        </select>
                      ) : (
                        <span className="font-bold text-slate-800">
                          {doc.specialty || 'Clínica Médica'}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-blue-700 mb-1">
                        Atribuição de Nível (Exclusivo Gestor):
                      </label>
                      {isAdmin ? (
                        <select
                          value={currentLevel}
                          onChange={e =>
                            handleUpdateDoctorLevelInline(doc.id, Number(e.target.value))
                          }
                          className="w-full border-2 border-blue-300 rounded-lg px-2.5 py-1.5 bg-blue-50/50 font-black text-blue-950"
                        >
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                          <option value={3}>Nível 3</option>
                          <option value={4}>Nível 4</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black">
                          <Award size={13} /> Nível {currentLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PAINEL EXPANSÍVEL: FICHA COMPLETA + HISTÓRICO DE TRABALHO + OCORRÊNCIAS INDIVIDUAIS */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFichaByDocId(prev => ({
                          ...prev,
                          [doc.id]: !prev[doc.id]
                        }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-100/90 hover:bg-slate-200/70 flex items-center justify-between font-extrabold text-slate-800 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        Ficha Cadastral, Histórico de Trabalho ({workHistoryList.length}) & Ocorrências ({indOccList.length})
                      </span>
                      {isFichaOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isFichaOpen && (
                      <div className="p-4 bg-white space-y-4 text-[11px] border-t border-slate-200">
                        {/* 1. Dados Cadastrais */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-slate-400 font-bold block">CPF:</span>
                            <strong className="text-slate-800">{doc.cpf || 'Não informado'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">Data Nascimento:</span>
                            <strong className="text-slate-800">
                              {formatBrDate(doc.birthDate)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">CRM / RQE:</span>
                            <strong className="text-slate-800">
                              {doc.crm || '—'} {doc.rqe ? `• RQE ${doc.rqe}` : ''}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">E-mail:</span>
                            <strong className="text-slate-800 break-all">
                              {doc.email || 'Não informado'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">
                              Telefone / WhatsApp:
                            </span>
                            <strong className="text-slate-800">
                              {doc.phone || 'Não informado'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">
                              Modalidade Contrato:
                            </span>
                            <strong className="text-slate-800">
                              {doc.contractType || 'Fixo Mensal'}
                            </strong>
                          </div>
                        </div>

                        {/* 2. Histórico de Trabalho do Plantonista (Exclusivo Gestor para adicionar) */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <strong className="text-indigo-950 uppercase flex items-center gap-1">
                              <History size={13} className="text-indigo-600" />
                              Histórico de Trabalho (Início de Função, Mudança de Carga Horária, Férias Passadas)
                            </strong>
                          </div>

                          {workHistoryList.length === 0 ? (
                            <p className="text-slate-400 italic">
                              Nenhum marco profissional registado ainda.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {workHistoryList.map((wh: any) => (
                                <div
                                  key={wh.id}
                                  className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-200 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-700 text-white font-black text-[9px] uppercase mr-1.5">
                                      {wh.type}
                                    </span>
                                    <strong className="text-slate-900">
                                      {formatBrDate(wh.date)}
                                      {wh.endDate ? ` a ${formatBrDate(wh.endDate)}` : ''}:
                                    </strong>{' '}
                                    <span className="text-slate-700">{wh.details}</span>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDoctorWorkHistory(doc.id, wh.id)}
                                      className="text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {isAdmin && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                  value={whDraft.type}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, type: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                >
                                  <option value="Início de Função">Início de Função</option>
                                  <option value="Mudança de Carga Horária (Aumento)">
                                    Mudança de Carga Horária (Aumento)
                                  </option>
                                  <option value="Mudança de Carga Horária (Redução)">
                                    Mudança de Carga Horária (Redução)
                                  </option>
                                  <option value="Férias Passadas">Férias Passadas</option>
                                  <option value="Alteração de Cargo / Setor">
                                    Alteração de Cargo / Setor
                                  </option>
                                </select>
                                <input
                                  type="date"
                                  value={whDraft.date}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, date: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                  title="Data inicial do marco"
                                />
                                <input
                                  type="date"
                                  value={whDraft.endDate}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, endDate: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white"
                                  title="Data final (opcional, ex: fim das férias passadas)"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Detalhes (ex: Assumiu 24h semanais como Plantonista Fixo / Férias gozadas)..."
                                  value={whDraft.details}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, details: e.target.value }
                                    }))
                                  }
                                  className="flex-1 border rounded-lg px-2.5 py-1 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddDoctorWorkHistory(doc.id, doc.name)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold shrink-0"
                                >
                                  + Adicionar Histórico
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Ocorrências Individuais deste Plantonista */}
                        {isAdmin && (
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <strong className="text-rose-950 uppercase flex items-center gap-1">
                              <ShieldAlert size={13} className="text-rose-600" />
                              Ocorrências Individuais deste Plantonista ({indOccList.length})
                            </strong>

                            {indOccList.length === 0 ? (
                              <p className="text-slate-400 italic">
                                Nenhuma ocorrência individual registada.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {indOccList.map((oc: any) => (
                                  <div
                                    key={oc.id}
                                    className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <span className="px-1.5 py-0.5 rounded bg-rose-700 text-white font-black text-[9px] uppercase mr-1.5">
                                        {oc.severity}
                                      </span>
                                      <strong className="text-slate-900">
                                        {formatBrDate(oc.date)} — {oc.title}:
                                      </strong>{' '}
                                      <span className="text-slate-700">{oc.description}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveDoctorIndividualOccurrence(doc.id, oc.id)
                                      }
                                      className="text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="date"
                                  value={occDraft.date}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, date: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                />
                                <select
                                  value={occDraft.severity}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, severity: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                >
                                  <option value="Apontamento Operacional">
                                    Apontamento Operacional
                                  </option>
                                  <option value="Elogio / Destaque Assistencial">
                                    Elogio / Destaque Assistencial
                                  </option>
                                  <option value="Atraso / Falta / Alinhamento">
                                    Atraso / Falta / Alinhamento
                                  </option>
                                  <option value="Advertência / Notificação">
                                    Advertência / Notificação
                                  </option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Título curto (ex: Atraso na rendição)"
                                  value={occDraft.title}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, title: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Descrição detalhada da ocorrência individual..."
                                  value={occDraft.description}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, description: e.target.value }
                                    }))
                                  }
                                  className="flex-1 border rounded-lg px-2.5 py-1 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddDoctorIndividualOccurrence(doc.id, doc.name)
                                  }
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg font-bold shrink-0"
                                >
                                  + Registar Ocorrência
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. Certificados Registados */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-slate-400 font-bold block mb-1">
                            Certificados / Cursos Registados ({docCoursesList.length}):
                          </span>
                          {docCoursesList.length === 0 ? (
                            <span className="italic text-slate-400">
                              Nenhum curso registado para este médico.
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {docCoursesList.map((c: any) => {
                                const exp = String(c.expirationDate || c.validUntil || '');
                                const expired =
                                  exp && exp < new Date().toISOString().split('T')[0];
                                return (
                                  <span
                                    key={c.id}
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                      expired
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    {c.courseName || c.name}:{' '}
                                    {expired ? 'Vencido' : 'Atualizado'} ({formatBrDate(exp)})
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Funções Habilitadas */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Funções:</span>
                    {(Array.isArray(doc.allowedFunctions) && doc.allowedFunctions.length > 0
                      ? doc.allowedFunctions
                      : [doc.role || 'Plantonista']
                    ).map((fn: string) => (
                      <span
                        key={fn}
                        className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 text-[11px]"
                      >
                        {fn}
                      </span>
                    ))}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                      {doc.contractType || 'Fixo Mensal'}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Plantões na escala:{' '}
                    <strong className="text-slate-800">{docShiftsCount} turno(s)</strong>
                  </span>
                  <span>
                    Tel: <strong className="text-slate-700">{doc.phone || '—'}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ABA: MEU CADASTRO PJ / PERFIL (LOGIN DO MÉDICO COM EDIÇÃO PRÓPRIA APÓS APROVAÇÃO)
  // ============================================================================
  if (currentView === 'profile') {
    const myDoc =
      safeDoctors.find((d: any) => Number(d?.id) === Number(currentUser?.id)) || currentUser;
    const myPayroll = safePayroll.find(
      (p: any) => Number(p?.doctor?.id) === Number(myDoc?.id)
    );

    const handleSaveMyOwnProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!myProfileForm.name.trim()) {
        alert('O campo Nome Completo não pode ficar em branco.');
        return;
      }

      safeSetDoctors((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((d: any) =>
          Number(d?.id) === Number(myDoc?.id)
            ? {
                ...d,
                name: myProfileForm.name.trim(),
                cpf: myProfileForm.cpf.trim(),
                birthDate: myProfileForm.birthDate,
                rqe: myProfileForm.rqe.trim(),
                email: myProfileForm.email.trim(),
                phone: myProfileForm.phone.trim(),
                razaoSocial: myProfileForm.razaoSocial.trim(),
                cnpj: myProfileForm.cnpj.trim(),
                password: myProfileForm.password.trim() || d.password
              }
            : d
        )
      );

      if (typeof setCurrentUser === 'function') {
        setCurrentUser((prev: any) => ({
          ...prev,
          name: myProfileForm.name.trim(),
          cpf: myProfileForm.cpf.trim(),
          birthDate: myProfileForm.birthDate,
          rqe: myProfileForm.rqe.trim(),
          email: myProfileForm.email.trim(),
          phone: myProfileForm.phone.trim(),
          razaoSocial: myProfileForm.razaoSocial.trim(),
          cnpj: myProfileForm.cnpj.trim()
        }));
      }

      setIsEditingMyProfile(false);
      setMyProfileSavedMsg('Os seus dados cadastrais foram atualizados e guardados com sucesso!');
      safeRecordAction(`Médico ${myProfileForm.name} atualizou os próprios dados cadastrais/PJ.`);
      setTimeout(() => setMyProfileSavedMsg(''), 5000);
    };

    return (
      <div className="max-w-4xl space-y-6 text-slate-800">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] uppercase">
              Meu Cadastro PJ & Enquadramento Médico
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{myDoc?.name}</h2>
            <p className="text-xs text-slate-500">
              {myDoc?.crm} {myDoc?.rqe ? `• RQE: ${myDoc.rqe}` : ''} • Especialidade:{' '}
              <strong>{myDoc?.specialty || 'Clínica Médica'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditingMyProfile(!isEditingMyProfile)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <Edit3 size={15} />
              {isEditingMyProfile ? 'Cancelar Edição' : '✏️ Editar Meus Dados Cadastrais'}
            </button>

            <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-center shrink-0">
              <span className="block text-[9px] font-extrabold uppercase opacity-80">
                Nível Gestão
              </span>
              <strong className="text-lg font-black">Nível {myDoc?.remunerationLevel || 1}</strong>
            </div>
          </div>
        </div>

        {myProfileSavedMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>{myProfileSavedMsg}</span>
          </div>
        )}

        {isEditingMyProfile ? (
          <form
            onSubmit={handleSaveMyOwnProfile}
            className="bg-white p-6 rounded-2xl border-2 border-blue-300 shadow-sm space-y-4 text-xs"
          >
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-blue-950 uppercase">
                Atualizar Meus Dados Pessoais, Contactos e Empresa PJ
              </h3>
              <span className="text-[11px] text-slate-500">
                * O CRM, Especialidade e Nível são geridos pela coordenação.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={myProfileForm.name}
                  onChange={e => setMyProfileForm({ ...myProfileForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">CPF</label>
                <input
                  type="text"
                  value={myProfileForm.cpf}
                  onChange={e => setMyProfileForm({ ...myProfileForm, cpf: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={myProfileForm.birthDate}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, birthDate: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">RQE</label>
                <input
                  type="text"
                  value={myProfileForm.rqe}
                  onChange={e => setMyProfileForm({ ...myProfileForm, rqe: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={myProfileForm.phone}
                  onChange={e => setMyProfileForm({ ...myProfileForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">E-mail</label>
                <input
                  type="email"
                  value={myProfileForm.email}
                  onChange={e => setMyProfileForm({ ...myProfileForm, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold mb-1">Razão Social PJ</label>
                <input
                  type="text"
                  value={myProfileForm.razaoSocial}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, razaoSocial: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={myProfileForm.cnpj}
                  onChange={e => setMyProfileForm({ ...myProfileForm, cnpj: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Alterar Senha de Acesso</label>
                <input
                  type="text"
                  value={myProfileForm.password}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, password: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingMyProfile(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm"
              >
                <Save size={15} /> Guardar Alterações Cadastrais
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase border-b border-slate-100 pb-2">
              Dados Pessoais, Profissionais e Pessoa Jurídica (PJ)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CPF
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.cpf || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Data de Nascimento
                </span>
                <strong className="text-sm text-slate-900">
                  {formatBrDate(myDoc?.birthDate)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CRM / RQE
                </span>
                <strong className="text-sm text-slate-900">
                  {myDoc?.crm || '—'} {myDoc?.rqe ? `• RQE ${myDoc.rqe}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  E-mail Cadastrado
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.email || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Telefone / WhatsApp
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Especialidade
                </span>
                <strong className="text-sm text-indigo-900">
                  {myDoc?.specialty || 'Clínica Médica'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Razão Social PJ
                </span>
                <strong className="text-sm text-slate-900">
                  {myDoc?.razaoSocial || 'PJ em atualização'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CNPJ
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.cnpj || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Produção na Competência ({competenceMonth})
                </span>
                <strong className="text-base font-black text-emerald-700">
                  R${' '}
                  {Number(myPayroll?.netTotal || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 3. ABA: TABELA DE REMUNERAÇÃO (OPÇÃO "APLICAR NIVELAMENTO", DIA DE SEMANA VS FDS,
  //         E ADICIONAIS/BONIFICAÇÕES COM % E ESCOLHA DE INCIDÊNCIA)
  // ============================================================================
  if (currentView === 'rates') {
    const functionNames = Object.keys(functionRatesObj);
    const shiftAdditionalsList = Array.isArray(config?.shiftAdditionals)
      ? config.shiftAdditionals
      : [];

    const handleAddSpecialty = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newSpecialtyName.trim();
      if (!trimmed) return;
      if (
        registeredSpecialtiesList.some(
          sp => sp.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        alert('Esta especialidade já está cadastrada!');
        return;
      }
      const nextList = [
        ...registeredSpecialtiesList,
        { id: `esp_${Date.now()}`, name: trimmed }
      ];
      safeSetConfig((prev: any) => ({
        ...prev,
        registeredSpecialties: nextList
      }));
      setNewSpecialtyName('');
      safeRecordAction(`Nova especialidade adicionada na emergência: ${trimmed}`);
    };

    const handleRemoveSpecialty = (specName: string) => {
      if (!isAdmin) return;
      if (!confirm(`Deseja remover a especialidade "${specName}"?`)) return;
      const nextList = registeredSpecialtiesList.filter(sp => sp.name !== specName);
      safeSetConfig((prev: any) => ({
        ...prev,
        registeredSpecialties: nextList
      }));
      safeRecordAction(`Especialidade removida: ${specName}`);
    };

    const handleUpdateFunctionField = (fnName: string, field: string, value: any) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              [field]: value
            }
          }
        };
      });
    };

    const handleUpdateFunctionLevelValue = (
      fnName: string,
      levelKey: 'level1' | 'level2' | 'level3' | 'level4',
      subField: 'fixed' | 'extraWeekday' | 'extraWeekend' | 'monthlyFixedValue',
      val: number
    ) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        const currLevels = currFn.levels || {};
        const currLvlObj = currLevels[levelKey] || {
          fixed: currFn.fixed || 1500,
          extra: currFn.extra || 1650,
          extraWeekday: currFn.extraWeekday || currFn.extra || 1650,
          extraWeekend: currFn.extraWeekend || (currFn.extra ? currFn.extra + 200 : 1850),
          monthlyFixedValue: currFn.monthlyFixedValue || 5000
        };
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              levels: {
                ...currLevels,
                [levelKey]: {
                  ...currLvlObj,
                  [subField]: val,
                  ...(subField === 'extraWeekday' ? { extra: val } : {})
                }
              }
            }
          }
        };
      });
    };

    const handleAddNewFunction = (e: React.FormEvent) => {
      e.preventDefault();
      const nameTrim = newFunctionForm.name.trim();
      if (!nameTrim) return;

      const f12 = Number(newFunctionForm.fixedRate12h || 1500);
      const eWk = Number(newFunctionForm.extraWeekday12h || 1650);
      const eFd = Number(newFunctionForm.extraWeekend12h || 1850);
      const mFixed = Number(newFunctionForm.monthlyFixedValue || 5000);

      safeSetConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev?.functionRates || {}),
          [nameTrim]: {
            description:
              newFunctionForm.description.trim() ||
              `${nameTrim} — Atuação médica na unidade`,
            requiresSchedule: Boolean(newFunctionForm.requiresSchedule),
            applyLeveling: Boolean(newFunctionForm.applyLeveling),
            fixed: f12,
            extra: eWk,
            extraWeekday: eWk,
            extraWeekend: eFd,
            monthlyFixedValue: mFixed,
            levels: {
              level1: {
                fixed: f12,
                extra: eWk,
                extraWeekday: eWk,
                extraWeekend: eFd,
                monthlyFixedValue: mFixed
              },
              level2: {
                fixed: f12 + 100,
                extra: eWk + 100,
                extraWeekday: eWk + 100,
                extraWeekend: eFd + 100,
                monthlyFixedValue: mFixed + 500
              },
              level3: {
                fixed: f12 + 200,
                extra: eWk + 200,
                extraWeekday: eWk + 200,
                extraWeekend: eFd + 200,
                monthlyFixedValue: mFixed + 1000
              },
              level4: {
                fixed: f12 + 350,
                extra: eWk + 350,
                extraWeekday: eWk + 350,
                extraWeekend: eFd + 350,
                monthlyFixedValue: mFixed + 1500
              }
            }
          }
        }
      }));

      setNewFunctionForm({
        name: '',
        description: '',
        requiresSchedule: true,
        applyLeveling: true,
        fixedRate12h: 1500,
        extraWeekday12h: 1650,
        extraWeekend12h: 1850,
        monthlyFixedValue: 5000
      });
      safeRecordAction(
        `Nova função adicionada na Tabela de Remuneração: ${nameTrim} (${
          newFunctionForm.applyLeveling ? 'Com Nivelamento' : 'Valor Fixo Semana/FDS'
        })`
      );
    };

    const handleDeleteFunction = (fnName: string) => {
      if (!isAdmin) return;
      if (!confirm(`Deseja remover a função "${fnName}" da Tabela de Remuneração?`))
        return;
      safeSetConfig((prev: any) => {
        const copy = { ...(prev?.functionRates || {}) };
        delete copy[fnName];
        return { ...prev, functionRates: copy };
      });
      safeRecordAction(`Função ${fnName} removida da Tabela de Remuneração`);
    };

    const handleAddAdditional = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdditionalForm.name.trim()) return;
      const created = {
        id: `add_${Date.now()}`,
        name: newAdditionalForm.name.trim(),
        incidence: newAdditionalForm.incidence,
        calcMode: newAdditionalForm.calcMode,
        applicationTarget: newAdditionalForm.applicationTarget,
        targetFunctionName:
          newAdditionalForm.applicationTarget === 'specific_function'
            ? newAdditionalForm.targetFunctionName
            : '',
        value12h: Number(newAdditionalForm.value12h || 0),
        percentValue: Number(newAdditionalForm.percentValue || 0)
      };
      safeSetConfig((prev: any) => ({
        ...prev,
        shiftAdditionals: [...shiftAdditionalsList, created]
      }));
      setNewAdditionalForm({
        name: '',
        incidence: 'shift',
        calcMode: 'fixed',
        applicationTarget: 'final_payroll',
        targetFunctionName: allFunctionNames[0] || 'Plantonista',
        value12h: 250,
        percentValue: 10
      });
      safeRecordAction(`Novo adicional/bonificação cadastrado: ${created.name}`);
    };

    const handleUpdateExistingAdditional = (addId: string, field: string, value: any) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => ({
        ...prev,
        shiftAdditionals: shiftAdditionalsList.map((item: any) =>
          item.id === addId ? { ...item, [field]: value } : item
        )
      }));
    };

    return (
      <div className="space-y-8 text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="text-blue-600" size={24} />
            Tabela de Remuneração, Opção de Nivelamento, Adicionais & Bonificações
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Escolha por função se deseja <strong>aplicar nivelamento (Níveis 1 a 4)</strong> ou manter valores fixos com diferenciação entre <strong>Dia de Semana e Final de Semana</strong> (mantendo sempre o pagamento proporcional por fração de plantão de 12h).
          </p>
        </div>

        {/* BLOCO 1: GESTÃO RÁPIDA DE ESPECIALIDADES MÉDICAS DA EMERGÊNCIA */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Stethoscope className="text-indigo-600" size={20} />
                Especialidades Médicas da Emergência
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {registeredSpecialtiesList.map(spec => (
              <div
                key={spec.id || spec.name}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-extrabold"
              >
                <span>{spec.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(spec.name)}
                    className="w-5 h-5 rounded-full bg-indigo-200/70 hover:bg-red-500 hover:text-white text-indigo-900 flex items-center justify-center transition-colors font-black"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddSpecialty}
              className="flex flex-col sm:flex-row gap-2 pt-2 text-xs"
            >
              <input
                type="text"
                placeholder="Digite uma nova especialidade..."
                value={newSpecialtyName}
                onChange={e => setNewSpecialtyName(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Adicionar Especialidade
              </button>
            </form>
          )}
        </div>

        {/* BLOCO 2: CARTÕES DE FUNÇÕES COM OPÇÃO "( ) APLICAR NIVELAMENTO" */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 uppercase px-1 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600" />
            Funções Médicas — Nivelamento Opcional & Diferenciação Dia de Semana vs. Fim de Semana (Ref. 12h)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {functionNames.map(fnName => {
              const fnObj = functionRatesObj[fnName] || {};
              const requiresSchedule = fnObj.requiresSchedule !== false;
              const applyLeveling = fnObj.applyLeveling !== false;

              const levels = fnObj.levels || {
                level1: {
                  fixed: fnObj.fixed || 1500,
                  extraWeekday: fnObj.extraWeekday || fnObj.extra || 1650,
                  extraWeekend: fnObj.extraWeekend || (fnObj.extra ? fnObj.extra + 200 : 1850),
                  monthlyFixedValue: fnObj.monthlyFixedValue || 5000
                },
                level2: {
                  fixed: (fnObj.fixed || 1500) + 100,
                  extraWeekday: (fnObj.extraWeekday || fnObj.extra || 1650) + 100,
                  extraWeekend: (fnObj.extraWeekend || (fnObj.extra ? fnObj.extra + 200 : 1850)) + 100,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 500
                },
                level3: {
                  fixed: (fnObj.fixed || 1500) + 200,
                  extraWeekday: (fnObj.extraWeekday || fnObj.extra || 1650) + 200,
                  extraWeekend: (fnObj.extraWeekend || (fnObj.extra ? fnObj.extra + 200 : 1850)) + 200,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 1000
                },
                level4: {
                  fixed: (fnObj.fixed || 1500) + 300,
                  extraWeekday: (fnObj.extraWeekday || fnObj.extra || 1650) + 300,
                  extraWeekend: (fnObj.extraWeekend || (fnObj.extra ? fnObj.extra + 200 : 1850)) + 300,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 1500
                }
              };

              return (
                <div
                  key={fnName}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-slate-900">{fnName}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              requiresSchedule
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {requiresSchedule
                              ? 'Com Escala (Proporcional Ref. 12h)'
                              : 'Cargo Fixo Mensal (Sem Escala)'}
                          </span>
                        </div>

                        {/* CHECKBOX: ( ) APLICAR NIVELAMENTO */}
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-extrabold cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={applyLeveling}
                            onChange={e =>
                              handleUpdateFunctionField(fnName, 'applyLeveling', e.target.checked)
                            }
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span>Aplicar nivelamento (Níveis 1 a 4) nesta função</span>
                        </label>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFunction(fnName)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Excluir função"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Caixa Descritiva */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        📝 Descrição / Detalhamento da Função:
                      </label>
                      {isAdmin ? (
                        <textarea
                          rows={2}
                          value={fnObj.description ?? ''}
                          onChange={e =>
                            handleUpdateFunctionField(fnName, 'description', e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-medium"
                        />
                      ) : (
                        <p className="text-slate-600 italic">{fnObj.description || fnName}</p>
                      )}
                    </div>

                    {/* MODO A: SEM NIVELAMENTO (VALORES FIXOS COM DIFERENCIAÇÃO DIA DE SEMANA VS FIM DE SEMANA) */}
                    {!applyLeveling ? (
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded bg-emerald-700 text-white font-black text-[10px] uppercase">
                            Valor Fixo (Sem Nivelamento — Fração paga proporcional a 12h)
                          </span>
                        </div>

                        {requiresSchedule ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 mb-1">
                                Ciclo Fixo Semanal (Ref. 12h R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={fnObj.fixed ?? 1500}
                                onChange={e =>
                                  handleUpdateFunctionField(
                                    fnName,
                                    'fixed',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-black text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-blue-900 mb-1">
                                Extra 12h — Dia de Semana (R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={fnObj.extraWeekday ?? fnObj.extra ?? 1650}
                                onChange={e => {
                                  const v = Number(e.target.value);
                                  handleUpdateFunctionField(fnName, 'extraWeekday', v);
                                  handleUpdateFunctionField(fnName, 'extra', v);
                                }}
                                className="w-full border border-blue-300 rounded-xl px-2.5 py-1.5 bg-white font-black text-blue-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-emerald-900 mb-1">
                                Extra 12h — Final de Semana (R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={
                                  fnObj.extraWeekend ??
                                  (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
                                }
                                onChange={e =>
                                  handleUpdateFunctionField(
                                    fnName,
                                    'extraWeekend',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full border border-emerald-400 rounded-xl px-2.5 py-1.5 bg-white font-black text-emerald-800"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              Valor Mensal Fixo do Cargo (R$)
                            </label>
                            <input
                              type="number"
                              disabled={!isAdmin}
                              value={fnObj.monthlyFixedValue ?? 5000}
                              onChange={e =>
                                handleUpdateFunctionField(
                                  fnName,
                                  'monthlyFixedValue',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full border rounded-xl px-3 py-1.5 bg-white font-black text-purple-900"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MODO B: COM NIVELAMENTO (NÍVEIS 1 A 4) */
                      <div className="space-y-2">
                        <span className="block font-extrabold text-slate-700 uppercase text-[11px]">
                          Valores por Nível de Senioridade (Base 12h — Fração paga proporcional):
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(['level1', 'level2', 'level3', 'level4'] as const).map(
                            (lvlKey, idx) => {
                              const lvlNum = idx + 1;
                              const lvlData = levels[lvlKey] || {};

                              return (
                                <div
                                  key={lvlKey}
                                  className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                                >
                                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] uppercase inline-block">
                                    Nível {lvlNum}
                                  </span>

                                  {requiresSchedule ? (
                                    <div className="grid grid-cols-3 gap-1.5">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-500">
                                          Ciclo Fixo 12h
                                        </label>
                                        <input
                                          type="number"
                                          disabled={!isAdmin}
                                          value={lvlData.fixed ?? fnObj.fixed ?? 1500}
                                          onChange={e =>
                                            handleUpdateFunctionLevelValue(
                                              fnName,
                                              lvlKey,
                                              'fixed',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full border rounded-lg px-1.5 py-1 font-extrabold text-slate-900"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-blue-700">
                                          Extra Sem. 12h
                                        </label>
                                        <input
                                          type="number"
                                          disabled={!isAdmin}
                                          value={
                                            lvlData.extraWeekday ??
                                            lvlData.extra ??
                                            fnObj.extra ??
                                            1650
                                          }
                                          onChange={e =>
                                            handleUpdateFunctionLevelValue(
                                              fnName,
                                              lvlKey,
                                              'extraWeekday',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full border rounded-lg px-1.5 py-1 font-extrabold text-blue-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-emerald-700">
                                          Extra FDS 12h
                                        </label>
                                        <input
                                          type="number"
                                          disabled={!isAdmin}
                                          value={
                                            lvlData.extraWeekend ??
                                            lvlData.extra ??
                                            fnObj.extraWeekend ??
                                            1850
                                          }
                                          onChange={e =>
                                            handleUpdateFunctionLevelValue(
                                              fnName,
                                              lvlKey,
                                              'extraWeekend',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full border rounded-lg px-1.5 py-1 font-extrabold text-emerald-700"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500">
                                        Valor Mensal Fixo (R$)
                                      </label>
                                      <input
                                        type="number"
                                        disabled={!isAdmin}
                                        value={
                                          lvlData.monthlyFixedValue ??
                                          fnObj.monthlyFixedValue ??
                                          5000
                                        }
                                        onChange={e =>
                                          handleUpdateFunctionLevelValue(
                                            fnName,
                                            lvlKey,
                                            'monthlyFixedValue',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full border rounded-lg px-2.5 py-1 font-extrabold text-purple-800"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulário para Criar Nova Função na Tabela (Com Checkbox "Aplicar Nivelamento") */}
          {isAdmin && (
            <form
              onSubmit={handleAddNewFunction}
              className="bg-white p-5 rounded-2xl border-2 border-dashed border-blue-300 space-y-4 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-sm text-blue-950 uppercase flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" /> Cadastrar Nova Função / Setor na Tabela de Remuneração
                </h4>

                <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-300 font-extrabold text-blue-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFunctionForm.applyLeveling}
                    onChange={e =>
                      setNewFunctionForm({
                        ...newFunctionForm,
                        applyLeveling: e.target.checked
                      })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span>( ) Aplicar nivelamento (Níveis 1 a 4)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Nome Curto da Função *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Plantonista Sala Vermelha"
                    value={newFunctionForm.name}
                    onChange={e =>
                      setNewFunctionForm({ ...newFunctionForm, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Tipo de Alocação</label>
                  <select
                    value={newFunctionForm.requiresSchedule ? 'sim' : 'nao'}
                    onChange={e =>
                      setNewFunctionForm({
                        ...newFunctionForm,
                        requiresSchedule: e.target.value === 'sim'
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                  >
                    <option value="sim">Com Escala (12h / Fração)</option>
                    <option value="nao">Sem Escala (Fixo Mensal)</option>
                  </select>
                </div>

                {newFunctionForm.requiresSchedule ? (
                  <>
                    <div>
                      <label className="block font-bold mb-1">
                        Ciclo Fixo Semanal 12h (R$)
                      </label>
                      <input
                        type="number"
                        value={newFunctionForm.fixedRate12h}
                        onChange={e =>
                          setNewFunctionForm({
                            ...newFunctionForm,
                            fixedRate12h: Number(e.target.value)
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">
                        Extra 12h Dia Semana / FDS
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          title="Extra 12h Dia de Semana (R$)"
                          value={newFunctionForm.extraWeekday12h}
                          onChange={e =>
                            setNewFunctionForm({
                              ...newFunctionForm,
                              extraWeekday12h: Number(e.target.value)
                            })
                          }
                          className="w-full border rounded-lg px-2 py-2 font-bold text-blue-900"
                        />
                        <input
                          type="number"
                          title="Extra 12h Final de Semana (R$)"
                          value={newFunctionForm.extraWeekend12h}
                          onChange={e =>
                            setNewFunctionForm({
                              ...newFunctionForm,
                              extraWeekend12h: Number(e.target.value)
                            })
                          }
                          className="w-full border rounded-lg px-2 py-2 font-bold text-emerald-800"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">
                      Valor Mensal Fixo do Cargo (R$)
                    </label>
                    <input
                      type="number"
                      value={newFunctionForm.monthlyFixedValue}
                      onChange={e =>
                        setNewFunctionForm({
                          ...newFunctionForm,
                          monthlyFixedValue: Number(e.target.value)
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Descrição / Atribuições da Função (Caixa Aberta):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atendimento de porta e observação clínica..."
                  value={newFunctionForm.description}
                  onChange={e =>
                    setNewFunctionForm({ ...newFunctionForm, description: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
                >
                  + Criar Função na Tabela
                </button>
              </div>
            </form>
          )}
        </div>

        {/* BLOCO 3: CATÁLOGO DETALHADO DE ADICIONAIS & BONIFICAÇÕES
            (COM VALOR FIXO R$ OU PERCENTUAL % E ESCOLHA DE APLICAÇÃO NA FOLHA FINAL OU SOBRE FUNÇÃO) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Percent size={18} className="text-amber-600" />
              Catálogo Detalhado de Adicionais & Bonificações (Valor Fixo R$ ou Percentual % + Regra de Incidência)
            </h3>
            <p className="text-slate-500 mt-0.5">
              Configure adicionais por plantão ou bonificações mensais, podendo escolher entre <strong>Valor Fixo (R$)</strong> ou <strong>Percentual (%)</strong>, e definir se incide <strong>sobre o valor final da folha</strong> ou <strong>sobre uma função/remuneração específica</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {shiftAdditionalsList.map((add: any) => {
              const targetLabel =
                add.applicationTarget === 'specific_function'
                  ? `Sobre a Função: ${add.targetFunctionName || allFunctionNames[0]}`
                  : add.applicationTarget === 'final_payroll'
                  ? 'Sobre o Valor Final da Folha PJ'
                  : 'Sobre a Remuneração do Plantão (Ref. 12h)';

              return (
                <div
                  key={add.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-sm font-black text-slate-900 block">
                        {add.name}
                      </strong>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                          {add.incidence === 'monthly'
                            ? 'Bonificação / Adicional na Folha Mensal'
                            : 'Adicional por Plantão'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                          {add.calcMode === 'percent'
                            ? `Percentual: ${add.percentValue || 0}%`
                            : `Fixo: R$ ${Number(add.value12h || 0).toLocaleString('pt-BR')}`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                          {targetLabel}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          safeSetConfig((prev: any) => ({
                            ...prev,
                            shiftAdditionals: shiftAdditionalsList.filter(
                              (item: any) => item.id !== add.id
                            )
                          }))
                        }
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          Modo de Cálculo
                        </label>
                        <select
                          value={add.calcMode || 'fixed'}
                          onChange={e =>
                            handleUpdateExistingAdditional(add.id, 'calcMode', e.target.value)
                          }
                          className="w-full border rounded-lg px-2 py-1 bg-white font-bold"
                        >
                          <option value="fixed">Valor Fixo (R$)</option>
                          <option value="percent">Percentual (%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          {add.calcMode === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
                        </label>
                        <input
                          type="number"
                          value={
                            add.calcMode === 'percent'
                              ? add.percentValue ?? 10
                              : add.value12h ?? 250
                          }
                          onChange={e =>
                            handleUpdateExistingAdditional(
                              add.id,
                              add.calcMode === 'percent' ? 'percentValue' : 'value12h',
                              Number(e.target.value)
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1 bg-white font-black text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          Aplicar Sobre:
                        </label>
                        <select
                          value={add.applicationTarget || 'shift_base'}
                          onChange={e =>
                            handleUpdateExistingAdditional(
                              add.id,
                              'applicationTarget',
                              e.target.value
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1 bg-white font-bold"
                        >
                          <option value="final_payroll">Valor Final da Folha</option>
                          <option value="specific_function">Função Específica</option>
                          <option value="shift_base">Base do Plantão (12h)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddAdditional}
              className="p-4 rounded-2xl bg-amber-50/50 border-2 border-dashed border-amber-300 space-y-3"
            >
              <h4 className="font-extrabold text-amber-950 uppercase text-xs flex items-center gap-1.5">
                <Plus size={15} className="text-amber-700" />
                Cadastrar Novo Adicional ou Bonificação (Com Opção Percentual % e Base de Aplicação)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">
                    Nome do Adicional / Bonificação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bonificação Meta Assistencial / Adicional Chefia"
                    value={newAdditionalForm.name}
                    onChange={e =>
                      setNewAdditionalForm({ ...newAdditionalForm, name: e.target.value })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Periodicidade</label>
                  <select
                    value={newAdditionalForm.incidence}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        incidence: e.target.value as 'shift' | 'monthly'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="shift">Por Plantão</option>
                    <option value="monthly">Na Folha Mensal (Bonificação)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Tipo de Valor</label>
                  <select
                    value={newAdditionalForm.calcMode}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        calcMode: e.target.value as 'fixed' | 'percent'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-extrabold text-amber-950"
                  >
                    <option value="fixed">Valor Fixo (R$)</option>
                    <option value="percent">Valor Percentual (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    {newAdditionalForm.calcMode === 'percent'
                      ? 'Percentual (%)'
                      : 'Valor em R$'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={
                      newAdditionalForm.calcMode === 'percent'
                        ? newAdditionalForm.percentValue
                        : newAdditionalForm.value12h
                    }
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        ...(newAdditionalForm.calcMode === 'percent'
                          ? { percentValue: Number(e.target.value) }
                          : { value12h: Number(e.target.value) })
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                <div>
                  <label className="block font-bold mb-1">
                    Onde Aplicar esta Bonificação / Adicional?
                  </label>
                  <select
                    value={newAdditionalForm.applicationTarget}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        applicationTarget: e.target.value as
                          | 'final_payroll'
                          | 'specific_function'
                          | 'shift_base'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-extrabold text-indigo-950"
                  >
                    <option value="final_payroll">
                      Aplicar sobre o Valor Final da Folha
                    </option>
                    <option value="specific_function">
                      Aplicar sobre uma Função / Remuneração Específica
                    </option>
                    <option value="shift_base">
                      Aplicar sobre o Plantão Individual (Base 12h)
                    </option>
                  </select>
                </div>

                {newAdditionalForm.applicationTarget === 'specific_function' ? (
                  <div>
                    <label className="block font-bold mb-1">
                      Selecione a Função Base do Cálculo:
                    </label>
                    <select
                      value={newAdditionalForm.targetFunctionName}
                      onChange={e =>
                        setNewAdditionalForm({
                          ...newAdditionalForm,
                          targetFunctionName: e.target.value
                        })
                      }
                      className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                    >
                      {allFunctionNames.map(fn => (
                        <option key={fn} value={fn}>
                          {fn}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 font-bold"
                >
                  + Salvar Adicional / Bonificação
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. ABA: FOLHA PJ 26 A 25 + AUDITORIA DE CARGA HORÁRIA POR FUNÇÃO
  //         (INTEGRADA COM OPÇÃO DE NIVELAMENTO, EXTRA SEMANA VS FDS E BONIFICAÇÃO %)
  // ============================================================================
  const windowShifts = safeShifts.filter((s: any) => {
    if (!s?.date) return false;
    const hasDoc = Boolean(s?.doctorId) || Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName);
    if (!hasDoc) return false;
    return (
      s.date >= (competenceWindow?.startStr || '0000-01-01') &&
      s.date <= (competenceWindow?.endStr || '9999-12-31')
    );
  });

  const monthCustomizations = config?.payrollCustomizations?.[competenceMonth] || {};
  const allCatalogAdditionals = Array.isArray(config?.shiftAdditionals)
    ? config.shiftAdditionals
    : [];

  const buildDetailedPayrollEntry = (
    entityKey: string | number,
    docObj: any,
    entityWindowShifts: any[],
    isManualEntry: boolean = false
  ) => {
    const docLevel = Number(docObj?.remunerationLevel || 1);
    const defaultFn = docObj?.role || allFunctionNames[0] || 'Plantonista';

    const auditByFunction: Record<
      string,
      { fixedShifts: number; fixedHours: number; extraShifts: number; extraHours: number }
    > = {};
    allFunctionNames.forEach(fn => {
      auditByFunction[fn] = { fixedShifts: 0, fixedHours: 0, extraShifts: 0, extraHours: 0 };
    });

    const autoWeeklyFixedSlotsMap: Record<
      string,
      { functionName: string; hoursPerUnit: number; occurrences: number }
    > = {};

    let autoExtraWeekdayHours = 0;
    let autoExtraWeekendHours = 0;
    const autoExtraHoursByFn: Record<string, number> = {};

    entityWindowShifts.forEach((s: any) => {
      const fnName = s?.category || s?.role || defaultFn;
      const hrs = getShiftHours(s);
      if (!auditByFunction[fnName]) {
        auditByFunction[fnName] = { fixedShifts: 0, fixedHours: 0, extraShifts: 0, extraHours: 0 };
      }

      const isFixedShift =
        !isManualEntry &&
        (s?.shiftType === 'Fixo' ||
          s?.modality === 'Fixo' ||
          (!s?.shiftType && !s?.modality && docObj?.contractType === 'Fixo Mensal'));

      if (isFixedShift) {
        auditByFunction[fnName].fixedShifts += 1;
        auditByFunction[fnName].fixedHours += hrs;

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
        auditByFunction[fnName].extraShifts += 1;
        auditByFunction[fnName].extraHours += hrs;
        if (isWeekendDate(s.date)) {
          autoExtraWeekendHours += hrs;
        } else {
          autoExtraWeekdayHours += hrs;
        }
        autoExtraHoursByFn[fnName] = (autoExtraHoursByFn[fnName] || 0) + hrs;
      }
    });

    const groupedAutoQuotas: Record<
      string,
      { id: string; units: number; hoursPerUnit: number; functionName: string }
    > = {};
    Object.values(autoWeeklyFixedSlotsMap).forEach((slot, idx) => {
      const gKey = `${slot.functionName}__${slot.hoursPerUnit}`;
      if (!groupedAutoQuotas[gKey]) {
        groupedAutoQuotas[gKey] = {
          id: `auto_q_${idx}`,
          units: 0,
          hoursPerUnit: slot.hoursPerUnit,
          functionName: slot.functionName
        };
      }
      groupedAutoQuotas[gKey].units += 1;
    });

    const autoFixedQuotasList = Object.values(groupedAutoQuotas);
    const customDoc = monthCustomizations[entityKey] || {};
    const hasCustomQuotas = Array.isArray(customDoc.fixedQuotas);
    const hasCustomExtraWeekday =
      customDoc.extraWeekdayHours !== undefined && customDoc.extraWeekdayHours !== null;
    const hasCustomExtraWeekend =
      customDoc.extraWeekendHours !== undefined && customDoc.extraWeekendHours !== null;

    const activeFixedQuotas: {
      id: string;
      units: number;
      hoursPerUnit: number;
      functionName: string;
    }[] = hasCustomQuotas ? customDoc.fixedQuotas : autoFixedQuotasList;

    const activeExtraWeekdayHours: number = hasCustomExtraWeekday
      ? Number(customDoc.extraWeekdayHours)
      : autoExtraWeekdayHours;

    const activeExtraWeekendHours: number = hasCustomExtraWeekend
      ? Number(customDoc.extraWeekendHours)
      : autoExtraWeekendHours;

    const activeExtraFunction: string =
      customDoc.extraFunction ||
      Object.keys(autoExtraHoursByFn)[0] ||
      defaultFn;

    // Subtotal financeiro acumulado por cada função (para bonificações que incidem sobre função específica)
    const remunerationByFunctionMap: Record<string, number> = {};

    // 1. Cálculo das Cargas Fixas Acumuladas (Proporcional: Valor Base 12h * (Horas / 12) * Unidades)
    let fixedQuotasFinancialTotal = 0;
    const evaluatedQuotas = activeFixedQuotas.map(q => {
      const { fixed12hRef, applyLeveling } = getFunctionEffectiveRates(
        q.functionName,
        docLevel
      );
      const unitProportionalValue = fixed12hRef * (Number(q.hoursPerUnit || 12) / 12);
      const lineTotal = Number(q.units || 0) * unitProportionalValue;
      fixedQuotasFinancialTotal += lineTotal;
      remunerationByFunctionMap[q.functionName] =
        (remunerationByFunctionMap[q.functionName] || 0) + lineTotal;
      return {
        ...q,
        fixed12hRef,
        applyLeveling,
        unitProportionalValue,
        lineTotal
      };
    });

    // 2. Cálculo das Horas Extras (Diferenciando Dia de Semana e Final de Semana, proporcional a 12h)
    const { extraWeekday12hRef, extraWeekend12hRef } = getFunctionEffectiveRates(
      activeExtraFunction,
      docLevel
    );
    const extraWeekdayTotal =
      extraWeekday12hRef * (Number(activeExtraWeekdayHours || 0) / 12);
    const extraWeekendTotal =
      extraWeekend12hRef * (Number(activeExtraWeekendHours || 0) / 12);
    const extraFinancialTotal = extraWeekdayTotal + extraWeekendTotal;

    remunerationByFunctionMap[activeExtraFunction] =
      (remunerationByFunctionMap[activeExtraFunction] || 0) + extraFinancialTotal;

    const baseSubtotalBeforeBonuses = fixedQuotasFinancialTotal + extraFinancialTotal;

    // 3. Cálculo de Adicionais por Plantão + Bonificações/Adicionais da Folha (Fixo R$ ou Percentual %)
    let shiftLevelAdditionalsTotal = 0;
    entityWindowShifts.forEach((s: any) => {
      const hrs = getShiftHours(s);
      const fnName = s?.category || defaultFn;
      const { fixed12hRef } = getFunctionEffectiveRates(fnName, docLevel);
      const shiftPropRef = fixed12hRef * (hrs / 12);
      const sAdds: string[] = Array.isArray(s?.additionals) ? s.additionals : [];

      sAdds.forEach(addId => {
        const addObj = allCatalogAdditionals.find((a: any) => a.id === addId);
        if (!addObj) return;
        if (addObj.calcMode === 'percent') {
          const pct = Number(addObj.percentValue || 0);
          if (addObj.applicationTarget === 'specific_function') {
            const targetFn = addObj.targetFunctionName || fnName;
            const fnBase = remunerationByFunctionMap[targetFn] || shiftPropRef;
            shiftLevelAdditionalsTotal += (fnBase * pct) / 100;
          } else if (addObj.applicationTarget === 'final_payroll') {
            shiftLevelAdditionalsTotal += (baseSubtotalBeforeBonuses * pct) / 100;
          } else {
            shiftLevelAdditionalsTotal += (shiftPropRef * pct) / 100;
          }
        } else {
          shiftLevelAdditionalsTotal += Number(addObj.value12h || 0) * (hrs / 12);
        }
      });
    });

    // Bonificações mensais selecionadas para este médico na folha
    const selectedBonusIds: string[] = Array.isArray(customDoc.selectedBonusIds)
      ? customDoc.selectedBonusIds
      : Array.isArray(docObj?.monthlyAdditionals)
      ? docObj.monthlyAdditionals
      : [];

    let payrollBonusesTotal = 0;
    selectedBonusIds.forEach(bId => {
      const addObj = allCatalogAdditionals.find((a: any) => a.id === bId);
      if (!addObj) return;
      if (addObj.calcMode === 'percent') {
        const pct = Number(addObj.percentValue || 0);
        if (addObj.applicationTarget === 'specific_function') {
          const targetFn = addObj.targetFunctionName || defaultFn;
          const fnSub = remunerationByFunctionMap[targetFn] || 0;
          payrollBonusesTotal += (fnSub * pct) / 100;
        } else {
          // Aplica sobre o valor final da folha (Fixed + Extra + Shift Additionals)
          payrollBonusesTotal +=
            ((baseSubtotalBeforeBonuses + shiftLevelAdditionalsTotal) * pct) / 100;
        }
      } else {
        payrollBonusesTotal += Number(addObj.value12h || 0);
      }
    });

    const additionsTotal =
      shiftLevelAdditionalsTotal +
      payrollBonusesTotal +
      Number(docObj?.fixedMonthlyAdditional || 0);

    const netTotalCalculated = baseSubtotalBeforeBonuses + additionsTotal;

    const totalFulfilledHours = entityWindowShifts.reduce(
      (acc: number, s: any) => acc + getShiftHours(s),
      0
    );

    return {
      entityKey,
      isManualEntry,
      doctor: docObj,
      docLevel,
      shiftsCount: entityWindowShifts.length,
      totalFulfilledHours,
      evaluatedQuotas,
      activeFixedQuotas,
      fixedQuotasFinancialTotal,
      activeExtraWeekdayHours,
      activeExtraWeekendHours,
      activeExtraHours: activeExtraWeekdayHours + activeExtraWeekendHours,
      activeExtraFunction,
      extraWeekday12hRef,
      extraWeekend12hRef,
      extraFinancialTotal,
      selectedBonusIds,
      additionsTotal,
      netTotal: netTotalCalculated,
      auditByFunction,
      isCustomized:
        hasCustomQuotas ||
        hasCustomExtraWeekday ||
        hasCustomExtraWeekend ||
        Array.isArray(customDoc.selectedBonusIds)
    };
  };

  const targetDoctorsForPayroll = isAdmin
    ? safeActiveDoctors
    : safeActiveDoctors.filter((d: any) => Number(d?.id) === Number(currentUser?.id));

  const registeredPayrollRows = targetDoctorsForPayroll.map(doc => {
    const docWindowShifts = windowShifts.filter(
      (s: any) => !s?.isManualUnregisteredDoctor && Number(s?.doctorId) === Number(doc.id)
    );
    return buildDetailedPayrollEntry(Number(doc.id), doc, docWindowShifts, false);
  });

  const manualGroupsMap: Record<
    string,
    { manualName: string; manualCrm: string; level: number; role: string; shifts: any[] }
  > = {};

  if (isAdmin) {
    windowShifts
      .filter((s: any) => Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName))
      .forEach((s: any) => {
        const cleanName = String(s.manualDoctorName).trim();
        const key = `manual__${cleanName.toLowerCase()}`;
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
  }

  const manualPayrollRows = Object.entries(manualGroupsMap).map(([mKey, grp]) => {
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
    return buildDetailedPayrollEntry(mKey, virtualDoc, grp.shifts, true);
  });

  const detailedPayrollRows = [...registeredPayrollRows, ...manualPayrollRows];

  const totalNet = detailedPayrollRows.reduce(
    (acc, item) => acc + Number(item.netTotal || 0),
    0
  );

  const updateDoctorPayrollCustom = (entityKey: string | number, updater: (curr: any) => any) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = prev?.payrollCustomizations || {};
      const monthObj = allCustom[competenceMonth] || {};
      const docObj = monthObj[entityKey] || {};
      const nextDocObj = updater(docObj);
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: {
            ...monthObj,
            [entityKey]: nextDocObj
          }
        }
      };
    });
  };

  const handleAddFixedQuotaRow = (docRow: any) => {
    const currentQuotas = [...docRow.activeFixedQuotas];
    currentQuotas.push({
      id: `q_${Date.now()}`,
      units: 1,
      hoursPerUnit: 12,
      functionName: docRow.doctor.role || allFunctionNames[0] || 'Plantonista'
    });
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
  };

  const handleUpdateFixedQuotaRow = (
    docRow: any,
    quotaIndex: number,
    field: 'units' | 'hoursPerUnit' | 'functionName',
    value: any
  ) => {
    const currentQuotas = docRow.activeFixedQuotas.map((q: any, idx: number) =>
      idx === quotaIndex ? { ...q, [field]: value } : q
    );
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
  };

  const handleRemoveFixedQuotaRow = (docRow: any, quotaIndex: number) => {
    const currentQuotas = docRow.activeFixedQuotas.filter(
      (_: any, idx: number) => idx !== quotaIndex
    );
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
  };

  const handleUpdateExtraWeekdayHours = (docRow: any, newHours: number) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      extraWeekdayHours: Math.max(0, newHours),
      extraWeekendHours:
        curr.extraWeekendHours !== undefined
          ? curr.extraWeekendHours
          : docRow.activeExtraWeekendHours,
      extraFunction: curr.extraFunction || docRow.activeExtraFunction
    }));
  };

  const handleUpdateExtraWeekendHours = (docRow: any, newHours: number) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      extraWeekdayHours:
        curr.extraWeekdayHours !== undefined
          ? curr.extraWeekdayHours
          : docRow.activeExtraWeekdayHours,
      extraWeekendHours: Math.max(0, newHours),
      extraFunction: curr.extraFunction || docRow.activeExtraFunction
    }));
  };

  const handleUpdateExtraFunction = (docRow: any, newFn: string) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      extraWeekdayHours:
        curr.extraWeekdayHours !== undefined
          ? curr.extraWeekdayHours
          : docRow.activeExtraWeekdayHours,
      extraWeekendHours:
        curr.extraWeekendHours !== undefined
          ? curr.extraWeekendHours
          : docRow.activeExtraWeekendHours,
      extraFunction: newFn
    }));
  };

  const handleTogglePayrollBonusOnRow = (docRow: any, bonusId: string) => {
    const currIds: string[] = docRow.selectedBonusIds || [];
    const exists = currIds.includes(bonusId);
    const nextIds = exists
      ? currIds.filter(id => id !== bonusId)
      : [...currIds, bonusId];

    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      selectedBonusIds: nextIds
    }));
  };

  const handleResetDoctorPayrollToAuto = (entityKey: string | number, docName: string) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = { ...(prev?.payrollCustomizations || {}) };
      const monthObj = { ...(allCustom[competenceMonth] || {}) };
      delete monthObj[entityKey];
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: monthObj
        }
      };
    });
    safeRecordAction(`Cálculo da Folha PJ de ${docName} restaurado para leitura automática`);
  };

  const handleExportPayrollAndAuditCSV = () => {
    if (typeof window === 'undefined') return;

    const fnHeaders: string[] = [];
    allFunctionNames.forEach(fn => {
      fnHeaders.push(`${fn} - Horas Fixas Escala`);
      fnHeaders.push(`${fn} - Horas Extras Escala`);
    });

    const header = [
      'Medico / Identificacao',
      'CRM',
      'Especialidade / Origem',
      'Nivel Senioridade',
      'Razao Social PJ',
      'CNPJ',
      'Cargas Fixas Acumuladas (Unidades)',
      'Valor Total Cargas Fixas (R$)',
      'Horas Extras Dia de Semana (h)',
      'Horas Extras Fim de Semana (h)',
      'Funcao Ref. Hora Extra',
      'Valor Total Horas Extras (R$)',
      'Adicionais e Bonificacoes (R$)',
      'Liquido Total PJ (R$)',
      'Total Horas Cumpridas na Escala',
      ...fnHeaders
    ];

    const rows = detailedPayrollRows.map(item => {
      const d = item.doctor || {};
      const quotasDesc =
        item.evaluatedQuotas.length > 0
          ? item.evaluatedQuotas
              .map(q => `${q.units}x Carga Fixa ${q.hoursPerUnit}h (${q.functionName})`)
              .join(' + ')
          : '0 Cargas Fixas';

      const fnCols: string[] = [];
      allFunctionNames.forEach(fn => {
        const audit = item.auditByFunction[fn] || { fixedHours: 0, extraHours: 0 };
        fnCols.push(String(audit.fixedHours || 0).replace('.', ','));
        fnCols.push(String(audit.extraHours || 0).replace('.', ','));
      });

      return [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.crm || '').replace(/"/g, '""')}"`,
        `"${(d.specialty || '').replace(/"/g, '""')}"`,
        `Nivel ${item.docLevel}`,
        `"${(d.razaoSocial || '').replace(/"/g, '""')}"`,
        `"${(d.cnpj || '').replace(/"/g, '""')}"`,
        `"${quotasDesc}"`,
        String(item.fixedQuotasFinancialTotal.toFixed(2).replace('.', ',')),
        String(item.activeExtraWeekdayHours).replace('.', ','),
        String(item.activeExtraWeekendHours).replace('.', ','),
        `"${item.activeExtraFunction}"`,
        String(item.extraFinancialTotal.toFixed(2).replace('.', ',')),
        String(item.additionsTotal.toFixed(2).replace('.', ',')),
        String(item.netTotal.toFixed(2).replace('.', ',')),
        String(item.totalFulfilledHours).replace('.', ','),
        ...fnCols
      ].join(';');
    });

    const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Folha_PJ_e_Auditoria_Funcoes_${competenceMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={24} />
            Folha Financeira PJ & Auditoria de Carga Horária ({competenceMonth})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Janela 26 a 25: <strong>{competenceWindow?.startStr}</strong> até{' '}
            <strong>{competenceWindow?.endStr}</strong> • Suporta funções com ou sem nivelamento, extra Semana vs. FDS e bonificações percentuais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="month"
            value={competenceMonth}
            onChange={e => safeSetCompetenceMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 font-extrabold"
          />
          <button
            type="button"
            onClick={handleExportPayrollAndAuditCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Exportar Folha PJ + Auditoria por Função (CSV/Excel)
          </button>
        </div>
      </div>

      <div className="bg-emerald-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-[11px] font-extrabold uppercase text-emerald-300">
            Total Consolidado da Competência ({competenceMonth})
          </span>
          <div className="text-2xl sm:text-3xl font-black mt-0.5">
            R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-xs text-emerald-200 flex items-center gap-2 max-w-md">
          <ShieldCheck size={20} className="shrink-0" />
          <span>
            Fração de plantão paga proporcionalmente sobre 12h. Bonificações podem incidir sobre o valor final da folha ou sobre função específica.
          </span>
        </div>
      </div>

      {/* TABELA 1: COMPOSIÇÃO DE PAGAMENTO PJ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Identificação</th>
              <th className="py-3 px-3">
                Ciclo Fixo Semanal Acumulado (Ref. 12h)
              </th>
              <th className="py-3 px-3">
                Horas Extras (Dia Semana vs. Fim de Semana)
              </th>
              <th className="py-3 px-3">Adicionais & Bonificações</th>
              <th className="py-3 px-4 text-right">Líquido Total PJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};

              return (
                <tr
                  key={row.entityKey}
                  className={`hover:bg-slate-50/80 align-top ${
                    row.isManualEntry ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="py-4 px-4 space-y-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-slate-900 text-sm font-black">
                        {d.name}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black text-[10px]">
                        Nível {row.docLevel}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {d.crm} • {d.specialty || 'Clínica Médica'}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        Escala: {row.shiftsCount} pl. ({row.totalFulfilledHours}h)
                      </span>
                      {isAdmin && row.isCustomized && (
                        <button
                          type="button"
                          onClick={() =>
                            handleResetDoctorPayrollToAuto(row.entityKey, d.name)
                          }
                          className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5"
                        >
                          <RotateCcw size={11} /> Auto
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Cargas Fixas */}
                  <td className="py-4 px-3 min-w-[310px] space-y-2">
                    {row.evaluatedQuotas.map((q: any, qIdx: number) => (
                      <div
                        key={q.id || qIdx}
                        className="p-2 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-center justify-between gap-1.5"
                      >
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={q.units}
                              onChange={e =>
                                handleUpdateFixedQuotaRow(
                                  row,
                                  qIdx,
                                  'units',
                                  Math.max(0, Number(e.target.value))
                                )
                              }
                              className="w-11 border border-blue-300 rounded px-1 py-0.5 text-center font-black bg-white"
                            />
                            <span className="text-[10px] font-bold">x</span>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={q.hoursPerUnit}
                              onChange={e =>
                                handleUpdateFixedQuotaRow(
                                  row,
                                  qIdx,
                                  'hoursPerUnit',
                                  Math.max(1, Number(e.target.value))
                                )
                              }
                              className="w-12 border border-blue-300 rounded px-1 py-0.5 text-center font-black bg-white"
                            />
                            <span className="text-[10px] font-bold">h</span>
                            <select
                              value={q.functionName}
                              onChange={e =>
                                handleUpdateFixedQuotaRow(
                                  row,
                                  qIdx,
                                  'functionName',
                                  e.target.value
                                )
                              }
                              className="border border-blue-300 rounded px-1.5 py-0.5 bg-white font-bold text-[10px]"
                            >
                              {allFunctionNames.map(fn => (
                                <option key={fn} value={fn}>
                                  {fn}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="font-bold text-blue-950">
                            {q.units}x {q.hoursPerUnit}h ({q.functionName})
                          </span>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          <span className="font-extrabold text-blue-900">
                            R${' '}
                            {q.lineTotal.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2
                            })}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFixedQuotaRow(row, qIdx)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAddFixedQuotaRow(row)}
                          className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                        >
                          + Acumular Carga Fixa
                        </button>
                      )}
                      <span className="text-[11px] font-extrabold text-slate-700 ml-auto">
                        Subtotal: R${' '}
                        {row.fixedQuotasFinancialTotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Horas Extras: Dia de Semana vs Final de Semana */}
                  <td className="py-4 px-3 min-w-[270px] space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      {isAdmin ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-blue-900">
                                Horas Extra Semana:
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={row.activeExtraWeekdayHours}
                                onChange={e =>
                                  handleUpdateExtraWeekdayHours(row, Number(e.target.value))
                                }
                                className="w-full border border-blue-300 rounded px-2 py-1 font-black bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-emerald-900">
                                Horas Extra FDS:
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={row.activeExtraWeekendHours}
                                onChange={e =>
                                  handleUpdateExtraWeekendHours(row, Number(e.target.value))
                                }
                                className="w-full border border-emerald-400 rounded px-2 py-1 font-black bg-white"
                              />
                            </div>
                          </div>
                          <select
                            value={row.activeExtraFunction}
                            onChange={e => handleUpdateExtraFunction(row, e.target.value)}
                            className="w-full border border-emerald-300 rounded px-2 py-1 bg-white font-bold text-[11px]"
                          >
                            {allFunctionNames.map(fn => (
                              <option key={fn} value={fn}>
                                Função Extra: {fn}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <div className="font-bold text-emerald-950">
                          Semana: {row.activeExtraWeekdayHours}h • FDS:{' '}
                          {row.activeExtraWeekendHours}h ({row.activeExtraFunction})
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-emerald-200/60">
                        <span className="text-slate-500">
                          Sem: R${row.extraWeekday12hRef} | FDS: R${row.extraWeekend12hRef}
                        </span>
                        <strong className="text-emerald-800 font-black">
                          R${' '}
                          {row.extraFinancialTotal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2
                          })}
                        </strong>
                      </div>
                    </div>
                  </td>

                  {/* Adicionais e Bonificações (Com ativação rápida pelo Gestor) */}
                  <td className="py-4 px-3 min-w-[220px] space-y-1.5">
                    <div className="font-extrabold text-indigo-800">
                      + R${' '}
                      {row.additionsTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </div>
                    {isAdmin && allCatalogAdditionals.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {allCatalogAdditionals.map((bon: any) => {
                          const active = (row.selectedBonusIds || []).includes(bon.id);
                          return (
                            <button
                              key={bon.id}
                              type="button"
                              onClick={() => handleTogglePayrollBonusOnRow(row, bon.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                active
                                  ? 'bg-amber-500 text-slate-950 border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-300'
                              }`}
                              title={
                                bon.applicationTarget === 'specific_function'
                                  ? `Aplica sobre ${bon.targetFunctionName}`
                                  : 'Aplica sobre valor final da folha'
                              }
                            >
                              {active ? '✓ ' : '+ '}
                              {bon.name}{' '}
                              {bon.calcMode === 'percent'
                                ? `(${bon.percentValue}%)`
                                : `(R$${bon.value12h})`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Total Líquido */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <span className="text-base font-black text-emerald-700 block">
                      R${' '}
                      {row.netTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Total Competência
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABELA 2: PLANILHA DE AUDITORIA DE CARGA HORÁRIA EM COLUNAS DEDICADAS POR FUNÇÃO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
            <Table size={17} className="text-indigo-600" />
            2. Planilha de Auditoria de Carga Horária por Função Cadastrada
          </h3>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Plantonista</th>
              <th className="py-3 px-3 text-center">Total Horas na Escala</th>
              {allFunctionNames.map(fn => (
                <th key={fn} className="py-3 px-3 text-center border-l border-slate-700">
                  {fn}
                  <span className="block text-[9px] text-slate-300 font-normal">
                    (Horas Fixas | Horas Extras)
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};
              return (
                <tr key={row.entityKey} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                  <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50">
                    {row.totalFulfilledHours}h ({row.shiftsCount} turnos)
                  </td>
                  {allFunctionNames.map(fn => {
                    const audit = row.auditByFunction[fn] || {
                      fixedHours: 0,
                      extraHours: 0
                    };
                    const hasAny = audit.fixedHours > 0 || audit.extraHours > 0;
                    return (
                      <td
                        key={fn}
                        className="py-3 px-3 text-center border-l border-slate-100"
                      >
                        {!hasAny ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="inline-flex items-center gap-2 font-bold">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                              Fixo: {audit.fixedHours}h
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                              Extra: {audit.extraHours}h
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}