import z from 'zod'

export const password = z.string().min(4).max(32)
