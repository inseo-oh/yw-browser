// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";
import {
    parseLengthOrPercentage,
    parseNumber,
    serializeLengthOrPercentage,
    type Length,
    type Number,
    type Percentage,
} from "./values.js";

// Bits of CSS2 that still isn't part of newer, non-draft CSS modules.

//==============================================================================
// CSS2 - 9.5.1.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/CSS2/visuren.html#float-position
    new SimplePropertyDescriptor({
        name: "float",
        valueParser: parseFloat, // This is not JS's parseFloat()
        initial: (): Float => "none",
        inherited: false,
        computed: (parent, value): Float => value,
        serializer: (v): string => v,
    }),
);

export type Float = "none" | "left" | "right";

export function parseFloat(ts: TokenStream): Float | undefined {
    if (ts.expectIdent("none")) {
        return "none";
    }
    if (ts.expectIdent("left")) {
        return "left";
    }
    if (ts.expectIdent("right")) {
        return "right";
    }

    return undefined;
}

//==============================================================================
// CSS2 - 9.5.2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/CSS2/visuren.html#float-position
    new SimplePropertyDescriptor({
        name: "clear",
        valueParser: parseClear,
        initial: (): Clear => "none",
        inherited: false,
        computed: (parent, value): Clear => value,
        serializer: (v): string => v,
    }),
);

export type Clear = "none" | "left" | "right" | "both";

export function parseClear(ts: TokenStream): Clear | undefined {
    if (ts.expectIdent("none")) {
        return "none";
    }
    if (ts.expectIdent("left")) {
        return "left";
    }
    if (ts.expectIdent("right")) {
        return "right";
    }
    if (ts.expectIdent("both")) {
        return "both";
    }
    return undefined;
}

//==============================================================================
// CSS2 - 10.8.1.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/CSS2/visuren.html#float-position
    new SimplePropertyDescriptor({
        name: "line-height",
        valueParser: parseLineHeight,
        initial: (): LineHeight => "normal",
        inherited: false,
        computed: (parent, value): LineHeight => value,
        serializer: (v): string => {
            if (v === "normal" || typeof v == "number") {
                return `${v}`;
            }
            return serializeLengthOrPercentage(v);
        },
    }),
);

export type LineHeight = "normal" | Number | Length | Percentage;

export function parseLineHeight(ts: TokenStream): LineHeight | undefined {
    const oldCursor = ts.cursor;
    if (ts.expectIdent("normal")) {
        return "normal";
    }
    const number = parseNumber(ts);
    if (number !== undefined && number < 0) {
        ts.cursor = oldCursor;
        return undefined;
    }
    if (number !== undefined) {
        return number;
    }
    return parseLengthOrPercentage(ts, {
        allowZeroShorthand: false,
        minValue: 0,
    });
}
