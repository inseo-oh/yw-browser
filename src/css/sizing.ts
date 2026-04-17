// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";
import {
    parseLengthOrPercentage,
    serializeLengthOrPercentage,
    type Length,
    type Percentage,
} from "./values.js";

// NOTE: CSS Box Sizing Module Level 3 is still in Working Draft stage!
//       Any of links below may stop working in the future!

//==============================================================================
// CSS Box Sizing Module Level 3 - 3.1.1.
//==============================================================================

registerPropertyDescriptor(
    // NOTE: We can't compute auto or percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-sizing-3/#propdef-width
    new SimplePropertyDescriptor({
        name: "width",
        valueParser: parseWidthHeight,
        initial: (): WidthHeight => "auto",
        inherited: false,
        computed: (parent, value): WidthHeight => value,
        serializer: serializeWidthHeight,
    }),
    // https://www.w3.org/TR/css-sizing-3/#propdef-height
    new SimplePropertyDescriptor({
        name: "height",
        valueParser: parseWidthHeight,
        initial: (): WidthHeight => "auto",
        inherited: false,
        computed: (parent, value): WidthHeight => value,
        serializer: serializeWidthHeight,
    }),
);

// https://www.w3.org/TR/css-sizing-3/#propdef-width
// https://www.w3.org/TR/css-sizing-3/#propdef-height
export type WidthHeight = Length | Percentage | "auto";

export function parseWidthHeight(ts: TokenStream): WidthHeight | undefined {
    if (ts.expectIdent("auto")) {
        return "auto";
    }
    // TODO: Add support for min-content | max-content from Level 3.
    return parseLengthOrPercentage(ts, { minValue: 0 });
}
export function serializeWidthHeight(widthHeight: WidthHeight): string {
    if (widthHeight === "auto") {
        return widthHeight;
    }
    // TODO: Add support for min-content | max-content from Level 3.
    return serializeLengthOrPercentage(widthHeight);
}

//==============================================================================
// CSS Box Sizing Module Level 3 - 3.1.2.
//==============================================================================

registerPropertyDescriptor(
    // NOTE: We can't compute percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-sizing-3/#propdef-min-width
    new SimplePropertyDescriptor({
        name: "min-width",
        valueParser: parseMinWidthHeight,
        initial: (): MinWidthHeight => ({ value: 0, unit: "px" }), // TODO: In Level 3, this is auto.
        inherited: false,
        computed: (parent, value): MinWidthHeight => value,
        serializer: serializeMinWidthHeight,
    }),
    // https://www.w3.org/TR/css-sizing-3/#propdef-min-height
    new SimplePropertyDescriptor({
        name: "min-height",
        valueParser: parseMinWidthHeight,
        initial: (): MinWidthHeight => ({ value: 0, unit: "px" }), // TODO: In Level 3, this is auto.
        inherited: false,
        computed: (parent, value): MinWidthHeight => value,
        serializer: serializeMinWidthHeight,
    }),
);

// https://www.w3.org/TR/css-sizing-3/#propdef-min-width
// https://www.w3.org/TR/css-sizing-3/#propdef-min-height
// TODO: Add support for min-content | max-content from Level 3.
export type MinWidthHeight = Length | Percentage;

export function parseMinWidthHeight(
    ts: TokenStream,
): MinWidthHeight | undefined {
    // TODO: Add support for auto | min-content | max-content from Level 3.
    return parseLengthOrPercentage(ts, { minValue: 0 });
}
export function serializeMinWidthHeight(widthHeight: MinWidthHeight): string {
    // TODO: Add support for auto | min-content | max-content from Level 3.
    return serializeLengthOrPercentage(widthHeight);
}

//==============================================================================
// CSS Box Sizing Module Level 3 - 3.1.3.
//==============================================================================

registerPropertyDescriptor(
    // NOTE: We can't compute percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-sizing-3/#propdef-max-width
    new SimplePropertyDescriptor({
        name: "max-width",
        valueParser: parseMaxWidthHeight,
        initial: (): MaxWidthHeight => "none",
        inherited: false,
        computed: (parent, value): MaxWidthHeight => value,
        serializer: serializeMaxWidthHeight,
    }),
    // https://www.w3.org/TR/css-sizing-3/#propdef-max-height
    new SimplePropertyDescriptor({
        name: "max-height",
        valueParser: parseMaxWidthHeight,
        initial: (): MaxWidthHeight => "none",
        inherited: false,
        computed: (parent, value): MaxWidthHeight => value,
        serializer: serializeMaxWidthHeight,
    }),
);

// https://www.w3.org/TR/css-sizing-3/#propdef-max-width
// https://www.w3.org/TR/css-sizing-3/#propdef-max-height
// TODO: Add support for max-content | max-content from Level 3.
export type MaxWidthHeight = Length | Percentage | "none";

export function parseMaxWidthHeight(
    ts: TokenStream,
): MaxWidthHeight | undefined {
    if (ts.expectIdent("none")) {
        return "none";
    }
    // TODO: Add support for max-content | max-content from Level 3.
    return parseLengthOrPercentage(ts, { minValue: 0 });
}
export function serializeMaxWidthHeight(widthHeight: MaxWidthHeight): string {
    if (widthHeight === "none") {
        return widthHeight;
    }
    // TODO: Add support for max-content | max-content from Level 3.
    return serializeLengthOrPercentage(widthHeight);
}
