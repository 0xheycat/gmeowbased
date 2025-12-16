/**
 * Type definitions for jest-axe
 * 
 * Provides TypeScript types for jest-axe accessibility testing matchers.
 * 
 * @see https://github.com/nickcolley/jest-axe
 */

declare module 'jest-axe' {
  import type { AxeResults, RunOptions, Spec } from 'axe-core'

  /**
   * Run axe accessibility tests on a given HTML element or document
   * 
   * @param html - The HTML element or document to test
   * @param options - axe-core configuration options
   * @returns Promise resolving to axe test results
   */
  export function axe(
    html: Element | Document | string,
    options?: RunOptions
  ): Promise<AxeResults>

  /**
   * Configure axe-core for all subsequent tests
   * 
   * @param spec - axe-core configuration spec
   * @returns Configured axe function
   */
  export function configureAxe(spec?: Spec): typeof axe

  /**
   * Jest matcher to assert no accessibility violations
   * 
   * Usage:
   * ```typescript
   * const results = await axe(container)
   * expect(results).toHaveNoViolations()
   * ```
   */
  export const toHaveNoViolations: () => {
    toHaveNoViolations(): {
      pass: boolean
      message: () => string
    }
  }

  /**
   * Get formatted violation messages from axe results
   * 
   * @param violations - Array of axe violations
   * @returns Formatted error messages
   */
  export function getViolations(violations: AxeResults['violations']): string
}

// Augment Vitest matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      /**
       * Assert that axe results contain no accessibility violations
       */
      toHaveNoViolations(): void
    }
  }
}
