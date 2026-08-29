/** @jsxImportSource react */
import * as React from 'react'
import { Html, Head, Preview, Body, Container } from '@react-email/components'
import { Tailwind } from '@react-email/tailwind'
import { theme } from '../theme'

interface EmailContainerProps {
  preview?: string
  children: React.ReactNode
}

const EmailContainer = ({ preview, children }: EmailContainerProps) => {
  return (
    <Html>
      {preview && <Preview>{preview}</Preview>}
      <Tailwind>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
          <style>{emailStyles}</style>
        </Head>
        <Body style={bodyStyle}>
          <Container 
            className={"border border-solid border-theme rounded-md overflow-hidden max-w-lg w-full"}
          >
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

const emailStyles = `
  .email-button {
    text-align: center;
    font-weight: 600;
    border-radius: 50px;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    max-width: 100%;
    box-sizing: border-box;
    word-break: break-word;
    background-color: #006BFF !important;
    color: #FFFFFF !important;
  }
  
  .email-button-xs {
    font-size: 14px;
    padding: 12px 12px;
  }
  
  .email-button-sm {
    font-size: 14px;
    padding: 12px 16px;
  }
  
  .email-button-md {
    font-size: 16px;
    padding: 16px 32px;
  }
  
  .email-button-lg {
    font-size: 18px;
    padding: 24px 48px;
  }
  
  .email-button-full {
    width: 100%;
  }
  
  .border-theme {
    border-color: ${theme.colors.border.default} !important;
  }
`

const bodyStyle = {
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.sizes.base,
  lineHeight: theme.typography.lineHeights.normal,
  color: theme.colors.text.primary,
  margin: 0,
  padding: theme.spacing.xs,
  width: '100%',
  WebkitTextSizeAdjust: '100%',
  msTextSizeAdjust: '100%',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility' as const,
}


export default EmailContainer