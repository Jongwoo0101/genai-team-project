export interface WsEnvelope<T = Record<string, unknown>> {
  event: string;
  data: T;
  occurredAt: string;
  version: 'v1';
}

type LegacyPayload = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asIsoString = (value: unknown): string => {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  return new Date().toISOString();
};

export const parseWsEnvelope = (payload: unknown): WsEnvelope | null => {
  if (!isObject(payload)) return null;

  if (typeof payload.event === 'string') {
    const data = isObject(payload.data) ? payload.data : {};
    return {
      event: payload.event,
      data,
      occurredAt: asIsoString(payload.occurredAt),
      version: payload.version === 'v1' ? 'v1' : 'v1',
    };
  }

  // Legacy flat payload adapter: { type, ...data, changedAt|updatedAt }
  const legacy = payload as LegacyPayload;
  if (typeof legacy.type !== 'string') return null;
  const { type, changedAt, updatedAt, ...rest } = legacy;
  return {
    event: type,
    data: rest,
    occurredAt: asIsoString(changedAt ?? updatedAt),
    version: 'v1',
  };
};
