// import { assertEquals } from "./deps/std.ts";
// import { DOMParser as DenoDomParser } from "./deps/deno_dom.ts";
import { React } from "./deps/react.ts";

console.log("React.Fragment=", React.Fragment );
console.log("React.createFragment=", React.createFragment );

// HACK: Polyfill DOMParser
// console.log("In transformer.test.tsx: globalThis.DOMParser=", globalThis.DOMParser );
// globalThis.DOMParser = globalThis.DOMParser || DenoDomParser;
// console.log("In transformer.test.tsx: Polyfilled globalThis.DOMParser=", globalThis.DOMParser );
// const parser = new globalThis.DOMParser();
// console.log("In transformer.test.tsx: parser instance:", parser);

import type { TransformerContext } from "./context.ts";
import { Transformer, TransformerEvent } from "./transformer.ts";

// Deno.test("test HTML string to React transform", () => {
  // const expected = (
  //   <div>
  //     <h1>Test</h1>
  //     <p><a href="/xyz">LINK WARNING: Next Page</a></p>
  //   </div>
  // );

  const source = `
  <div>
    <h1>Test</h1>
    <p><a href="/xyz">Next page</a></p>
    <script>console.log('XSS! You are PWNED!')</script>
    <iframe src="http://www.danger.com/PWNED"></iframe>
  </div>
  `;

  const transformer = new Transformer();
  const traceBuf: string[] = [];
  transformer.on(TransformerEvent.Element, (ctx: TransformerContext) => {
    traceBuf.push(`${" ".repeat(ctx.depth)}<${ctx.component}>`);
    if (ctx.source.nodeName === "a") {
      ctx.props.href=`/redirect?to=${ctx.props.href}`;
      ctx.children = (
        <span>External link: {ctx.children}</span>
      );
    }
  });
  transformer.on(TransformerEvent.Text, (ctx: TransformerContext) => {
    traceBuf.push(`${" ".repeat(ctx.depth)}${ctx.children}`);
  });
  transformer.on(TransformerEvent.Errors, (ctx: TransformerContext) => {
    ctx.errors.forEach(console.error);
  });
  const result = transformer.transform(source);
  
  console.log("Trace:", traceBuf.join("\n"));
  console.log("Result:", result);
  // assertEquals(result, expected);
// });
