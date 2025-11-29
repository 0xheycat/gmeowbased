'use client';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

import LayoutProvider from '@/contexts/useLayoutContext';
import { WagmiProvider } from '@/components/providers/WagmiProvider';

// Preline UI type declaration
declare global {
  interface Window {
    HSStaticMethods?: {
      autoInit: () => void;
    };
  }
}

const ProvidersWrapper = ({ children }: { children: React.ReactNode }) => {
  const path = usePathname();

  useEffect(() => {
    import('preline/preline').then(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    });
  }, []);

  useEffect(() => {
    if (window.HSStaticMethods) {
      window.HSStaticMethods.autoInit();
    }
  }, [path]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <WagmiProvider>
      <LayoutProvider>{children}</LayoutProvider>
    </WagmiProvider>
  );
};

export default ProvidersWrapper;
