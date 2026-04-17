// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";

//==============================================================================
// CSS Display Module Level 3 - 2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-display-3/#propdef-display
    new SimplePropertyDescriptor({
        name: "display",
        valueParser: parseDisplay,
        initial: (): Display => ({
            kind: "normal",
            outerMode: "inline",
            innerMode: "flow",
            isListItem: false,
        }),
        inherited: false,
        computed: (parent, value): Display => value,
        serializer: serializeDisplay,
    }),
);

export type Display =
    | {
          kind: "normal";
          outerMode: DisplayOutside;
          innerMode: DisplayInside;
          isListItem: boolean;
      }
    | DisplayInternal
    | DisplayBox;

export function parseDisplay(ts: TokenStream): Display | undefined {
    let res = parseDisplayLegacy(ts);
    if (res !== undefined) {
        return res;
    }
    res = parseDisplayListItem(ts);
    if (res !== undefined) {
        return res;
    }
    res = parseDisplayInternal(ts);
    if (res !== undefined) {
        return res;
    }
    res = parseDisplayBox(ts);
    if (res !== undefined) {
        return res;
    }
    const oldCursor = ts.cursor;
    let outerMode: DisplayOutside | undefined = undefined;
    let innerMode: DisplayInside | undefined = undefined;
    while (outerMode === undefined || innerMode === undefined) {
        if (outerMode === undefined) {
            ts.skipWhitespaces();
            outerMode = parseDisplayOutside(ts);
            if (outerMode !== undefined) {
                ts.skipWhitespaces();
                continue;
            }
        }
        if (innerMode === undefined) {
            ts.skipWhitespaces();
            innerMode = parseDisplayInside(ts);
            if (innerMode !== undefined) {
                ts.skipWhitespaces();
                continue;
            }
        }
        break;
    }
    if (outerMode !== undefined || innerMode !== undefined) {
        innerMode = innerMode ?? "flow";
        outerMode = outerMode ?? "block"; // TODO: for "ruby"(TBD), this should be "inline"
        return { kind: "normal", outerMode, innerMode, isListItem: false };
    }

    ts.cursor = oldCursor;
    return undefined;
}

export function serializeDisplay(display: Display): string {
    switch (display.kind) {
        case "normal":
            return `${display.outerMode} ${display.innerMode}${display.isListItem ? " list-item" : ""}`;
        default:
            return display.kind;
    }
}

// https://www.w3.org/TR/css-display-3/#typedef-display-legacy
function parseDisplayLegacy(ts: TokenStream): Display | undefined {
    if (ts.expectIdent("inline-block")) {
        return {
            kind: "normal",
            outerMode: "inline",
            innerMode: "flow-root",
            isListItem: false,
        };
    }
    if (ts.expectIdent("inline-table")) {
        return {
            kind: "normal",
            outerMode: "inline",
            innerMode: "table",
            isListItem: false,
        };
    }
    // TODO: inline-flex and inline-grid from Level 3.
    return undefined;
}

//==============================================================================
// CSS Display Module Level 3 - 2.1.
//==============================================================================

// https://www.w3.org/TR/css-display-3/#typedef-display-outside
export type DisplayOutside = "block" | "inline"; // TODO: run-in

function parseDisplayOutside(ts: TokenStream): DisplayOutside | undefined {
    if (ts.expectIdent("block")) {
        return "block";
    }
    if (ts.expectIdent("inline")) {
        return "inline";
    }
    return undefined;
}

//==============================================================================
// CSS Display Module Level 3 - 2.2.
//==============================================================================

// https://www.w3.org/TR/css-display-3/#typedef-display-inside
export type DisplayInside = "flow" | "flow-root" | "table"; // TODO: flex | grid | ruby

function parseDisplayInside(ts: TokenStream): DisplayInside | undefined {
    if (ts.expectIdent("flow")) {
        return "flow";
    }
    if (ts.expectIdent("flow-root")) {
        return "flow-root";
    }
    if (ts.expectIdent("table")) {
        return "table";
    }
    return undefined;
}

//==============================================================================
// CSS Display Module Level 3 - 2.3.
//==============================================================================

export type DisplayListItem = {
    kind: "list-item";
    outerMode: DisplayOutside;
    innerMode: DisplayInside;
};

function parseDisplayListItem(ts: TokenStream): Display | undefined {
    if (ts.expectIdent("list-item")) {
        return {
            kind: "normal",
            outerMode: "block",
            innerMode: "flow",
            isListItem: true,
        };
    }
    // TODO: Support outer and inner mode(flow or flow-root) from Level 3.
    return undefined;
}

//==============================================================================
// CSS Display Module Level 3 - 2.4.
//==============================================================================

export type DisplayInternal =
    | { kind: "table-row-group" }
    | { kind: "table-header-group" }
    | { kind: "table-footer-group" }
    | { kind: "table-row" }
    | { kind: "table-cell" }
    | { kind: "table-column-group" }
    | { kind: "table-column" }
    | { kind: "table-caption" };
// TODO: ruby-base | ruby-text | ruby-base-container | ruby-text-container from Level 3.

function parseDisplayInternal(ts: TokenStream): DisplayInternal | undefined {
    if (ts.expectIdent("table-row-group")) {
        return { kind: "table-row-group" };
    }
    if (ts.expectIdent("table-header-group")) {
        return { kind: "table-header-group" };
    }
    if (ts.expectIdent("table-footer-group")) {
        return { kind: "table-header-group" };
    }
    if (ts.expectIdent("table-row")) {
        return { kind: "table-row" };
    }
    if (ts.expectIdent("table-cell")) {
        return { kind: "table-cell" };
    }
    if (ts.expectIdent("table-column-group")) {
        return { kind: "table-column-group" };
    }
    if (ts.expectIdent("table-column")) {
        return { kind: "table-column" };
    }
    if (ts.expectIdent("table-caption")) {
        return { kind: "table-caption" };
    }
    // TODO: Support ruby-base | ruby-text | ruby-base-container | ruby-text-container from Level 3.
    return undefined;
}

//==============================================================================
// CSS Display Module Level 3 - 2.5.
//==============================================================================

export type DisplayBox = { kind: "none" }; // TODO: contents from Level 3.

function parseDisplayBox(ts: TokenStream): DisplayBox | undefined {
    if (ts.expectIdent("none")) {
        return { kind: "none" };
    }
    // TODO: Support contents from Level 3.
    return undefined;
}
