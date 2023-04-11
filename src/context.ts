import React, { DynamicComponent } from "./deps/react.ts";

export interface TransformerContext {
    children?: React.ReactNode[];
    component: DynamicComponent | null;
    depth: number;
    errors: Error[];
    key?: string;
    props: Record<string, unknown>;
    source: Node | null;
}
