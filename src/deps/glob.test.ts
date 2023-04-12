
import { assert, assertEquals } from "./std.ts";
import { expandGlobSync } from "https://deno.land/std@0.159.0/fs/mod.ts";
import { relative } from "https://deno.land/std@0.159.0/path/mod.ts";


Deno.test("should match glob", () => {
    const pattern = "./example/public/**/*.png";
    const matches = [...expandGlobSync(pattern, {
        root: Deno.cwd(),
        extended: true,
    })]
    .map((file) => ({
      fullPath: file.path.replace(/\\/g, "/"),
      path: "./" + relative(Deno.cwd(), file.path).replace(/\\/g, "/"),
      lstat: Deno.lstatSync(file.path),
    }));
    console.log(matches);

    assert(matches.length > 0, "no match");
});
