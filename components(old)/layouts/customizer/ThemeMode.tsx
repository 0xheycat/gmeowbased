'use client';

import { useLayoutContext, type LayoutThemeType } from 'contexts(old)/useLayoutContext';

const ThemeMode = () => {
  const { theme, updateSettings } = useLayoutContext();
  const changeTheme = (newTheme: LayoutThemeType) => {
    updateSettings({ theme: newTheme });
  };
  return (
    <div className="p-6">
      <h5 className="font-semibold text-sm mb-3">Theme Mode</h5>
      <div className="flex gap-2">
        <div>
          <input
            className="hidden"
            type="radio"
            name="data-theme"
            id="layout-color-light"
            value="light"
            checked={theme === 'light'}
            onChange={() => changeTheme('light')}
          />
          <label className="form-label btn bg-default-150" htmlFor="layout-color-light">
            Light
          </label>
        </div>

        <div>
          <input
            className="hidden"
            type="radio"
            name="data-theme"
            id="layout-color-dark"
            value="dark"
            checked={theme === 'dark'}
            onChange={() => changeTheme('dark')}
          />
          <label className="form-label btn bg-default-150" htmlFor="layout-color-dark">
            Dark
          </label>
        </div>

        <div>
          <input
            className="hidden"
            type="radio"
            name="data-theme"
            id="layout-color-system"
            value="system"
            checked={theme === 'system'}
            onChange={() => changeTheme('system')}
          />
          <label className="form-label btn bg-default-150" htmlFor="layout-color-system">
            System
          </label>
        </div>
      </div>
    </div>
  );
};

export default ThemeMode;
