import type { StripeElementsOptions } from "@stripe/stripe-js"

export const STRIPE_APPEARANCE: StripeElementsOptions["appearance"] = {
    theme: "stripe",
    variables: {
        fontFamily: "Inter, system-ui, sans-serif",
        borderRadius: "6px",
        colorPrimary: "#1E3FDA",
        colorText: "#171717",
        colorTextPlaceholder: "#8f8f8f",
        colorBackground: "#ffffff",
        colorDanger: "#b91c1c",
        spacingGridRow: "16px",
    },
    rules: {
        ".Label": {
            fontSize: "13px",
            fontWeight: "500",
            lineHeight: "1.2",
            color: "#171717",
            marginBottom: "8px",
        },
        ".Input": {
            border: "1px solid #e6e6e6",
            padding: "10px 14px",
            fontSize: "14px",
            fontWeight: "400",
            lineHeight: "18px",
            color: "#171717",
            boxShadow: "none",
            transition: "border-color 150ms ease, box-shadow 150ms ease",
        },
        ".Input:hover": {
            borderColor: "#c9c9c9",
        },
        ".Input:focus": {
            borderColor: "#a8a8a8",
            boxShadow: "0 0 0 3px rgba(0, 0, 0, 0.1)",
            outline: "none",
        },
        ".Input--invalid": {
            borderColor: "#b91c1c",
            boxShadow: "0 0 0 3px rgba(185, 28, 28, 0.15)",
        },
        ".Input--invalid:focus": {
            borderColor: "#b91c1c",
            boxShadow: "0 0 0 3px rgba(185, 28, 28, 0.15)",
        },
        ".Error": {
            fontSize: "12px",
            fontWeight: "500",
            color: "#b91c1c",
            marginTop: "6px",
        },
    },
}
