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
  EmailBorderedSection,
  EmailList,
  EmailListItem,
} from "../../components";
import { OrganizationBranding } from "../../types";

interface ChatMessageAnonymousEmailProps {
  username?: string;
  senderName?: string;
  messageContent?: string;
  conversationName?: string;
  signupLink?: string;
  organization?: OrganizationBranding;
}

const ChatMessageAnonymousEmail = ({
  username = "Geoffrey",
  senderName = "Quest Team",
  messageContent = "Hello! We have an update regarding your request. Create your account to reply and continue the conversation.",
  conversationName = "Request REQ-001",
  signupLink = "https://quest.ortelius.app",
  organization,
}: ChatMessageAnonymousEmailProps) => {
  return (
    <EmailContainer preview={`New message from ${senderName}`}>      
      <EmailSection className="px-5 sm:px-10">
        <EmailHeading level={1}>New message received</EmailHeading>

        <EmailText margin="" variant="small">
          Hello <EmailHighlight weight="bold">{username}</EmailHighlight>,
        </EmailText>

        <EmailText variant="small">
          <EmailHighlight weight="bold">{senderName}</EmailHighlight> sent you a message in{" "}
          <EmailHighlight weight="bold">{conversationName}</EmailHighlight>.
        </EmailText>

        <EmailText variant="small">
          To reply and continue the conversation, please create your account to access the full chat experience.
        </EmailText>

        <EmailText variant="small" margin="24px 0 8px 0">
          By signing up, you'll be able to:
        </EmailText>

        <EmailList variant="extrasmall" color="primary">
          <EmailListItem>Reply to messages instantly</EmailListItem>
          <EmailListItem>Access your full conversation history</EmailListItem>
          <EmailListItem>Receive quotes and manage your requests</EmailListItem>
          <EmailListItem>Get real-time notifications</EmailListItem>
        </EmailList>
      </EmailSection>

      <EmailSection align="center" className="px-5 sm:px-10 pt-5">
        <EmailButton fullWidth href={signupLink} size="xs" brandColor={organization?.brandColor}>
          Create my account
        </EmailButton>
      </EmailSection>

      <EmailSeparator thickness="thin" margin="lg" />

      <EmailSection className="px-5 sm:px-10 pb-5">
        <EmailText variant="extrasmall" color="secondary" margin="0">
          This message was sent to you because you submitted a request. Your account will automatically link to your previous conversations once you sign up.
        </EmailText>

      </EmailSection>
    </EmailContainer>
  );
};

export default ChatMessageAnonymousEmail;