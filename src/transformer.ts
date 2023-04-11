import { EventEmitter } from "./deps/events.ts";
import DefaultReact, { DynamicComponent } from "./deps/react.ts";

import { TransformerContext } from "./context.ts";
import { DOMConstants, useDOMParser } from "./dom-parser.polyfill.ts";
import React from "./deps/react.ts";

// HACK: Workaround for React typings
// interface ReactUseEffectCallbackFunc {
//     (): any;
// }
interface ReactInstanceType {
    createElement: typeof DefaultReact.createElement; // (component: DynamicComponent, props: any, ...children: DefaultReact.ReactNode[]): DefaultReact.ReactNode;
    Fragment: typeof DefaultReact.Fragment;
    useEffect: typeof DefaultReact.useEffect; // (callback: ReactUseEffectCallbackFunc, deps: any[]): any;
    useMemo: typeof DefaultReact.useMemo;
    useRef: typeof DefaultReact.useRef;
    useState: typeof DefaultReact.useState; // <T>(st: T): any;
}

export enum TransformerEvent {
    Initialized = "initialized",
    Element = "element",
    Text = "text",
    Error = "error",
    MaxDepthReached = "maxDepthReached",
}

export interface TransformerComponentProps {
    loadingComponent?: DefaultReact.ReactNode;
    onError?: (err: Error) => void;
    source: string | Node;
}

export type TransformerComponent = DefaultReact.ComponentType<TransformerComponentProps>;

export interface TransformerType {
    getComponent(React?: ReactInstanceType): TransformerComponent;
    transform(source: Node | string, React?: ReactInstanceType): DefaultReact.ReactNode;
}

export class Transformer extends EventEmitter implements TransformerType {
    dangerouslyAllowScripts = false;
    dangerouslyAllowIFrames = false;
    maxDepth?: number;
    // eventEmitter: EventEmitter;
    initState = false;

    constructor(props?: Partial<Transformer>) {
        super();
        // this.eventEmitter = new EventEmitter();
        props && Object.assign(this, props);
    }

    // on(eventName: TransformerEvent, listener: (ctx: TransformerContext) => void): void {
    //     this.eventEmitter.on(eventName as string, listener);
    // }

    async init() {
        try {
            this.initState = await useDOMParser();
            if (!this.initState) {
                throw new Error("Transformer initialization failed");
            }
            const initCtx = <TransformerContext>{
                props: {},
                errors: <Error[]>[],
            };
            this.emit(TransformerEvent.Initialized, initCtx);
        } catch (err) {
            const errCtx = <TransformerContext>{
                props: {},
                errors: [err],
            };
            this.emit(TransformerEvent.Error, errCtx);
            throw err;
        }
    }

    /**
     * Supply your own React instance here
     * if you face "Invalid hook call" or other errors
     * relating to redundant React instances 
     */
    getComponent(
        React: ReactInstanceType = DefaultReact,
    ): TransformerComponent {
        return ({ loadingComponent, onError, source }: TransformerComponentProps) => {
            const [isReady, setIsReady] = React.useState(this.initState);
            const errorsRef = React.useRef<Error[]>([]);

            const collectError = (err: Error) => {
                errorsRef.current.push(err);
            }

            React.useEffect(() => {
                (async () => {
                    if (isReady) {
                        return;
                    }

                    errorsRef.current = [];
                    try {
                        await this.init();
                        setIsReady(this.initState);
                    } catch (err) {
                        console.error(err);
                        collectError(err);
                        onError?.(err as Error);
                    }
                })();

                // cleanup
                return () => {};
            }, [isReady]);

            const [transformedNode, setTransformedNode] = React.useState<DefaultReact.ReactNode>(null);
            React.useEffect(() => {
                if (!isReady) {
                    return;
                }

                errorsRef.current = [];
                this.on(TransformerEvent.Error, collectError);
                const transformResult = this.transform(source, React);
                this.off(TransformerEvent.Error, collectError);
                onError != null && errorsRef.current.forEach(onError);

                if (transformResult != null
                    && typeof transformResult === "object"
                    && "type" in transformResult) {
                    setTransformedNode(transformResult);
                }

                // Wrap node in Fragment
                setTransformedNode(React.createElement(
                    React.Fragment,
                    {},
                    transformResult
                ));
            }, [isReady, source]);

            return React.createElement(
                React.Fragment,
                {},
                (isReady ? transformedNode : loadingComponent) ?? null
            );
        }
    }

    transform(
        source: Node | string,
        React: ReactInstanceType = DefaultReact,
    ): DefaultReact.ReactNode {
        let sourceNode: Node | null = null
        try {
            if (typeof source === "string") {
                const doc = new globalThis.DOMParser().parseFromString(source, "text/html");
                const rootElement = (doc)
                    ? (doc.body || doc)
                    : undefined;
                if (!rootElement) {
                    return null;
                }
                sourceNode = rootElement;
            } else {
                sourceNode = source
            }

            return this.walkNode(sourceNode, 0, React)
        } catch (err) {
            const ctx: TransformerContext = {
                component: null,
                source: sourceNode,
                props: {},
                depth: 0,
                errors: [err],
            };
            this.emit(TransformerEvent.Error, ctx);

            throw err;
        }
    }

    protected walkNode(
        source: Node,
        level: number,
        React: ReactInstanceType,
        key?: string
    ): DefaultReact.ReactNode {
        const tagName = source.nodeName.toLowerCase();

        const ctx: TransformerContext = {
            component: tagName as DynamicComponent,
            depth: level,
            errors: [],
            key,
            props: {},
            source: source,
        };
        if ((this.maxDepth !== undefined) && (level >= this.maxDepth)) {
            this.emit(TransformerEvent.MaxDepthReached, ctx);
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
            const sourceElement = source as unknown as Element;
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
            ctx.component = null;
            isTransparent = true;
            shouldWalkChildren = true;
        } else {
            const content = this.getNodeContent(source);
            if (content) {
                ctx.children = [content];
                this.emit(TransformerEvent.Text, ctx);
            }
            return content;
        }
        if (shouldWalkChildren) {
            if (source.childNodes && source.childNodes.length >= 1) {
                ctx.children = [];
                for (let i = 0; i < source.childNodes.length; i++) {
                    try {
                        const sourceChild = source.childNodes[i];
                        const child = this.walkNode(sourceChild, level + 1, React, String(i));
                        if (child != null) {
                            ctx.children.push(child);
                        }
                    } catch (err) {
                        ctx.errors.push(err);
                    }
                }
            }
        }
        if (ctx.errors.length >= 1) {
            this.emit(TransformerEvent.Error, ctx);
        }
        // Predefined transformation rules
        if (ctx.props) {
            if (ctx.props.class) {
                ctx.props.className = ctx.props.class;
                delete ctx.props.class;
            }
        }
        this.emit(TransformerEvent.Element, ctx);

        if (isTransparent) {
            const fragment = React.createElement(DefaultReact.Fragment, {}, ctx.children);
            return fragment;
        }

        const propsWithKey = {
            ...ctx.props,
            key: ctx.key,
        };

        const elementArgs: [DynamicComponent, any, ...DefaultReact.ReactNode[]] = [ctx.component!, propsWithKey];
        if (ctx.children) {
            if (Array.isArray(ctx.children) && typeof ctx.children[Symbol.iterator] === 'function') {
                for (const child of ctx.children) {
                    if (child != null) {
                        elementArgs.push(child);
                    }
                }
            } else {
                elementArgs.push(ctx.children);
            }
        }
        const element = React.createElement.apply(React, elementArgs);

        return element
    }

    protected getNodeContent(source: Node): string | undefined {
        let s = undefined;
        switch (source.nodeType) {
            case DOMConstants.TEXT_NODE:
                s = `${(source as unknown as Text).data}`;
                break;
            case DOMConstants.CDATA_SECTION_NODE:
                s = `${(source  as unknown as CDATASection).data}`;
                break;
            default:
                break;
        }

        return s
    }
}
