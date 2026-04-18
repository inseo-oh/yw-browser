// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    NormalShorthandPropertyDescriptor,
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";

//==============================================================================
// CSS Text Decoration Module Level 3 - 2.1.
//==============================================================================

registerPropertyDescriptor(
    // NOTE: We can't compute auto or percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-text-decor-3/#propdef-text-decoration-line
    new SimplePropertyDescriptor({
        name: "text-decoration-line",
        valueParser: parseTextDecorationLine,
        initial: (): TextDecorationLine => [],
        inherited: false,
        computed: (parent, value): TextDecorationLine => value,
        serializer: (v): string => `${v.join(" ")}`,
    }),
);

export type TextDecorationLine = (
    | "underline"
    | "overline"
    | "line-through"
    | "blink"
)[];

export function parseTextDecorationLine(
    ts: TokenStream,
): TextDecorationLine | undefined {
    const oldCursor = ts.cursor;

    if (ts.expectIdent("none")) {
        return [];
    }

    let underline: boolean | undefined;
    let overline: boolean | undefined;
    let lineThrough: boolean | undefined;
    let blink: boolean | undefined;
    while (
        underline === undefined ||
        overline === undefined ||
        lineThrough === undefined ||
        blink === undefined
    ) {
        ts.skipWhitespaces();
        if (underline === undefined && ts.expectIdent("underline")) {
            underline = true;
            continue;
        }
        if (overline === undefined && ts.expectIdent("overline")) {
            overline = true;
            continue;
        }
        if (lineThrough === undefined && ts.expectIdent("line-through")) {
            lineThrough = true;
            continue;
        }
        if (blink === undefined && ts.expectIdent("blink")) {
            blink = true;
            continue;
        }
        break;
    }
    if (
        underline !== undefined ||
        overline !== undefined ||
        lineThrough !== undefined ||
        blink !== undefined
    ) {
        const res: TextDecorationLine = [];
        if (underline) res.push("underline");
        if (overline) res.push("overline");
        if (lineThrough) res.push("line-through");
        if (blink) res.push("blink");
        return res;
    }

    ts.cursor = oldCursor;
    return undefined;
}

//==============================================================================
// CSS Text Decoration Module Level 3 - 2.4.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-text-decor-3/#propdef-text-decoration
    new NormalShorthandPropertyDescriptor({
        name: "text-decoration",
        propertyNames: [
            "text-decoration-line",
            // TODO: Level 3 properties: text-decoration-style and text-decoration-color
        ],
        inherited: false,
    }),
);
