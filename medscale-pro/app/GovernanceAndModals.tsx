'use client';

import React, { useState, useEffect } from 'react';
import {
  Umbrella, GraduationCap, AlertTriangle, Megaphone, History,
  Settings, Plus, Trash2, CheckCircle, XCircle, X, Shield, Lock
} from 'lucide-react';
import { calculateExpirationFromIssueDate } from './medscaleData';

interface GovernanceAndModalsProps {
  currentView: string;
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  isMasterAdmin?: boolean;
  currentUser: any;
  doctors: any[];
  setDoctors: React.Dispatch<React.SetStateAction<any[]>>;
  shifts: any[];
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  vacations: any[];
  setVacations: React.Dispatch<React.SetStateAction<any[]>>;
  courses: any[];
  setCourses: React.Dispatch<React.SetStateAction<any[]>>;
  occurrences: any[];
  setOccurrences: React.Dispatch<React.SetStateAction<any[]>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  auditTrail: any[];
  dynamicCategories: string[];
  getDoctorById: (id: any) => any;
  recordAction: (description: string) => void;
  isDoctorModalOpen: boolean;
  setIsDoctorModalOpen: (b: boolean) => void;
  editingDoctor: any | null;
}

export default function GovernanceAndModals({
  currentView,
  config,
  setConfig,
  isAdmin,
  isMasterAdmin = false,
  currentUser,
  doctors,
  setDoctors,
  shifts,
  setShifts,
  vacations,
  setVacations,
  courses,
  setCourses,
  occurrences,
  setOccurrences,
  announcements,
  setAnnouncements,
  auditTrail,
  dynamicCategories,
  getDoctorById,
  recordAction,
  isDoctorModalOpen,
  setIsDoctorModalOpen,
  editingDoctor
}: GovernanceAndModalsProps) {
  // Estado para o Modal de Cadastro/Edição de Médico
  const [docForm, setDocForm] = useState<any>({
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    email: '',
    password: '123',
    phone: '',
    crm: '',
    rqe: '',
    specialty: 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    role: 'Plantonista',
    remunerationLevel: 1,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: ['Plantonista'],
    defaultShiftAdditionals: [],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    status: 'Ativo'
  });

  useEffect(() => {
    if (editingDoctor) {
      setDocForm({
        ...editingDoctor,
        hasManagerAccess: Boolean(editingDoctor.hasManagerAccess),
        participatesInSchedule: editingDoctor.participatesInSchedule !== false,
        allowedFunctions: editingDoctor.allowedFunctions || [editingDoctor.role || 'Plantonista'],
        defaultShiftAdditionals: editingDoctor.defaultShiftAdditionals || [],
        monthlyAdditionals: editingDoctor.monthlyAdditionals || []
      });
    } else {
      setDocForm({
        name: '',
        username: '',
        cpf: '',
        birthDate: '',
        email: '',
        password: '123',
        phone: '',
        crm: '',
        rqe: '',
        specialty: config?.registeredSpecialties?.[0]?.name || 'Clínica Médica',
        razaoSocial: '',
        cnpj: '',
        role: dynamicCategories[0] || 'Plantonista',
        remunerationLevel: 1,
        contractType: 'Coringa / Extra',
        participatesInSchedule: true,
        hasManagerAccess: false,
        allowedFunctions: [dynamicCategories[0] || 'Plantonista'],
        defaultShiftAdditionals: [],
        monthlyAdditionals: [],
        fixedMonthlyAdditional: 0,
        status: 'Ativo'
      });
    }
  }, [editingDoctor, isDoctorModalOpen, config, dynamicCategories]);

  // Estados das abas de Governança
  const [vacForm, setVacForm] = useState({
    requestType: 'Férias',
    leaveSubtype: 'Férias Regulamentares',
    startDate: '2026-11-01',
    endDate: '2026-11-15',
    justification: '',
    freeTextSubstitutions: ''
  });

  const [courseForm, setCourseForm] = useState({
    doctorId: currentUser?.id || 1,
    courseName: config?.courseCatalog?.[0]?.name || 'ACLS',
    issueDate: '2026-01-10',
    mandatory: true
  });

  const [occForm, setOccForm] = useState({
    targetType: 'Plantonista',
    doctorId: 1,
    date: new Date().toISOString().split('T')[0],
    type: 'Intercorrência Administrativa',
    severity: 'Atenção',
    title: '',
    description: ''
  });

  const [annForm, setAnnForm] = useState({
    title: '',
    category: 'Protocolo Clínico',
    priority: 'Normal',
    content: ''
  });

  const [newMasterPass, setNewMasterPass] = useState(config?.masterAdminPassword || 'admin123');
  const [passSavedMsg, setPassSavedMsg] = useState(false);

  const handleSaveDoctorModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name?.trim()) return;

    const cleanUsername = (docForm.username || docForm.email?.split('@')[0] || 'medico')
      .trim()
      .toLowerCase();

    // Verifica se a função principal escolhida exige escala ou não na Tabela de Remuneração
    const roleConfig = config?.functionRates?.[docForm.role];
    const isRoleWithoutSchedule = roleConfig && roleConfig.requiresSchedule === false;

    const finalParticipates = isRoleWithoutSchedule ? false : Boolean(docForm.participatesInSchedule);

    const updatedDoc = {
      ...docForm,
      id: editingDoctor ? editingDoctor.id : Date.now(),
      username: cleanUsername,
      participatesInSchedule: finalParticipates,
      hasManagerAccess: isMasterAdmin
        ? Boolean(docForm.hasManagerAccess)
        : Boolean(editingDoctor?.hasManagerAccess),
      accumulatedRoles: (docForm.allowedFunctions || [docForm.role]).map((fn: string, i: number) => {
        const fnCfg = config?.functionRates?.[fn];
        const fnNoSched = fnCfg && fnCfg.requiresSchedule === false;
        return {
          id: `ar_${Date.now()}_${i}`,
          roleName: fn,
          categoryType: fnNoSched ? 'administrativa' : 'assistencial',
          level: docForm.remunerationLevel || 1,
          contractModality: fnNoSched ? 'Cargo Administrativo Fixo' : docForm.contractType
        };
      })
    };

    if (editingDoctor) {
      setDoctors(prev => prev.map(d => (d.id === editingDoctor.id ? updatedDoc : d)));
      recordAction(`Cadastro do médico ${updatedDoc.name} atualizado`);
    } else {
      setDoctors(prev => [...prev, updatedDoc]);
      recordAction(`Novo médico cadastrado: ${updatedDoc.name}`);
    }

    setIsDoctorModalOpen(false);
  };

  const toggleFunctionInDocForm = (fnName: string) => {
    setDocForm((prev: any) => {
      const current = prev.allowedFunctions || [];
      const exists = current.includes(fnName);
      const next = exists ? current.filter((x: string) => x !== fnName) : [...current, fnName];
      return { ...prev, allowedFunctions: next };
    });
  };

  const toggleMonthlyAddInDocForm = (addId: string) => {
    setDocForm((prev: any) => {
      const current = prev.monthlyAdditionals || [];
      const exists = current.includes(addId);
      return {
        ...prev,
        monthlyAdditionals: exists ? current.filter((x: string) => x !== addId) : [...current, addId]
      };
    });
  };

  // Renderização do Modal de Edição/Cadastro de Médico (Disponível em qualquer aba)
  const renderDoctorModal = () => {
    if (!isDoctorModalOpen) return null;
    const allFnNames = Object.keys(config?.functionRates || {});
    const monthlyAdds = (config?.shiftAdditionals || []).filter((a: any) => a.incidence === 'monthly');

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 text-slate-800 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-extrabold text-slate-900">
              {editingDoctor ? `Editar Ficha: ${editingDoctor.name}` : 'Cadastrar Novo Médico'}
            </h3>
            <button
              type="button"
              onClick={() => setIsDoctorModalOpen(false)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveDoctorModal} className="space-y-4">
            {/* CONTROLE EXCLUSIVO DO LOGIN MESTRE (GESTOR) */}
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-amber-800" />
                  <span className="font-extrabold text-amber-950 uppercase text-xs">
                    Permissão de Acesso de Gestor (Exclusivo Login Mestre)
                  </span>
                </div>
                {!isMasterAdmin && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                    Bloqueado (Apenas Login Mestre)
                  </span>
                )}
              </div>

              <label className={`flex items-center gap-2.5 ${isMasterAdmin ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  disabled={!isMasterAdmin}
                  checked={Boolean(docForm.hasManagerAccess)}
                  onChange={e => setDocForm({ ...docForm, hasManagerAccess: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span className="font-bold text-slate-800">
                  Liberar perfil e funções de Gestor para este médico ao logar com a conta dele
                </span>
              </label>
              <p className="text-[11px] text-amber-900">
                Nota: O médico com acesso de gestor poderá gerir escalas, trocas e folha, mas <strong>nunca</strong> poderá conceder ou revogar acesso de gestor de outros usuários.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={docForm.name}
                  onChange={e => setDocForm({ ...docForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Usuário de Login (Username) *</label>
                <input
                  type="text"
                  required
                  value={docForm.username}
                  onChange={e => setDocForm({ ...docForm, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Senha de Acesso *</label>
                <input
                  type="text"
                  required
                  value={docForm.password}
                  onChange={e => setDocForm({ ...docForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">CRM *</label>
                <input
                  type="text"
                  required
                  value={docForm.crm}
                  onChange={e => setDocForm({ ...docForm, crm: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Especialidade</label>
                <input
                  type="text"
                  value={docForm.specialty}
                  onChange={e => setDocForm({ ...docForm, specialty: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Razão Social (PJ)</label>
                <input
                  type="text"
                  value={docForm.razaoSocial}
                  onChange={e => setDocForm({ ...docForm, razaoSocial: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={docForm.cnpj}
                  onChange={e => setDocForm({ ...docForm, cnpj: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Função Principal na Tabela</label>
                <select
                  value={docForm.role}
                  onChange={e => setDocForm({ ...docForm, role: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {allFnNames.map(fn => (
                    <option key={fn} value={fn}>
                      {fn} {config?.functionRates?.[fn]?.requiresSchedule === false ? '(Sem Escala)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Modalidade de Contrato</label>
                <select
                  value={docForm.contractType}
                  onChange={e => setDocForm({ ...docForm, contractType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Fixo Mensal">Fixo Mensal</option>
                  <option value="Coringa / Extra">Coringa / Extra</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Nível de Senioridade (1 a 4)</label>
                <select
                  value={docForm.remunerationLevel || 1}
                  onChange={e => setDocForm({ ...docForm, remunerationLevel: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value={1}>Nível 1 (Júnior)</option>
                  <option value={2}>Nível 2 (Pleno)</option>
                  <option value={3}>Nível 3 (Sênior)</option>
                  <option value={4}>Nível 4 (Referência)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(docForm.participatesInSchedule)}
                    onChange={e => setDocForm({ ...docForm, participatesInSchedule: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span>Participa da Escala de Plantões</span>
                </label>
              </div>
            </div>

            {/* Funções Exercidas (Com e Sem Escala) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border space-y-2">
              <span className="block font-bold text-slate-800">
                Funções Habilitadas / Acumuladas (Marque funções com ou sem escala):
              </span>
              <div className="flex flex-wrap gap-2">
                {allFnNames.map(fn => {
                  const active = (docForm.allowedFunctions || []).includes(fn);
                  const isNoSched = config?.functionRates?.[fn]?.requiresSchedule === false;
                  return (
                    <button
                      key={fn}
                      type="button"
                      onClick={() => toggleFunctionInDocForm(fn)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        active
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {fn} {isNoSched ? '(Sem Escala)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adicionais de Incidência no Mês vinculados ao médico */}
            {monthlyAdds.length > 0 && (
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                <span className="block font-bold text-indigo-950">
                  📅 Adicionais Fixos no Mês de Competência vinculados a este Médico:
                </span>
                <div className="flex flex-wrap gap-2">
                  {monthlyAdds.map((mAdd: any) => {
                    const active = (docForm.monthlyAdditionals || []).includes(mAdd.id);
                    return (
                      <button
                        key={mAdd.id}
                        type="button"
                        onClick={() => toggleMonthlyAddInDocForm(mAdd.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold border ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {mAdd.name} ({mAdd.calcMode === 'percent' ? `${mAdd.percentValue}%` : `R$ ${mAdd.value12h}`})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Salvar Ficha do Médico
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ABAS DE GOVERNANÇA
  // ============================================================================
  let viewContent = null;

  if (currentView === 'vacations') {
    const displayedVacations = isAdmin
      ? vacations
      : vacations.filter(v => Number(v.doctorId) === Number(currentUser?.id));

    const handleCreateVacation = (e: React.FormEvent) => {
      e.preventDefault();
      const newVac = {
        id: Date.now(),
        doctorId: currentUser?.id || 1,
        ...vacForm,
        status: isAdmin ? 'Aprovado' : 'Pendente',
        substitutionsStatus: 'Pendente Gestor',
        substitutions: []
      };
      setVacations(prev => [newVac, ...prev]);
      recordAction(`Solicitação de ${vacForm.requestType} registrada`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Férias & Licenças</h2>
        <form onSubmit={handleCreateVacation} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-sm">Solicitar Férias ou Licença</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={vacForm.requestType}
              onChange={e => setVacForm({ ...vacForm, requestType: e.target.value })}
              className="border rounded-lg px-3 py-2 bg-white font-bold"
            >
              <option value="Férias">Férias</option>
              <option value="Licença">Licença Médica / Especial</option>
            </select>
            <input
              type="date"
              value={vacForm.startDate}
              onChange={e => setVacForm({ ...vacForm, startDate: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={vacForm.endDate}
              onChange={e => setVacForm({ ...vacForm, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <input
            type="text"
            placeholder="Justificativa e sugestão de cobertura"
            value={vacForm.justification}
            onChange={e => setVacForm({ ...vacForm, justification: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
            Enviar Solicitação
          </button>
        </form>

        <div className="space-y-3">
          {displayedVacations.map(v => {
            const doc = getDoctorById(v.doctorId);
            return (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <strong className="text-sm">{doc?.name || 'Médico'}</strong> — {v.requestType} ({v.startDate} a {v.endDate})
                  <p className="text-slate-500 mt-0.5">{v.justification}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100">{v.status}</span>
                  {isAdmin && v.status === 'Pendente' && (
                    <button
                      type="button"
                      onClick={() =>
                        setVacations(prev => prev.map(item => (item.id === v.id ? { ...item, status: 'Aprovado' } : item)))
                      }
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold"
                    >
                      Aprovar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'courses') {
    const displayedCourses = isAdmin
      ? courses
      : courses.filter(c => Number(c.doctorId) === Number(currentUser?.id));

    const handleAddCourse = (e: React.FormEvent) => {
      e.preventDefault();
      const exp = calculateExpirationFromIssueDate(courseForm.issueDate, 24);
      const newC = {
        id: Date.now(),
        doctorId: isAdmin ? Number(courseForm.doctorId) : Number(currentUser?.id),
        courseName: courseForm.courseName,
        issueDate: courseForm.issueDate,
        expirationDate: exp,
        mandatory: courseForm.mandatory,
        fileName: 'Certificado_Anexado.pdf',
        status: 'Válido'
      };
      setCourses(prev => [newC, ...prev]);
      recordAction(`Certificado ${courseForm.courseName} registrado`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Cursos & Certificações (ACLS / ATLS / PALS)</h2>
        <form onSubmit={handleAddCourse} className="bg-white p-5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
          {isAdmin && (
            <div>
              <label className="block font-bold mb-1">Médico</label>
              <select
                value={courseForm.doctorId}
                onChange={e => setCourseForm({ ...courseForm, doctorId: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-bold mb-1">Curso</label>
            <input
              type="text"
              value={courseForm.courseName}
              onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Data de Emissão</label>
            <input
              type="date"
              value={courseForm.issueDate}
              onChange={e => setCourseForm({ ...courseForm, issueDate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg font-bold">
            + Registrar Curso
          </button>
        </form>

        <div className="space-y-2">
          {displayedCourses.map(c => {
            const doc = getDoctorById(c.doctorId);
            return (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <strong>{c.courseName}</strong> — {doc?.name}
                  <p className="text-slate-500">Emissão: {c.issueDate} • Validade: {c.expirationDate}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold ${c.status === 'Válido' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'occurrences') {
    const handleAddOcc = (e: React.FormEvent) => {
      e.preventDefault();
      if (!occForm.title.trim()) return;
      const newO = {
        id: Date.now(),
        ...occForm,
        shiftDate: occForm.date
      };
      setOccurrences(prev => [newO, ...prev]);
      setOccForm({ ...occForm, title: '', description: '' });
      recordAction(`Ocorrência registrada: ${occForm.title}`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Livro de Ocorrências Operacionais e Clínicas</h2>
        {isAdmin && (
          <form onSubmit={handleAddOcc} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={occForm.doctorId}
                onChange={e => setOccForm({ ...occForm, doctorId: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 bg-white font-bold"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={occForm.date}
                onChange={e => setOccForm({ ...occForm, date: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Título da ocorrência"
                value={occForm.title}
                onChange={e => setOccForm({ ...occForm, title: e.target.value })}
                className="border rounded-lg px-3 py-2 font-semibold"
              />
            </div>
            <textarea
              placeholder="Descrição detalhada"
              value={occForm.description}
              onChange={e => setOccForm({ ...occForm, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
              Registrar Ocorrência
            </button>
          </form>
        )}

        <div className="space-y-2">
          {occurrences.map(o => {
            const doc = getDoctorById(o.doctorId);
            return (
              <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <strong>{o.title}</strong>
                  <span className="text-slate-500">{o.date}</span>
                </div>
                <p className="text-slate-600 mt-1">{o.description}</p>
                {doc && <p className="text-slate-400 mt-1">Profissional: {doc.name}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'announcements') {
    const handleAddAnn = (e: React.FormEvent) => {
      e.preventDefault();
      if (!annForm.title.trim()) return;
      const newA = {
        id: Date.now(),
        ...annForm,
        date: new Date().toISOString().split('T')[0],
        acknowledgedBy: []
      };
      setAnnouncements(prev => [newA, ...prev]);
      setAnnForm({ title: '', category: 'Protocolo Clínico', priority: 'Normal', content: '' });
      recordAction(`Novo comunicado publicado: ${newA.title}`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Comunicados & Protocolos</h2>
        {isAdmin && (
          <form onSubmit={handleAddAnn} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <input
              type="text"
              placeholder="Título do Comunicado"
              value={annForm.title}
              onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 font-bold"
            />
            <textarea
              placeholder="Conteúdo do protocolo ou aviso..."
              value={annForm.content}
              onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
              Publicar Comunicado
            </button>
          </form>
        )}

        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <strong className="text-sm">{a.title}</strong>
                <span className="text-slate-400">{a.date}</span>
              </div>
              <p className="text-slate-600">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (currentView === 'audit') {
    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Trilha de Auditoria</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y text-xs">
          {auditTrail.length === 0 ? (
            <p className="p-4 text-slate-400 italic">Nenhuma ação registrada ainda nesta sessão.</p>
          ) : (
            auditTrail.map((log: any, idx: number) => (
              <div key={log.id || idx} className="p-3.5 flex justify-between items-center">
                <span>{log.description || log.action}</span>
                <span className="text-slate-400">{log.timestamp} — <strong>{log.user}</strong></span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  } else if (currentView === 'settings') {
    viewContent = (
      <div className="max-w-3xl space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Configurações da Unidade & Segurança</h2>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h3 className="font-bold text-sm">Identificação do Hospital e Setor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Nome do Aplicativo</label>
              <input
                type="text"
                value={config.appName || ''}
                onChange={e => setConfig({ ...config, appName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Nome da Unidade / Setor</label>
              <input
                type="text"
                value={config.sectorUnitName || ''}
                onChange={e => setConfig({ ...config, sectorUnitName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>
        </div>

        {/* EXCLUSIVO DO LOGIN MESTRE: ALTERAR SENHA DO GESTOR MESTRE */}
        {isMasterAdmin && (
          <div className="bg-amber-50 p-5 rounded-xl border-2 border-amber-300 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-900" />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Segurança do Login Mestre (Usuário: gestor)
              </h3>
            </div>
            <p className="text-amber-900">
              Altere abaixo a senha exclusiva do Login Mestre (`gestor`). Médicos com perfil de gestor utilizam suas próprias senhas individuais e não têm acesso a este painel.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMasterPass}
                onChange={e => setNewMasterPass(e.target.value)}
                className="border border-amber-400 rounded-lg px-3 py-2 bg-white font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  setConfig((prev: any) => ({ ...prev, masterAdminPassword: newMasterPass }));
                  setPassSavedMsg(true);
                  setTimeout(() => setPassSavedMsg(false), 3000);
                  recordAction('Senha do Login Mestre atualizada');
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-bold"
              >
                Salvar Nova Senha Mestre
              </button>
            </div>
            {passSavedMsg && (
              <p className="text-emerald-700 font-bold">✓ Nova senha mestre salva com sucesso!</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {viewContent}
      {renderDoctorModal()}
    </>
  );
}