import { NextResponse } from 'next/server';
import { submitSimulation } from '@/actions/submissions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await submitSimulation(body);
    return NextResponse.json({ submission: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    const status = message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
