import { EventEmitter } from "./deps/events.ts";
import { React } from "./deps/react.ts";

import { TransformerContext } from "./context.ts";
import { DOMConstants } from "./dom-polyfill.ts";

export enum TransformerEvent {
    Element = "element",
    Text = "text",
    Errors = "error",
    MaxDepthReached = "maxDepthReached",
}

export class Transformer {
    dangerouslyAllowScripts: boolean = false;
    dangerouslyAllowIFrames: boolean = false;
    maxDepth?: number;
    eventEmitter: EventEmitter;

    public constructor(props?: Partial<Transformer>) {
        this.eventEmitter = new EventEmitter();
        (props) && Object.assign(this, props);
    }

    public on(eventName: TransformerEvent, listener: (ctx: TransformerContext) => void): void {
        this.eventEmitter.on(eventName as string, listener);
    }

    public transform(source: Node | string): React.ReactNode {
        try {
            if (typeof source === "string") {
                const doc = new DOMParser().parseFromString(source, "text/html");
                const rootElement = (doc)
                    ? (doc.body || doc)
                    : undefined;
                if (!rootElement) {
                    return null;
                }
                source = rootElement;
            };
            // console.log("Transforming:", source);

            return this.walkNode(source as Node, 0)
        } catch (err) {
            const ctx = <TransformerContext>{
                source: source,
                component: "",
                props: {},
                depth: 0,
                errors: [err],
            };
            this.eventEmitter.emit(TransformerEvent.Errors, ctx);

            throw err;
        }
    }

    walkNode(source: Node, level: number): React.ReactNode {
        const tagName = source.nodeName.toLowerCase();

        const ctx = <TransformerContext>{
            source: source,
            component: tagName,
            props: {},
            depth: level,
            errors: [],
        };
        if ((this.maxDepth !== undefined) && (level >= this.maxDepth)) {
            this.eventEmitter.emit(TransformerEvent.MaxDepthReached, ctx);
            return null;
        }

        if (tagName === "script") {
            if (!this.dangerouslyAllowScripts) {
                throw new Error(`Blocked script tag: <${source.nodeName}>`);
            }
        }
        if (tagName === "iframe") {
            if (!this.dangerouslyAllowIFrames) {
                throw new Error(`Blocked frame tag: <${source.nodeName}>`);
            }
        }

        let isTransparent = false;
        let shouldWalkChildren = false;
        if (source.nodeType === DOMConstants.ELEMENT_NODE) {
            // HACK
            const sourceElement = <Element><unknown>source;

            Object.assign(ctx.props, sourceElement.attributes);
            isTransparent = ([
                "",
                "body",
            ].indexOf(tagName) >= 0);
            shouldWalkChildren = true;
        } else if ((source.nodeType === DOMConstants.DOCUMENT_NODE)
            || (source.nodeType === DOMConstants.DOCUMENT_FRAGMENT_NODE)) {
            // console.log(`Found document/fragment`);
            ctx.component = "";
            isTransparent = true;
            shouldWalkChildren = true;
        } else {
            // console.log(`Found node <${source.nodeName}> (type: ${source.nodeType})`);
            const content = this.getNodeContent(source);
            // console.log(`${" ".repeat(level)}"${content}"`);
            if (content) {
                ctx.children = content;
                this.eventEmitter.emit(TransformerEvent.Text, ctx);
            }
            return content;
        }
        this.eventEmitter.emit(TransformerEvent.Element, ctx);
        if (shouldWalkChildren) {
            if ((source.childNodes) && (source.childNodes.length >= 1)) {
                ctx.children = [];
                for (let i = 0; i < source.childNodes.length; i++) {
                    try {
                        const sourceChild = source.childNodes[i];
                        // console.log(`Found child node [${i}] => `, child);
                        const child = this.walkNode(sourceChild, level + 1);
                        (child !== undefined) && (child !== null) && ctx.children.push(child);
                    } catch (err) {
                        ctx.errors.push(err);
                    }
                }
            }
        }
        if (ctx.errors.length >= 1) {
            this.eventEmitter.emit(TransformerEvent.Errors, ctx);
        }

        if (isTransparent) {
            const fragment = React.createElement(React.Fragment, {}, ...ctx.children);
            // console.log(`<#${tagName}> children=`, ctx.children, " => ", fragment);
            return fragment;
        }

        const element = React.createElement(ctx.component!, ctx.props!, ...ctx.children);
        // console.log(`<${ctx.component}> children=`, ctx.children, " => ", element);
        return element
    }

    getNodeContent(source: Node): string | undefined {
        let s = undefined;
        switch (source.nodeType) {
            case DOMConstants.TEXT_NODE:
                s = `${(<Text><unknown>source).data}`;
                break;
            case DOMConstants.CDATA_SECTION_NODE:
                s = `${(<Text><unknown>source).data}`;
                break;
            default:
                break;
        }

        return s
    }
}
