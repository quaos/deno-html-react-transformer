import React from "./deps/react.ts";
import { createRoot } from "./deps/react-dom.ts";

import App from "./App.tsx";

window.addEventListener("DOMContentLoaded", (evt) => {
  const reactRoot = createRoot(document.getElementById("root")!);
  reactRoot.render(<App />);
});

export {};
