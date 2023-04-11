import React, { useMemo, useState } from "./deps/react.ts";

import type { TransformerContext } from "@src/context.ts";
import { Transformer, TransformerEvent } from "@src/transformer.ts";
import type { TransformerComponentProps } from "@src/transformer.ts";

const styles = {
  logo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "192px",
    height: "192px",
  },
  error: {
    backgroundColor: "red",
    color: "white",
    fontWeight: "bold",
  },
};

interface ExternalLinkProps {
  href?: string;
  target?: string;
}

const ExternalLink = (props: React.PropsWithChildren<ExternalLinkProps>) => {
  const { href, target, children } = props;

  return (
    <a href={`/redirect/to/${href}`} target={target}>
      EXTERNAL LINK WARNING: {children}{" "}
      <i className="fa fa-external-link-alt"></i>
    </a>
  );
};

const sourceHtml = `
<div>
  <h1>Test</h1>
  <p><span class="lead-word">T</span>esting HTML <i class="fa fa-coffee"></i></p>
  <p><a href="xyz" target="_blank"> Next page</a></p>
  <script>console.log('XSS! You are PWNED!')</script>
  <iframe src="http://www.dangerous.org/PWNED"></iframe>
</div>
`;

// deno-lint-ignore no-empty-interface
export interface AppProps {}

const App = ({}: AppProps) => {
  const [error, setError] = useState<Error | undefined>();

  const Renderer = useMemo<React.ComponentType<TransformerComponentProps>>(
    () => {
      const transformer = new Transformer();
      const traceBuf: string[] = [];
      transformer.on(TransformerEvent.Element, (ctx: TransformerContext) => {
        traceBuf.push(`${" ".repeat(ctx.depth)}<${ctx.component}>`);
        if (ctx.component === "a") {
          ctx.component = ExternalLink;
          console.log(
            "Transforming <a> => <ExternalLink />; props=",
            ctx.props,
            "; children=",
            ctx.children,
          );
        }
      });
      transformer.on(TransformerEvent.Text, (ctx: TransformerContext) => {
        traceBuf.push(`${" ".repeat(ctx.depth)}${ctx.children}`);
      });
      transformer.on(TransformerEvent.Error, (ctx: TransformerContext) => {
        ctx.errors.forEach(console.error);
      });

      return transformer.getComponent(React);
    },
    [],
  );

  return (
    <div className="container">
      <p>
        <img src="assets/img/deno-logo.png" style={styles.logo} />
        <img src="assets/img/react-logo192.png" style={styles.logo} />
      </p>
      {error && <p className="error" style={styles.error}>{error.message}</p>}
      <Renderer
        source={sourceHtml}
        loadingComponent={<pre>Loading ...</pre>}
        onError={setError}
      />
    </div>
  );
};
export default App;
