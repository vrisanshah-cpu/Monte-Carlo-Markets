'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { LifeEvent, ScriptedShock } from '@/lib/types/trading';

async function assertAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: admin role required');
  }

  return user;
}

export interface CompetitionPayload {
  title: string;
  description: string;
  climate_scenario: 'orderly' | 'disorderly' | 'hothouse';
  start_date: string;
  end_date: string;
  status: 'draft' | 'open' | 'closed' | 'archived';
  starting_balance: number;
  scripted_shocks: ScriptedShock[];
  life_events: LifeEvent[];
}

export async function listCompetitions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function listPublicCompetitions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competitions')
    .select(
      'id, title, description, climate_scenario, start_date, end_date, status, starting_balance, scripted_shocks, life_events'
    )
    .in('status', ['open', 'closed'])
    .order('start_date', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function createCompetition(
  payload: CompetitionPayload
) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  if (!payload.title.trim()) {
    throw new Error('Competition title is required');
  }

  if (new Date(payload.end_date) <= new Date(payload.start_date)) {
    throw new Error('End date must be after start date');
  }

  if (payload.starting_balance <= 0) {
    throw new Error('Starting balance must be greater than zero');
  }

  const { data, error } = await admin
    .from('competitions')
    .insert({
      title: payload.title.trim(),
      description: payload.description.trim(),
      climate_scenario: payload.climate_scenario,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status,
      starting_balance: payload.starting_balance,
      scripted_shocks: payload.scripted_shocks,
      life_events: payload.life_events,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/admin');
  revalidatePath('/admin/competitions');
  revalidatePath('/competitions');

  return data;
}

export async function updateCompetition(
  id: string,
  payload: CompetitionPayload
) {
  await assertAdmin();

  if (!payload.title.trim()) {
    throw new Error('Competition title is required');
  }

  if (new Date(payload.end_date) <= new Date(payload.start_date)) {
    throw new Error('End date must be after start date');
  }

  if (payload.starting_balance <= 0) {
    throw new Error('Starting balance must be greater than zero');
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('competitions')
    .update({
      title: payload.title.trim(),
      description: payload.description.trim(),
      climate_scenario: payload.climate_scenario,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status,
      starting_balance: payload.starting_balance,
      scripted_shocks: payload.scripted_shocks,
      life_events: payload.life_events,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/admin');
  revalidatePath('/admin/competitions');
  revalidatePath(`/admin/competitions/${id}/edit`);
  revalidatePath('/competitions');
  revalidatePath(`/competitions/${id}`);

  return data;
}

export async function archiveCompetition(id: string) {
  await assertAdmin();

  const admin = createAdminClient();

  const { error } = await admin
    .from('competitions')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/admin');
  revalidatePath('/admin/competitions');
  revalidatePath('/competitions');
}