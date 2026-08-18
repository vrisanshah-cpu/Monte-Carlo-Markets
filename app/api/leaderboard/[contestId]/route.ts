import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('challenge_id', contestId)
    .order('rank', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leaderboard: data });
}
