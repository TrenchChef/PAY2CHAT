/**
 * Zod validation schemas for WebRTC signaling messages
 * Used to validate all signaling messages before processing
 */

import { z } from 'zod';

/**
 * ICE candidate schema
 */
export const iceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMLineIndex: z.number().nullable().optional(),
  sdpMid: z.string().nullable().optional(),
});

/**
 * Session description schema (offer/answer)
 */
export const sessionDescriptionSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string(),
});

/**
 * Signaling message types
 */
export const signalingMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join'),
    room: z.string().min(1),
  }),
  z.object({
    type: z.literal('offer'),
    room: z.string().min(1),
    payload: sessionDescriptionSchema,
  }),
  z.object({
    type: z.literal('answer'),
    room: z.string().min(1),
    payload: sessionDescriptionSchema,
  }),
  z.object({
    type: z.literal('candidate'),
    room: z.string().min(1),
    payload: iceCandidateSchema,
  }),
  z.object({
    type: z.literal('peer-joined'),
    room: z.string().min(1),
  }),
]);

/**
 * Type exports for TypeScript
 */
export type IceCandidate = z.infer<typeof iceCandidateSchema>;
export type SessionDescription = z.infer<typeof sessionDescriptionSchema>;
export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

/**
 * Validate a signaling message
 * @param data - Raw message data to validate
 * @returns Validated message or throws ZodError
 */
export function validateSignalingMessage(data: unknown): SignalingMessage {
  return signalingMessageSchema.parse(data);
}

/**
 * Safe validation that returns a result instead of throwing
 * @param data - Raw message data to validate
 * @returns Validation result with success flag
 */
export function safeValidateSignalingMessage(
  data: unknown
): { success: true; data: SignalingMessage } | { success: false; error: z.ZodError } {
  const result = signalingMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

