import { React } from "./deps/react.ts";

export interface TransformerContext {
    source: Node;
    component: any;
    props: Record<string, any>;
    children?: React.ReactNode;
    depth: number;
    errors: Error[];
}
