import { Parser } from "./deps/htmlparser2.ts";

export interface ParserContext {
    rootNode: Node;
    currentNode: Node;
    parent?: ParserContext;
};

const source = `
<div>
  <h1>Test</h1>
  <p><a href="/xyz">Next page</a></p>
</div>
`;

let ctx: ParserContext | undefined = undefined;

const parser = new Parser({
    onopentag(name: string, attribs: any) {
        const node = document.createElement(name);
        node.setAttributes(attribs);
        if (ctx) {
            ctx = <ParserContext>{
                rootNode: ctx.rootNode,
                currentNode: node,
                parent: ctx,
            };
        } else {
            document.appendChild(node);
            ctx = <ParserContext>{ rootNode: node, currentNode: node };
        }
    },
    ontext(text: string) {
        if (!ctx) {
            throw new Error("No ParserContext initialized");
        }
        ctx.currentNode.appendChild(document.createTextNode(text))
    },
    onclosetag(tagname) {
        if (!ctx) {
            throw new Error("No ParserContext initialized");
        }
        if (ctx.currentNode.nodeName !== tagName) {
            throw new Error(`Tags mismatch: <${ctx.currentNode.nodeName}> ... </${tagName}>`);
        }
        ctx = ctx.parent;
    },
    onend() {
        console.log("Done");
    },
}, { decodeEntities: true });
parser.write(source);
parser.end();

console.log("result:", document);
