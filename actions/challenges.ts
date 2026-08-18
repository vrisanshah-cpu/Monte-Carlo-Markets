'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  if (profile?.role !== 'admin') throw new Error('Forbidden: admin role required');
  return user;
}

export interface ChallengePayload {
  slug: string;
  title: string;
  tagline?: string;
  description?: string;
  theme?: string;
  max_carbon_intensity?: number | null;
  min_green_allocation?: number | null;
  climate_scenario?: string | null;
  physical_risk_intensity?: number;
  tipping_point_prob?: number;
  carbon_tax_onset_year?: number;
  years?: number;
  initial_balance?: number;
  weight_sharpe?: number;
  weight_climate_var?: number;
  weight_temp_rise?: number;
  status?: 'draft' | 'active' | 'archived';
  starts_at?: string | null;
  ends_at?: string | null;
  prize_tiers?: { rank: number; label: string; reward: string }[];
}

export async function listChallenges() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createChallenge(payload: ChallengePayload) {
  const user = await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('challenges')
    .insert({ ...payload, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/admin');
  revalidatePath('/contests');
  return data;
}

export async function updateChallenge(id: string, payload: Partial<ChallengePayload>) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('challenges')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/admin');
  revalidatePath('/contests');
  revalidatePath(`/contests/${id}`);
  return data;
}

export async function archiveChallenge(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('challenges')
    .update({ status: 'archived' })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/admin');
  revalidatePath('/contests');
}

export async function deleteChallenge(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('challenges').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/admin');
  revalidatePath('/contests');
}
