// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    registerPropertyDescriptor,
    SideShorthandPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";
import {
    parseLengthOrPercentage,
    serializeLengthOrPercentage,
    type Length,
    type Percentage,
} from "./values.js";

//==============================================================================
// CSS Box Model Module Level 3 - 3.1.
//==============================================================================

export type Margin = Length | Percentage | "auto";

export function parseMargin(ts: TokenStream): Margin | undefined {
    if (ts.expectIdent("auto")) {
        return "auto";
    }
    return parseLengthOrPercentage(ts, {});
}
export function serializeMargin(margin: Margin): string {
    if (margin === "auto") {
        return "margin";
    }
    return serializeLengthOrPercentage(margin);
}

registerPropertyDescriptor(
    // NOTE: We can't compute percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-box-3/#propdef-margin-top
    new SimplePropertyDescriptor({
        name: "margin-top",
        valueParser: parseMargin,
        initial: (): Margin => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Margin => value,
        serializer: serializeMargin,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-margin-right
    new SimplePropertyDescriptor({
        name: "margin-right",
        valueParser: parseMargin,
        initial: (): Margin => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Margin => value,
        serializer: serializeMargin,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-margin-bottom
    new SimplePropertyDescriptor({
        name: "margin-bottom",
        valueParser: parseMargin,
        initial: (): Margin => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Margin => value,
        serializer: serializeMargin,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-margin-left
    new SimplePropertyDescriptor({
        name: "margin-left",
        valueParser: parseMargin,
        initial: (): Margin => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Margin => value,
        serializer: serializeMargin,
    }),
);

//==============================================================================
// CSS Box Model Module Level 3 - 3.2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-box-3/#propdef-margin
    new SideShorthandPropertyDescriptor({
        name: "margin",
        propertyNames: {
            top: "margin-top",
            right: "margin-right",
            bottom: "margin-bottom",
            left: "margin-left",
        },
        inherited: false,
    }),
);

//==============================================================================
// CSS Box Model Module Level 3 - 4.1.
//==============================================================================

export type Padding = Length | Percentage;

export function parsePadding(ts: TokenStream): Padding | undefined {
    return parseLengthOrPercentage(ts, { minValue: 0 });
}
export function serializePadding(padding: Padding): string {
    return serializeLengthOrPercentage(padding);
}

registerPropertyDescriptor(
    // NOTE: We can't compute percentage value here, because we need layout context to do so.

    // https://www.w3.org/TR/css-box-3/#propdef-padding-top
    new SimplePropertyDescriptor({
        name: "padding-top",
        valueParser: parsePadding,
        initial: (): Padding => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Padding => value,
        serializer: serializePadding,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-padding-right
    new SimplePropertyDescriptor({
        name: "padding-right",
        valueParser: parsePadding,
        initial: (): Padding => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Padding => value,
        serializer: serializePadding,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-padding-bottom
    new SimplePropertyDescriptor({
        name: "padding-bottom",
        valueParser: parsePadding,
        initial: (): Padding => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Padding => value,
        serializer: serializePadding,
    }),
    // https://www.w3.org/TR/css-box-3/#propdef-padding-left
    new SimplePropertyDescriptor({
        name: "padding-left",
        valueParser: parsePadding,
        initial: (): Padding => ({ value: 0, unit: "px" }),
        inherited: false,
        computed: (parent, value): Padding => value,
        serializer: serializePadding,
    }),
);

//==============================================================================
// CSS Box Model Module Level 3 - 4.2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-box-3/#propdef-padding
    new SideShorthandPropertyDescriptor({
        name: "padding",
        propertyNames: {
            top: "padding-top",
            right: "padding-right",
            bottom: "padding-bottom",
            left: "padding-left",
        },
        inherited: false,
    }),
);
