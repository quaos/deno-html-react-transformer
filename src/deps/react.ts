export { default as React } from "https://esm.sh/[react,react-dom]/react?dev&no-check";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}
