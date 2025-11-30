import type { IconType } from 'react-icons/lib';
import {
  LuCalendar1,
  LuCircuitBoard,
  LuClipboardList,
  LuCodesandbox,
  LuFileText,
  LuFingerprint,
  LuLayoutPanelLeft,
  LuLock,
  LuMail,
  LuMessagesSquare,
  LuMonitorDot,
  LuPackage,
  LuPictureInPicture2,
  LuShare2,
  LuShieldCheck,
  LuShoppingBag,
  LuSquareUserRound,
} from 'react-icons/lu';

export type MenuItemType = {
  key: string;
  label: string;
  isTitle?: boolean;
  href?: string;
  children?: MenuItemType[];

  icon?: IconType;
  parentKey?: string;
  target?: string;
  isDisabled?: boolean;
};

export const menuItemsData: MenuItemType[] = [
  {
    key: 'Overview',
    label: 'Overview',
    isTitle: true,
  },
  {
    key: 'Dashboards',
    label: 'Dashboards',
    icon: LuMonitorDot,
    children: [
      { key: 'Analytics', label: 'Analytics', href: '/analytics' },
      { key: 'Ecommerce', label: 'Ecommerce', href: '/index' },
      { key: 'Email', label: 'Email', href: '/email' },
      { key: 'HR', label: 'HR', href: '/hr' },
    ],
  },
  {
    key: 'Landing Page',
    label: 'Landing Page',
    icon: LuPictureInPicture2,
    children: [
      { key: 'One Page', label: 'One Page', href: '/onepage-landing', target: '_blank' },
      { key: 'Product', label: 'Product', href: '/product-landing', target: '_blank' },
    ],
  },
  {
    key: 'Apps',
    label: 'Apps',
    isTitle: true,
  },
  {
    key: 'Chat',
    label: 'Chat',
    icon: LuMessagesSquare,
    href: '/chat',
  },
  {
    key: 'Calendar',
    label: 'Calendar',
    icon: LuCalendar1,
    href: '/calendar',
  },
  {
    key: 'Email',
    label: 'Email',
    icon: LuMail,
    href: '/mailbox',
  },
  {
    key: 'Notes',
    label: 'Notes',
    icon: LuClipboardList,
    href: '/notes',
  },
  {
    key: 'Ecommerce',
    label: 'Ecommerce',
    icon: LuShoppingBag,
    children: [
      { key: 'Products', label: 'Products', href: '/product-list' },
      { key: 'Products Grid', label: 'Products Grid', href: '/product-grid' },
      { key: 'Product Details', label: 'Product Details', href: '/product-overview' },
      { key: 'Shopping Cart', label: 'Shopping Cart', href: '/cart' },
      { key: 'Checkout', label: 'Checkout', href: '/checkout' },
      { key: 'Add Products', label: 'Add Products', href: '/product-create' },
      { key: 'Orders', label: 'Orders', href: '/orders' },
      { key: 'Order Details', label: 'Order Details', href: '/order-overview' },
      { key: 'Sellers', label: 'Sellers', href: '/sellers' },
    ],
  },
  {
    key: 'HR Management',
    label: 'HR Management',
    icon: LuCircuitBoard,
    children: [
      { key: 'Employee List', label: 'Employee List', href: '/employee' },
      { key: 'Holidays', label: 'Holidays', href: '/holidays' },
      {
        key: 'Leave Manage',
        label: 'Leave Manage',
        href: '#',
        children: [
          { key: 'By Employee', label: 'By Employee', href: '/leave-employee' },
          {
            key: 'Add Leave(Employee)',
            label: 'Add Leave(Employee)',
            href: '/create-leave-employee',
          },
          { key: 'By HR', label: 'By HR', href: '/leave' },
          { key: 'Add Leave(HR)', label: 'Add Leave(HR)', href: '/create-leave' },
        ],
      },
      {
        key: 'Attendance',
        label: 'Attendance',
        href: '#',
        children: [
          { key: 'Attendance(HR)', label: 'Attendance(HR)', href: '/attendance' },
          { key: 'Main Attendance', label: 'Main Attendance', href: '/attendance-main' },
        ],
      },
      { key: 'Department', label: 'Department', href: '/department' },
      {
        key: 'Sales',
        label: 'Sales',
        href: '#',
        children: [
          { key: 'Estimates', label: 'Estimates', href: '/sales-estimates' },
          { key: 'Payments', label: 'Payments', href: '/sales-payments' },
          { key: 'Expenses', label: 'Expenses', href: '/sales-expenses' },
        ],
      },
      {
        key: 'Payroll',
        label: 'Payroll',
        href: '#',
        children: [
          { key: 'Employee Salary', label: 'Employee Salary', href: '/payroll-employee-salary' },
          { key: 'Payslip', label: 'Payslip', href: '/payroll-payslip' },
          { key: 'Create Payslip', label: 'Create Payslip', href: '/create-payslip' },
        ],
      },
    ],
  },
  {
    key: 'Invoice',
    label: 'Invoice',
    icon: LuFileText,
    children: [
      { key: 'Overview', label: 'Overview', href: '/overview' },
      { key: 'List Invoice', label: 'List Invoice', href: '/list' },
      { key: 'Add Invoice', label: 'Add Invoice', href: '/add-new' },
    ],
  },
  {
    key: 'Users',
    label: 'Users',
    icon: LuSquareUserRound,
    children: [
      { key: 'List View', label: 'List View', href: '/users-list' },
      { key: 'Grid View', label: 'Grid View', href: '/users-grid' },
    ],
  },
  {
    key: 'Extra',
    label: 'Extra',
    isTitle: true,
  },
  {
    key: 'Pages',
    label: 'Pages',
    icon: LuCodesandbox,
    children: [
      { key: 'Starter Page', label: 'Starter Page', href: '/starter' },
      { key: 'Pricing', label: 'Pricing', href: '/pricing' },
      { key: 'FAQ', label: 'FAQ', href: '/faqs' },
      { key: 'Maintenance', label: 'Maintenance', href: '/maintenance' },
      { key: 'Timeline', label: 'Timeline', href: '/timeline' },
      { key: 'Coming Soon', label: 'Coming Soon', href: '/coming-soon' },
      { key: '404', label: '404', href: '/404' },
      { key: 'Offline', label: 'Offline', href: '/offline' },
    ],
  },
  {
    key: 'Basic Auth',
    label: 'Basic Auth',
    icon: LuLock,
    children: [
      { key: 'Login', label: 'Login', href: '/basic-login' },
      { key: 'Register', label: 'Register', href: '/basic-register' },
      { key: 'Verify Email', label: 'Verify Email', href: '/basic-verify-email' },
      { key: 'Two Steps', label: 'Two Steps', href: '/basic-two-steps' },
      { key: 'Logout', label: 'Logout', href: '/basic-logout' },
      { key: 'Reset Password', label: 'Reset Password', href: '/basic-reset-password' },
      { key: 'Create Password', label: 'Create Password', href: '/basic-create-password' },
    ],
  },
  {
    key: 'Cover Auth',
    label: 'Cover Auth',
    icon: LuShieldCheck,
    children: [
      { key: 'Login', label: 'Login', href: '/cover-login' },
      { key: 'Register', label: 'Register', href: '/cover-register' },
      { key: 'Verify Email', label: 'Verify Email', href: '/cover-verify-email' },
      { key: 'Two Steps', label: 'Two Steps', href: '/cover-two-steps' },
      { key: 'Logout', label: 'Logout', href: '/cover-logout' },
      { key: 'Reset Password', label: 'Reset Password', href: '/cover-reset-password' },
      { key: 'Create Password', label: 'Create Password', href: '/cover-create-password' },
    ],
  },
  {
    key: 'Boxed Auth',
    label: 'Boxed Auth',
    icon: LuPackage,
    children: [
      { key: 'Login', label: 'Login', href: '/boxed-login' },
      { key: 'Register', label: 'Register', href: '/boxed-register' },
      { key: 'Verify Email', label: 'Verify Email', href: '/boxed-verify-email' },
      { key: 'Two Steps', label: 'Two Steps', href: '/boxed-two-steps' },
      { key: 'Logout', label: 'Logout', href: '/boxed-logout' },
      { key: 'Reset Password', label: 'Reset Password', href: '/boxed-reset-password' },
      { key: 'Create Password', label: 'Create Password', href: '/boxed-create-password' },
    ],
  },
  {
    key: 'Modern Auth',
    label: 'Modern Auth',
    icon: LuFingerprint,
    children: [
      { key: 'Login', label: 'Login', href: '/modern-login' },
      { key: 'Register', label: 'Register', href: '/modern-register' },
      { key: 'Verify Email', label: 'Verify Email', href: '/modern-verify-email' },
      { key: 'Two Steps', label: 'Two Steps', href: '/modern-two-steps' },
      { key: 'Logout', label: 'Logout', href: '/modern-logout' },
      { key: 'Reset Password', label: 'Reset Password', href: '/modern-reset-password' },
      { key: 'Create Password', label: 'Create Password', href: '/modern-create-password' },
    ],
  },
  {
    key: 'Layouts',
    label: 'Layouts',
    icon: LuLayoutPanelLeft,
    children: [
      { key: 'Hover Sidenav', label: 'Hover Sidenav', href: '/sidenav-hover', target: '_blank' },
      {
        key: 'Hover Active Sidenav',
        label: 'Hover Active Sidenav',
        href: '/sidenav-hover-active',
        target: '_blank',
      },
      { key: 'Small Sidenav', label: 'Small Sidenav', href: '/sidenav-small', target: '_blank' },
      {
        key: 'Compact Sidenav',
        label: 'Compact Sidenav',
        href: '/sidenav-compact',
        target: '_blank',
      },
      {
        key: 'Offcanvas Sidenav',
        label: 'Offcanvas Sidenav',
        href: '/sidenav-offcanvas',
        target: '_blank',
      },
      { key: 'Hidden Sidenav', label: 'Hidden Sidenav', href: '/sidenav-hidden', target: '_blank' },
      { key: 'Dark Sidenav', label: 'Dark Sidenav', href: '/sidenav-dark', target: '_blank' },
      { key: 'Dark Mode', label: 'Dark Mode', href: '/dark-mode', target: '_blank' },
      { key: 'RTL Mode', label: 'RTL Mode', href: '/rtl-mode', target: '_blank' },
    ],
  },
  {
    key: 'Multi Level',
    label: 'Multi Level',
    icon: LuShare2,
    children: [
      { key: 'Item 1', label: 'Item 1', href: '#' },
      { key: 'Item 2', label: 'Item 2', href: '#' },
    ],
  },
];
