import { LegalPageLayout } from "@/widgets/legal-page-layout"

const tocItems = [
    {
        id: "account-registration",
        text: "Account Registration and License",
        level: 2,
    },
    {
        id: "subscription-fees",
        text: "Subscription, Fees, and Payment",
        level: 2,
    },
    { id: "use-of-service", text: "Use of the Service", level: 2 },
    { id: "intellectual-property", text: "Intellectual Property", level: 2 },
    { id: "privacy-data", text: "Privacy and Data Protection", level: 2 },
    {
        id: "third-party-services",
        text: "Third-Party Services and Integrations",
        level: 2,
    },
    { id: "term-termination", text: "Term and Termination", level: 2 },
    {
        id: "disclaimers-liability",
        text: "Disclaimers and Limitation of Liability",
        level: 2,
    },
    {
        id: "governing-law",
        text: "Governing Law and Dispute Resolution",
        level: 2,
    },
    { id: "amendments", text: "Amendments to Terms", level: 2 },
    { id: "contact-notices", text: "Contact and Notices", level: 2 },
]

export function LegalTermsPage() {
    return (
        <LegalPageLayout
            title="Terms of Service"
            introduction='These Terms of Service ("Terms") govern your use of Ortelius Quest, provided by The Space Behind BV (Filip Williotstraat 9, 2600 Antwerpen, Belgium, VAT BE0733609812). "Ortelius Quest" or "the Service" is a software-as-a-service platform that helps logistics companies manage RFIs/RFQs, team collaboration, and communications in one integrated tool. Please read these Terms carefully before using the Service. By accessing or using Ortelius Quest, you agree to be bound by these Terms. If you do not agree, you may not access or use the Service.'
            lastUpdated="December 8, 2025"
            tocItems={tocItems}
        >
            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="account-registration">Account Registration and License</h2>
            <ul>
                <li>
                    <strong>Eligibility:</strong> You must be a legal entity (e.g. business) or an
                    authorized representative of one. You must have the legal authority to enter
                    into contracts for your organization.
                </li>
                <li>
                    <strong>Registration:</strong> To use most features of Ortelius Quest, you must
                    register for an account and provide certain information (name, email, company,
                    etc.). You agree to provide accurate information and update it as needed.
                </li>
                <li>
                    <strong>License:</strong> Upon registration and payment of applicable fees, The
                    Space Behind grants you a non-exclusive, non-transferable, worldwide right to
                    use the Ortelius Quest Service solely for your internal business purposes. You
                    may not sublicense, rent, or lease the Service.
                </li>
                <li>
                    <strong>Account Security:</strong> You are responsible for maintaining the
                    confidentiality of your account credentials (username, password). You agree to
                    notify us immediately of any unauthorized use or breach of security. We are not
                    liable for any loss or damage from your failure to protect your login
                    information.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="subscription-fees">Subscription, Fees, and Payment</h2>
            <ul>
                <li>
                    <strong>Subscription Plans:</strong> Ortelius Quest is offered on a subscription
                    basis (monthly, annual, etc.). Specific pricing plans and features are described
                    on our website. We reserve the right to change pricing or plans (with notice).
                </li>
                <li>
                    <strong>Payment Processing:</strong> All fees are paid through Stripe (the
                    payment gateway). When you subscribe, you must provide a valid payment method.
                    Stripe's terms apply, and we do not see or store your full credit card details.
                </li>
                <li>
                    <strong>Billing:</strong> Your subscription renews automatically at the end of
                    each billing cycle unless you cancel in advance. The cost of renewal (at the
                    then-current rate) will be charged to your payment method. You agree to keep
                    your payment method current.
                </li>
                <li>
                    <strong>Taxes:</strong> You are responsible for all applicable taxes related to
                    your subscription (e.g. VAT, sales tax). We will charge VAT to EU customers as
                    required by law.
                </li>
                <li>
                    <strong>Refunds:</strong> Subscription fees are non-refundable except as
                    required by law. If you cancel your subscription mid-term, you will continue to
                    have access until the end of that billing period, after which the Service will
                    be suspended or terminated.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="use-of-service">Use of the Service</h2>
            <h3>Authorized Use</h3>
            <p>
                You may use the Service only in compliance with these Terms, applicable laws, and
                any instructions provided. You agree not to:
            </p>
            <ul>
                <li>
                    Reverse engineer, decompile, or attempt to extract source code from Ortelius
                    Quest.
                </li>
                <li>
                    Use the Service to store or transmit any data that is unlawful, defamatory, or
                    infringing on any third party's rights.
                </li>
                <li>
                    Interfere with or disrupt the integrity or performance of the Service or its
                    users (e.g. by hacking, distributed denial-of-service attacks).
                </li>
                <li>
                    Attempt to bypass security measures or gain unauthorized access to any part of
                    the Service.
                </li>
                <li>
                    Use automated scripts or bots to access or use the Service (unless permitted by
                    API).
                </li>
                <li>Impersonate others or share account access.</li>
            </ul>

            <h3>Acceptable Content</h3>
            <p>
                You must have the rights to upload any content (documents, images, messages) to
                Ortelius Quest. You are solely responsible for compliance with all laws regarding
                the content you post. We do not routinely monitor user content, but we reserve the
                right to remove or disable content that violates these Terms or is legally
                objectionable.
            </p>

            <h3>Modifications</h3>
            <p>
                We may update the Service features from time to time. We may also suspend or
                discontinue parts of the Service for maintenance or upgrades. We will strive to
                notify you in advance of planned downtime, but do not guarantee uninterrupted
                availability.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="intellectual-property">Intellectual Property</h2>
            <ul>
                <li>
                    <strong>Our Ownership:</strong> All rights, title, and interest in Ortelius
                    Quest (including software, documentation, trademarks, logos, and all related
                    intellectual property) remain with The Space Behind BV or its licensors. Except
                    for the license granted above, no other rights are granted.
                </li>
                <li>
                    <strong>User Data:</strong> You retain ownership of any data or content you
                    upload into Ortelius Quest (the "User Data"). However, by uploading it, you
                    grant us a limited license to use this data to provide the Service (for example,
                    storing it on our servers, displaying it in your account, or using it to train
                    AI models if applicable). We will not claim ownership of your User Data.
                </li>
                <li>
                    <strong>Feedback:</strong> If you provide feedback or suggestions about Ortelius
                    Quest, you grant us a perpetual, royalty-free license to use such feedback for
                    any purpose.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="privacy-data">Privacy and Data Protection</h2>
            <p>
                Your use of Ortelius Quest is subject to our Privacy Policy (see above). You agree
                that we may collect, use, and share your personal information as described there.
                You are responsible for complying with any data protection obligations for the data
                you input into Ortelius Quest (especially if it includes personal data of others).
                If you are an EU-based customer, we can sign a Data Processing Addendum (DPA) to
                comply with GDPR on data handling as needed.
            </p>
            <p>
                Ortelius processes personal data solely for the purposes of providing, operating,
                maintaining, and improving the platform, including optimising the user experience.
                Such processing is carried out in accordance with applicable data protection laws,
                including Regulation (EU) 2016/679 (the General Data Protection Regulation).
            </p>
            <p>
                Personal data may also be processed for marketing-related purposes, but only where
                Ortelius has obtained a valid legal basis to do so, including the data subject's
                consent where required. Data subjects have the right to withdraw their consent at
                any time.
            </p>
            <p>
                Ortelius does not intentionally process special categories of personal data as
                defined under Article 9 GDPR. Where the processing of such data is unavoidable,
                Ortelius ensures that appropriate technical and organisational measures are
                implemented, including anonymisation or pseudonymisation, to protect the rights and
                freedoms of data subjects.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="third-party-services">Third-Party Services and Integrations</h2>
            <p>
                Ortelius Quest integrates with third-party services (e.g. Stripe, AWS, VOIP
                providers, logistics APIs). Your use of these services is subject to their own terms
                and privacy policies. We are not responsible for the performance or content of
                third-party services. If you choose to link your Ortelius Quest account to external
                accounts (e.g. a TMS or ERP system), you authorize us to access your data on those
                services. Always ensure you trust any service before linking it.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="term-termination">Term and Termination</h2>
            <ul>
                <li>
                    <strong>Term:</strong> These Terms begin on the date you first use Ortelius
                    Quest and remain in effect until terminated.
                </li>
                <li>
                    <strong>Termination by You:</strong> You may cancel your subscription at any
                    time in your account settings. Upon cancellation, your access will continue
                    until the end of the paid period. After termination, we may delete your data
                    after a grace period (we will attempt to export or provide your data upon
                    request before deletion).
                </li>
                <li>
                    <strong>Termination by Us:</strong> We may suspend or terminate your access if
                    you violate these Terms, for non-payment of fees, or if we cease offering the
                    Service. We will typically give notice of non-payment. We may also terminate if
                    required by law or if continuation poses legal risks.
                </li>
                <li>
                    <strong>Effect of Termination:</strong> Upon termination, your right to use
                    Ortelius Quest ends. We may delete or irreversibly anonymize your User Data
                    after a reasonable period, unless retention is required by law. You remain
                    responsible for any unpaid fees. Termination does not limit our rights to any
                    remedies available by law or equity.
                </li>
            </ul>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="disclaimers-liability">Disclaimers and Limitation of Liability</h2>
            <h3>Warranty Disclaimer</h3>
            <p>
                The Service is provided "as is" without warranties of any kind. To the maximum
                extent permitted by law, The Space Behind disclaims all warranties, express or
                implied, including merchantability, fitness for a particular purpose, and
                non-infringement. We do not guarantee that Ortelius Quest will be error-free,
                uninterrupted, or meet your specific needs. We are not liable for delays or failures
                beyond our control (e.g. network issues, third-party outages).
            </p>

            <h3>Limitation of Liability</h3>
            <p>
                Except where prohibited by law, The Space Behind's total liability for any claim
                related to the Service is limited to the fees you paid for the Service in the 12
                months preceding the claim. Under no circumstances will we be liable for indirect,
                incidental, special, consequential or punitive damages (such as lost profits, data,
                or business interruption) even if we were advised of the possibility of such
                damages.
            </p>

            <h3>Data Loss</h3>
            <p>
                You are responsible for maintaining backups of your data. We are not liable for loss
                or corruption of data, but we implement reasonable measures (backups, encryption) to
                protect your information.
            </p>

            <h3>Indemnification</h3>
            <p>
                You agree to defend, indemnify, and hold harmless The Space Behind BV and its
                officers, directors, and employees from claims arising out of your use of the
                Service, your violation of these Terms, or your violation of any law or rights of a
                third party. This obligation includes covering any damages, settlements, or legal
                fees.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="governing-law">Governing Law and Dispute Resolution</h2>
            <p>
                These Terms and any disputes arising from them are governed by the laws of Belgium
                (as the seat of The Space Behind BV). Any legal suit or proceeding related to the
                Service must be filed in Belgian courts. If any part of these Terms is found
                unenforceable, the rest remain in effect. This agreement (along with the Privacy
                Policy) is the entire agreement between you and The Space Behind regarding Ortelius
                Quest, superseding any prior agreements or communications.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="amendments">Amendments to Terms</h2>
            <p>
                We may update these Terms from time to time (for example, to reflect new features or
                legal requirements). We will post the revised Terms with an updated "Last updated"
                date. If changes are material, we will notify you (via email or in-app) before they
                take effect. Your continued use of Ortelius Quest after notice means you accept the
                new Terms.
            </p>

            {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
            <h2 id="contact-notices">Contact and Notices</h2>
            <p>For questions about these Terms, please contact:</p>
            <p>
                <strong>The Space Behind BV (Ortelius Quest)</strong>
                <br />
                Legal Department – Filip Williotstraat 9, 2600 Antwerpen, Belgium.
                <br />
                Email: info@ortelius.app
            </p>
            <p>
                Any notices required or permitted by these Terms shall be in writing and sent to
                this address or email. If a court of competent jurisdiction finds any provision of
                these Terms invalid or unenforceable, the remaining provisions will remain in full
                force.
            </p>
        </LegalPageLayout>
    )
}
