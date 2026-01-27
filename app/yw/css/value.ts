import { CSSSyntaxError, Parser, TokenStream } from "./syntax";

// https://www.w3.org/TR/css-values-3/#number
export function parseNumber(ts: TokenStream, _args: void): number {
    const tk = ts.nextToken();
    if (tk.type === "number") {
        ts.consumeToken();
        return tk.value.num;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

// https://www.w3.org/TR/css-values-3/#dimension
export type Dimension = { num: number; unit: string };

// https://www.w3.org/TR/css-values-3/#length-value
export type Length = { num: number; unit: LengthUnit };

export function lengthFromPx(px: number): Length {
    return { num: px, unit: "px" };
}

export type LengthParseArgs = {
    allowZeroShorthand?: boolean;
    allowNegative?: boolean;
};

export function parseLength(
    ts: TokenStream,
    { allowZeroShorthand = true, allowNegative = true }: LengthParseArgs,
): Length {
    const tk = ts.nextToken();
    if (tk.type === "dimension") {
        ts.consumeToken();
        switch (tk.unit) {
            case "em":
            case "ex":
            case "ch":
            case "rem":
            case "vw":
            case "vh":
            case "vmin":
            case "vmax":
            case "cm":
            case "mm":
            case "q":
            case "pc":
            case "pt":
            case "px":
                break;
            default:
                throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        if (!allowNegative && tk.value.num < 0) {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        return { num: tk.value.num, unit: tk.unit };
    } else if (
        allowZeroShorthand &&
        tk.type === "number" &&
        tk.value.num === 0
    ) {
        ts.consumeToken();
        return { num: 0, unit: "px" };
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

type LengthUnit =
    //==========================================================================
    // Relative lengths
    //
    // https://www.w3.org/TR/css-values-3/#relative-lengths
    //==========================================================================
    | "em"
    | "ex"
    | "ch"
    | "rem"
    | "vw"
    | "vh"
    | "vmin"
    | "vmax"
    //==========================================================================
    // Absolute lengths
    //
    // https://www.w3.org/TR/css-values-3/#absolute-lengths
    //==========================================================================
    | "cm"
    | "mm"
    | "q"
    | "pc"
    | "pt"
    | "px";

// https://www.w3.org/TR/css-values-3/#percentages
export type Percentage = { num: number; unit: "%" };

export function parsePercentage(ts: TokenStream, _args: void): Percentage {
    const tk = ts.nextToken();
    if (tk.type === "percentage") {
        ts.consumeToken();
        return { num: tk.value.num, unit: "%" };
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}
function parsePercentageOr<ParseArgs, Result>(
    ts: TokenStream,
    parser: Parser<ParseArgs, Result>,
    args: ParseArgs,
): Result | Percentage {
    let oldCursor = ts.cursor;
    try {
        return parser(ts, args);
    } catch (e) {
        if (!(e instanceof CSSSyntaxError)) {
            throw e;
        }
        ts.cursor = oldCursor;
    }
    try {
        return parsePercentage(ts);
    } catch (e) {
        if (!(e instanceof CSSSyntaxError)) {
            throw e;
        }
        ts.cursor = oldCursor;
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}
export function parseLengthOrPercentage(
    ts: TokenStream,
    args: LengthParseArgs,
): Length | Percentage {
    return parsePercentageOr(ts, parseLength, args);
}

export function toPx(
    len: Length | Percentage,
    fontSize: () => number,
    containerSize: () => number,
) {
    switch (len.unit) {
        case "px":
            return len.num;
        case "em":
            return fontSize() * len.num;
        case "pt":
            // STUB -- For now we treat pt and px as the same thing.
            return len.num;
        case "%":
            return (len.num * containerSize()) / 100;
        default:
            throw Error("not implemented");
    }
}
