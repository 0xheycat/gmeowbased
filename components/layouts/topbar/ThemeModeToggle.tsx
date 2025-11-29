'use client';
import { TbMoon, TbSun } from 'react-icons/tb';

import { useLayoutContext, type LayoutThemeType } from '@/contexts/useLayoutContext';

const ThemeModeToggle = () => {
  const { theme, updateSettings } = useLayoutContext();

  const changeTheme = (newTheme: LayoutThemeType) => {
    updateSettings({ theme: newTheme });
  };

  return (
    <div className="topbar-item">
      <button
        className="btn btn-icon size-8 hover:bg-default-150 transition-[scale,background] rounded-full"
        id="light-dark-mode"
        type="button"
        onClick={() => changeTheme(theme === 'light' ? 'dark' : 'light')}
      >
        <TbSun className={`text-xl absolute transition-all duration-200 ${theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`} />
        <TbMoon className={`text-xl absolute transition-all duration-200 ${theme === 'light' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} />
      </button>
    </div>
  );
};

export default ThemeModeToggle;
