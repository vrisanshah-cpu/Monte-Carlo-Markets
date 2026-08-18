import { ScenarioGame } from '@/components/ScenarioGame';

export default function GamePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <ScenarioGame resetKey={0} />
    </main>
  );
}
