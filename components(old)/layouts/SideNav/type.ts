import type { ComponentType } from 'react';

export type MenuType = {
  key: string;
  text: string;
  href?: string;
  target?: string;
  icon?: ComponentType<{ className?: string }>;
  isTitle?: boolean;
  children?: MenuType[];
};
