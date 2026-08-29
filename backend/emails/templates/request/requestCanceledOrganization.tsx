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

interface RequestCanceledOrganizationEmailProps {
  username?: string;
  requestNumber?: string;
  requesterName?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const RequestCanceledOrganizationEmail = ({
  username = "Geoffrey",
  requestNumber = "REQ-001",
  requesterName = "John Doe",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: RequestCanceledOrganizationEmailProps) => {
  return (
    <EmailContainer preview="Request canceled">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Request canceled</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          The request{" "}
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight> from{" "}
          <EmailHighlight weight="bold">{requesterName}</EmailHighlight> has
          been canceled by the requester.
        </EmailText>

        <EmailText variant="small">
          No further action is required from your organization.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 py-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Request Details
        </EmailButton>
      </EmailSection>
    </EmailContainer>
  );
};

export default RequestCanceledOrganizationEmail;
