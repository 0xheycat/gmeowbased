'use client';
import { useLayoutContext, type SideNavColorType } from 'contexts(old)/useLayoutContext';

const SidenavColor = () => {
  const { sidenav, updateSettings } = useLayoutContext();
  const { color } = sidenav;

  const changeSidenavColor = (newColor: SideNavColorType) => {
    updateSettings({ sidenav: { ...sidenav, color: newColor } });
  };

  return (
    <div className="p-6">
      <h5 className="font-semibold text-sm mb-3">Sidenav Color</h5>
      <div className="flex gap-2">
        <div>
          <input
            className="hidden"
            type="radio"
            name="data-sidenav-color"
            id="menu-color-light"
            value="light"
            checked={color === 'light'}
            onChange={() => changeSidenavColor('light')}
          />
          <label className="form-label btn bg-default-150" htmlFor="menu-color-light">
            Light
          </label>
        </div>

        <div>
          <input
            className="hidden"
            type="radio"
            name="data-sidenav-color"
            id="menu-color-dark"
            value="dark"
            checked={color === 'dark'}
            onChange={() => changeSidenavColor('dark')}
          />
          <label className="form-label btn bg-default-150" htmlFor="menu-color-dark">
            Dark
          </label>
        </div>
      </div>
    </div>
  );
};

export default SidenavColor;
