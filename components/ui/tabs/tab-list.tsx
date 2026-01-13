'use client';

import React, { Children, cloneElement, isValidElement, type ReactNode, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { FocusScope } from '@react-aria/focus';
import type { TabProps } from './tab';
import { TabLine } from './tab-line';

export interface TabListProps {
  children: ReactNode;
  // center tabs within tablist
  center?: boolean;
  // expand tabs to fill in tablist space fully. By default, tabs are only as wide as their content.
  expand?: boolean;
  className?: string;
}

export function TabList({ children, center, expand, className }: TabListProps) {
  const childrenArray = Children.toArray(children);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showHintAnimation, setShowHintAnimation] = useState(false);
  
  // Check if wrapping is enabled (disable scroll features)
  const isWrapping = className?.includes('flex-wrap');

  // Update fade indicators on scroll
  const updateFadeIndicators = () => {
    if (isWrapping) return; // Skip fade indicators if wrapping
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const scrollRight = scrollWidth - clientWidth - scrollLeft;

    // Show left fade if scrolled past start (with 10px threshold)
    setShowLeftFade(scrollLeft > 10);
    
    // Show right fade if not at end (with 10px threshold)
    setShowRightFade(scrollRight > 10);
    
    // Hide hint animation after first scroll
    if (scrollLeft > 0) {
      setShowHintAnimation(false);
    }
  };

  // Check on mount and when content changes
  useEffect(() => {
    if (isWrapping) return; // Skip if wrapping
    updateFadeIndicators();
    
    // Show hint animation if scrollable
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      // Delay hint animation slightly for better UX
      const hintTimer = setTimeout(() => setShowHintAnimation(true), 500);
      return () => clearTimeout(hintTimer);
    }
    
    // Re-check after a brief delay to account for dynamic content
    const timer = setTimeout(updateFadeIndicators, 100);
    return () => clearTimeout(timer);
  }, [children]);

  // Listen to scroll events
  useEffect(() => {
    if (isWrapping) return; // Skip if wrapping
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateFadeIndicators);
    window.addEventListener('resize', updateFadeIndicators);

    return () => {
      el.removeEventListener('scroll', updateFadeIndicators);
      window.removeEventListener('resize', updateFadeIndicators);
    };
  }, []);

  return (
    <FocusScope>
      <div className="relative">
        {/* Left fade gradient with shadow */}
        {!isWrapping && showLeftFade && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-dark-bg-base dark:via-dark-bg-base/90" />
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-1 shadow-[4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_rgba(0,0,0,0.3)]" />
          </>
        )}
        
        {/* Right fade gradient with shadow and hint animation */}
        {!isWrapping && showRightFade && (
          <>
            <div 
              className={clsx(
                "pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-dark-bg-base dark:via-dark-bg-base/90",
                showHintAnimation && "animate-pulse-subtle"
              )}
            />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-1 shadow-[-4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.3)]" />
            {/* Scroll hint indicator - chevron */}
            {showHintAnimation && (
              <div className="pointer-events-none absolute right-2 top-1/2 z-20 -translate-y-1/2 animate-bounce-horizontal">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </>
        )}

        <div
          ref={scrollRef}
          className={clsx(
            // Hidden scrollbar, smooth scroll with snap points for better mobile UX
            'hidden-scrollbar relative flex max-w-full gap-1 border-b-2 border-gray-200 dark:border-gray-700',
            !isWrapping && 'overflow-x-auto overflow-y-hidden scroll-smooth',
            !isWrapping && 'snap-x snap-mandatory', // Snap to start of tabs for better touch UX
            className
          )}
          role="tablist"
          aria-orientation="horizontal"
        >
          {childrenArray.map((child, index) => {
            if (isValidElement<TabProps>(child)) {
              return cloneElement<TabProps>(child, {
                index,
                className: clsx(
                  child.props.className,
                  expand && 'flex-auto',
                  center && index === 0 && 'ml-auto',
                  center && index === childrenArray.length - 1 && 'mr-auto',
                  // Add snap point to each tab
                  'snap-start'
                ),
              });
            }
            return null;
          })}
          <TabLine />
        </div>
      </div>
    </FocusScope>
  );
}
