interface RequestModalDataIdentity {
    reqNumber: string
}

export function getActiveModalRequestData<TRequest extends RequestModalDataIdentity>(
    requestData: TRequest | null,
    openRequestNumber: string | null | undefined
): TRequest | null {
    if (!requestData || !openRequestNumber) return null

    return requestData.reqNumber === openRequestNumber ? requestData : null
}
