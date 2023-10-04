export const sanitizeUri = (uri: string): string => {
    return uri.replace('file://', '')
}