import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(72),
})

export const registerSchema = z.object({
  email: z.string().trim().email('Email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(72),
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100),
})

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Nama proyek wajib diisi').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
})

export const joinCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Format kode tidak valid (contoh: ABCD-1234)'),
})

export const inviteEmailSchema = z.object({
  email: z.string().trim().email('Email tidak valid').max(255),
})