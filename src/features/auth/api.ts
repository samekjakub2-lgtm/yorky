import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

export const EmailSchema = z.email();
export const OtpSchema = z.string().regex(/^\d{6}$/);

export function useSendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: EmailSchema.parse(email.trim().toLowerCase()),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: OtpSchema.parse(token.trim()),
        type: 'email',
      });
      if (error) throw error;
    },
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
