/**
 * Accessibility Testing Utilities
 * 
 * Purpose: Automated tests for WCAG AA compliance
 * - Contrast ratio validation
 * - Keyboard navigation testing
 * - ARIA attribute verification
 * - Focus management testing
 * - Responsive layout validation
 */

import { expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getContrastRatio, meetsWCAG_AA } from './accessibility'

// ========================================
// Contrast Ratio Tests
// ========================================

/**
 * Test if all text in component meets WCAG AA contrast
 */
export const testContrastRatios = (component: React.ReactElement) => {
  const { container } = render(component)
  
  // Get all text elements
  const textElements = container.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label')
  
  const failures: string[] = []
  
  textElements.forEach((element) => {
    const styles = window.getComputedStyle(element)
    const textColor = rgbToHex(styles.color)
    const bgColor = getBackgroundColor(element)
    
    const fontSize = parseFloat(styles.fontSize)
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold')
    
    if (!meetsWCAG_AA(textColor, bgColor, isLargeText)) {
      const ratio = getContrastRatio(textColor, bgColor)
      failures.push(
        `Element with text "${element.textContent?.slice(0, 30)}" has insufficient contrast: ${ratio.toFixed(2)}:1 (min: ${isLargeText ? '3:1' : '4.5:1'})`
      )
    }
  })
  
  if (failures.length > 0) {
    throw new Error(`WCAG AA contrast failures:\n${failures.join('\n')}`)
  }
}

/**
 * Convert RGB string to hex
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g)
  if (!match) return '#000000'
  
  const [r, g, b] = match.map(Number)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Get effective background color (walks up DOM tree)
 */
function getBackgroundColor(element: Element): string {
  let current: Element | null = element
  
  while (current) {
    const styles = window.getComputedStyle(current)
    const bgColor = styles.backgroundColor
    
    // Check if background is opaque
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      return rgbToHex(bgColor)
    }
    
    current = current.parentElement
  }
  
  return '#ffffff' // Default to white
}

// ========================================
// Keyboard Navigation Tests
// ========================================

/**
 * Test keyboard navigation through interactive elements
 */
export const testKeyboardNavigation = async (component: React.ReactElement) => {
  const user = userEvent.setup()
  const { container } = render(component)
  
  // Get all focusable elements
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusableElements.length === 0) {
    console.warn('No focusable elements found in component')
    return
  }
  
  // Test Tab navigation
  for (let i = 0; i < focusableElements.length; i++) {
    await user.tab()
    expect(document.activeElement).toBe(focusableElements[i])
  }
  
  // Test Shift+Tab navigation (reverse)
  for (let i = focusableElements.length - 1; i >= 0; i--) {
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(focusableElements[i])
  }
}

/**
 * Test Enter/Space activation on buttons
 */
export const testKeyboardActivation = async (
  buttonText: string,
  onClickMock: () => void
) => {
  const user = userEvent.setup()
  
  const button = screen.getByRole('button', { name: buttonText })
  
  // Test Enter key
  button.focus()
  await user.keyboard('{Enter}')
  expect(onClickMock).toHaveBeenCalledTimes(1)
  
  // Test Space key
  await user.keyboard(' ')
  expect(onClickMock).toHaveBeenCalledTimes(2)
}

/**
 * Test Escape key closes dialog/modal
 */
export const testEscapeKeyClose = async (
  component: React.ReactElement,
  closeFn: () => void
) => {
  const user = userEvent.setup()
  render(component)
  
  await user.keyboard('{Escape}')
  expect(closeFn).toHaveBeenCalled()
}

// ========================================
// ARIA Attribute Tests
// ========================================

/**
 * Verify all interactive elements have accessible names
 */
export const testAccessibleNames = (component: React.ReactElement) => {
  const { container } = render(component)
  
  const interactiveElements = container.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [role="link"]'
  )
  
  const failures: string[] = []
  
  interactiveElements.forEach((element) => {
    const hasAccessibleName = 
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      (element as HTMLInputElement).placeholder ||
      element.querySelector('img[alt]')
    
    if (!hasAccessibleName) {
      failures.push(
        `Element <${element.tagName.toLowerCase()}> lacks accessible name`
      )
    }
  })
  
  if (failures.length > 0) {
    throw new Error(`Accessible name failures:\n${failures.join('\n')}`)
  }
}

/**
 * Verify proper ARIA roles
 */
export const testAriaRoles = (component: React.ReactElement) => {
  const { container } = render(component)
  
  // Check for invalid role combinations
  const invalidRoles = container.querySelectorAll(
    '[role="button"][href], [role="link"]:not([href])'
  )
  
  if (invalidRoles.length > 0) {
    throw new Error(`Found ${invalidRoles.length} elements with invalid role combinations`)
  }
}

/**
 * Test loading states have proper ARIA
 */
export const testLoadingStates = (component: React.ReactElement) => {
  const { container } = render(component)
  
  const loadingElements = container.querySelectorAll('[aria-busy="true"]')
  
  loadingElements.forEach((element) => {
    expect(element.getAttribute('aria-live')).toBeTruthy()
  })
}

// ========================================
// Focus Management Tests
// ========================================

/**
 * Test focus trap in modal/dialog
 */
export const testFocusTrap = async (component: React.ReactElement) => {
  const user = userEvent.setup()
  const { container } = render(component)
  
  const dialog = container.querySelector('[role="dialog"]')
  if (!dialog) {
    throw new Error('No dialog element found')
  }
  
  const focusableElements = dialog.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusableElements.length < 2) {
    console.warn('Not enough focusable elements to test focus trap')
    return
  }
  
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  
  // Focus should start on first element
  expect(document.activeElement).toBe(firstElement)
  
  // Tab from last element should cycle to first
  lastElement.focus()
  await user.tab()
  expect(document.activeElement).toBe(firstElement)
  
  // Shift+Tab from first element should cycle to last
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(lastElement)
}

/**
 * Test visible focus indicators
 */
export const testFocusIndicators = (component: React.ReactElement) => {
  const { container } = render(component)
  
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const failures: string[] = []
  
  focusableElements.forEach((element) => {
    element.focus()
    const styles = window.getComputedStyle(element)
    
    const hasVisibleFocus = 
      styles.outline !== 'none' ||
      styles.boxShadow !== 'none' ||
      styles.border !== styles.borderColor // Border change on focus
    
    if (!hasVisibleFocus) {
      failures.push(
        `Element <${element.tagName.toLowerCase()}> lacks visible focus indicator`
      )
    }
  })
  
  if (failures.length > 0) {
    throw new Error(`Focus indicator failures:\n${failures.join('\n')}`)
  }
}

// ========================================
// Responsive Layout Tests
// ========================================

/**
 * Test no horizontal scroll at various widths
 */
export const testResponsiveLayout = (component: React.ReactElement) => {
  const widths = [375, 768, 1024, 1440, 1920]
  
  widths.forEach((width) => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
    
    window.dispatchEvent(new Event('resize'))
    
    const { container } = render(component)
    const body = container.ownerDocument.body
    
    // Check for horizontal scroll
    if (body.scrollWidth > width) {
      throw new Error(
        `Horizontal scroll detected at ${width}px width (scrollWidth: ${body.scrollWidth}px)`
      )
    }
  })
}

/**
 * Test minimum touch target sizes (44x44px)
 */
export const testTouchTargets = (component: React.ReactElement) => {
  const { container } = render(component)
  
  const interactiveElements = container.querySelectorAll<HTMLElement>(
    'button, a[href], input[type="button"], input[type="submit"], [role="button"]'
  )
  
  const failures: string[] = []
  
  interactiveElements.forEach((element) => {
    const rect = element.getBoundingClientRect()
    
    if (rect.width < 44 || rect.height < 44) {
      failures.push(
        `Element <${element.tagName.toLowerCase()}> is too small: ${rect.width}x${rect.height}px (min: 44x44px)`
      )
    }
  })
  
  if (failures.length > 0) {
    throw new Error(`Touch target size failures:\n${failures.join('\n')}`)
  }
}

// ========================================
// Utility Test Runners
// ========================================

/**
 * Run all accessibility tests on a component
 */
export const runFullAccessibilityAudit = async (component: React.ReactElement) => {
  console.log('🔍 Running full accessibility audit...')
  
  try {
    console.log('  ✓ Testing contrast ratios...')
    testContrastRatios(component)
    
    console.log('  ✓ Testing keyboard navigation...')
    await testKeyboardNavigation(component)
    
    console.log('  ✓ Testing accessible names...')
    testAccessibleNames(component)
    
    console.log('  ✓ Testing ARIA roles...')
    testAriaRoles(component)
    
    console.log('  ✓ Testing focus indicators...')
    testFocusIndicators(component)
    
    console.log('  ✓ Testing responsive layout...')
    testResponsiveLayout(component)
    
    console.log('  ✓ Testing touch targets...')
    testTouchTargets(component)
    
    console.log('✅ All accessibility tests passed!')
  } catch (error) {
    console.error('❌ Accessibility audit failed:', error)
    throw error
  }
}

/**
 * Generate accessibility report
 */
export const generateA11yReport = (component: React.ReactElement) => {
  const report = {
    timestamp: new Date().toISOString(),
    passed: [] as string[],
    failed: [] as string[],
    warnings: [] as string[],
  }
  
  const tests = [
    { name: 'Contrast Ratios', fn: () => testContrastRatios(component) },
    { name: 'Keyboard Navigation', fn: async () => await testKeyboardNavigation(component) },
    { name: 'Accessible Names', fn: () => testAccessibleNames(component) },
    { name: 'ARIA Roles', fn: () => testAriaRoles(component) },
    { name: 'Focus Indicators', fn: () => testFocusIndicators(component) },
    { name: 'Responsive Layout', fn: () => testResponsiveLayout(component) },
    { name: 'Touch Targets', fn: () => testTouchTargets(component) },
  ]
  
  tests.forEach(({ name, fn }) => {
    try {
      fn()
      report.passed.push(name)
    } catch (error) {
      report.failed.push(`${name}: ${error}`)
    }
  })
  
  return report
}
