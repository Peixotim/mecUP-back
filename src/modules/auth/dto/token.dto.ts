import { z } from 'zod'

import { Role } from '@modules/users/enum/role.enum'

export const accessPayloadSchema = z.object({
  sub: z.string(),
  workshopId: z.string(),
  role: z.enum(Role),
})

export type AccessTokenPayload = z.infer<typeof accessPayloadSchema>

export const accessClaimsSchema = accessPayloadSchema.extend({
  iat: z.number(),
  exp: z.number(),
})

export type AccessClaims = z.infer<typeof accessClaimsSchema>

export const refreshPayloadSchema = z.object({
  sub: z.string(),
  tokenId: z.string(),
})

export type RefreshTokenPayload = z.infer<typeof refreshPayloadSchema>

export const refreshClaimsSchema = refreshPayloadSchema.extend({
  iat: z.number(),
  exp: z.number(),
})

export type RefreshClaims = z.infer<typeof refreshClaimsSchema>
