// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { toASCIILowercase } from "../infra.js";
import type { TokenStream } from "./syntax.js";

//==============================================================================
// CSS Values and Units Module Level 3 - 4.2.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#integer-value
export type Integer = number;

export function parseInteger(ts: TokenStream): Integer | undefined {
    const oldCursor = ts.cursor;
    const num = ts.expectToken("number");
    if (num?.type !== "integer") {
        ts.cursor = oldCursor;
        return undefined;
    }
    return num.value;
}

//==============================================================================
// CSS Values and Units Module Level 3 - 4.3.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#number-value
export type Number = number;

export function parseNumber(ts: TokenStream): number | undefined {
    const oldCursor = ts.cursor;
    const num = ts.expectToken("number");
    if (num === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    return num.value;
}

//==============================================================================
// CSS Values and Units Module Level 3 - 4.4.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#typedef-dimension
export type Dimension = { value: number; unit: string };

export function parseDimension(ts: TokenStream): Dimension | undefined {
    const oldCursor = ts.cursor;
    const dim = ts.expectToken("dimension");
    if (dim === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { value: dim.value, unit: toASCIILowercase(dim.unit) };
}

//==============================================================================
// CSS Values and Units Module Level 3 - 4.5.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#percentage-value
export type Percentage = { value: number; unit: "%" };

export function parsePercentage(ts: TokenStream): Percentage | undefined {
    const oldCursor = ts.cursor;
    const per = ts.expectToken("percentage");
    if (per === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { value: per.value, unit: "%" };
}

//==============================================================================
// CSS Values and Units Module Level 3 - 4.6.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#typedef-length-percentage
export function parseLengthOrPercentage(
    ts: TokenStream,
    options: {
        allowZeroShorthand?: boolean;
        minValue?: number;
        maxValue?: number;
    },
): Percentage | Length | undefined {
    const len = parseLength(ts, options);
    if (len !== undefined) {
        return len;
    }
    return parsePercentage(ts);
}

//==============================================================================
// CSS Values and Units Module Level 3 - 5.
//==============================================================================

// https://www.w3.org/TR/css-values-3/#length-value
export type Length =
    // CSS Values and Units Module Level 3 - 5.1.1.
    | { value: number; unit: "em" }
    | { value: number; unit: "ex" }
    // TODO: Level 3 units (ch, rem)
    // CSS Values and Units Module Level 3 - 5.1.2.
    // TODO: Level 3 units (vw, vh, vmin, vmax)
    // CSS Values and Units Module Level 3 - 5.2.
    | { value: number; unit: "cm" }
    | { value: number; unit: "mm" }
    | { value: number; unit: "in" }
    | { value: number; unit: "pc" }
    | { value: number; unit: "pt" }
    | { value: number; unit: "px" };
// TODO: Level 3 units (Q)

export function parseLength(
    ts: TokenStream,
    {
        allowZeroShorthand = true,
        minValue,
        maxValue,
    }: {
        allowZeroShorthand?: boolean;
        minValue?: number;
        maxValue?: number;
    },
): Length | undefined {
    const oldCursor = ts.cursor;
    const dim = parseDimension(ts);
    if (
        dim === undefined ||
        (minValue !== undefined && dim.value < minValue) ||
        (maxValue !== undefined && maxValue < dim.value)
    ) {
        if (dim === undefined && parseInteger(ts) === 0 && allowZeroShorthand) {
            return { value: 0, unit: "px" };
        }
        ts.cursor = oldCursor;
        return undefined;
    }
    switch (dim.unit) {
        case "em":
        case "ex":
        case "cm":
        case "mm":
        case "in":
        case "pc":
        case "pt":
        case "px":
            return { value: dim.value, unit: dim.unit };
    }
    ts.cursor = oldCursor;
    return undefined;
}
