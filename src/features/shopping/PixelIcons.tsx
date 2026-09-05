import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function PixelCart({ width = 24, height = 24, className, ...props }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Handle */}
      <rect x="1" y="3" width="2" height="2" fill="#000000" />
      <rect x="2" y="5" width="2" height="2" fill="#000000" />
      {/* Basket Border */}
      <rect x="3" y="6" width="11" height="2" fill="#000000" />
      <rect x="3" y="8" width="2" height="4" fill="#000000" />
      <rect x="12" y="8" width="2" height="4" fill="#000000" />
      <rect x="4" y="10" width="9" height="2" fill="#000000" />
      {/* Basket Interior */}
      <rect x="5" y="8" width="7" height="2" fill="#39FF14" />
      {/* Wheels */}
      <rect x="4" y="13" width="3" height="3" fill="#000000" />
      <rect x="11" y="13" width="3" height="3" fill="#000000" />
      <rect x="5" y="14" width="1" height="1" fill="#F4F0EB" />
      <rect x="12" y="14" width="1" height="1" fill="#F4F0EB" />
    </svg>
  )
}

export function PixelCoin({ width = 24, height = 24, className, ...props }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Outer Border */}
      <rect x="4" y="1" width="8" height="2" fill="#000000" />
      <rect x="4" y="13" width="8" height="2" fill="#000000" />
      <rect x="2" y="3" width="2" height="10" fill="#000000" />
      <rect x="12" y="3" width="2" height="10" fill="#000000" />
      <rect x="3" y="2" width="2" height="2" fill="#000000" />
      <rect x="11" y="2" width="2" height="2" fill="#000000" />
      <rect x="3" y="12" width="2" height="2" fill="#000000" />
      <rect x="11" y="12" width="2" height="2" fill="#000000" />
      {/* Coin Body */}
      <rect x="4" y="3" width="8" height="10" fill="#FFFF00" />
      <rect x="3" y="4" width="10" height="8" fill="#FFFF00" />
      {/* Coin Symbol */}
      <rect x="7" y="4" width="2" height="8" fill="#000000" />
      <rect x="6" y="5" width="4" height="2" fill="#000000" />
      <rect x="6" y="9" width="4" height="2" fill="#000000" />
    </svg>
  )
}

export function PixelCheck({ width = 24, height = 24, className, ...props }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Black Outline */}
      <rect x="2" y="7" width="2" height="3" fill="#000000" />
      <rect x="4" y="9" width="2" height="3" fill="#000000" />
      <rect x="6" y="11" width="3" height="3" fill="#000000" />
      <rect x="8" y="9" width="2" height="3" fill="#000000" />
      <rect x="10" y="7" width="2" height="3" fill="#000000" />
      <rect x="12" y="5" width="2" height="3" fill="#000000" />
      {/* Green Check Fill */}
      <rect x="3" y="7" width="2" height="2" fill="#39FF14" />
      <rect x="5" y="9" width="2" height="2" fill="#39FF14" />
      <rect x="7" y="11" width="2" height="2" fill="#39FF14" />
      <rect x="9" y="9" width="2" height="2" fill="#39FF14" />
      <rect x="11" y="7" width="2" height="2" fill="#39FF14" />
      <rect x="13" y="5" width="2" height="2" fill="#39FF14" />
    </svg>
  )
}
