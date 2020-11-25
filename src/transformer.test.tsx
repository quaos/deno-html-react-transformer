import { assertEquals } from "./deps/std.ts";
import { React } from "./deps/react.ts";

import type { TransformerContext } from "./context.ts";
import { Transformer, TransformerEvent } from "./transformer.ts";

Deno.test("test HTML string to React transform", () => {
  const expected = (
    <div>
      <h1>Test</h1>
      <p><a href="/xyz">LINK WARNING: Next Page</a></p>
    </div>
  );

  const source = `
  <div>
    <h1>Test</h1>
    <p><a href="/xyz">Next page</a></p>
    <script>console.log('XSS! You are PWNED!')</script>
  </div>
  `;

  const transformer = new Transformer();
  transformer.on(TransformerEvent.Element, (ctx: TransformerContext) => {
    if (ctx.source.nodeName === "a") {
      ctx.props.href=`/redirect?to=${ctx.props.href}`;
      ctx.children = (
        <span>External link: {ctx.children}</span>
      );
    }
  });
  transformer.on(TransformerEvent.Errors, (ctx: TransformerContext) => {
    ctx.errors.forEach(console.error);
  });
  const result = transformer.transform(source);
  
  assertEquals(result, expected);
});
