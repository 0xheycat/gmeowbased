import cn from 'classnames';

interface InputLabelProps {
  title: string;
  subTitle?: string;
  important?: boolean;
  className?: string;
  titleClassName?: string;
}

function InputLabel({
  title,
  subTitle,
  important,
  className,
  titleClassName,
}: InputLabelProps) {
  return (
    <div className={cn('relative mb-3', className)}>
      <span
        className={cn(
          'block text-sm font-medium uppercase tracking-wider text-gray-900 dark:text-white',
          titleClassName,
        )}
      >
        {title}
        {important && (
          <sup className="text-red-500 ltr:ml-1.5 rtl:mr-1.5">*</sup>
        )}
      </span>
      {subTitle && (
        <span className="mt-1 block text-xs tracking-tighter text-gray-600 dark:text-gray-400 sm:text-sm">
          {subTitle}
        </span>
      )}
    </div>
  );
}

export default InputLabel;
