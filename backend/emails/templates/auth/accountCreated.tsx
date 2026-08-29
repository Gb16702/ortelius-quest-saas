/** @jsxImportSource react */
import * as React from "react";
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface AccountCreatedEmailProps {
  username?: string;
  verificationLink?: string;
  organization?: OrganizationBranding;
}

const AccountCreatedEmail = ({
  username = "Geoffrey",
  verificationLink = "",
  organization = { name: "quest" },
}: AccountCreatedEmailProps) => {
  return (
    <EmailContainer preview={`Welcome to ${organization?.name}`}>
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Welcome to {organization?.name}</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          Welcome aboard {organization?.name}! Before you can fully access the
          platform, we need to{" "}
          <EmailHighlight weight="bold">verify your account</EmailHighlight>.
          This ensures a safe and secured environment for all users.
        </EmailText>

        <EmailText variant="small">
          Click the button below to verify your account and get started.
        </EmailText>
      </EmailSection>

      <EmailSection align="center" className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={verificationLink} size="xs" brandColor={organization?.brandColor}>
          Verify your account
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary">
          If you have any questions or need help, please{" "}
          <EmailHighlight weight="normal">
            contact our support team
          </EmailHighlight>
          . We're here to ensure your experience is seamless!
        </EmailText>

        <EmailText variant="extrasmall" color="secondary" margin="0">
          Thank you for joining {organization?.name || "Ortelius"}. We're
          excited to have you aboard!
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default AccountCreatedEmail;
