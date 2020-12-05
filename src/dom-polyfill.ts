// HACK: Workaround for Top-Level-Await-Imports in browser
export async function useDOMParser() {
    const prom = ("Deno" in window)
        ? import("./deps/deno_dom.ts")
            .then(denoDom => {
                globalThis.DOMParser = globalThis.DOMParser || denoDom.DOMParser;
                return true
            })
        : Promise.resolve(true);

    return await prom
}

export const DOMConstants = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12,
};
