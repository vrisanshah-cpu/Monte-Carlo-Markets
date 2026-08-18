'use server';

import { createClient } from '@/lib/supabase/server';

export async function getMyProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(payload: { username?: string; display_name?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGlobalLeaderboard() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, total_points, simulations_run')
    .order('total_points', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}
