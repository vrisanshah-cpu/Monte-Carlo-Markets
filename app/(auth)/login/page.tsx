import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-24">
      <h1 className="text-2xl font-bold text-slate-100">Log in</h1>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
