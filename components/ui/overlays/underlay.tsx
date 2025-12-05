'use client'

import clsx from 'clsx';
import {m} from 'framer-motion';
import type {ComponentPropsWithoutRef} from 'react';

interface UnderlayProps extends ComponentPropsWithoutRef<'div'> {
  position?: 'fixed' | 'absolute';
  className?: string;
  isTransparent?: boolean;
  disableInitialTransition?: boolean;
}

export function Underlay({
  position = 'absolute',
  className,
  isTransparent = false,
  disableInitialTransition,
  onClick,
}: UnderlayProps) {
  return (
    <m.div
      onClick={onClick}
      className={clsx(
        !isTransparent && 'bg-black/30',
        'w-full h-full inset-0 z-10',
        position,
        className,
      )}
      aria-hidden
      initial={disableInitialTransition ? undefined : {opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.3}}
    />
  );
}
