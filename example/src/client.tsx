import { React } from "./deps/react.ts";
import { ReactDOM } from "./deps/react-dom.ts";

import App from "./App.tsx";

window.addEventListener("DOMContentLoaded", (evt) => {
  (ReactDOM as any).render(
    <App />,
    // @ts-ignore
    document.getElementById("root"),
  );
});

export {};
