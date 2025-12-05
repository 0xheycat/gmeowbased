'use client'

import {forwardRef, useEffect} from 'react';
import {FocusScope} from '@react-aria/focus';
import {useObjectRef} from '@react-aria/utils';
import {m} from 'framer-motion';
import {useOverlayViewport} from './use-overlay-viewport';
import {Underlay} from './underlay';
import type {OverlayProps} from './overlay-props';

export const Tray = forwardRef<
  HTMLDivElement,
  Partial<OverlayProps>
>(
  (
    {
      children,
      autoFocus = false,
      restoreFocus = true,
      isDismissable = true,
      isOpen = false,
      onClose,
    },
    ref,
  ) => {
    const viewPortStyle = useOverlayViewport();
    const objRef = useObjectRef(ref);

    // Don't render if tray is closed
    if (!isOpen) return null;

    // Handle ESC key press
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isDismissable && onClose) {
          e.preventDefault();
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isDismissable, onClose]);

    return (
      <div
        className="isolate z-tray fixed inset-0"
        style={viewPortStyle as React.CSSProperties}
      >
        <Underlay onClick={() => isDismissable && onClose?.()} />
        <m.div
          className="absolute bottom-0 left-0 right-0 w-full z-20 rounded-t overflow-hidden max-w-[375px] max-h-[90vh] mx-auto pb-safe-area"
          initial={{opacity: 0, y: '100%'}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: '100%'}}
          transition={{type: 'tween', duration: 0.2}}
        >
          <FocusScope restoreFocus={restoreFocus} autoFocus={autoFocus} contain>
            <div ref={objRef} className="pointer-events-auto">
              {children}
            </div>
          </FocusScope>
        </m.div>
      </div>
    );
  },
);

Tray.displayName = 'Tray';
