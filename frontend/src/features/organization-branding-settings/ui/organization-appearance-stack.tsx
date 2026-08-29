import { useId } from "react"
import { useTranslation } from "react-i18next"
import {
    getOrganizationBrandColorOption,
    getOrganizationFontOption,
    ORGANIZATION_BRAND_COLOR_OPTIONS,
    ORGANIZATION_FONT_OPTIONS,
    organizationBrandColorSchema,
    organizationFontIdSchema,
} from "@/entities/organization"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/shared/ui/select"
import {
    Stack,
    StackActionButton,
    StackDescription,
    StackItem,
    StackTitle,
} from "@/shared/ui/stack"
import { useBrandingPage } from "../model/branding-page.provider"

const selectTriggerClassName = "w-[200px]"

export function OrganizationAppearanceStack() {
    const { t } = useTranslation("settings")
    const brandColorSelectId = `${useId()}-organization-brand-color-select`
    const fontSelectId = `${useId()}-organization-font-select`
    const { state, actions } = useBrandingPage()
    const { organizationData } = state
    const selectedBrandColor = getOrganizationBrandColorOption(organizationData.brandColor)
    const selectedFont = getOrganizationFontOption(organizationData.font)

    const handleBrandColorValueChange = (value: string) => {
        const result = safeParseSchema(organizationBrandColorSchema, value)
        if (!result.success || result.data === selectedBrandColor.id) return

        actions.saveOrganizationBrandColor(result.data)
    }

    const handleFontValueChange = (value: string) => {
        const result = safeParseSchema(organizationFontIdSchema, value)
        if (!result.success || result.data === selectedFont.id) return

        actions.saveOrganizationFont(result.data)
    }

    return (
        <Stack>
            <StackItem className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                    <StackTitle>{t("branding.brandColor.title")}</StackTitle>
                    <StackDescription>{t("branding.brandColor.description")}</StackDescription>
                </div>
                <StackActionButton className="flex shrink-0 items-center gap-2">
                    <Select
                        value={selectedBrandColor.id}
                        onValueChange={handleBrandColorValueChange}
                    >
                        <SelectTrigger
                            id={brandColorSelectId}
                            size="md"
                            className={selectTriggerClassName}
                            aria-label={t("branding.brandColor.ariaLabel")}
                        >
                            <BrandColorOption
                                name={selectedBrandColor.name}
                                color={selectedBrandColor.id}
                            />
                        </SelectTrigger>
                        <SelectContent
                            align="end"
                            className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                        >
                            {ORGANIZATION_BRAND_COLOR_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    <BrandColorOption name={option.name} color={option.id} />
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </StackActionButton>
            </StackItem>

            <StackItem className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                    <StackTitle>{t("branding.font.title")}</StackTitle>
                    <StackDescription>{t("branding.font.description")}</StackDescription>
                </div>
                <StackActionButton className="flex shrink-0 items-center gap-2">
                    <Select value={selectedFont.id} onValueChange={handleFontValueChange}>
                        <SelectTrigger
                            id={fontSelectId}
                            size="md"
                            className={selectTriggerClassName}
                            aria-label={t("branding.font.ariaLabel")}
                        >
                            <span className="min-w-0 truncate">{selectedFont.name}</span>
                        </SelectTrigger>
                        <SelectContent
                            align="end"
                            className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                        >
                            {ORGANIZATION_FONT_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    <span className="min-w-0 truncate">{option.name}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </StackActionButton>
            </StackItem>
        </Stack>
    )
}

function BrandColorOption({ name, color }: { name: string; color: string }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />
            <span className="min-w-0 truncate">{name}</span>
        </span>
    )
}
