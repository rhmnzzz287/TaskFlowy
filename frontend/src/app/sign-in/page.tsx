import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Sign in — TaskFlowy',
  description: 'Sign in to your TaskFlowy account to sync timelines across devices.',
};

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { expired?: string };
}) {
  return <AuthForm mode="sign-in" expired={searchParams?.expired === '1'} />;
}
