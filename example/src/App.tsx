import { React } from "../../src/deps/react.ts";

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
}

const ExternalLink = (props: React.PropsWithChildren<ExternalLinkProps>) => {
  let { href, children } = props;

  return (
    <a href={`/redirect/to/${href}`}><span>EXTERNAL LINK WARNING: {children}</span></a>
  )
}

const sourceHtml = `
<div>
  <h1>Test</h1>
  <p><a href="xyz">Next page</a></p>
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
  }
});
transformer.on(TransformerEvent.Text, (ctx: TransformerContext) => {
  traceBuf.push(`${" ".repeat(ctx.depth)}${ctx.children}`);
});
transformer.on(TransformerEvent.Errors, (ctx: TransformerContext) => {
  ctx.errors.forEach(console.error);
});
const Renderer = transformer.getComponent();

const App = (props: any) => {
  let [ loading, setLoading ] = React.useState(true);

  React.useEffect(() => {
    console.log("Start loading...");

  const timerId = setTimeout(() => {
    setLoading(false);
    console.log("Finished loading");
  }, 1000);

    return () => {
      //cleanup
      clearTimeout(timerId);
    }
  }, []);

  return (
    <div className="container">
      <p>
        <img src="assets/img/deno-logo.png" style={styles.logo} />
        <img src="assets/img/react-logo192.png" style={styles.logo} />
      </p>
      <pre>Loading ...{(loading) ? "" : " OK!"}</pre>
      <Renderer source={sourceHtml} />
    </div>
  );
};

export default App;
