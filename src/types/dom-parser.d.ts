declare global {
    interface HTMLDocument {}

    class DOMParser {
        parseFromString(source: string, mimeType: string): HTMLDocument | null;
    }
}

export {}
