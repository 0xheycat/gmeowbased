'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuChevronRight } from 'react-icons/lu';
import { menuItemsData, type MenuItemType } from './menu';

const isItemActive = (item: MenuItemType, pathname: string): boolean => {
  if (item.href && pathname === item.href) return true;
  if (item.children) {
    return item.children.some(child => isItemActive(child, pathname));
  }
  return false;
};

const MenuItemWithChildren = ({ item }: { item: MenuItemType }) => {
  const pathname = usePathname();
  const Icon = item.icon;

  const isActive = isItemActive(item, pathname);

  return (
    <li className={`menu-item hs-accordion ${isActive ? 'active' : ''}`}>
      <button
        className={`hs-accordion-toggle menu-link ${isActive ? 'active' : ''}`}
      >
        {Icon && (
          <span className="menu-icon">
            <Icon />
          </span>
        )}
        <span className="menu-text">{item.label}</span>
        <span className="menu-arrow">
          <LuChevronRight />
        </span>
      </button>

      <ul
        className={`sub-menu hs-accordion-content hs-accordion-group ${
          isActive ? 'block' : 'hidden'
        }`}
      >
        {item.children?.map((child: MenuItemType) =>
          child.children ? (
            <MenuItemWithChildren key={child.key} item={child} />
          ) : (
            <MenuItem key={child.key} item={child} />
          )
        )}
      </ul>
    </li>
  );
};

const MenuItem = ({ item }: { item: MenuItemType }) => {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = pathname === item.href;

  return (
    <li className={`menu-item ${isActive ? 'active' : ''}`}>
      <Link href={item.href ?? '#'} className={`menu-link ${isActive ? 'active' : ''}`}>
        {Icon && (
          <span className="menu-icon">
            <Icon />
          </span>
        )}
        <div className="menu-text">{item.label}</div>
      </Link>
    </li>
  );
};

const AppMenu = () => {
  return (
    <ul className="side-nav p-3 hs-accordion-group">
      {menuItemsData.map((item: MenuItemType) =>
        item.isTitle ? (
          <li className="menu-title" key={item.key}>
            <span>{item.label}</span>
          </li>
        ) : item.children ? (
          <MenuItemWithChildren key={item.key} item={item} />
        ) : (
          <MenuItem key={item.key} item={item} />
        )
      )}
    </ul>
  );
};

export default AppMenu;
