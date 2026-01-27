import { CSSSyntaxError, TokenStream } from "./syntax";

// https://www.w3.org/TR/CSS2/visuren.html#propdef-float
export type Float = "none" | "left" | "right";

export function parseFloat(ts: TokenStream, _args: void): Float {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "none":
        case "left":
        case "right":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}
