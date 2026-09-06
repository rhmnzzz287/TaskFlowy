import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Sign up — TaskFlowy',
  description: 'Create a free TaskFlowy account to sync timelines across devices.',
};

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
