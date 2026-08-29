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

interface OrganizationNotificationEmailProps {
  username?: string;
  requestNumber?: string;
  requesterName?: string;
  organizationName?: string;
  organization?: OrganizationBranding;
  baseUrl?: string;
  dashboardLink?: string;
}

const OrganizationNotificationEmail = ({
  username = "Geoffrey",
  requestNumber = "REQ-001",
  requesterName = "John Doe",
  organizationName = "Quest",
  organization,
  baseUrl = "",
  dashboardLink = "https://quest.ortelius.app",
}: OrganizationNotificationEmailProps) => {
  return (
    <EmailContainer preview="New request received">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>New request received</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          A new request (
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight>) has
          been submitted to{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> by{" "}
          <EmailHighlight weight="bold">{requesterName}</EmailHighlight>.
        </EmailText>

        <EmailText variant="small">
          Please review the request and respond accordingly through your
          dashboard.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 py-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Request
        </EmailButton>
      </EmailSection>
    </EmailContainer>
  );
};

export default OrganizationNotificationEmail;
