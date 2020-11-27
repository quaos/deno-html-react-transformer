import { DOMParser as DenoDomParser } from "./deps/deno_dom.ts";

globalThis.DOMParser = globalThis.DOMParser || DenoDomParser;

export namespace DOMConstants {
    export const ELEMENT_NODE = 1;
    export const ATTRIBUTE_NODE = 2;
    export const TEXT_NODE = 3;
    export const CDATA_SECTION_NODE = 4;
    export const ENTITY_REFERENCE_NODE = 5;
    export const ENTITY_NODE = 6;
    export const PROCESSING_INSTRUCTION_NODE = 7;
    export const COMMENT_NODE = 8;
    export const DOCUMENT_NODE = 9;
    export const DOCUMENT_TYPE_NODE = 10;
    export const DOCUMENT_FRAGMENT_NODE = 11;
    export const NOTATION_NODE = 12;
}
// console.log(
//     `DOCUMENT_NODE=${DOMConstants.DOCUMENT_NODE}\n`
//     + `ELEMENT_NODE=${DOMConstants.ELEMENT_NODE}\n`
//     + `TEXT_NODE=${DOMConstants.TEXT_NODE}\n`
// );


export const DOMParser = globalThis.DOMParser;
