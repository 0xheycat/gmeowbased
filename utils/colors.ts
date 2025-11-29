export function twColor(name: string) {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}
export const colors = {
  primary: () => twColor('primary'),
  success: () => twColor('success'),
  danger: () => twColor('danger'),
  gray: () => twColor('gray-500'),
};
