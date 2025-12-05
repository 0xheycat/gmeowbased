'use client';

import React, {
  Children,
  cloneElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { getFocusableTreeWalker } from '@react-aria/focus';
import { TabContext } from './tabs-context';

export interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
  const { isLazy } = useContext(TabContext);
  const childrenArray = Children.toArray(children) as ReactElement[];

  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        if (isLazy) {
          return cloneElement(child, { index });
        }
        return cloneElement(child, {
          index,
          key: index,
        });
      })}
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function TabPanel({ children, index, className }: TabPanelProps) {
  const { selectedTab, id: tabsId, isLazy } = useContext(TabContext);
  const isSelected = selectedTab === index;
  const ref = useRef<HTMLDivElement>(null);
  const [tabIndex, setTabIndex] = useState<number | undefined>(undefined);

  // If tab panel does not contain any tabbable elements, make the panel itself tabbable.
  // This makes sure that tab panel content is still accessible via keyboard.
  useEffect(() => {
    if (ref.current && isSelected) {
      const walker = getFocusableTreeWalker(ref.current);
      setTabIndex(walker.nextNode() ? undefined : 0);

      // rerun when children change
      const observer = new MutationObserver(() => {
        const hasNodes = !!getFocusableTreeWalker(ref.current!).nextNode();
        setTabIndex(hasNodes ? undefined : 0);
      });
      observer.observe(ref.current, {
        subtree: true,
        childList: true,
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [ref, isSelected, children]);

  // If tab is not selected and lazy loading is enabled, don't render the tab panel
  if (isLazy && !isSelected) {
    return null;
  }

  return (
    <div
      className={clsx('focus-visible:outline-none', className, !isSelected && 'hidden')}
      id={`${tabsId}-${index}-tabpanel`}
      aria-labelledby={`${tabsId}-${index}-tab`}
      role="tabpanel"
      tabIndex={tabIndex}
      ref={ref}
    >
      {children}
    </div>
  );
}
