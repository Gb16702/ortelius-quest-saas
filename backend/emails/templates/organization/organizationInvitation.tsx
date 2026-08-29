/** @jsxImportSource react */
import {
  EmailContainer,
  EmailSection,
  EmailSeparator,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
  EmailLink,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface OrganizationInvitationEmailProps {
  username?: string;
  organizationName?: string;
  inviterName?: string;
  inviterEmail?: string;
  role?: string;
  inviteLink?: string;
  organization?: OrganizationBranding;
}

const OrganizationInvitationEmail = ({
  username = "Geoffrey",
  organizationName = "Quest",
  inviterName = "John Doe",
  inviterEmail = "john.doe@example.com",
  role = "Member",
  inviteLink = "https://quest.ortelius.app",
  organization,
}: OrganizationInvitationEmailProps) => {
  return (
    <EmailContainer preview={`Join ${organizationName} on Ortelius`}>
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>Join {organizationName}</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          <EmailHighlight weight="bold">{inviterName}</EmailHighlight> (
          <EmailLink href={`mailto:${inviterEmail}`}>{inviterEmail}</EmailLink>)
          has invited you to join the{" "}
          <EmailHighlight weight="bold">{organizationName}</EmailHighlight> team
          as a <EmailHighlight weight="bold">{role}</EmailHighlight>.
        </EmailText>
      </EmailSection>

      <EmailSection className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={inviteLink} size="xs" brandColor={organization?.brandColor}>
          Join the team
        </EmailButton>
      </EmailSection>
      <EmailSection className="px-5 sm:px-10">
        <EmailText variant="small">
          or paste this URL into your browser:{" "}
          <EmailLink>{inviteLink}</EmailLink>
        </EmailText>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          You can <EmailHighlight>accept or decline</EmailHighlight> the
          invitation in the invitation page.
        </EmailText>
        <br />
        <EmailText variant="extrasmall" color="secondary" margin="0">
          If you have any questions about this invitation, please{" "}
          <EmailHighlight>contact the person who invited you</EmailHighlight>.
        </EmailText>
      </EmailSection>
    </EmailContainer>
  );
};

export default OrganizationInvitationEmail;
