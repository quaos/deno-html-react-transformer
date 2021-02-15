import { React } from "./deps/react.ts";

import type { TransformerContext } from "../../src/context.ts";
import { Transformer, TransformerEvent } from "../../src/transformer.ts";

const styles = {
  logo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "192px",
    height: "192px",
  },
};

interface ExternalLinkProps {
  href?: string;
  target?: string;
}

const ExternalLink = (props: React.PropsWithChildren<ExternalLinkProps>) => {
  let { href, target, children } = props;

  return (
    <a href={`/redirect/to/${href}`} target={target}>
      EXTERNAL LINK WARNING: {children} <i className="fa fa-external-link-alt"></i>
    </a>
  )
}

const sourceHtml = `
<div>
  <h1>Test</h1>
  <p><span class="lead-word">T</span>esting HTML <i class="fa fa-coffee"></i></p>
  <p><a href="xyz" target="_blank"> Next page</a></p>
  <script>console.log('XSS! You are PWNED!')</script>
  <iframe src="http://www.dangerous.org/PWNED"></iframe>
</div>
`;

const transformer = new Transformer();
const traceBuf: string[] = [];
transformer.on(TransformerEvent.Element, (ctx: TransformerContext) => {
  traceBuf.push(`${" ".repeat(ctx.depth)}<${ctx.component}>`);
  if (ctx.component === "a") {
    ctx.component = ExternalLink;
    console.log("Transforming <a> => <ExternalLink />; props=", ctx.props, "; children=", ctx.children);
  }
});
transformer.on(TransformerEvent.Text, (ctx: TransformerContext) => {
  traceBuf.push(`${" ".repeat(ctx.depth)}${ctx.children}`);
});
transformer.on(TransformerEvent.Errors, (ctx: TransformerContext) => {
  ctx.errors.forEach(console.error);
});
const Renderer = transformer.getComponent(React);

const App = (props: any) => {
  let [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    console.log("Start loading...");

    transformer.init().then(() => {
      setLoading(false);
      console.log("Finished loading");
    });

    return () => {
      //cleanup
    }
  }, []);

  return (
    <div className="container">
      <p>
        <img src="assets/img/deno-logo.png" style={styles.logo} />
        <img src="assets/img/react-logo192.png" style={styles.logo} />
      </p>
      {(loading)
        ? <pre>Loading ...</pre>
        : <Renderer source={sourceHtml} />
      }
    </div>
  );
};

export default App;
