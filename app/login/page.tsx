import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasAuthConfig, verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (!hasAuthConfig()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full space-y-3">
          <CardHeader className="mb-1">
            <CardTitle>Authentication is off</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Set an <code>AUTH_PASSWORD</code> (and optional <code>AUTH_SECRET</code>) in your environment to protect this
            app. Restart the dev server after updating.
          </CardContent>
        </Card>
      </main>
    );
  }

  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (token && (await verifyAuthToken(token))) {
    redirect('/');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted">Enter your password to continue.</p>
        </div>
        <Card className="glass">
          <CardContent className="space-y-1">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
