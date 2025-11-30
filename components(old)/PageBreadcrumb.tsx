import Link from 'next/link';
import { LuChevronRight } from 'react-icons/lu';

type PageBreadcrumbProps = {
  title: string;
  subtitle?: string;
};

const PageBreadcrumb = ({ title, subtitle }: PageBreadcrumbProps) => {
  return (
    <div className="flex items-center md:justify-between flex-wrap gap-2 mb-4 print:hidden">
      <h4 className="text-default-900 text-lg font-semibold">{title}</h4>

      <div className="md:flex hidden items-center gap-2 text-sm font-semibold">
        <Link href="#" className="text-sm font-medium text-default-700">
          Gmeowbased
        </Link>

        <LuChevronRight
          className="text-sm flex-shrink-0 text-default-500 rtl:rotate-180"
          size={14}
        />

        {subtitle && (
          <>
            <Link href="#" className="text-sm font-medium text-default-700">
              {subtitle}
            </Link>

            <LuChevronRight
              className="text-sm flex-shrink-0 text-default-500 rtl:rotate-180"
              size={14}
            />
          </>
        )}

        <Link href="#" className="text-sm font-medium text-default-700" aria-current="page">
          {title}
        </Link>
      </div>
    </div>
  );
};

export default PageBreadcrumb;
