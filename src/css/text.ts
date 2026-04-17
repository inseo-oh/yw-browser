// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";

//==============================================================================
// CSS Text Module Level 3 - 2.1.
//==============================================================================

registerPropertyDescriptor(
    // NOTE: We can't compute auto or percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-text-3/#propdef-text-transform
    new SimplePropertyDescriptor({
        name: "text-transform",
        valueParser: parseTextTransform,
        initial: (): TextTransform => "none",
        inherited: false,
        computed: (parent, value): TextTransform => value,
        serializer: (v): string => `${v}`,
    }),
);

// https://www.w3.org/TR/css-text-3/#propdef-text-transform
export type TextTransform = "capitalize" | "uppercase" | "lowercase" | "none"; // TODO: full-width || full-size-kana from Level 3

export function parseTextTransform(ts: TokenStream): TextTransform | undefined {
    if (ts.expectIdent("capitalize")) {
        return "capitalize";
    }
    if (ts.expectIdent("uppercase")) {
        return "uppercase";
    }
    if (ts.expectIdent("lowercase")) {
        return "lowercase";
    }
    if (ts.expectIdent("none")) {
        return "none";
    }
    // TODO: Support full-width || full-size-kana from Level 3.
    return undefined;
}

export function applyTextTransform(trans: TextTransform, s: string): string {
    switch (trans) {
        // https://www.w3.org/TR/css-text-3/#valdef-text-transform-none
        case "none":
            return s;
        // https://www.w3.org/TR/css-text-3/#valdef-text-transform-capitalize
        case "capitalize":
            return s.substring(0, 1).toUpperCase() + s.substring(1);
        // https://www.w3.org/TR/css-text-3/#valdef-text-transform-uppercase
        case "uppercase":
            return s.toUpperCase();
        case "lowercase":
            // https://www.w3.org/TR/css-text-3/#valdef-text-transform-lowercase
            return s.toLowerCase();
        // TODO: Support full-width || full-size-kana from Level 3.
    }
}
