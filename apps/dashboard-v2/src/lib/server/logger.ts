export type LogMeta = Record<string, unknown>;

const safeMeta = (meta?: LogMeta): LogMeta | undefined => {
  if (!meta) return undefined;
  const redacted: LogMeta = { ...meta };
  if ("token" in redacted) redacted.token = "[redacted]";
  if ("authorization" in redacted) redacted.authorization = "[redacted]";
  return redacted;
};

export const logInfo = (message: string, meta?: LogMeta) => {
  console.log(`[info] ${message}`, safeMeta(meta));
};

export const logWarn = (message: string, meta?: LogMeta) => {
  console.warn(`[warn] ${message}`, safeMeta(meta));
};

export const logError = (message: string, meta?: LogMeta) => {
  console.error(`[error] ${message}`, safeMeta(meta));
};