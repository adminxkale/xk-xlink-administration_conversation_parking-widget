'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenantResolutionState } from '@/src/domain/entities/tenant';
import {
  extractOrg,
  resolveTenant,
  fetchGenesysCredentials,
  getCachedCredentials,
  setCachedCredentials,
  clearCachedCredentials,
} from '@/src/infrastructure/adapters/tenant-resolution.adapter';

export function useTenantResolution() {
  const [state, setState] = useState<TenantResolutionState>({
    status: 'idle', org: null, tenantId: null, credentials: null, error: null,
  });

  const resolve = useCallback(async () => {
    const orgResult = extractOrg();
    if ('error' in orgResult) {
      setState({ status: 'error', org: null, tenantId: null, credentials: null, error: orgResult.error });
      return;
    }
    const { org } = orgResult;

    const cached = getCachedCredentials(org);
    if (cached) {
      setState({ status: 'resolved', org, tenantId: cached.tenantId, credentials: cached.credentials, error: null });
      return;
    }

    setState({ status: 'resolving-tenant', org, tenantId: null, credentials: null, error: null });
    try {
      const { tenant_id } = await resolveTenant(org);
      setState({ status: 'fetching-credentials', org, tenantId: tenant_id, credentials: null, error: null });
      const credentials = await fetchGenesysCredentials(org);
      setCachedCredentials(org, credentials, tenant_id);
      setState({ status: 'resolved', org, tenantId: tenant_id, credentials, error: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido.';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
    }
  }, []);

  useEffect(() => { resolve(); }, [resolve]);

  const retry = useCallback(() => {
    clearCachedCredentials();
    setState({ status: 'idle', org: null, tenantId: null, credentials: null, error: null });
    resolve();
  }, [resolve]);

  return { state, retry };
}
