'use client';
import IconifyIcon from 'components(old)/client-wrapper/IconifyIcon';
import { useLayoutContext } from 'contexts(old)/useLayoutContext';

const HoverToggle = () => {
  const { sidenav, updateSettings } = useLayoutContext();
  const { size } = sidenav;

  const toggleHoverSize = () => {
    updateSettings({ sidenav: { ...sidenav, size: size === 'hover' ? 'hover-active' : 'hover' } });
  };

  return (
    <div className="absolute top-0 end-5 flex h-topbar items-center justify">
      <button id="button-hover-toggle" onClick={toggleHoverSize}>
        <IconifyIcon icon="tabler:circle" className="size-5" />
      </button>
    </div>
  );
};

export default HoverToggle;
