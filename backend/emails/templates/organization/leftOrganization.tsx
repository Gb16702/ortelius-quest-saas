/** @jsxImportSource react */
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailHighlight,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface LeftOrganizationEmailProps {
  username?: string;
  organizationName?: string;
  organization?: OrganizationBranding;
}

const LeftOrganizationEmail = ({
  username = "Geoffrey",
  organizationName = "Quest",
}: LeftOrganizationEmailProps) => {
  return (
    <EmailContainer preview={`You left ${organizationName}`}>
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>You left {organizationName}</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          This is a confirmation that you have left{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight>. You
          no longer have access to its data, members, or workspace.
        </EmailText>

        <EmailText variant="small">
          Any requests that were assigned to you have been unassigned. If you
          believe this was a mistake, please contact an administrator of{" "}
          {organizationName} to be re-invited.
        </EmailText>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          If you did not intend to leave this organization, please{" "}
          <EmailHighlight>contact support</EmailHighlight> as soon as possible.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default LeftOrganizationEmail;
