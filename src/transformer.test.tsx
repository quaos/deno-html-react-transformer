// import { assertEquals } from "./deps/std.ts";
import { React } from "./deps/react.ts";

import type { TransformerContext } from "./context.ts";
import { Transformer, TransformerEvent } from "./transformer.ts";

interface ExternalLinkProps {
  href?: string;
}

const ExternalLink = (props: React.PropsWithChildren<ExternalLinkProps>) => {
  let { href, children } = props;

  return (
    <a href={`/redirect/to/${href}`}><span>EXTERNAL LINK WARNING: {children}</span></a>
  )
}

// Deno.test("test HTML string to React transform", () => {
const expected = (
  <div>
    <h1>Test</h1>
    <p><ExternalLink href="/redirect/to/xyz">EXTERNAL LINK WARNING: Next Page</ExternalLink></p>
  </div>
);

const source = `
  <div>
    <h1>Test</h1>
    <p><a href="xyz">Next page</a></p>
    <script>console.log('XSS! You are PWNED!')</script>
    <iframe src="http://www.dangerous.org/PWNED"></iframe>
  </div>
  `;

const transformer = new Transformer();
transformer.on(TransformerEvent.Initialized, (ctx: TransformerContext) => {
  console.log("Transformer Initialized:", transformer);
});

const traceBuf: string[] = [];
transformer.on(TransformerEvent.Element, (ctx: TransformerContext) => {
  traceBuf.push(`${" ".repeat(ctx.depth)}<${ctx.component}>`);
  if (ctx.component === "a") {
    ctx.component = ExternalLink;
  }
});
transformer.on(TransformerEvent.Text, (ctx: TransformerContext) => {
  traceBuf.push(`${" ".repeat(ctx.depth)}${ctx.children}`);
});
transformer.on(TransformerEvent.Errors, (ctx: TransformerContext) => {
  ctx.errors.forEach(console.error);
});
(async function () {
  await transformer.init();
  const result = transformer.transform(source);

  console.log("Trace:", traceBuf.join("\n"));
  console.log("Result:", Deno.inspect(result, { colors: true, depth: 99 }));
})();

//   assertEquals(result, expected);
// });
