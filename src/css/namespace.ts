// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import type { TokenStream } from "./syntax.js";

//==============================================================================
// CSS Namespaces Module Level 3 - 4.
//==============================================================================

// https://www.w3.org/TR/css3-namespace/#css-qualified-name
export type CSSQualifiedName = {
    namespace: string | undefined;
    localName: string;
};

export function parseCSSQualifiedName(
    ts: TokenStream,
): CSSQualifiedName | undefined {
    // STUB
    const oldCursor = ts.cursor;
    let name;
    if (ts.expectDelim("*")) {
        name = "*";
    } else {
        const ident = ts.expectToken("ident");
        if (ident === undefined) {
            ts.cursor = oldCursor;
            return undefined;
        }
        name = ident.value;
    }
    if (ts.expectDelim("|")) {
        // TODO: Support namespace prefix
        throw new Error("Not implemented yet");
    }
    return { namespace: undefined, localName: name };
}
export function serializeCSSQualifiedName(qname: CSSQualifiedName) {
    if (qname.namespace !== undefined) {
        return `${qname.namespace}|${qname.localName}`;
    }
    return qname.localName;
}
