import { SupabaseClient } from '@supabase/supabase-js';

export async function syncStateToSupabase(
  supabase: SupabaseClient,
  state: {
    config: any;
    doctors: any[];
    shifts: any[];
    swaps: any[];
    vacations: any[];
    courses: any[];
    hourlyDemand: any;
  }
) {
  const { config, doctors, shifts, swaps, hourlyDemand } = state;

  // 1. Sincronizar Configurações e Mapa de Demanda Horária (07h às 06h)
  if (config) {
    await supabase.from('configuracoes').upsert({
      id: 1,
      app_name: config.appName,
      hospital_name: config.hospitalName,
      meses_ferias_bloqueados: config.blockedVacationMonths || ['2026-12', '2027-01'],
      tabela_funcoes_assistenciais: config.functionRates || {},
      tabela_funcoes_administrativas: config.adminFunctionRates || {},
      tabela_niveis_remuneracao: config.levelBonuses12h || {},
      adicionais_plantao: config.shiftAdditionals || [],
      mapa_demanda_horaria: hourlyDemand || {},
    });

    if (Array.isArray(config.registeredSpecialties)) {
      for (const spec of config.registeredSpecialties) {
        await supabase.from('especialidades').upsert(
          { nome: spec.name, adicional_12h: Number(spec.extra12h || 0) },
          { onConflict: 'nome' }
        );
      }
    }
  }

  const legacyDoctorIdToUuid = new Map<number, string>();
  const legacyShiftIdToUuid = new Map<number, string>();

  // 2. Sincronizar Médicos, Funções Acumuladas e Categorias Habilitadas
  if (Array.isArray(doctors)) {
    const { data: specs } = await supabase.from('especialidades').select('id, nome');
    const specMap = new Map((specs || []).map((s: any) => [s.nome, s.id]));

    for (const doc of doctors) {
      const { data: insertedDoc, error } = await supabase
        .from('medicos')
        .upsert(
          {
            nome_completo: doc.name,
            cpf: doc.cpf,
            data_nascimento: doc.birthDate || '1990-01-01',
            email: doc.email.toLowerCase(),
            telefone: doc.phone || '(11) 99999-9999',
            crm: doc.crm,
            rqe: doc.rqe || 'Não informado',
            especialidade_id: specMap.get(doc.specialty) || null,
            razao_social: doc.razaoSocial || doc.name,
            cnpj: doc.cnpj || '00.000.000/0001-00',
            data_ingresso: doc.joinDate || '2026-01-01',
            funcao_base: doc.role,
            nivel_remuneracao: Number(doc.remunerationLevel || 1),
            modalidade_contrato: doc.contractType,
            participa_escala: doc.participatesInSchedule !== false,
            status: doc.status,
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (!error && insertedDoc) {
        legacyDoctorIdToUuid.set(Number(doc.id), insertedDoc.id);

        if (Array.isArray(doc.accumulatedRoles)) {
          for (const ar of doc.accumulatedRoles) {
            await supabase.from('medicos_funcoes_acumuladas').upsert(
              {
                medico_id: insertedDoc.id,
                nome_funcao: ar.roleName,
                tipo_categoria: ar.categoryType,
                nivel: ar.categoryType === 'assistencial' ? Number(ar.level || 1) : null,
                modalidade_contrato: ar.contractModality,
              },
              { onConflict: 'medico_id,nome_funcao' }
            );
          }
        }

        if (Array.isArray(doc.allowedFunctions)) {
          for (const fnName of doc.allowedFunctions) {
            await supabase.from('medicos_categorias_habilitadas').upsert(
              {
                medico_id: insertedDoc.id,
                categoria_funcao: fnName,
              },
              { onConflict: 'medico_id,categoria_funcao' }
            );
          }
        }
      }
    }
  }

  // 3. Sincronizar Plantões
  if (Array.isArray(shifts)) {
    for (const sh of shifts) {
      const medicoUuid = legacyDoctorIdToUuid.get(Number(sh.doctorId));
      if (!medicoUuid) continue;

      const [shH, shM] = sh.startTime.split(':').map(Number);
      const [ehH, ehM] = sh.endTime.split(':').map(Number);
      let diffMin = ehH * 60 + ehM - (shH * 60 + shM);
      if (diffMin <= 0) diffMin += 24 * 60;
      const duracaoHoras = Math.max(1, diffMin / 60);

      const { data: insertedShift } = await supabase
        .from('plantoes')
        .insert({
          medico_id: medicoUuid,
          data_plantao: sh.date,
          hora_inicio: sh.startTime,
          hora_fim: sh.endTime,
          duracao_horas: duracaoHoras,
          tipo_descricao: sh.type,
          categoria_funcao: sh.category,
          tipo_faturamento: sh.billingType === 'Fixo' ? 'Fixo' : 'Coringa/Extra',
          adicionais_ids: sh.additionals || [],
        })
        .select('id')
        .single();

      if (insertedShift) {
        legacyShiftIdToUuid.set(Number(sh.id), insertedShift.id);
      }
    }
  }

  // 4. Sincronizar Trocas e Passagens
  if (Array.isArray(swaps)) {
    for (const sw of swaps) {
      const plantaoUuid = legacyShiftIdToUuid.get(Number(sw.shiftId));
      const reqUuid = legacyDoctorIdToUuid.get(Number(sw.requestingDoctorId));
      const propUuid = legacyDoctorIdToUuid.get(Number(sw.proposedDoctorId));
      if (!plantaoUuid || !reqUuid || !propUuid) continue;

      if (sw.movementType === 'Passagem') {
        await supabase.from('passagens').insert({
          plantao_id: plantaoUuid,
          data_plantao: sw.shiftDate,
          categoria_plantao: sw.shiftCategory,
          tipo_faturamento_origem: sw.shiftBillingType === 'Fixo' ? 'Fixo' : 'Coringa/Extra',
          medico_titular_id: reqUuid,
          medico_substituto_id: propUuid,
          parcial: Boolean(sw.isPartial),
          hora_inicio_passagem: sw.swapStartTime,
          hora_fim_passagem: sw.swapEndTime,
          horas_passadas: 12,
          justificativa: sw.reason,
          status: sw.status,
          aplicar_desconto_folha: Boolean(sw.applyPayrollDiscount),
          modo_desconto: sw.discountMode === 'diferenca' ? 'diferenca' : 'integral',
          data_solicitacao: sw.dateRequested,
        });
      } else {
        await supabase.from('trocas').insert({
          plantao_id: plantaoUuid,
          data_plantao: sw.shiftDate,
          categoria_plantao: sw.shiftCategory,
          medico_solicitante_id: reqUuid,
          medico_proposto_id: propUuid,
          parcial: Boolean(sw.isPartial),
          hora_inicio_troca: sw.swapStartTime,
          hora_fim_troca: sw.swapEndTime,
          justificativa: sw.reason,
          status: sw.status,
          data_solicitacao: sw.dateRequested,
        });
      }
    }
  }

  return {
    success: true,
    message: `Dados sincronizados no Supabase com sucesso (${legacyDoctorIdToUuid.size} médicos e ${legacyShiftIdToUuid.size} plantões gravados na nuvem)!`,
  };
}