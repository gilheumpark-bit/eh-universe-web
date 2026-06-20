import { SPARK_SERVER_URL } from '@/services/sparkService';

export function getDgxDeveloperApiBaseUrl(): string {
  return (
    SPARK_SERVER_URL ||
    process.env.NEXT_PUBLIC_SPARK_GATEWAY_URL ||
    ''
  ).trim();
}

export function isDgxDeveloperApiEnabled(): boolean {
  return Boolean(getDgxDeveloperApiBaseUrl()) && (
    process.env.FEATURE_DGX_DEV_API === 'on' ||
    process.env.ENABLE_DGX_DEV_API === 'on'
  );
}
