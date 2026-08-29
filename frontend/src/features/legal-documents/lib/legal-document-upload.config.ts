export const LEGAL_DOCUMENT_FILE_CONFIG = {
    accept: {
        "application/pdf": [".pdf"],
    },
    maxSize: 25 * 1024 * 1024,
    maxFiles: 10,
    acceptedFormats: ["PDF"] as const,
    description: "PDF documents only",
    errorMessages: {
        oversize: "Each file must be 25 MB or smaller.",
        wrongFormat: "Only PDF files are accepted.",
        tooMany: "You can upload up to 10 files at once.",
    },
} as const
