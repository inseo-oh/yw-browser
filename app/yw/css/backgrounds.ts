import { CSSSyntaxError, TokenStream } from "./syntax";
import { Length, lengthFromPx, LengthParseArgs, parseLength } from "./value";

// https://www.w3.org/TR/css-backgrounds-3/#typedef-line-style
export type LineStyle =
    | "none"
    | "hidden"
    | "dotted"
    | "dashed"
    | "solid"
    | "double"
    | "groove"
    | "ridge"
    | "inset"
    | "outset";

export function parseLineStyle(ts: TokenStream, _args: void): LineStyle {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "none":
        case "hidden":
        case "dotted":
        case "dashed":
        case "solid":
        case "double":
        case "groove":
        case "ridge":
        case "inset":
        case "outset":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

// https://www.w3.org/TR/css-backgrounds-3/#typedef-line-width
type LineWidth = Length;

export const LineWidths = {
    THIN: lengthFromPx(1),
    MEDIUM: lengthFromPx(3),
    THICK: lengthFromPx(5),
} as const;

export function parseLineWidth(
    ts: TokenStream,
    args: LengthParseArgs,
): LineWidth {
    const tk = ts.nextToken();
    if (tk.type === "ident") {
        ts.consumeToken();
        switch (tk.value) {
            case "thin":
                return LineWidths.THIN;
            case "medium":
                return LineWidths.MEDIUM;
            case "thick":
                return LineWidths.THICK;
            default:
                throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
    }
    return parseLength(ts, args);
}
