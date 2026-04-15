// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { toASCIILowercase } from "../infra.js";
import {
    parseCSSQualifiedName,
    serializeCSSQualifiedName,
    type CSSQualifiedName,
} from "./namespace.js";
import { TokenStream } from "./syntax.js";

export interface SelectableElement {
    localName: string;

    attribute(namespace: string | null, localName: string): string | undefined;
    index(): number;
    pseudoClassList(): string[];
    language(): string;
    parentSelectableElement(): SelectableElement | null;
    prevSiblingSelectableElement(): SelectableElement | null;
    pseudoElementKind(): PseudoElementKind | undefined;
    shouldLowercaseTypeSelector(): boolean;
    shouldLowercaseAttributeSelectorName(): boolean;
    isAttributeValueCaseInsensitive(
        namespace: string | undefined,
        attributeName: string,
    ): boolean;
    isIDCaseInsensitive(): boolean;
    isClassCaseInsensitive(): boolean;
}

//==============================================================================
// Selectors Level 3 - 4.
//==============================================================================

type SelectorItem = {
    simpleSelector: SimpleSelector[];
    pseudoElement: PseudoElementKind | undefined;
};
export type Selector = { items: SelectorItem[]; combinators: Combinator[] };

function parseSelectorItem(ts: TokenStream): SelectorItem | undefined {
    const oldCursor = ts.cursor;
    const lhs = [];
    while (true) {
        const item = parseSimpleSelector(ts);
        if (item === undefined) {
            break;
        }
        if (lhs.length !== 0 && item.kind === "type") {
            ts.cursor = oldCursor;
            return undefined;
        }
        lhs.push(item);
    }
    if (lhs.length === 0) {
        ts.cursor = oldCursor;
        return undefined;
    }
    const pseudo = parsePseudoElement(ts);
    return { simpleSelector: lhs, pseudoElement: pseudo };
}
export function parseSelector(ts: TokenStream): Selector | undefined {
    const oldCursor = ts.cursor;
    const item = parseSelectorItem(ts);
    if (item === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    const items = [item];
    const combinators: Combinator[] = [];
    while (true) {
        const combinator = parseCombinator(ts);
        if (combinator === undefined) {
            break;
        }
        const item = parseSelectorItem(ts);
        if (item === undefined) {
            ts.cursor = oldCursor;
            return undefined;
        }
        items.push(item);
        combinators.push(combinator);
    }
    return { items, combinators };
}
export function serializeSelector(selector: Selector): string {
    return selector.items
        .map((s, i) => {
            const serialized = `${s.simpleSelector.map(serializeSimpleSelector).join("")}${s.pseudoElement ?? ""}`;
            const comb = selector.combinators[i];
            if (comb === undefined) {
                return serialized;
            }
            return `${serialized}${comb}`;
        })
        .join("");
}
export function matchSelector(selector: Selector, element: SelectableElement) {
    for (let i = selector.items.length - 1; 0 <= i; i--) {
        const rhs = selector.items[i]!;
        for (const sel of rhs.simpleSelector) {
            if (!matchSimpleSelector(sel, element)) {
                return false;
            }
        }
        if (element.pseudoElementKind() !== rhs.pseudoElement) {
            return false;
        }
        switch (selector.combinators[i - 1]) {
            case undefined:
                return true;
            case " ": {
                const lhs = selector.items[i - 1]!;
                const tempElement = element.parentSelectableElement();
                if (tempElement === null) {
                    // No more parent
                    return false;
                }
                let newElement = tempElement;
                while (true) {
                    let ok = true;
                    for (const sel of lhs.simpleSelector) {
                        if (!matchSimpleSelector(sel, newElement)) {
                            ok = false;
                            break;
                        }
                    }
                    if (newElement.pseudoElementKind() !== lhs.pseudoElement) {
                        ok = false;
                    }
                    if (ok) {
                        break;
                    }
                    const tempElement = newElement.parentSelectableElement();
                    if (tempElement === null) {
                        // No more parent
                        return false;
                    }
                    newElement = tempElement;
                }
                element = newElement;
                break;
            }
            case ">": {
                const newElement = element.parentSelectableElement();
                if (newElement === null) {
                    // No more parent
                    return false;
                }
                element = newElement;
                break;
            }
            case "+": {
                const newElement = element.prevSiblingSelectableElement();
                if (newElement === null) {
                    // No more siblings
                    return false;
                }
                element = newElement;
                break;
            }
        }
    }
}

type SimpleSelector =
    | TypeSelector
    | UniversalSelector
    | AttributeSelector
    | ClassSelector
    | IDSelector
    | PseudoClass;

function parseSimpleSelector(ts: TokenStream): SimpleSelector | undefined {
    return (
        parseTypeSelector(ts) ??
        parseUniversalSelector(ts) ??
        parseAttributeSelector(ts) ??
        parseClassSelector(ts) ??
        parseIDSelector(ts) ??
        parsePseudoClass(ts)
    );
}
function matchSimpleSelector(
    selector: SimpleSelector,
    element: SelectableElement,
): boolean {
    switch (selector.kind) {
        case "type":
            return matchTypeSelector(selector, element);
        case "universal":
            return matchUniversalSelector(selector, element);
        case "attribute":
            return matchAttributeSelector(selector, element);
        case "class":
            return matchClassSelector(selector, element);
        case "id":
            return matchIDSelector(selector, element);
        case "pseudo-class":
            return matchPseudoClass(selector, element);
    }
}
function serializeSimpleSelector(selector: SimpleSelector): string {
    switch (selector.kind) {
        case "type":
            return serializeTypeSelector(selector);
        case "universal":
            return serializeUniversalSelector(selector);
        case "attribute":
            return serializeAttributeSelector(selector);
        case "class":
            return serializeClassSelector(selector);
        case "id":
            return serializeIDSelector(selector);
        case "pseudo-class":
            return serializePseudoClass(selector);
    }
}

//==============================================================================
// Selectors Level 3 - 6.1.
//==============================================================================

type TypeSelector = { kind: "type"; name: CSSQualifiedName };

function parseTypeSelector(ts: TokenStream): TypeSelector | undefined {
    const oldCursor = ts.cursor;
    const value = parseCSSQualifiedName(ts);
    if (value === undefined || value.localName === "*") {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { kind: "type", name: value };
}
function matchTypeSelector(selector: TypeSelector, element: SelectableElement) {
    if (selector.name.namespace !== undefined) {
        throw new Error("Not implemented yet");
    }
    if (element.shouldLowercaseTypeSelector()) {
        return element.localName === toASCIILowercase(selector.name.localName);
    }
    return element.localName === selector.name.localName;
}
function serializeTypeSelector(selector: TypeSelector) {
    return serializeCSSQualifiedName(selector.name);
}

//==============================================================================
// Selectors Level 3 - 6.2.
//==============================================================================

type UniversalSelector = {
    kind: "universal";
    namespace: string | undefined;
};

function parseUniversalSelector(
    ts: TokenStream,
): UniversalSelector | undefined {
    const oldCursor = ts.cursor;
    const v = parseCSSQualifiedName(ts);
    if (v === undefined || v.localName !== "*") {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { kind: "universal", namespace: v.namespace };
}
function matchUniversalSelector(
    selector: UniversalSelector,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    element: SelectableElement,
) {
    if (selector.namespace !== undefined) {
        throw new Error("Not implemented yet");
    }
    return true;
}
function serializeUniversalSelector(selector: UniversalSelector) {
    if (selector.namespace !== undefined) {
        return `${selector.namespace}|*`;
    }
    return "*";
}

//==============================================================================
// Selectors Level 3 - 6.3.
//==============================================================================

type AttributeSelector =
    // 6.3.1 ===================================================================
    | { kind: "attribute"; name: CSSQualifiedName; op: undefined }
    | { kind: "attribute"; name: CSSQualifiedName; op: "="; value: string }
    | { kind: "attribute"; name: CSSQualifiedName; op: "~="; value: string }
    | { kind: "attribute"; name: CSSQualifiedName; op: "|="; value: string };
// 6.3.2 ===================================================================
// TODO: ^=, $=, *= (CSS3 additions)

function parseAttributeSelector(
    ts: TokenStream,
): AttributeSelector | undefined {
    const oldCursor = ts.cursor;
    const simpleBlock = ts.expectSimpleBlock("[");
    if (simpleBlock === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    const innerTs = new TokenStream(simpleBlock.value);

    // [ <name> ] ----------------------------------------------------------
    // [ <name> operand value ] --------------------------------------------
    innerTs.skipWhitespaces();
    const name = parseCSSQualifiedName(innerTs);
    if (name === undefined) {
        return undefined;
    }
    let op: AttributeSelector["op"];

    innerTs.skipWhitespaces();
    if (innerTs.isEnd()) {
        if (!innerTs.isEnd()) {
            ts.cursor = oldCursor;
            return undefined;
        }
        return { kind: "attribute", name, op: undefined };
    } else {
        // [ name <operand> value ] ----------------------------------------
        if (innerTs.expectDelim("=")) {
            op = "=";
        } else if (innerTs.expectDelim("~")) {
            if (!innerTs.expectDelim("=")) {
                ts.cursor = oldCursor;
                return undefined;
            }
            op = "~=";
        } else if (innerTs.expectDelim("|")) {
            if (!innerTs.expectDelim("=")) {
                ts.cursor = oldCursor;
                return undefined;
            }
            op = "|=";
        }
        // [ name operand <value> ] ----------------------------------------
        innerTs.skipWhitespaces();
        const ident = innerTs.expectToken("ident");
        let value;
        if (ident != undefined) {
            value = ident.value;
        } else {
            const str = innerTs.expectToken("string");
            if (str != undefined) {
                value = str.value;
            } else {
                ts.cursor = oldCursor;
                return undefined;
            }
        }
        if (!innerTs.isEnd()) {
            ts.cursor = oldCursor;
            return undefined;
        }
        return { kind: "attribute", name, op, value };
    }
}

function matchAttributeSelector(
    selector: AttributeSelector,
    element: SelectableElement,
) {
    if (selector.name.namespace !== undefined) {
        throw new Error("Not implemented yet");
    }
    const localName = element.shouldLowercaseAttributeSelectorName()
        ? toASCIILowercase(selector.name.localName)
        : selector.name.localName;
    let val = element.attribute(null, localName);
    if (val === undefined) {
        return false;
    }
    const isCaseInsensitive = element.isAttributeValueCaseInsensitive(
        selector.name.namespace,
        localName,
    );
    if (isCaseInsensitive) {
        val = toASCIILowercase(val);
    }
    if (selector.op === undefined) {
        return true;
    }
    const selectorValue = isCaseInsensitive
        ? toASCIILowercase(selector.value)
        : selector.value;
    switch (selector.op) {
        case "=":
            return val === selectorValue;
        case "~=":
            return val !== "" && 0 <= val.split(" ").indexOf(selectorValue);
        case "|=":
            return val === selectorValue || val.startsWith(`${selectorValue}-`);
    }
}
function serializeAttributeSelector(selector: AttributeSelector) {
    if (selector.op === undefined) {
        return `[${serializeCSSQualifiedName(selector.name)}]`;
    }
    return `[${serializeCSSQualifiedName(selector.name)}${selector.op}${selector.value}]`;
}

//==============================================================================
// Selectors Level 3 - 6.4.
//==============================================================================
type ClassSelector = { kind: "class"; name: string };

function parseClassSelector(ts: TokenStream): ClassSelector | undefined {
    const oldCursor = ts.cursor;
    if (!ts.expectDelim(".")) {
        ts.cursor = oldCursor;
        return undefined;
    }
    const ident = ts.expectToken("ident");
    if (ident === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { kind: "class", name: ident.value };
}
function matchClassSelector(
    selector: ClassSelector,
    element: SelectableElement,
) {
    let attrVal = element.attribute(null, "class");
    if (attrVal === undefined || attrVal === "") {
        return false;
    }
    let className = selector.name;
    if (element.isClassCaseInsensitive()) {
        attrVal = toASCIILowercase(attrVal);
        className = toASCIILowercase(className);
    }
    return 0 <= attrVal.split(" ").indexOf(className);
}
function serializeClassSelector(selector: ClassSelector) {
    return `.${selector.name}`;
}

//==============================================================================
// Selectors Level 3 - 6.5.
//==============================================================================
type IDSelector = { kind: "id"; name: string };

function parseIDSelector(ts: TokenStream): IDSelector | undefined {
    const oldCursor = ts.cursor;
    const hash = ts.expectToken("hash");
    if (hash === undefined || hash.type !== "id") {
        ts.cursor = oldCursor;
        return undefined;
    }
    return { kind: "id", name: hash.value };
}
function matchIDSelector(selector: IDSelector, element: SelectableElement) {
    let attrVal = element.attribute(null, "id");
    if (attrVal === undefined) {
        return false;
    }
    let id = selector.name;
    if (element.isIDCaseInsensitive()) {
        attrVal = toASCIILowercase(attrVal);
        id = toASCIILowercase(id);
    }
    return attrVal === id;
}
function serializeIDSelector(selector: IDSelector) {
    return `#${selector.name}`;
}

//==============================================================================
// Selectors Level 3 - 6.6.
//==============================================================================

type PseudoClass =
    // 6.6.1.1 =================================================================
    | { kind: "pseudo-class"; name: ":link" }
    | { kind: "pseudo-class"; name: ":visited" }
    // 6.6.1.2 =================================================================
    | { kind: "pseudo-class"; name: ":active" }
    | { kind: "pseudo-class"; name: ":hover" }
    | { kind: "pseudo-class"; name: ":focus" }
    // 6.6.2. ==================================================================
    // TODO: :target
    // 6.6.3. ==================================================================
    | { kind: "pseudo-class"; name: ":lang"; lang: string }
    // 6.6.4.1. ================================================================
    // TODO: :enabled, :disabled
    // 6.6.4.2. ================================================================
    // TODO: :checked
    // 6.6.4.3. ================================================================
    // TODO: :indeterminate
    // 6.6.5.1. ================================================================
    // TODO: :root
    // 6.6.5.2. ================================================================
    // TODO: :nth-child()
    // 6.6.5.3. ================================================================
    // TODO: :nth-last-child()
    // 6.6.5.4. ================================================================
    // TODO: :nth-of-type()
    // 6.6.5.5. ================================================================
    // TODO: :nth-last-of-type()
    // 6.6.5.6. ================================================================
    | { kind: "pseudo-class"; name: ":first-child" };
// 6.6.5.7. ================================================================
// TODO: :first-child
// 6.6.5.8. ================================================================
// TODO: :first-of-type
// 6.6.5.9. ================================================================
// TODO: :last-of-type
// 6.6.5.10. ===============================================================
// TODO: :only-child
// 6.6.5.11. ===============================================================
// TODO: :only-of-type
// 6.6.5.12. ===============================================================
// TODO: :empty

function parsePseudoClass(ts: TokenStream): PseudoClass | undefined {
    const oldCursor = ts.cursor;
    if (ts.expectToken("colon") === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    if (ts.expectIdent("link")) {
        return { kind: "pseudo-class", name: ":link" };
    }
    if (ts.expectIdent("visited")) {
        return { kind: "pseudo-class", name: ":visited" };
    }
    if (ts.expectIdent("active")) {
        return { kind: "pseudo-class", name: ":active" };
    }
    if (ts.expectIdent("hover")) {
        return { kind: "pseudo-class", name: ":hover" };
    }
    if (ts.expectIdent("focus")) {
        return { kind: "pseudo-class", name: ":focus" };
    }
    const func = ts.expectFunction("lang");
    if (func !== undefined) {
        const innerTs = new TokenStream(func.value);
        const ident = innerTs.expectToken("ident");
        if (ident === undefined) {
            ts.cursor = oldCursor;
            return undefined;
        }
        return { kind: "pseudo-class", name: ":lang", lang: ident.value };
    }
    if (ts.expectIdent("first-child")) {
        return { kind: "pseudo-class", name: ":first-child" };
    }
    ts.cursor = oldCursor;
    return undefined;
}

function matchPseudoClass(
    selector: PseudoClass,
    element: SelectableElement,
): boolean {
    switch (selector.name) {
        case ":first-child":
            return element.index() === 0;
        case ":lang":
            return (
                element.language() === selector.lang ||
                element.language().startsWith(`${selector.lang}-`)
            );
        case ":link":
        case ":visited":
        case ":active":
        case ":hover":
        case ":focus":
            return 0 < element.pseudoClassList().indexOf(selector.name);
    }
}
function serializePseudoClass(selector: PseudoClass): string {
    switch (selector.name) {
        case ":lang":
            return `${selector.name}(${selector.lang})`;
        case ":link":
        case ":visited":
        case ":active":
        case ":hover":
        case ":focus":
        case ":first-child":
            return `${selector.name}`;
    }
}

//==============================================================================
// Selectors Level 3 - 7.
//==============================================================================

export type PseudoElementKind =
    // 7.1. ====================================================================
    | "::first-line"
    // 7.2. ====================================================================
    | "::first-letter"
    // 7.4. ====================================================================
    | "::before"
    | "::after";

function parsePseudoElement(ts: TokenStream): PseudoElementKind | undefined {
    const oldCursor = ts.cursor;
    if (ts.expectToken("colon") === undefined) {
        ts.cursor = oldCursor;
        return undefined;
    }
    // We ignore the result so that we can accept both : and ::
    ts.expectToken("colon");

    if (ts.expectIdent("first-line")) {
        return "::first-line";
    }
    if (ts.expectIdent("first-letter")) {
        return "::first-letter";
    }
    if (ts.expectIdent("before")) {
        return "::before";
    }
    if (ts.expectIdent("after")) {
        return "::after";
    }
    ts.cursor = oldCursor;
    return undefined;
}

//==============================================================================
// Selectors Level 3 - 8.
//==============================================================================

type Combinator =
    // 8.1. ====================================================================
    | " "
    // 8.2. ====================================================================
    | ">"
    // 8.3.1. ==================================================================
    | "+";
// 8.3.2. ==================================================================
// TODO: "~"

function parseCombinator(ts: TokenStream): Combinator | undefined {
    const oldCursor = ts.cursor;
    let whitespaceSeen = false;

    if (ts.expectToken("whitespace")) {
        ts.skipWhitespaces();
        whitespaceSeen = true;
    }
    if (ts.expectDelim(">")) {
        ts.skipWhitespaces();
        return ">";
    }
    if (ts.expectDelim("+")) {
        ts.skipWhitespaces();
        return "+";
    }
    if (whitespaceSeen) {
        return " ";
    }
    ts.cursor = oldCursor;
    return undefined;
}

//==============================================================================
// Selectors Level 3 - 9.
//==============================================================================

export function caluclateSelectorSpecificity(selector: Selector) {
    const items = selector.items;

    let a = 0;
    for (const { simpleSelector } of items) {
        a += simpleSelector.filter((s) => s.kind === "id").length;
    }

    let b = 0;
    for (const { simpleSelector } of items) {
        b += simpleSelector.filter(
            (s) =>
                s.kind === "class" ||
                s.kind === "attribute" ||
                s.kind === "pseudo-class",
        ).length;
    }

    let c = 0;
    for (const { simpleSelector, pseudoElement } of items) {
        c += simpleSelector.filter((s) => s.kind === "type").length;
        c += pseudoElement !== undefined ? 1 : 0;
    }

    return a * 100 + b * 10 + c;
}
