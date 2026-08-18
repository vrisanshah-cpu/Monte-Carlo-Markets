import { NextResponse } from 'next/server';
import { createChallenge, listChallenges } from '@/actions/challenges';

export async function GET() {
  try {
    const data = await listChallenges();
    return NextResponse.json({ challenges: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list challenges';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await createChallenge(body);
    return NextResponse.json({ challenge: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create challenge';
    const status = message.startsWith('Forbidden') || message === 'Not authenticated' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
