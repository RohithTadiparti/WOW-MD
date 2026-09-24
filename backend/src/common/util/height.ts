import { ValueTransformer } from 'typeorm';

export const feetTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => value === null ? null : Number(value),
};

export function parseFeetQuery(value: unknown): unknown {
  return typeof value === 'string' && /^\d+(?:\.\d)?$/.test(value) ? Number(value) : value;
}
