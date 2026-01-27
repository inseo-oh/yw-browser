import { CSSSyntaxError, TokenStream } from "./syntax";
import {
    Length,
    parseLength,
    parseLengthOrPercentage,
    parseNumber,
    Percentage,
    toPx,
} from "./value";

export type FontFamily =
    | { type: "serif" }
    | { type: "sans-serif" }
    | { type: "cursive" }
    | { type: "fantasy" }
    | { type: "monospace" }
    | { type: "non-generic"; family: string };

export function parseFontFamily(ts: TokenStream, _args: void): FontFamily[] {
    return ts.parseCommaSeparatedRepeation(1, null, null, () => {
        const tk = ts.nextToken();
        if (tk.type === "ident") {
            switch (tk.value) {
                case "serif":
                case "sans-serif":
                case "cursive":
                case "fantasy":
                case "monospace":
                    ts.consumeToken();
                    return { type: tk.value };
            }
            const idents = ts.parseRepeation(1, null, null, () => {
                const tk = ts.nextToken();
                if (tk.type !== "ident") {
                    throw new CSSSyntaxError(ts.prevOrFirstToken());
                }
                ts.consumeToken();
                return tk.value;
            });
            return { type: "non-generic", family: idents.join(" ") };
        } else if (tk.type === "string") {
            return { type: "non-generic", family: tk.value };
        } else {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
    });
}

export type FontWeight = number;

export const FontWeights = {
    NORMAL: 400,
    BOLD: 700,
} as const;

export function parseFontWeight(ts: TokenStream, _args: void): FontWeight {
    const tk = ts.nextToken();
    if (tk.type === "ident") {
        ts.consumeToken();
        switch (tk.value) {
            case "normal":
                return FontWeights.NORMAL;
            case "bold":
                return FontWeights.BOLD;
            default:
                throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
    }
    // TODO: Check range of returned value.
    return Math.floor(parseNumber(ts));
}

export type FontStretch =
    | "ultra-condensed"
    | "extra-condensed"
    | "condensed"
    | "semi-condensed"
    | "normal"
    | "semi-expanded"
    | "expanded"
    | "extra-expanded"
    | "ultra-expanded";

export function parseFontStretch(ts: TokenStream, _args: void): FontStretch {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "ultra-condensed":
        case "extra-condensed":
        case "condensed":
        case "semi-condensed":
        case "normal":
        case "semi-expanded":
        case "expanded":
        case "extra-expanded":
        case "ultra-expanded":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

export type FontStyle = "normal" | "italic" | "oblique";

export function parseFontStyle(ts: TokenStream, _args: void): FontStyle {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "normal":
        case "italic":
        case "oblique":
            ts.consumeToken();
            return tk.value;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

// https://www.w3.org/TR/css-fonts-3/#absolute-size-value
type AbsoluteSize =
    | "xx-small"
    | "x-small"
    | "small"
    | "medium"
    | "large"
    | "x-large"
    | "xx-large";

const PREFERRED_FONT_SIZE = 14; // XXX: Let user choose this size!

function absoluteToPixelSize(abs: AbsoluteSize): number {
    switch (abs) {
        case "xx-small":
            return (PREFERRED_FONT_SIZE * 3.0) / 5.0;
        case "x-small":
            return (PREFERRED_FONT_SIZE * 3.0) / 4.0;
        case "small":
            return (PREFERRED_FONT_SIZE * 8.0) / 9.0;
        case "medium":
            return PREFERRED_FONT_SIZE;
        case "large":
            return (PREFERRED_FONT_SIZE * 6.0) / 5.0;
        case "x-large":
            return (PREFERRED_FONT_SIZE * 3.0) / 2.0;
        case "xx-large":
            return (PREFERRED_FONT_SIZE * 2.0) / 1.0;
    }
}
function absoluteFromPixelSize(px: number): AbsoluteSize {
    let sizes: AbsoluteSize[] = [
        "xx-small",
        "x-small",
        "small",
        "medium",
        "large",
        "x-large",
        "xx-large",
    ];
    let minDiff: number | null = null;
    let resSize: AbsoluteSize = "medium";
    for (const size of sizes) {
        let diff = Math.abs(px - absoluteToPixelSize(size));
        if (minDiff === null || diff < minDiff) {
            resSize = size;
            minDiff = diff;
        }
    }
    return resSize;
}

// https://www.w3.org/TR/css-fonts-3/#relative-size-value
type RelativeSize = "larger" | "smaller";

function relativeToAbsoluteSize(
    rel: RelativeSize,
    abs: AbsoluteSize,
): AbsoluteSize {
    let newAbsSize: AbsoluteSize;
    switch (rel) {
        case "larger":
            switch (abs) {
                case "xx-small":
                    newAbsSize = "x-small";
                    break;
                case "x-small":
                    newAbsSize = "small";
                    break;
                case "small":
                    newAbsSize = "medium";
                    break;
                case "medium":
                    newAbsSize = "large";
                    break;
                case "large":
                    newAbsSize = "x-large";
                    break;
                case "x-large":
                    newAbsSize = "xx-large";
                    break;
                case "xx-large":
                    newAbsSize = "xx-large";
                    break;
            }
        case "smaller":
            switch (abs) {
                case "xx-small":
                    newAbsSize = "xx-small";
                    break;
                case "x-small":
                    newAbsSize = "xx-small";
                    break;
                case "small":
                    newAbsSize = "x-small";
                    break;
                case "medium":
                    newAbsSize = "small";
                    break;
                case "large":
                    newAbsSize = "medium";
                    break;
                case "x-large":
                    newAbsSize = "large";
                    break;
                case "xx-large":
                    newAbsSize = "x-large";
                    break;
            }
    }
    return newAbsSize;
}
function relativeToPixelSize(
    rel: RelativeSize,
    parentFontSize: number,
): number {
    return absoluteToPixelSize(
        relativeToAbsoluteSize(rel, absoluteFromPixelSize(parentFontSize)),
    );
}

export type FontSize = RelativeSize | AbsoluteSize | Length | Percentage;
export function fontSizeToPixelSize(
    fontSize: FontSize,
    inheritedFontSize: () => number,
    parentFontSize: () => number,
): number {
    switch (fontSize) {
        case "xx-small":
        case "x-small":
        case "small":
        case "medium":
        case "large":
        case "x-large":
        case "xx-large":
            return absoluteToPixelSize(fontSize);
        case "larger":
        case "smaller":
            return relativeToPixelSize(fontSize, parentFontSize());
        default:
            return toPx(fontSize, inheritedFontSize, parentFontSize);
    }
}

export function parseFontSize(ts: TokenStream, _args: void): FontSize {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    switch (tk.value) {
        case "xx-small":
        case "x-small":
        case "small":
        case "medium":
        case "large":
        case "x-large":
        case "xx-large":
        case "larger":
        case "smaller":
            ts.consumeToken();
            return tk.value;
    }
    return parseLengthOrPercentage(ts, {});
}
