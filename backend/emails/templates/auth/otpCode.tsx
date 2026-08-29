/** @jsxImportSource react */
import * as React from 'react'
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailHighlight,
  EmailCode,
} from '../../components'
import { OrganizationBranding } from '../../types'

interface OTPVerificationEmailProps {
  code?: string
  type?: 'login' | 'transaction' | '2FA verification' | 'email-verification' | 'verification'
  username?: string
  organization?: OrganizationBranding
}

const OTPVerificationEmail = ({
  code = '123456',
  type = 'verification',
  username = 'Geoffrey',
  organization,
}: OTPVerificationEmailProps) => {

  const getTitle = () => {
    const orgName = organization?.name || 'Ortelius';
    
    switch (type) {
      case 'login':
        return `Verify your ${orgName} login`;
      case 'transaction':
        return `Verify your ${orgName} transaction`;
      case '2FA verification':
        return `${code} - Your ${orgName} 2FA Code`;
      case 'email-verification':
        return `Verify your ${orgName} email`;
      default:
        return `Verify your ${orgName} account`;
    }
  };

  return (
    <EmailContainer preview={getTitle()}>
      <EmailSection className={"px-5 sm:px-10"}>
        <EmailHeading level={1}>
          {getTitle()}
        </EmailHeading>
        
        <EmailText margin={""} variant="small">
          Hello <EmailHighlight weight={"bold"}>{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          We need to verify your identity for your {organization?.name || 'Ortelius'} account. 
          Please use the <EmailHighlight weight={"bold"}>verification code</EmailHighlight> below to complete the process.
        </EmailText>

        <EmailText variant="small">
          This code will expire in <EmailHighlight weight={"bold"}>15 minutes</EmailHighlight> for security purposes.
        </EmailText>
      </EmailSection>

      <EmailSection align={"center"} className={"px-5 sm:px-10"}>
        <EmailCode size="xl" spacing={true}>
          {code}
        </EmailCode>
      </EmailSection>

      <EmailSeparator thickness={"thin"} margin={"lg"} />

      <EmailSection className={"px-5 sm:px-10 pb-5"}>
        <EmailText variant="extrasmall" color="secondary">
          If you did <EmailHighlight weight={"normal"}>not request</EmailHighlight> this code, please ignore this email or contact support immediately.
        </EmailText>

        <EmailText variant="extrasmall" color="secondary" margin="0">
          For security reasons, please <EmailHighlight weight={"normal"}>do not share</EmailHighlight> this code with anyone.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default OTPVerificationEmail;