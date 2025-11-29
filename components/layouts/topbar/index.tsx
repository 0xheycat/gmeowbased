import ArabianFlag from '@/assets/images/flags/arebian.svg';
import FrenchFlag from '@/assets/images/flags/french.jpg';
import GermanyFlag from '@/assets/images/flags/germany.jpg';
import ItalyFlag from '@/assets/images/flags/italy.jpg';
import JapaneseFlag from '@/assets/images/flags/japanese.svg';
import RussiaFlag from '@/assets/images/flags/russia.jpg';
import SpainFlag from '@/assets/images/flags/spain.jpg';
import UsFlag from '@/assets/images/flags/us.jpg';
import avatar1 from '@/assets/images/user/avatar-1.png';
import avatar3 from '@/assets/images/user/avatar-3.png';
import avatar5 from '@/assets/images/user/avatar-5.png';
import avatar7 from '@/assets/images/user/avatar-7.png';
import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { TbSearch } from 'react-icons/tb';
import SimpleBar from 'simplebar-react';
import SidenavToggle from './SidenavToggle';
import ThemeModeToggle from './ThemeModeToggle';
import {
  LuBellRing,
  LuClock,
  LuGem,
  LuHeart,
  LuLogOut,
  LuMail,
  LuMessagesSquare,
  LuMoveRight,
  LuSettings,
  LuShoppingBag,
} from 'react-icons/lu';

type Language = {
  src: StaticImageData;
  label: string;
};

type Tab = {
  id: string;
  title: string;
  active?: boolean;
};

type Notification = {
  type: 'follow' | 'comment' | 'purchase' | 'like';
  avatar?: StaticImageData;
  icon?: ReactNode;
  text: ReactNode;
  time: string;
  ago: string;
  comment?: string;
};

type ProfileMenuItem = {
  icon?: ReactNode;
  label?: string;
  href?: string;
  badge?: string;
  divider?: boolean;
};

const languages: Language[] = [
  { src: UsFlag, label: 'English' },
  { src: SpainFlag, label: 'Spanish' },
  { src: GermanyFlag, label: 'German' },
  { src: FrenchFlag, label: 'French' },
  { src: JapaneseFlag, label: 'Japanese' },
  { src: ItalyFlag, label: 'Italian' },
  { src: RussiaFlag, label: 'Russian' },
  { src: ArabianFlag, label: 'Arabic' },
];

const tabs: Tab[] = [
  { id: 'tabsViewall', title: 'View all', active: true },
  { id: 'tabsMentions', title: 'Mentions' },
  { id: 'tabsFollowers', title: 'Followers' },
  { id: 'tabsInvites', title: 'Invites' },
];

const notifications: Record<string, Notification[]> = {
  tabsViewall: [
    {
      type: 'follow',
      avatar: avatar3,
      text: (
        <>
          <b>@willie_passem</b> followed you
        </>
      ),
      time: 'Wednesday 03:42 PM',
      ago: '4 sec',
    },
    {
      type: 'comment',
      avatar: avatar5,
      text: (
        <>
          <b>@caroline_jessica</b> commented <br />
          on your post
        </>
      ),
      time: 'Wednesday 03:42 PM',
      ago: '15 min',
      comment: 'Amazing! Fast, to the point, professional and really amazing to work with them!!!',
    },
    {
      type: 'purchase',
      icon: <LuShoppingBag className="size-5 text-danger" />,
      text: (
        <>
          Successfully purchased a business plan for <span className="text-danger">$199.99</span>
        </>
      ),
      time: 'Monday 11:26 AM',
      ago: 'yesterday',
    },
    {
      type: 'like',
      avatar: avatar7,
      icon: <LuHeart className="size-3.5 fill-orange-500" />,
      text: (
        <>
          <b>@scott</b> liked your post
        </>
      ),
      time: 'Thursday 06:59 AM',
      ago: '1 Week',
    },
  ],
  tabsMentions: [
    {
      type: 'comment',
      avatar: avatar5,
      text: (
        <>
          <b>@caroline_jessica</b> commented <br />
          on your post
        </>
      ),
      time: 'Wednesday 03:42 PM',
      ago: '15 min',
      comment: 'Amazing! Fast, to the point, professional and really amazing to work with them!!!',
    },
    {
      type: 'like',
      avatar: avatar7,
      icon: <LuHeart className="size-3.5 fill-orange-500" />,
      text: (
        <>
          <b>@scott</b> liked your post
        </>
      ),
      time: 'Thursday 06:59 AM',
      ago: '1 Week',
    },
  ],
  tabsFollowers: [
    {
      type: 'follow',
      avatar: avatar3,
      text: (
        <>
          <b>@willie_passem</b> followed you
        </>
      ),
      time: 'Wednesday 03:42 PM',
      ago: '4 sec',
    },
  ],
  tabsInvites: [
    {
      type: 'purchase',
      icon: <LuShoppingBag className="size-5 text-danger" />,
      text: (
        <>
          Successfully purchased a business plan for <span className="text-danger">$199.99</span>
        </>
      ),
      time: 'Monday 11:26 AM',
      ago: 'yesterday',
    },
  ],
};

const profileMenu: ProfileMenuItem[] = [
  {
    icon: <LuMail className="size-4" />,
    label: 'Inbox',
    href: '/mailbox',
    badge: '15',
  },
  { icon: <LuMessagesSquare className="size-4" />, label: 'Chat', href: '/chat' },
  { icon: <LuGem className="size-4" />, label: 'Upgrade Pro', href: '/pricing' },
  { divider: true },
  {
    icon: <LuLogOut className="size-4" />,
    label: 'Sign Out',
    href: '/basic-logout',
  },
];

const Topbar = () => {
  return (
    <div className="app-header min-h-topbar-height flex items-center sticky top-0 z-30 bg-(--topbar-background) border-b border-default-200">
      <div className="w-full flex items-center justify-between px-6">
        <div className="flex items-center gap-5">
          <SidenavToggle />

          <div className="lg:flex hidden items-center relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <TbSearch className="text-base" />
            </div>
            <input
              type="search"
              id="topbar-search"
              className="form-input px-12 text-sm rounded border-transparent focus:border-transparent w-60"
              placeholder="Search something..."
            />
            <button type="button" className="absolute inset-y-0 end-0 flex items-center pe-4">
              <span className="ms-auto font-medium">⌘ K</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="topbar-item hs-dropdown [--placement:bottom-right] relative inline-flex">
            <button
              className="hs-dropdown-toggle btn btn-icon size-8 hover:bg-default-150 rounded-full relative"
              type="button"
            >
              <Image src={UsFlag} alt="us-flag" className="size-4.5 rounded" />
            </button>
            <div className="hs-dropdown-menu" role="menu">
              {languages.map((lang, i) => (
                <Link
                  key={i}
                  href="#"
                  className="flex items-center gap-x-3.5 py-1.5 px-3 text-default-600 hover:bg-default-150 rounded font-medium"
                >
                  <Image src={lang.src} alt={lang.label} className="size-4 rounded-full" />
                  {lang.label}
                </Link>
              ))}
            </div>
          </div>

          <ThemeModeToggle />

          <div className="topbar-item hs-dropdown [--auto-close:inside] relative inline-flex">
            <button
              type="button"
              className="hs-dropdown-toggle btn btn-icon size-8 hover:bg-default-150 rounded-full relative"
            >
              <LuBellRing className="size-4.5" />
              <span className="absolute end-0 top-0 size-1.5 bg-primary/90 rounded-full"></span>
            </button>
            <div className="hs-dropdown-menu max-w-100 p-0">
              <div className="p-4 border-b border-default-200 flex items-center gap-2">
                <h3 className="text-base text-default-800">Notifications</h3>
                <span className="size-5 font-semibold bg-orange-500 rounded text-white flex items-center justify-center text-xs">
                  15
                </span>
              </div>

              <nav
                className="flex gap-x-1 bg-default-150 p-2 border-b border-default-200"
                role="tablist"
              >
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    data-hs-tab={`#${tab.id}`}
                    type="button"
                    className={`hs-tab-active:bg-card hs-tab-active:text-primary py-0.5 px-4 rounded font-semibold inline-flex items-center gap-x-2 border-b-2 border-transparent text-xs whitespace-nowrap text-default-500 hover:text-blue-600 ${
                      tab.active ? 'active' : ''
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </nav>

              <SimpleBar className="h-80">
                {tabs.map((tab, i) => (
                  <div key={i} id={tab.id} className={tab.active ? '' : 'hidden'}>
                    {notifications[tab.id]?.map((n, j) => (
                      <Link
                        key={j}
                        href="#"
                        className="flex gap-3 p-4 items-start hover:bg-default-150"
                      >
                        {n.avatar ? (
                          <div className="relative">
                            <div className="size-10 rounded-md bg-default-100 flex justify-center items-center">
                              <Image src={n.avatar} alt="avatar" className="rounded-md" />
                            </div>
                            {n.icon && (
                              <div className="absolute bottom-0 -end-0.5 text-orange-500">
                                {n.icon}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="size-10 rounded-md bg-red-100 flex justify-center items-center">
                            {n.icon}
                          </div>
                        )}
                        <div className="flex justify-between w-full text-sm">
                          <div>
                            <h6 className="mb-2 font-medium text-default-800">{n.text}</h6>
                            <p className="flex items-center gap-1 text-default-500 text-xs">
                              <LuClock className="size-3.5" /> <span>{n.time}</span>
                            </p>
                            {n.comment && (
                              <p className="p-2 bg-default-50 text-default-500 mt-2 rounded">
                                {n.comment}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-default-500">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            {n.ago}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ))}
              </SimpleBar>

              <div className="flex items-center justify-between p-4 border-t border-default-200">
                <Link href="#!" className="text-sm font-medium text-default-900">
                  Manage Notification
                </Link>
                <button type="button" className="btn btn-sm text-white bg-primary">
                  View All <LuMoveRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="topbar-item">
            <button
              className="btn btn-icon size-8 hover:bg-default-150 rounded-full"
              type="button"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-controls="theme-customization"
              data-hs-overlay="#theme-customization"
            >
              <LuSettings className="size-4.5" />
            </button>
          </div>

          <div className="topbar-item hs-dropdown relative inline-flex">
            <button className="cursor-pointer bg-pink-100 rounded-full">
              <Image
                src={avatar1}
                alt="user"
                className="hs-dropdown-toggle rounded-full size-9.5"
              />
            </button>
            <div className="hs-dropdown-menu min-w-48">
              <div className="p-2">
                <h6 className="mb-2 text-default-500">Welcome to Gmeowbased</h6>
                <Link href="#!" className="flex gap-3">
                  <div className="relative inline-block">
                    <Image src={avatar1} alt="user" className="size-12 rounded" />
                    <span className="-top-1 -end-1 absolute w-2.5 h-2.5 bg-green-400 border-2 theme-border-default rounded-full"></span>
                  </div>
                  <div>
                    <h6 className="mb-1 text-sm font-semibold text-default-800">Paula Keenan</h6>
                    <p className="text-default-500">CEO & Founder</p>
                  </div>
                </Link>
              </div>

              <div className="border-t border-default-200 -mx-2 my-2"></div>

              <div className="flex flex-col gap-y-1">
                {profileMenu.map((item, i) =>
                  item.divider ? (
                    <div key={i} className="border-t border-default-200 -mx-2 my-1"></div>
                  ) : (
                    <Link
                      key={i}
                      href={item.href || '#!'}
                      className="flex items-center gap-x-3.5 py-1.5 px-3 text-default-600 hover:bg-default-150 rounded font-medium"
                    >
                      {item.icon}
                      {item.label}
                      {item.badge && (
                        <span className="size-4.5 font-semibold bg-danger rounded text-white flex items-center justify-center text-xs">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
