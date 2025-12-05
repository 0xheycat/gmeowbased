'use client'

import {forwardRef, useEffect} from 'react';
import {FocusScope} from '@react-aria/focus';
import {useObjectRef} from '@react-aria/utils';
import {m} from 'framer-motion';
import {useOverlayViewport} from './use-overlay-viewport';
import {Underlay} from './underlay';
import type {OverlayProps} from './overlay-props';

export const Modal = forwardRef<
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

    // Don't render if modal is closed
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
        className="isolate z-modal fixed inset-0"
        style={viewPortStyle as React.CSSProperties}
      >
        <Underlay onClick={() => isDismissable && onClose?.()} />
        <m.div
          className="absolute inset-0 w-full h-full z-20 flex items-center justify-center pointer-events-none"
          initial={{opacity: 0, scale: 0.7}}
          animate={{opacity: 1, scale: 1}}
          exit={{opacity: 0, scale: 1}}
          transition={{type: 'spring', damping: 25, stiffness: 300}}
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

Modal.displayName = 'Modal';
