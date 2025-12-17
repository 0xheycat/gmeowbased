'use client'

import Loader, {
  type LoaderSize,
  type LoaderVariant,
} from '@/components/ui/loader'

// Alias for backwards compatibility
type LoaderSizeTypes = LoaderSize
type LoaderVariantTypes = LoaderVariant

export default function ButtonLoader({
  size,
  variant,
}: {
  size: LoaderSizeTypes
  variant: LoaderVariantTypes
}) {
  return (
    <span className="absolute inset-0 h-full w-full flex items-center justify-center">
      <Loader
        size={size}
        variant={variant}
      />
    </span>
  )
}

ButtonLoader.displayName = 'ButtonLoader'
