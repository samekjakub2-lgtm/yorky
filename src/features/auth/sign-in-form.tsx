'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { EmailSchema, useSendOtp, useVerifyOtp } from '@/features/auth/api';

export function SignInForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string>();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const onSendCode = (event: FormEvent) => {
    event.preventDefault();
    if (!EmailSchema.safeParse(email.trim()).success) {
      setError(t('errors.invalidEmail'));
      return;
    }
    setError(undefined);
    sendOtp.mutate(email, { onSuccess: () => setCodeSent(true) });
  };

  const onVerify = (event: FormEvent) => {
    event.preventDefault();
    verifyOtp.mutate(
      { email, token: code },
      {
        onSuccess: () => router.replace('/discover'),
        onError: () => setError(t('errors.invalidCode')),
      },
    );
  };

  if (!codeSent) {
    return (
      <form onSubmit={onSendCode} className="flex flex-col gap-4" noValidate>
        <TextField
          label={t('emailLabel')}
          placeholder={t('emailPlaceholder')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={sendOtp.isPending}>
          {t('sendCode')}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-4" noValidate>
      <p className="text-sm opacity-80">{t('checkEmail')}</p>
      <TextField
        label={t('codeLabel')}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
      />
      <Button type="submit" loading={verifyOtp.isPending}>
        {t('verify')}
      </Button>
      <Button variant="secondary" onClick={() => setCodeSent(false)}>
        {t('changeEmail')}
      </Button>
    </form>
  );
}
