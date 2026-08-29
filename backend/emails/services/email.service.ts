import {render} from '@react-email/render';
import postmark from 'postmark';
import React from 'react';
import { env } from '../../src/infrastructure/config/environment';
import { EmailTemplate, TemplateProps, OrganizationBranding } from '../types';
import { organizationApplicationService } from '../../src/domains/organization/organization.application';
import AccountCreatedEmail from '../templates/auth/accountCreated';
import PasswordResetEmail from '../templates/auth/passwordReset';
import RequestOnboardingEmail from '../templates/request/onboarding';
import OrganizationNotificationEmail from '../templates/request/organizationNotification';
import QuoteSentEmail from '../templates/quote/quoteSent';
import QuoteAcceptedEmail from '../templates/quote/quoteAccepted';
import QuoteAcceptedOrganizationEmail from '../templates/quote/quoteAcceptedOrganization';
import RequestCanceledEmail from '../templates/request/requestCanceled';
import RequestCanceledOrganizationEmail from '../templates/request/requestCanceledOrganization';
import RequestRejectedEmail from '../templates/request/requestRejected';
import RequestRejectedOrganizationEmail from '../templates/request/requestRejectedOrganization';
import InvoiceSentEmail from '../templates/invoice/invoiceSent';
import OrganizationInvitationEmail from '../templates/organization/organizationInvitation';
import LeftOrganizationEmail from '../templates/organization/leftOrganization';
import ShowcaseInvitationEmail from '../templates/showcase/showcaseInvitation';
import OTPVerificationEmail from "../templates/auth/otpCode";
import ChatMessageAnonymousEmail from '../templates/chat/chatMessageAnonymous';
import MarketingEmail from '../templates/marketing/marketing';

const client = new postmark.ServerClient(env.POSTMARK_API_KEY!);

const templateComponents: Record<EmailTemplate, React.ComponentType<any>> = {
    [EmailTemplate.ACCOUNT_CREATED]: AccountCreatedEmail,
    [EmailTemplate.PASSWORD_RESET]: PasswordResetEmail,
    [EmailTemplate.REQUEST_ONBOARDING]: RequestOnboardingEmail,
    [EmailTemplate.ORGANIZATION_NOTIFICATION]: OrganizationNotificationEmail,
    [EmailTemplate.ORGANIZATION_INVITATION]: OrganizationInvitationEmail,
    [EmailTemplate.SHOWCASE_INVITATION]: ShowcaseInvitationEmail,
    [EmailTemplate.QUOTE_SENT]: QuoteSentEmail,
    [EmailTemplate.QUOTE_ACCEPTED]: QuoteAcceptedEmail,
    [EmailTemplate.QUOTE_ACCEPTED_ORGANIZATION]: QuoteAcceptedOrganizationEmail,
    [EmailTemplate.REQUEST_CANCELED]: RequestCanceledEmail,
    [EmailTemplate.REQUEST_CANCELED_ORGANIZATION]: RequestCanceledOrganizationEmail,
    [EmailTemplate.REQUEST_REJECTED]: RequestRejectedEmail,
    [EmailTemplate.REQUEST_REJECTED_ORGANIZATION]: RequestRejectedOrganizationEmail,
    [EmailTemplate.INVOICE_SENT]: InvoiceSentEmail,
    [EmailTemplate.OTP_CODE]: OTPVerificationEmail,
    [EmailTemplate.CHAT_MESSAGE_ANONYMOUS]: ChatMessageAnonymousEmail,
    [EmailTemplate.MARKETING]: MarketingEmail,
    [EmailTemplate.LEFT_ORGANIZATION]: LeftOrganizationEmail,
};

type EmailOptions = {
    from?: string;
    to: string | string[];
    subject: string;
    cc?: string | string[];
    bcc?: string | string[];
    organizationId?: string;
};

export class EmailService {
    static async sendTemplatedEmail<T extends EmailTemplate>(
        template: T,
        props: TemplateProps<T>,
        options: EmailOptions
    ) {
        try {
            const TemplateComponent = templateComponents[template];

            let organizationBranding: OrganizationBranding | undefined;
            let baseUrl: string = env.FRONTEND_URL;
            let tenantSender: string | undefined;

            if (options.organizationId) {
                try {
                    const org = await organizationApplicationService.getInfo(options.organizationId);
                    if (org && org.slug) {
                        const { getBrandColorHex } = await import('../../src/domains/organization/domain/brand-color');
                        organizationBranding = {
                            name: org.name,
                            logo: org.logo || undefined,
                            brandLogo: org.brandLogo || undefined,
                            brandColor: org.brandColor ? getBrandColorHex(org.brandColor) : undefined,
                        };

                        baseUrl = `${env.FRONTEND_URL}/org/${org.slug}`;
                        tenantSender = `"${org.name}" <${org.slug}@ortelius.app>`;
                    }
                } catch (error) {
                    console.warn('Failed to fetch organization branding:', error);
                }
            }

            const propsWithOrganization = {
                ...props,
                ...(organizationBranding && { organization: organizationBranding }),
                baseUrl,
            };

            const emailComponent = React.createElement(TemplateComponent, propsWithOrganization);

            const htmlContent = await render(emailComponent, { pretty: true });
            const textContent = await render(emailComponent, { plainText: true });

            const { from, to, subject, cc, bcc } = options;
            const senderEmail = from || tenantSender || 'noreply@ortelius.app';

            const broadcastTemplates = [EmailTemplate.MARKETING];
            const messageStream = broadcastTemplates.includes(template) ? 'broadcast' : 'outbound';

            const emailOptions = {
                From: senderEmail,
                To: Array.isArray(to) ? to.join(',') : to,
                Subject: subject,
                HtmlBody: htmlContent,
                TextBody: textContent,
                ...(cc && { Cc: Array.isArray(cc) ? cc.join(',') : cc }),
                ...(bcc && { Bcc: Array.isArray(bcc) ? bcc.join(',') : bcc }),
                MessageStream: messageStream
            };

            const result = await client.sendEmail(emailOptions);
            return { success: true, messageId: result.MessageID };
        } catch (error) {
            console.error('Error while sending email:', error);
            
            if (error && typeof error === 'object' && 'code' in error && error.code === 406) {
                console.warn('Attempted to send email to inactive recipient(s):', error);
                return { success: false, error: 'Inactive recipient', details: error };
            }
            
            return { success: false, error };
        }
    }

    static async sendTemplatedEmailFromContext<T extends EmailTemplate>(
        template: T,
        props: TemplateProps<T>,
        options: Omit<EmailOptions, 'organizationId'>,
        context?: { get: (key: string) => any }
    ) {
        const organizationId = context?.get('organizationId');
        return this.sendTemplatedEmail(template, props, {
            ...options,
            organizationId,
        });
    }
}
