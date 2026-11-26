'use client';

import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/client';

export const EmailSchema = z.email();
export const OtpSchema = z.string().regex(/^\d{6}$/);

export function useSendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await createClient().auth.signInWithOtp({
        email: EmailSchema.parse(email.trim().toLowerCase()),
        options: {
          shouldCreateUser: true,
          // Ak e-mail obsahuje odkaz namiesto kódu, vráti používateľa sem (PKCE).
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const { error } = await createClient().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: OtpSchema.parse(token.trim()),
        type: 'email',
      });
      if (error) throw error;
    },
  });
}
