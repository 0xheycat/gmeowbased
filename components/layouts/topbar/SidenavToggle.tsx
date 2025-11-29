'use client';
import { LuAlignLeft } from 'react-icons/lu';

import { showBackdrop, toggleClassName } from '@/utils/layout';
import { useLayoutContext, type SideNavSizeType } from '@/contexts/useLayoutContext';

const SidenavToggle = () => {
  const { sidenav, updateSettings } = useLayoutContext();
  const { size } = sidenav;

  const changeSideNavSize = (newSize: SideNavSizeType) => {
    updateSettings({ sidenav: { ...sidenav, size: newSize } });
  };

  const toggleSidebar = () => {
    if (size === 'offcanvas') {
      showBackdrop();
    } else if (size === 'md') {
      changeSideNavSize('sm');
    } else if (size === 'hidden') {
      changeSideNavSize('default');
    } else {
      changeSideNavSize(size === 'sm' ? 'default' : 'sm');
    }

    toggleClassName('sidenav-enable');
  };

  return (
    <button
      id="button-toggle-menu"
      className="btn btn-icon size-8 hover:bg-default-150 rounded"
      onClick={toggleSidebar}
    >
      <LuAlignLeft size={20} />
    </button>
  );
};

export default SidenavToggle;
