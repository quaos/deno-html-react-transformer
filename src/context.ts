import { React } from "./deps/react.ts";

export interface TransformerContext {
    source: Node;
    component: React.ReactNode;
    props: Record<string, any>;
    children?: React.ReactNode;
    depth: number;
    errors: Error[];
}
