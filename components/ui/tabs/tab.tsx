'use client';

import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type MouseEvent,
  type KeyboardEvent,
  useContext,
  useRef,
} from 'react';
import clsx from 'clsx';
import { useFocusManager } from '@react-aria/focus';
import { TabContext } from './tabs-context';

export interface TabProps extends ComponentPropsWithoutRef<'button'> {
  index?: number;
  className?: string;
  isDisabled?: boolean;
  elementType?: ElementType;
  relative?: boolean;
  width?: string;
  padding?: string;
}

export function Tab({
  index,
  className,
  isDisabled,
  elementType = 'button',
  relative = true,
  width,
  padding,
  children,
  onClick,
  ...domProps
}: TabProps) {
  const {
    selectedTab,
    setSelectedTab,
    tabsRef,
    size,
    id: tabsId,
  } = useContext(TabContext);
  const focusManager = useFocusManager();
  const domRef = useRef<HTMLButtonElement>(null);
  const isSelected = index === selectedTab;

  const Element: ElementType = elementType || 'button';

  return (
    <Element
      disabled={isDisabled}
      id={`${tabsId}-${index}-tab`}
      aria-controls={`${tabsId}-${index}-tabpanel`}
      aria-selected={isSelected}
      role="tab"
      tabIndex={isSelected ? 0 : -1}
      type={Element === 'button' ? 'button' : undefined}
      className={clsx(
        'whitespace-nowrap text-sm capitalize outline-none transition-colors',
        'border-b-2 border-transparent', // Add bottom border for active state
        {
          'hover:text-gray-900 hover:border-gray-300 dark:hover:text-white dark:hover:border-gray-600': !isSelected && !isDisabled,
          'text-gray-600 dark:text-gray-300': !isSelected,
          'cursor-default text-gray-900 dark:text-white border-brand': isSelected,
          'pointer-events-none text-gray-400 dark:text-gray-600': isDisabled,
          'px-3 py-2': size === 'sm',
          'px-4 py-3': size === 'md',
          relative,
        },
        width,
        padding,
        className
      )}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        setSelectedTab(index!);
        onClick?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        switch (e.key) {
          case 'ArrowLeft':
            focusManager?.focusPrevious();
            break;
          case 'ArrowRight':
            focusManager?.focusNext();
            break;
          case 'Home':
            focusManager?.focusFirst();
            break;
          case 'End':
            focusManager?.focusLast();
            break;
        }
      }}
      ref={(node: HTMLButtonElement | null) => {
        if (index != null && tabsRef.current && node != null) {
          tabsRef.current[index] = node;
        }
        (domRef as any).current = node;
      }}
      {...domProps}
    >
      {children}
    </Element>
  );
}
