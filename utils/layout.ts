import type { ElementType } from 'react';

type ToggleDocumentAttributeType = (
  attribute: string,
  value: string,
  remove?: boolean,
  tag?: ElementType
) => void;

export const toggleAttribute: ToggleDocumentAttributeType = (
  attribute,
  value,
  remove,
  tag = 'html'
): void => {
  if (document.body) {
    const element = document.getElementsByTagName(tag.toString())[0];
    const hasAttribute = element.getAttribute(attribute);
    if (remove && hasAttribute) element.removeAttribute(attribute);
    else element.setAttribute(attribute, value);
  }
};

export const toggleClassName = (className: string, tag: keyof HTMLElementTagNameMap = 'html') => {
  if (!document.body) return;
  const element = document.getElementsByTagName(tag.toString())[0];
  element.classList.toggle(className);
};

export const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const showBackdrop = () => {
  const backdrop = document.createElement('div');
  backdrop.id = 'custom-backdrop';
  backdrop.className = 'transition duration fixed inset-0 bg-default-900/50 z-40';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', () => {
    toggleClassName('sidenav-enable');
    hideBackdrop();
  });
};

export const hideBackdrop = () => {
  const backdrop = document.getElementById('custom-backdrop');
  if (backdrop) {
    document.body.removeChild(backdrop);
  }
};
