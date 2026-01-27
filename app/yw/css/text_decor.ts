import { Color } from "./color";
import { CSSSyntaxError, TokenStream } from "./syntax";

// https://www.w3.org/TR/css-text-decor-3/#text-decoration-line-property
export type TextDecorationLine =
    | "underline"
    | "overline"
    | "line-through"
    | "blink";

export function parseTextDecorationLine(
    ts: TokenStream,
    _args: void,
): TextDecorationLine {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "underline":
        case "overline":
        case "line-through":
        case "blink":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

// https://www.w3.org/TR/css-text-decor-3/#text-decoration-style-property
export type TextDecorationStyle =
    | "solid"
    | "double"
    | "dotted"
    | "dashed"
    | "wavy";

export function parseTextDecorationStyle(
    ts: TokenStream,
    _args: void,
): TextDecorationStyle {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "solid":
        case "double":
        case "dotted":
        case "dashed":
        case "wavy":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

export type TextDecorationOptions = {
    line: TextDecorationLine;
    style: TextDecorationStyle;
    color: Color;
};
