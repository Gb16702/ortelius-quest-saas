/** @jsxImportSource react */
import * as React from 'react'
import { Button } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  brandColor?: string
}

const DEFAULT_ACCENT = '#0103B8'

const EmailButton = ({
  href,
  children,
  size = 'xs',
  fullWidth = false,
  brandColor,
}: EmailButtonProps) => {

  const bgColor = brandColor || DEFAULT_ACCENT

  const getButtonStyle = () => {
    const baseStyle = {
      textAlign: 'center' as const,
      fontWeight: 600,
      borderRadius: '50px',
      textDecoration: 'none',
      display: 'inline-block',
      cursor: 'pointer',
      maxWidth: '100%',
      boxSizing: 'border-box' as const,
      wordBreak: 'break-word' as const,
      backgroundColor: bgColor,
      color: '#FFFFFF',
      border: 'none',
      width: fullWidth ? '100%' : 'auto',
    }

    const sizeStyles = {
      xs: { fontSize: '14px', padding: '12px 12px' },
      sm: { fontSize: '14px', padding: '12px 16px' },
      md: { fontSize: '16px', padding: '16px 32px' },
      lg: { fontSize: '18px', padding: '24px 48px' },
    }

    return { ...baseStyle, ...sizeStyles[size] }
  }

  return (
    <Button href={href} style={getButtonStyle()}>
      {children}
    </Button>
  )
}

export default EmailButton
