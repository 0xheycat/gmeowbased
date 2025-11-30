'use client';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { getSystemTheme, toggleAttribute } from '@/utils/layout';
import { debounce } from '@/helpers/debounce';

export type LayoutThemeType = 'light' | 'dark' | 'system';

export type LayoutDirectionType = 'ltr' | 'rtl';

export type SideNavSizeType =
  | 'default'
  | 'hover'
  | 'hover-active'
  | 'sm'
  | 'md'
  | 'offcanvas'
  | 'hidden';

export type SideNavColorType = 'light' | 'dark';

export type LayoutStateType = {
  sidenav: {
    size: SideNavSizeType;
    color: SideNavColorType;
  };
  theme: LayoutThemeType;
  dir: LayoutDirectionType;
};

type LayoutContextType = {
  updateSettings: (newSettings: Partial<LayoutStateType>) => void;
  reset: () => void;
} & LayoutStateType;

const INIT_STATE: LayoutStateType = {
  sidenav: {
    size: 'default',
    color: 'light',
  },
  theme: 'light',
  dir: 'ltr',
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayoutContext = () => {
  const context = use(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext can only be used within LayoutProvider');
  }
  return context;
};

const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useLocalStorage<LayoutStateType>(
    '__GMEOWBASED_LAYOUT_CONFIG__',
    INIT_STATE
  );

  const updateSettings = useCallback(
    (_newSettings: Partial<LayoutStateType>) => {
      setSettings((prevSettings: LayoutStateType) => ({
        ...prevSettings,
        ..._newSettings,
        sidenav: {
          ...prevSettings.sidenav,
          ...(_newSettings.sidenav || {}),
        },
      }));
    },
    [setSettings]
  );

  useEffect(() => {
    toggleAttribute('data-sidenav-color', settings.sidenav.color);
    toggleAttribute('data-sidenav-size', settings.sidenav.size);
    toggleAttribute('data-theme', settings.theme === 'system' ? getSystemTheme() : settings.theme);
    toggleAttribute('dir', settings.dir);
  }, [settings]);

  const reset = useCallback(() => {
    setSettings(INIT_STATE);
  }, [setSettings]);

  const changeSideNavSize = useCallback(
    (nSize: SideNavSizeType, persist = true) => {
      toggleAttribute('data-sidenav-size', nSize);
      if (persist) {
        setSettings(prev => ({
          ...prev,
          sidenav: { ...prev.sidenav, size: nSize },
        }));
      }
    },
    [setSettings]
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const handleResize = () => {
      const width = window.innerWidth;

      if (width <= 768) {
        changeSideNavSize('offcanvas');
      } else if (width <= 1140) {
        changeSideNavSize('sm');
      } else {
        changeSideNavSize('default');
      }
    };

    handleResize();
    const debouncedResize = debounce(handleResize, 200);
    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, [hasHydrated]);

  return (
    <LayoutContext
      value={useMemo(
        () => ({
          ...settings,
          updateSettings,
          reset,
        }),
        [settings, updateSettings, reset]
      )}
    >
      {children}
    </LayoutContext>
  );
};

export default LayoutProvider;
