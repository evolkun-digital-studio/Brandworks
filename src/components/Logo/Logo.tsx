import Image from 'next/image'
import type { ImageProps } from 'next/image'

// color: the brand colours, for dark grounds. dark: one colour, for light and green grounds.
const LOGO_SRC = {
  color: '/BWorksLogo-01.svg',
  dark: '/BWorksLogo-dark.svg',
}

type LogoProps = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> & {
  variant?: keyof typeof LOGO_SRC
  alt?: string
}

/** Set its size by height in className (e.g. h-[30px]); the width follows the artwork. */
function Logo({ variant = 'color', alt = 'BrandWorks', className = '', ...props }: LogoProps) {
  return (
    <Image
      {...props}
      src={LOGO_SRC[variant]}
      alt={alt}
      width={176}
      height={30}
      className={`w-auto ${className}`}
    />
  )
}

export default Logo
