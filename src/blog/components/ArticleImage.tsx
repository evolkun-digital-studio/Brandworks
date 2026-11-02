'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ComponentProps, CSSProperties } from 'react'
import type { Components } from 'react-markdown'
import { imageFigureVars, imageSources, parseImageRatio, parseImageWidth } from '../lib/articleImage'

const FigureWidth = createContext<number | null>(null)

type WithNode<P> = P & { node?: unknown }

/** react-markdown passes its syntax tree node as a prop; it must not reach the DOM. */
function withoutNode<P extends object>(props: WithNode<P>): P {
  const rest = { ...props }
  delete rest.node
  return rest
}

function ArticleFigure(input: WithNode<ComponentProps<'figure'>>) {
  const { style, children, ...props } = withoutNode(input)
  const data = props as Record<string, unknown>
  const width = parseImageWidth(data['data-width'])
  const vars = imageFigureVars(width, parseImageRatio(data['data-ratio']))
  return (
    <FigureWidth.Provider value={width}>
      <figure {...props} style={{ ...style, ...vars } as CSSProperties}>{children}</figure>
    </FigureWidth.Provider>
  )
}

function ArticleImg(input: WithNode<ComponentProps<'img'>>) {
  const { src, alt, ...props } = withoutNode(input)
  const { 'data-vector': vector, ...attributes } = props as ComponentProps<'img'> & { 'data-vector'?: string }
  const width = useContext(FigureWidth)
  const ref = useRef<HTMLImageElement>(null)
  const [optimizedFailed, setOptimizedFailed] = useState(false)
  const source = typeof src === 'string' ? src : ''
  const sources = vector !== undefined || optimizedFailed ? null : imageSources(source, width)

  // An error during server-rendered loading fires before React can listen for it.
  useEffect(() => {
    const image = ref.current
    if (sources && image?.complete && image.naturalWidth === 0) setOptimizedFailed(true)
  }, [sources])

  return (
    <img
      {...attributes}
      ref={ref}
      src={source}
      alt={alt ?? ''}
      srcSet={sources?.srcSet}
      sizes={sources?.sizes}
      loading="lazy"
      decoding="async"
      onError={() => { if (sources) setOptimizedFailed(true) }}
    />
  )
}

/** Shared by the public article and the admin preview, so both show the same layout. */
export const articleImageComponents: Pick<Components, 'figure' | 'img'> = {
  figure: ArticleFigure as Components['figure'],
  img: ArticleImg as Components['img'],
}
