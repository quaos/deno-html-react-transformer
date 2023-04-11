# Deno HTML to React Transformer

Tool for Transforming HTML/DOM to React element in Deno


## WARNING

Do not forget to enforce XSS protection with libraries like [DOMPurify](https://github.com/cure53/DOMPurify), even thought this module provides some basic protections such as blocking `<script>` and `<iframe>` tags by default!


## Usage

```typescript
import {
  Transformer, TransformContext, TransformerEvent,
} from "https://deno.land/x/html_react_transformer@v1.2.0/mod.ts";

const html = `<div>
  <h1>Test</h1>
  <p>&nbsp;&nbsp;Test HTML content</p>
</div>
`;

export const App = ({ }) => {
  const Renderer = React.useMemo(() => {
      const transformer = new Transformer({
        // Optional (default: false)
        dangerouslyAllowScripts: false,
        // Optional (default: false)
        dangerouslyAllowIFrames: false,
        // Optional (default: undefined)
        maxDepth: 64,
      });
      transformer.on(TransformerEvent.Element, (ctx: TransformContext) => {
        if (ctx.component === "a") {
          // If using React Router lib:
          ctx.component = Link;
          let { href } = ctx.props;
          ctx.props = {
            to: href,
            onClick = (evt) => interceptLinkClick(evt, ctx),
          };
          ctx.children = (
            <span>External link: {ctx.children}</span>
          );
        }
      });
      transformer.on(TransformerEvent.Errors, (ctx: TransformContext) => {
        ctx.errors.forEach(console.error);
      });

      /**
       * Supply your own React instance here
       * if you face "Invalid hook call" or other errors
       * relating to redundant React instances 
       */
      return transformer.getComponent(React);
  });

  return (
    <Renderer source={html} />
  )
} 
```

## Dependencies

* Deno version ^1.32
* React version ^18.0
* [deno_dom](https://deno.land/x/deno_dom@v0.1.38) (for testing from CLI)


## Testing

***yarn***
```shell
yarn test
```

***npm***
```shell
npm run test
```


## Running Example

***yarn***
```shell
yarn example:build && yarn example:run
```

***npm***
```shell
npm run example:build && npm run example:run
```
