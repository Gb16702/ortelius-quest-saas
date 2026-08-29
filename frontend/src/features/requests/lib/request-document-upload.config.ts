export const REQUEST_DOCUMENT_FILE_CONFIG = {
    accept: {
        "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    acceptedFormats: ["PDF"] as const,
    description: "PDF documents only",
} as const
