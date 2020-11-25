# Deno HTML to React Transformer

Tool for Transforming HTML/DOM to React element in Deno

## Warning

Do not forget to enforce XSS protection with libraries like ()[DOMPurify], even thought this module has some basic protections such as disabling scripts by default!

## Usage

```typescript
import {
  Transformer, TransformContext, TransformerEvent,
} from "https://deno.land/x/html_react_transformer@1.0.0/mod.ts";

const html = `<div>
  <h1>Test</h1>
  <p>&nbsp;&nbsp;Test HTML content</p>
</div>
`;

export const App: React.FC<{}> = ({ }) => {
  const transformer = new Transformer({
    // Optional (default: false)
    dangerouslyAllowScripts: false,
    // Optional (default: false)
    dangerouslyAllowIFrames: false,
  });
  transformer.on(TransformerEvent.Element, (ctx: TransformContext) => {
    if (ctx.sourceNode.nodeName === "a") {
      // If using React Router lib:
      ctx.element = Link;
      ctx.props.to = ctx.sourceNode.href;
      ctx.props.onClick = (evt) => interceptLinkClick(evt, ctx);
      ctx.children = (
        <span>External link: {ctx.children}</span>
      );
    }
  });
  transformer.on(TransformerEvent.Errors, (ctx: TransformContext) => {
    ctx.errors.forEach(console.error);
  });

  const result = transformer.transform(html);
  console.log(result);

  return result
} 

```

## Dependencies
* Deno version ^1.5.4
