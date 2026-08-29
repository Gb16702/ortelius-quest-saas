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

interface PasswordResetEmailProps {
  username?: string;
  resetLink?: string;
  organization?: OrganizationBranding;
}

const PasswordResetEmail = ({
  username = "Geoffrey",
  resetLink = "https://quest.ortelius.app",
  organization,
}: PasswordResetEmailProps) => {
  return (
    <EmailContainer preview="Reset your password">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Reset your password</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          We received a{" "}
          <EmailHighlight weight="bold">password reset request</EmailHighlight>{" "}
          for your {organization?.name || "Ortelius"} account. This link will
          expire in <EmailHighlight weight="bold">60 minutes</EmailHighlight>.
        </EmailText>
      </EmailSection>

      <EmailSection align="center" className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={resetLink} size="xs" brandColor={organization?.brandColor}>
          Reset your password
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary">
          If you did{" "}
          <EmailHighlight weight="normal">not request</EmailHighlight> a
          password reset, please ignore this email.
        </EmailText>

        <EmailText variant="extrasmall" color="secondary" margin="0">
          For security reasons, we recommend regularly updating your password
          and <EmailHighlight weight="normal">not sharing it</EmailHighlight>{" "}
          with anyone.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default PasswordResetEmail;
