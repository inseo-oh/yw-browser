import { TokenStream } from "./syntax";
import { Length, parseLengthOrPercentage, Percentage, toPx } from "./value";

// https://www.w3.org/TR/2021/WD-css-sizing-3-20211217/#sizing-values
export type Size =
    | "none"
    | "auto"
    | "min-content"
    | "max-content"
    | "fit-content"
    | Length
    | Percentage;

export function parseSize(ts: TokenStream, _args: void): Size {
    const tk = ts.nextToken();
    if (tk.type === "ident") {
        switch (tk.value) {
            case "none":
            case "auto":
            case "min-content":
            case "max-content":
            case "fit-content":
                ts.consumeToken();
                return tk.value;
        }
    }
    return parseLengthOrPercentage(ts, {});
}
export function computeUsedSizeValue(
    size: Size,
    fontSize: () => number,
    containerSize: () => number,
): number {
    switch (size) {
        case "none":
            throw new Error("Not implemented");
        case "auto":
            throw new Error("Auto sizes must be calculated by caller");
        case "min-content":
            throw new Error("Not implemented");
        case "max-content":
            throw new Error("Not implemented");
        case "fit-content":
            throw new Error("Not implemented");
        default:
            return toPx(size, fontSize, containerSize);
    }
}
