// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    parseColor,
    resolveColor,
    serializeColor,
    type Color,
} from "./color.js";
import {
    NormalShorthandPropertyDescriptor,
    registerPropertyDescriptor,
    SideShorthandPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";
import { parseLength, serializeLength, type Length } from "./values.js";

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 2.2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-background-color
    new SimplePropertyDescriptor({
        name: "background-color",
        valueParser: parseColor,
        // FIXME: Initial background must be transparent!
        //        As of writing this, our Color module does not support transparent color yet.
        initial: (): Color => ({ kind: "rgb", r: 255, g: 255, b: 255 }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
);

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 3.1.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-top-color
    new SimplePropertyDescriptor({
        name: "border-top-color",
        valueParser: parseColor,
        initial: (): Color => ({ kind: "currentColor" }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-right-color
    new SimplePropertyDescriptor({
        name: "border-right-color",
        valueParser: parseColor,
        initial: (): Color => ({ kind: "currentColor" }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-bottom-color
    new SimplePropertyDescriptor({
        name: "border-bottom-color",
        valueParser: parseColor,
        initial: (): Color => ({ kind: "currentColor" }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-left-color
    new SimplePropertyDescriptor({
        name: "border-left-color",
        valueParser: parseColor,
        initial: (): Color => ({ kind: "currentColor" }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
);
registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-color
    new SideShorthandPropertyDescriptor({
        name: "border-color",
        propertyNames: {
            top: "border-top-color",
            right: "border-right-color",
            bottom: "border-bottom-color",
            left: "border-left-color",
        },
        inherited: false,
    }),
);

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 3.2.
//==============================================================================

// https://www.w3.org/TR/css-backgrounds-3/#typedef-line-style
export type LineStyle =
    | "none"
    | "hidden"
    | "dotted"
    | "dashed"
    | "solid"
    | "double"
    | "groove"
    | "ridge"
    | "inset"
    | "outset";

export function parseLineStyle(ts: TokenStream): LineStyle | undefined {
    const oldCursor = ts.cursor;
    if (ts.expectIdent("none")) {
        return "none";
    }
    if (ts.expectIdent("hidden")) {
        return "hidden";
    }
    if (ts.expectIdent("dotted")) {
        return "dotted";
    }
    if (ts.expectIdent("dashed")) {
        return "dashed";
    }
    if (ts.expectIdent("solid")) {
        return "solid";
    }
    if (ts.expectIdent("double")) {
        return "double";
    }
    if (ts.expectIdent("groove")) {
        return "groove";
    }
    if (ts.expectIdent("ridge")) {
        return "ridge";
    }
    if (ts.expectIdent("inset")) {
        return "inset";
    }
    if (ts.expectIdent("outset")) {
        return "outset";
    }
    ts.cursor = oldCursor;
    return undefined;
}

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-top-style
    new SimplePropertyDescriptor({
        name: "border-top-style",
        valueParser: parseLineStyle,
        initial: (): LineStyle => "none",
        inherited: false,
        computed: (parent, value): LineStyle => value,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-right-style
    new SimplePropertyDescriptor({
        name: "border-right-style",
        valueParser: parseLineStyle,
        initial: (): LineStyle => "none",
        inherited: false,
        computed: (parent, value): LineStyle => value,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-bottom-style
    new SimplePropertyDescriptor({
        name: "border-bottom-style",
        valueParser: parseLineStyle,
        initial: (): LineStyle => "none",
        inherited: false,
        computed: (parent, value): LineStyle => value,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-left-style
    new SimplePropertyDescriptor({
        name: "border-left-style",
        valueParser: parseLineStyle,
        initial: (): LineStyle => "none",
        inherited: false,
        computed: (parent, value): LineStyle => value,
    }),
);
registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-style
    new SideShorthandPropertyDescriptor({
        name: "border-style",
        propertyNames: {
            top: "border-top-style",
            right: "border-right-style",
            bottom: "border-bottom-style",
            left: "border-left-style",
        },
        inherited: false,
    }),
);

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 3.3.
//==============================================================================

// https://www.w3.org/TR/css-backgrounds-3/#typedef-line-width
export type LineWidth = Length;

export const THIN: Length = { value: 1, unit: "px" };
export const MEDIUM: Length = { value: 3, unit: "px" };
export const THICK: Length = { value: 5, unit: "px" };

export function parseLineWidth(ts: TokenStream): Length | undefined {
    if (ts.expectIdent("thin")) {
        return THIN;
    }
    if (ts.expectIdent("medium")) {
        return MEDIUM;
    }
    if (ts.expectIdent("thick")) {
        return THICK;
    }
    return parseLength(ts, {});
}

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-top-width
    new SimplePropertyDescriptor({
        name: "border-top-width",
        valueParser: parseLineWidth,
        initial: (): LineWidth => MEDIUM,
        inherited: false,
        computed: (parent, value): LineWidth => value,
        serializer: serializeLength,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-right-width
    new SimplePropertyDescriptor({
        name: "border-right-width",
        valueParser: parseLineWidth,
        initial: (): LineWidth => MEDIUM,
        inherited: false,
        computed: (parent, value): LineWidth => value,
        serializer: serializeLength,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-bottom-width
    new SimplePropertyDescriptor({
        name: "border-bottom-width",
        valueParser: parseLineWidth,
        initial: (): LineWidth => MEDIUM,
        inherited: false,
        computed: (parent, value): LineWidth => value,
        serializer: serializeLength,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-left-width
    new SimplePropertyDescriptor({
        name: "border-left-width",
        valueParser: parseLineWidth,
        initial: (): LineWidth => MEDIUM,
        inherited: false,
        computed: (parent, value): LineWidth => value,
        serializer: serializeLength,
    }),
);
registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-width
    new SideShorthandPropertyDescriptor({
        name: "border-width",
        propertyNames: {
            top: "border-top-width",
            right: "border-right-width",
            bottom: "border-bottom-width",
            left: "border-left-width",
        },
        inherited: false,
    }),
);

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 3.4.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-top
    new NormalShorthandPropertyDescriptor({
        name: "border-top",
        propertyNames: [
            "border-top-width",
            "border-top-style",
            "border-top-color",
        ],
        inherited: false,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-right
    new NormalShorthandPropertyDescriptor({
        name: "border-right",
        propertyNames: [
            "border-right-width",
            "border-right-style",
            "border-right-color",
        ],
        inherited: false,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-bottom
    new NormalShorthandPropertyDescriptor({
        name: "border-bottom",
        propertyNames: [
            "border-bottom-width",
            "border-bottom-style",
            "border-bottom-color",
        ],
        inherited: false,
    }),
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border-left
    new NormalShorthandPropertyDescriptor({
        name: "border-left",
        propertyNames: [
            "border-left-width",
            "border-left-style",
            "border-left-color",
        ],
        inherited: false,
    }),
);

//==============================================================================
// CSS Backgrounds and Borders Module Level 3 - 3.5.
//==============================================================================
registerPropertyDescriptor(
    // https://www.w3.org/TR/css-backgrounds-3/#propdef-border
    new NormalShorthandPropertyDescriptor({
        name: "border",
        propertyNames: ["border-width", "border-style", "border-color"],
        inherited: false,
        hiddenPropertyNames: [
            // TODO: border-image
        ],
    }),
);
