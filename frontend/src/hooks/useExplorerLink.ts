/**
 * React Hook for Stellar Explorer links
 * 
 * Provides a reusable hook for generating and opening explorer links
 * with support for custom explorer domains.
 */

import { useCallback, useMemo } from 'react';
import {
  getTransactionExplorerUrl,
  getAccountExplorerUrl,
  openExplorerLink,
  getExplorerDomain,
} from '../utils/explorer';

interface ExplorerLinkConfig {
  /**
   * Custom explorer domain (e.g., 'steexp.com' for private networks)
   * Defaults to 'stellar.expert' if not provided
   */
  customExplorerDomain?: string;
}

/**
 * Hook for generating and opening Stellar Explorer links
 * @param config Configuration options
 * @returns Object with methods for explorer navigation
 */
export function useExplorerLink(config?: ExplorerLinkConfig) {
  const explorerDomain = useMemo(
    () => getExplorerDomain(config?.customExplorerDomain),
    [config?.customExplorerDomain]
  );

  const getTransactionUrl = useCallback(
    (txHash: string) => getTransactionExplorerUrl(txHash, explorerDomain),
    [explorerDomain]
  );

  const getAccountUrl = useCallback(
    (accountAddress: string) => getAccountExplorerUrl(accountAddress, explorerDomain),
    [explorerDomain]
  );

  const openTransaction = useCallback(
    (txHash: string) => {
      const url = getTransactionUrl(txHash);
      openExplorerLink(url);
    },
    [getTransactionUrl]
  );

  const openAccount = useCallback(
    (accountAddress: string) => {
      const url = getAccountUrl(accountAddress);
      openExplorerLink(url);
    },
    [getAccountUrl]
  );

  return {
    explorerDomain,
    getTransactionUrl,
    getAccountUrl,
    openTransaction,
    openAccount,
  };
}
