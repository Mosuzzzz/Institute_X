import AuthenticationPage from './authentication-page';

const DEFAULT_SSO_LOGIN_URL = 'https://mock-university-sso.vercel.app';

export default function HomePage() {
  const ssoLoginUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL ?? DEFAULT_SSO_LOGIN_URL;

  return <AuthenticationPage ssoLoginUrl={ssoLoginUrl} />;
}
