import type { ReactNode } from 'react'
import { GEIST_BOLD_BASE64 } from './og-assets/geist-bold-base64'

let fontBuffer: ArrayBuffer | null = null

function decodeBase64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes.buffer
}

function loadFont(): ArrayBuffer {
  if (!fontBuffer) {
    fontBuffer = decodeBase64ToArrayBuffer(GEIST_BOLD_BASE64)
  }

  return fontBuffer
}

interface RenderPngInput {
  node: ReactNode
  width: number
  height: number
}

export async function renderPng({ node, width, height }: RenderPngInput): Promise<Uint8Array> {
  const [{ default: satori }, { Resvg }] = await Promise.all([
    import('satori'),
    import('@resvg/resvg-js'),
  ])
  const fontData = loadFont()
  const svg = await satori(node, {
    width,
    height,
    fonts: [{ name: 'Geist', data: fontData, weight: 700, style: 'normal' }],
  })
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })

  return resvg.render().asPng()
}
