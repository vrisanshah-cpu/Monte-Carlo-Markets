import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCompetitionBrief, getCompetitionState, joinCompetition } from '@/actions/trading';
import { CompetitionDetailClient } from '@/components/competitions/CompetitionDetailClient';

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login if not authenticated
    notFound();
  }

  try {
    const competition = await getCompetitionBrief(id);

    if (!competition) {
      notFound();
    }

    // Check if user is joined
    let state = null;
    let isJoined = false;

    try {
      state = await getCompetitionState(id);
      isJoined = true;
    } catch {
      isJoined = false;
    }

    // Pass to client component for interactivity
    return (
      <CompetitionDetailClient
        competition={competition}
        initialState={state}
        isJoined={isJoined}
        userId={user.id}
      />
    );
  } catch (error) {
    console.error('Error loading competition:', error);
    notFound();
  }
}
