import { appAuthor, appName, authorWebsite, currentYear } from '@/helpers/constants';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="mt-auto footer flex items-center py-5 border-t border-default-200">
      <div className="lg:px-8 px-6 w-full flex md:justify-between justify-center gap-4">
        <div>
          {currentYear} © {appName}
        </div>
        <div className="md:flex hidden gap-2 item-center md:justify-end">
          Design &amp; Develop by
          <Link href={authorWebsite} target="_blank" className="text-primary">
            {appAuthor}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
