import { Form, Field as FormischField, handleSubmit } from "@formisch/react"
import { SquarePen } from "lucide-react"
import { useId } from "react"
import { useTranslation } from "react-i18next"
import {
    getOrgBreadcrumbItems,
    normalizeOrganizationSlugInput,
    ORGANIZATION_NAME_MAX_LENGTH,
    ORGANIZATION_SLUG_MAX_LENGTH,
    stripSchemePrefix,
    useOrg,
} from "@/entities/organization"
import { AvatarWithIcon } from "@/shared/ui/avatar"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogAction,
    DialogBody,
    DialogCancel,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldError } from "@/shared/ui/field"
import { ImageCropper } from "@/shared/ui/image-cropper"
import { preloadImageCropperContent } from "@/shared/ui/image-cropper-preload"
import { InlineErrorBoundary } from "@/shared/ui/inline-error-boundary"
import { Input } from "@/shared/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import {
    Stack,
    StackActionButton,
    StackDescription,
    StackItem,
    StackTitle,
} from "@/shared/ui/stack"
import { BRANDING_LOGO_UPLOAD_CONFIG } from "../lib/branding-logo-upload"
import { useBrandingPage } from "../model/branding-page.provider"
import { OrganizationAppearanceStack } from "./organization-appearance-stack"
import { OverviewEditDialog } from "./overview-edit-dialog"

export function BrandingPageContent() {
    const { t } = useTranslation("settings")
    const { state, actions } = useBrandingPage()
    const { state: orgState, meta } = useOrg()
    const publicProfileHeadingId = useId()
    const visualIdentityHeadingId = useId()
    const {
        organizationData,
        orgLogoImageSrc,
        showOrgLogoCropper,
        organizationNameForm,
        taglineForm,
        websiteForm,
    } = state

    const workspaceUrlPrefix = getWorkspaceUrlPrefix()

    const submitOrganizationNameIfDirty = () => {
        if (!organizationNameForm.isDirty) return
        void handleSubmit(organizationNameForm, actions.saveOrganizationName)()
    }

    const submitTaglineIfDirty = () => {
        if (!taglineForm.isDirty) return
        void handleSubmit(taglineForm, actions.saveTagline)()
    }

    const submitWebsiteIfDirty = () => {
        if (!websiteForm.isDirty) return
        void handleSubmit(websiteForm, actions.saveWebsite)()
    }

    return (
        <div className="flex w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(orgState.org, [
                    { label: t("nav.settings"), href: `/org/${meta.slug}/settings` },
                    { label: t("nav.branding") },
                ])}
            />
            <ProfilePageHead title={t("branding.title")} maxWidth="4xl" />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-4xl flex-col py-6">
                    <div className="space-y-12">
                        <div>
                            <Stack>
                                {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
                                <StackItem
                                    id="logo"
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <StackTitle>{t("branding.logo.title")}</StackTitle>
                                        <StackDescription>
                                            {t("branding.logo.description")}
                                        </StackDescription>
                                    </div>
                                    <StackActionButton className="flex shrink-0 items-center gap-2">
                                        <div className="group relative flex size-10 cursor-pointer items-center justify-center">
                                            <input
                                                type="file"
                                                aria-label={t("branding.logo.uploadAriaLabel")}
                                                accept={BRANDING_LOGO_UPLOAD_CONFIG.accept}
                                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                                onChange={(event) => {
                                                    void preloadImageCropperContent()
                                                    actions.handleLogoFileChange(event)
                                                }}
                                                onFocus={() => void preloadImageCropperContent()}
                                                onPointerDown={() =>
                                                    void preloadImageCropperContent()
                                                }
                                                onPointerEnter={() =>
                                                    void preloadImageCropperContent()
                                                }
                                            />
                                            <AvatarWithIcon
                                                src={organizationData?.logo}
                                                alt={organizationData?.name || ""}
                                                icon={
                                                    <SquarePen
                                                        size={14}
                                                        className={"text-ds-fg-muted"}
                                                    />
                                                }
                                                className="h-10 w-10"
                                            />
                                        </div>
                                    </StackActionButton>
                                </StackItem>

                                <StackItem className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <div className="min-w-0">
                                        <StackTitle>{t("branding.name.title")}</StackTitle>
                                    </div>
                                    <Form
                                        of={organizationNameForm}
                                        onSubmit={(data) => actions.saveOrganizationName(data)}
                                        className="flex w-full flex-col gap-1 sm:w-auto sm:shrink-0"
                                    >
                                        <FormischField of={organizationNameForm} path={["name"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <Input
                                                        {...field.props}
                                                        value={field.input ?? ""}
                                                        onBlur={(event) => {
                                                            field.props.onBlur(event)
                                                            submitOrganizationNameIfDirty()
                                                        }}
                                                        placeholder={t("branding.name.placeholder")}
                                                        maxLength={ORGANIZATION_NAME_MAX_LENGTH}
                                                        size="md"
                                                        className="w-full sm:w-[260px]"
                                                        aria-invalid={field.errors !== null}
                                                    />
                                                    {field.errors && (
                                                        <FieldError
                                                            errors={field.errors.map((message) => ({
                                                                message,
                                                            }))}
                                                        />
                                                    )}
                                                </Field>
                                            )}
                                        </FormischField>
                                    </Form>
                                </StackItem>

                                <StackItem className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <div className="min-w-0">
                                        <StackTitle>{t("branding.workspaceUrl.title")}</StackTitle>
                                    </div>
                                    <StackActionButton className="w-full sm:w-auto sm:shrink-0">
                                        <InputGroup
                                            size="md"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={t("branding.workspaceUrl.currentAriaLabel")}
                                            aria-haspopup="dialog"
                                            onClick={actions.openWorkspaceUrlDialog}
                                            onKeyDown={(event) => {
                                                if (event.key !== "Enter" && event.key !== " ") {
                                                    return
                                                }
                                                event.preventDefault()
                                                actions.openWorkspaceUrlDialog()
                                            }}
                                            className="w-full cursor-pointer sm:w-[260px]"
                                        >
                                            <InputGroupAddon
                                                align="inline-start"
                                                className="text-ds-fg-subtle"
                                            >
                                                <span>{workspaceUrlPrefix}</span>
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                tabIndex={-1}
                                                aria-hidden="true"
                                                readOnly
                                                value={organizationData.slug ?? ""}
                                                className="pointer-events-none cursor-pointer px-0! caret-transparent"
                                            />
                                        </InputGroup>
                                    </StackActionButton>
                                </StackItem>
                            </Stack>
                        </div>

                        <section className="space-y-6" aria-labelledby={publicProfileHeadingId}>
                            <div className="space-y-2">
                                <h2
                                    id={publicProfileHeadingId}
                                    className="font-medium text-base text-ds-fg leading-none"
                                >
                                    {t("branding.publicProfile.heading")}
                                </h2>
                                <p className="text-ds-fg-muted text-sm leading-normal">
                                    {t("branding.publicProfile.description")}
                                </p>
                            </div>
                            <Stack>
                                {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
                                <StackItem
                                    id="tagline"
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <StackTitle>{t("branding.tagline.title")}</StackTitle>
                                        <StackDescription>
                                            {t("branding.tagline.description")}
                                        </StackDescription>
                                    </div>
                                    <Form
                                        of={taglineForm}
                                        onSubmit={(data) => actions.saveTagline(data)}
                                        className="flex shrink-0 flex-col gap-1"
                                    >
                                        <FormischField of={taglineForm} path={["tagline"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <Input
                                                        {...field.props}
                                                        value={field.input ?? ""}
                                                        onBlur={(event) => {
                                                            field.props.onBlur(event)
                                                            submitTaglineIfDirty()
                                                        }}
                                                        placeholder={t(
                                                            "branding.tagline.placeholder"
                                                        )}
                                                        maxLength={80}
                                                        size="md"
                                                        className="w-[260px]"
                                                        aria-invalid={field.errors !== null}
                                                    />
                                                    {field.errors && (
                                                        <FieldError
                                                            errors={field.errors.map((message) => ({
                                                                message,
                                                            }))}
                                                        />
                                                    )}
                                                </Field>
                                            )}
                                        </FormischField>
                                    </Form>
                                </StackItem>

                                {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
                                <StackItem
                                    id="website"
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <StackTitle>{t("branding.website.title")}</StackTitle>
                                        <StackDescription>
                                            {t("branding.website.description")}
                                        </StackDescription>
                                    </div>
                                    <Form
                                        of={websiteForm}
                                        onSubmit={(data) => actions.saveWebsite(data)}
                                        className="flex shrink-0 flex-col gap-1"
                                    >
                                        <FormischField of={websiteForm} path={["website"]}>
                                            {(field) => {
                                                const display = stripSchemePrefix(field.input ?? "")
                                                const setFromDisplay = (next: string) => {
                                                    const cleaned = stripSchemePrefix(next).slice(
                                                        0,
                                                        247
                                                    )
                                                    field.onChange(
                                                        cleaned === "" ? "" : `https://${cleaned}`
                                                    )
                                                }

                                                return (
                                                    <Field data-invalid={field.errors !== null}>
                                                        <InputGroup size="md" className="w-[260px]">
                                                            <InputGroupAddon
                                                                align="inline-start"
                                                                className="text-ds-fg-subtle"
                                                            >
                                                                <span>https://</span>
                                                            </InputGroupAddon>
                                                            <InputGroupInput
                                                                {...field.props}
                                                                type="text"
                                                                placeholder="example.com"
                                                                className="px-0!"
                                                                maxLength={247}
                                                                aria-invalid={field.errors !== null}
                                                                value={display}
                                                                onBlur={(event) => {
                                                                    field.props.onBlur(event)
                                                                    submitWebsiteIfDirty()
                                                                }}
                                                                onChange={(e) =>
                                                                    setFromDisplay(e.target.value)
                                                                }
                                                                onPaste={(e) => {
                                                                    e.preventDefault()
                                                                    const pasted =
                                                                        e.clipboardData.getData(
                                                                            "text"
                                                                        )
                                                                    const cleaned =
                                                                        stripSchemePrefix(pasted)
                                                                    const input = e.currentTarget
                                                                    const start =
                                                                        input.selectionStart ??
                                                                        display.length
                                                                    const end =
                                                                        input.selectionEnd ??
                                                                        display.length
                                                                    const nextDisplay =
                                                                        display.slice(0, start) +
                                                                        cleaned +
                                                                        display.slice(end)
                                                                    setFromDisplay(nextDisplay)
                                                                }}
                                                            />
                                                        </InputGroup>
                                                        {field.errors && (
                                                            <FieldError
                                                                errors={field.errors.map(
                                                                    (message) => ({
                                                                        message,
                                                                    })
                                                                )}
                                                            />
                                                        )}
                                                    </Field>
                                                )
                                            }}
                                        </FormischField>
                                    </Form>
                                </StackItem>

                                {/* biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation */}
                                <StackItem
                                    id="overview"
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0 space-y-0.5">
                                        <StackTitle>{t("branding.overview.title")}</StackTitle>
                                        <StackDescription>
                                            {t("branding.overview.description")}
                                        </StackDescription>
                                    </div>
                                    <StackActionButton className="shrink-0">
                                        <Button
                                            variant="outline"
                                            size="default"
                                            radius="full"
                                            onClick={() => {
                                                actions.openOverviewDialog()
                                            }}
                                        >
                                            {t("branding.overview.editAction")}
                                        </Button>
                                    </StackActionButton>
                                </StackItem>
                            </Stack>
                        </section>

                        <section className="space-y-6" aria-labelledby={visualIdentityHeadingId}>
                            <div className="space-y-2">
                                <h2
                                    id={visualIdentityHeadingId}
                                    className="font-medium text-base text-ds-fg leading-none"
                                >
                                    {t("branding.visualIdentity.heading")}
                                </h2>
                                <p className="text-ds-fg-muted text-sm leading-normal">
                                    {t("branding.visualIdentity.description")}
                                </p>
                            </div>
                            <InlineErrorBoundary componentName="OrganizationAppearanceStack">
                                <OrganizationAppearanceStack />
                            </InlineErrorBoundary>
                        </section>

                        {state.showOverviewDialog && <OverviewEditDialog />}

                        {state.showWorkspaceUrlDialog && <WorkspaceUrlDialog />}

                        {showOrgLogoCropper && orgLogoImageSrc && (
                            <ImageCropper
                                imageSrc={orgLogoImageSrc}
                                onSave={actions.handleLogoCropSave}
                                onCancel={actions.handleLogoCropCancel}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function WorkspaceUrlDialog() {
    const { t } = useTranslation("settings")
    const { state, actions } = useBrandingPage()
    const { workspaceUrlForm, workspaceUrlServerError } = state
    const workspaceUrlPrefix = getWorkspaceUrlPrefix()
    const workspaceUrlInputId = useId()

    const handleOpenChange = (open: boolean) => {
        if (!open) actions.closeWorkspaceUrlDialog()
    }

    return (
        <Dialog open={state.showWorkspaceUrlDialog} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader className="border-ds-surface-border border-b">
                    <DialogTitle>{t("branding.workspaceUrl.dialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("branding.workspaceUrl.dialogDescription")}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form of={workspaceUrlForm} onSubmit={(data) => actions.saveWorkspaceUrl(data)}>
                        <FormischField of={workspaceUrlForm} path={["slug"]}>
                            {(field) => (
                                <Field
                                    data-invalid={
                                        field.errors !== null || Boolean(workspaceUrlServerError)
                                    }
                                >
                                    <label htmlFor={workspaceUrlInputId} className="sr-only">
                                        {t("branding.workspaceUrl.dialogFieldLabel")}
                                    </label>
                                    <InputGroup size="md">
                                        <InputGroupAddon
                                            align="inline-start"
                                            className="text-ds-fg-subtle"
                                        >
                                            <span>{workspaceUrlPrefix}</span>
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field.props}
                                            id={workspaceUrlInputId}
                                            value={field.input ?? ""}
                                            onChange={(event) => {
                                                actions.clearWorkspaceUrlServerError()
                                                field.onChange(
                                                    normalizeOrganizationSlugInput(
                                                        event.target.value
                                                    )
                                                )
                                            }}
                                            maxLength={ORGANIZATION_SLUG_MAX_LENGTH}
                                            className="px-0!"
                                            aria-invalid={
                                                field.errors !== null ||
                                                Boolean(workspaceUrlServerError)
                                            }
                                        />
                                    </InputGroup>
                                    {field.errors ? (
                                        <FieldError
                                            errors={field.errors.map((message) => ({ message }))}
                                        />
                                    ) : (
                                        workspaceUrlServerError && (
                                            <FieldError>{workspaceUrlServerError}</FieldError>
                                        )
                                    )}
                                </Field>
                            )}
                        </FormischField>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogCancel onClick={actions.closeWorkspaceUrlDialog}>
                        {t("common:action.cancel")}
                    </DialogCancel>
                    <DialogAction
                        type="button"
                        disabled={workspaceUrlForm.isSubmitting}
                        onClick={() => {
                            void handleSubmit(workspaceUrlForm, actions.saveWorkspaceUrl)()
                        }}
                    >
                        {t("branding.workspaceUrl.updateAction")}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function getWorkspaceUrlPrefix(): string {
    if (typeof window === "undefined") return "/org/"
    return `${window.location.host}/org/`
}
