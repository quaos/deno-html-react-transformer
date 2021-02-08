import { EventEmitter } from "./deps/events.ts";
import { React as DefaultReact } from "./deps/react.ts";

import { TransformerContext } from "./context.ts";
import { DOMConstants, useDOMParser } from "./dom-polyfill.ts";

export enum TransformerEvent {
    Initialized = "initialized",
    Element = "element",
    Text = "text",
    Errors = "error",
    MaxDepthReached = "maxDepthReached",
}

export interface TransformerComponentProps {
    source: string | Node;
}

// HACK: Workaround for React typings
interface ReactInstanceProps {
    createElement(component: any, props: any, ...children: any): DefaultReact.ReactNode;
    useState<T>(st: T): any;
    useEffect(callback: ReactUseEffectCallbackFunc, deps: any[]): any;
}
interface ReactUseEffectCallbackFunc {
    (): any;
}

export interface TransformerComponent {
    (props: TransformerComponentProps): DefaultReact.ReactNode;
}

export class Transformer {
    dangerouslyAllowScripts: boolean = false;
    dangerouslyAllowIFrames: boolean = false;
    maxDepth?: number;
    eventEmitter: EventEmitter;
    initState: boolean = false;

    public constructor(props?: Partial<Transformer>) {
        this.eventEmitter = new EventEmitter();
        (props) && Object.assign(this, props);
    }

    public on(eventName: TransformerEvent, listener: (ctx: TransformerContext) => void): void {
        this.eventEmitter.on(eventName as string, listener);
    }

    public async init() {
        try {
            this.initState = await useDOMParser();
            if (!this.initState) {
                throw new Error("Transformer initialization failed");
            }
            const initCtx = <TransformerContext>{
                component: "",
                props: {},
                errors: <Error[]>[],
            };
            this.eventEmitter.emit(TransformerEvent.Initialized, initCtx);
        } catch (err) {
            const errCtx = <TransformerContext>{
                component: "",
                props: {},
                errors: [err],
            };
            this.eventEmitter.emit(TransformerEvent.Errors, errCtx);
            throw err;
        }
    }

    public transform(
        source: Node | string,
        React: ReactInstanceProps = DefaultReact,
    ): DefaultReact.ReactNode {
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
            }

            return this.walkNode(source as Node, 0, React)
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

    /**
     * Supply your own React instance here
     * if you face "Invalid hook call" or other errors
     * relating to redundant React instances 
     */

    public getComponent(
        React: ReactInstanceProps = DefaultReact,
    ): TransformerComponent {
        return ({ source }: TransformerComponentProps) => {
            let [transformerReady, setTransformerReady] = React.useState<boolean>(this.initState);
            React.useEffect(() => {
                if (!transformerReady) {
                    this.init().then(() => setTransformerReady(this.initState));
                }

                return () => {
                    // cleanup
                }
            }, [transformerReady]);

            return (transformerReady) ? this.transform(source, React) : null
        }
    }

    walkNode(
        source: Node,
        level: number,
        React: ReactInstanceProps,
    ): any {
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
            Array.from(sourceElement.attributes)
                .forEach((attrNode: Attr) => {
                    ctx.props[attrNode.name] = attrNode.value;
                });
            isTransparent = ([
                "",
                "body",
            ].indexOf(tagName) >= 0);
            shouldWalkChildren = true;
        } else if ((source.nodeType === DOMConstants.DOCUMENT_NODE)
            || (source.nodeType === DOMConstants.DOCUMENT_FRAGMENT_NODE)) {
            ctx.component = "";
            isTransparent = true;
            shouldWalkChildren = true;
        } else {
            const content = this.getNodeContent(source);
            if (content) {
                ctx.children = content;
                this.eventEmitter.emit(TransformerEvent.Text, ctx);
            }
            return content;
        }
        if (shouldWalkChildren) {
            if ((source.childNodes) && (source.childNodes.length >= 1)) {
                ctx.children = [];
                for (let i = 0; i < source.childNodes.length; i++) {
                    try {
                        const sourceChild = source.childNodes[i];
                        const child = this.walkNode(sourceChild, level + 1, React);
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
        this.eventEmitter.emit(TransformerEvent.Element, ctx);

        if (isTransparent) {
            const fragment = React.createElement(DefaultReact.Fragment, {}, ...ctx.children);
            return fragment;
        }

        const element = React.createElement(ctx.component!, ctx.props!, ...ctx.children);
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
