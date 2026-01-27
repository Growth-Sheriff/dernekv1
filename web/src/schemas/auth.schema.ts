import * as z from 'zod';

/**
 * Login Form Şeması
 */
export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  mode: z.enum(['LOCAL', 'ONLINE', 'HYBRID']),
  rememberMe: z.boolean().optional(),
});

export type LoginForm = z.infer<typeof loginSchema>;

/**
 * Şifre Değiştirme Şeması
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Mevcut şifre en az 6 karakter olmalı'),
  newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalı'),
  confirmPassword: z.string().min(6, 'Şifre tekrarı en az 6 karakter olmalı'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
