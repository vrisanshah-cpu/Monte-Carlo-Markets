import { Sandbox } from '@/components/Sandbox';

export default function SandboxPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Sandbox resetKey={0} />
    </main>
  );
}
