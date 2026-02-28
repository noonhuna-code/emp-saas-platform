import type { AuthContext, Logger } from './types';
import { createServerSupabaseClient } from './supabase';
import { defaultLogger } from './types';

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

type JwtClaims = {
  sub?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  permissions?: string[];
  company_id?: string;
};

function decodeJwtPayload(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new AuthError('Invalid JWT format', 401);
  }

  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const payloadText = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(payloadText) as JwtClaims;
}

function extractPermissions(claims: JwtClaims): string[] {
  if (Array.isArray(claims.permissions)) {
    return claims.permissions.filter((p): p is string => typeof p === 'string');
  }

  const appPermissions = claims.app_metadata?.permissions;
  if (Array.isArray(appPermissions)) {
    return appPermissions.filter((p): p is string => typeof p === 'string');
  }

  return [];
}

function extractCompanyId(claims: JwtClaims): string | undefined {
  if (typeof claims.company_id === 'string' && claims.company_id) {
    return claims.company_id;
  }
  const fromAppMetadata = claims.app_metadata?.company_id;
  if (typeof fromAppMetadata === 'string' && fromAppMetadata) {
    return fromAppMetadata;
  }
  return undefined;
}

export async function buildAuthContext(input: {
  accessToken: string;
  logger?: Logger;
  requestId?: string;
}): Promise<AuthContext> {
  const logger = input.logger ?? defaultLogger;
  const claims = decodeJwtPayload(input.accessToken);
  const supabase = createServerSupabaseClient(input.accessToken);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    logger.warn('JWT validation failed', { error: error?.message, requestId: input.requestId });
    throw new AuthError('Authentication failed', 401);
  }

  const companyId = extractCompanyId(claims);
  if (!companyId) {
    throw new AuthError('Missing company_id in token claims', 403);
  }

  return {
    accessToken: input.accessToken,
    userId: data.user.id,
    companyId,
    permissions: extractPermissions(claims),
    role: typeof claims.role === 'string' ? claims.role : undefined,
    requestId: input.requestId,
    logger,
    supabase,
  };
}

export function requirePermission(ctx: AuthContext, permission: string): void {
  if (!ctx.permissions.includes(permission)) {
    throw new AuthError(`Missing required permission: ${permission}`, 403);
  }
}

export function requireCompanyScope(ctx: AuthContext, companyId: string): void {
  if (!companyId || ctx.companyId !== companyId) {
    throw new AuthError('Cross-company access denied', 403);
  }
}

export function withPermission<TArgs extends unknown[], TResult>(
  permission: string,
  handler: (ctx: AuthContext, ...args: TArgs) => Promise<TResult>
) {
  return async (ctx: AuthContext, ...args: TArgs): Promise<TResult> => {
    requirePermission(ctx, permission);
    return handler(ctx, ...args);
  };
}