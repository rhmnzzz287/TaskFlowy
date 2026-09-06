import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Sign in — TaskFlowy',
  description: 'Sign in to your TaskFlowy account to sync timelines across devices.',
};

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}
