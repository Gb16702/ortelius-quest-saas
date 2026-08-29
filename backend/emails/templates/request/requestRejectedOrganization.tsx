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

interface RequestRejectedOrganizationEmailProps {
  username?: string;
  requestNumber?: string;
  requesterName?: string;
  dashboardLink?: string;
  organization?: OrganizationBranding;
}

const RequestRejectedOrganizationEmail = ({
  username = "Geoffrey",
  requestNumber = "REQ-001",
  requesterName = "John Doe",
  dashboardLink = "https://quest.ortelius.app",
  organization,
}: RequestRejectedOrganizationEmailProps) => {
  return (
    <EmailContainer preview="Request rejected">
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Request rejected</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          You have successfully rejected the request{" "}
          <EmailHighlight weight="bold">{requestNumber}</EmailHighlight> from{" "}
          <EmailHighlight weight="bold">{requesterName}</EmailHighlight>.
        </EmailText>

        <EmailText variant="small">
          The requester has been notified of the rejection. The request is now
          closed and no further action is required.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={dashboardLink} size="xs" brandColor={organization?.brandColor}>
          View Request Details
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          This is a confirmation that the request has been{" "}
          <EmailHighlight>rejected successfully</EmailHighlight>.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default RequestRejectedOrganizationEmail;
