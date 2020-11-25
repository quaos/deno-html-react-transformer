import { EventEmitter } from "./deps/events.ts";
import { DOMParser } from "./deps/deno_dom.ts";
import { React } from "./deps/react.ts";

import { TransformerContext } from "./context.ts";

export enum TransformerEvent {
    Element = "element",
    Errors = "error",
}

export class Transformer {
    dangerouslyAllowScripts: boolean = false;
    dangerouslyAllowIFrames: boolean = false;
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
            if (!("nodeType" in source)) {
                const parser = new DOMParser();
                source = parser.parseFromString(source, "text/html") as Node;
            };
            
            return this.walkNode(source, 0)
        } catch (err) {
            const ctx = <TransformerContext> {
                source: source,
                component: "",
                props: {},
                errors: [err],
            };
            this.eventEmitter.emit(TransformerEvent.Errors, ctx);

            throw err;
        }
    }

    walkNode(source: Node, level: number): React.ReactNode {
        const ctx = <TransformerContext> {
            source: source,
            component: source.nodeName,
            props: source.attributes,
            errors: [],
        };
        if (source.nodeName === "script") {
            if (!this.dangerouslyAllowScripts) {
                throw new Error(`Blocked script tag: <${source.nodeName}>`);
            }
        }
        if (source.nodeName === "iframe") {
            if (!this.dangerouslyAllowIFrames) {
                throw new Error(`Blocked frame tag: <${source.nodeName}>`);
            }
        }
        this.eventEmitter.emit(TransformerEvent.Element, ctx);

        if ((source.children) && (source.children.length >= 1)) {
            ctx.children = source.children.map((child) => {
                try {
                    return this.walkNode(child, level + 1);
                } catch (err) {
                    ctx.errors.push(err);
                    return null
                }
            });
        }
        if (ctx.errors.length >= 1) {
            this.eventEmitter.emit(TransformerEvent.Errors, ctx);
        }

        return React.createElement(ctx.component!, ctx.props!, ctx.children)
    }
    
}
