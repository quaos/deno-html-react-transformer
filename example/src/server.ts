import * as abc from "./deps/abc.ts";
import { opn } from "./deps/opn.ts";

export interface RunServerOptions {
  cwd?: string;
  host?: string;
  port?: number;
  browse: boolean;
}

async function runServer(opts?: RunServerOptions): Promise<number> {
  try {
    const cwd = opts?.cwd || ".";
    const sourceDir = `${cwd}/public`;
    const host = opts?.host || "localhost";
    const port = opts?.port || 8080;

    abc.MIME.DB[".css"] = "text/css";

    console.log(
      `Starting static web server at: http://${host}:${port}/\nSource path: ${sourceDir}`,
    );
    const abcApp = new abc.Application();
    abcApp
      .use((next) =>
        async (ctx) => {
          console.log(`${ctx.request.method} ${ctx.request.url}`);
          await next(ctx);
        }
      )
      .static("/", sourceDir)
      .file("/", `${sourceDir}/index.html`)
      .start({ port });

    if (opts?.browse) {
      await opn(`http://${host}:${port}/`);
    }

    return 0;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

let opts = <RunServerOptions>{
  browse: false,
};
enum CommandOption {
  None = "",
  Host = "host",
  Port = "port",
}
let lastOpt: CommandOption = CommandOption.None;
for (let arg of Deno.args) {
  if (lastOpt != CommandOption.None) {
    switch (lastOpt) {
      case CommandOption.Host:
        opts.host = arg;
        break;
      case CommandOption.Port:
        opts.port = Number(arg);
        break;
      default:
        break;
    }
  } else if (arg === "--browse") {
    opts.browse = true;
  } else if (arg === "--host") {
    lastOpt = CommandOption.Host;
  } else if (arg === "--port") {
    lastOpt = CommandOption.Port;
  } else if (!opts.cwd) {
    opts.cwd = arg;
  } else {
    throw new Error(`unknown option: ${arg}`);
  }
}

runServer(opts)
  .then(() => Deno.exit(0))
  .catch((err) => {
    console.error(err);
    Deno.exit(-1);
  });
