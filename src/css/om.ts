// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import type { Document, Node } from "../dom.js";
import type { UnfinalizedPropertySet } from "./properties.js";
import type { Selector } from "./selector.js";
import type { Token } from "./syntax.js";

// NOTE: CSSOM is still in Working Draft stage!
//       Any of links below may stop working in the future!
//       (These are mostly for structural concepts of CSS and interaction with HTML)

export interface CSSStyleSheetProviderDOMNode extends Node {
    stylesheets: CSSStyleSheet[];
}

//==============================================================================
// CSS Object Model - 4.4.
//==============================================================================

// https://www.w3.org/TR/cssom-1/#the-medialist-interface
// STUB type
export type MediaList = unknown;

//==============================================================================
// CSS Object Model - 6.1.
//==============================================================================

// https://www.w3.org/TR/cssom-1/#css-style-sheet
export class CSSStyleSheet {
    type: string = "text/css";
    location: string | null = null;
    parentStyleSheet: CSSStyleSheet | null = null;
    ownerNode: CSSStyleSheetProviderDOMNode | null = null;
    ownerCSSRule: Rule | null = null;
    media: MediaList = null; // STUB
    title: string = "";
    alternateFlag: boolean = false;
    disabledFlag: boolean = false;
    cssRules: Rule[] = [];
    originCleanFlag: boolean;
    constructedFlag: boolean = false;
    disallowModificationFlag: boolean = false;
    constructorDocument: Document | null = null;
    stylesheetBaseURL: string | null = null;

    constructor({ originCleanFlag }: { originCleanFlag: boolean }) {
        this.originCleanFlag = originCleanFlag;
    }
}

//==============================================================================
// CSS Object Model - 6.2.
//==============================================================================

// https://www.w3.org/TR/cssom-1/#documentorshadowroot-document-or-shadow-root-css-style-sheets
function documentOrShadowRootCSSStyleSheets(): CSSStyleSheet[] {
    throw new Error("Not implemented yet");
}

function persistentCSSStylesheets(): CSSStyleSheet[] {
    const res = [];
    const sheets = documentOrShadowRootCSSStyleSheets();
    for (const sheet of sheets) {
        const title = sheet.title;
        if (title !== "" || sheet.alternateFlag) {
            continue;
        }
        res.push(sheet);
    }
    return res;
}

// https://www.w3.org/TR/cssom-1/#css-style-sheet-set
function cssStyleSheetSets(
    filter: (sheet: CSSStyleSheet) => boolean = () => true,
): CSSStyleSheetSet[] {
    const res = [];
    const titleMap = new Map();
    const sheets = documentOrShadowRootCSSStyleSheets();
    for (const sheet of sheets) {
        if (filter != null && !filter(sheet)) {
            continue;
        }
        const title = sheet.title;
        if (title === "") {
            continue;
        }
        let dest = titleMap.get(title);
        if (dest === undefined) {
            dest = new CSSStyleSheetSet();
            titleMap.set(title, dest);
            res.push(dest);
        }
        dest.list().add(sheet);
    }
    return res;
}

// https://www.w3.org/TR/cssom-1/#enable-a-css-style-sheet-set
function enableCSSStyleSheetSet(name: string): void {
    for (const set of cssStyleSheetSets()) {
        for (const sheet of set.list) {
            sheet.disabledFlag = true;
        }
    }
    if (name === "") {
        return;
    }
    for (const set of cssStyleSheetSets()) {
        for (const sheet of set.list) {
            sheet.disabledFlag = set.name() !== name;
        }
    }
}

export class StyleSheetSetManager {
    // https://www.w3.org/TR/cssom-1/#remove-a-css-style-sheet
    static removeCSSStyleSheet(sheet: CSSStyleSheet): void {
        if (sheet.ownerNode === null) {
            throw new Error("ownerNode must not be null");
        }

        // S1.
        sheet.ownerNode.stylesheets.splice(
            sheet.ownerNode.stylesheets.indexOf(sheet),
            1,
        );

        // S2.
        sheet.parentStyleSheet = null;
        sheet.ownerNode = null;
        sheet.ownerCSSRule = null;
    }

    // https://www.w3.org/TR/cssom-1/#add-a-css-style-sheet
    addCSSStyleSheet(sheet: CSSStyleSheet): void {
        if (sheet.ownerNode === null) {
            throw new Error("ownerNode must not be null");
        }

        // S1.
        sheet.ownerNode.stylesheets.push(sheet);
        // S2.
        if (sheet.disabledFlag) {
            return;
        }
        // S3.
        if (
            sheet.title !== "" &&
            !sheet.alternateFlag &&
            this.preferredCSSStyleSheetSetName === ""
        ) {
            this.changePreferredStylesheetSetName(sheet.title);
        }
        // S4.
        if (
            sheet.title === "" ||
            (this.lastCSSStylesheetSetName == null &&
                sheet.title === this.preferredCSSStyleSheetSetName) ||
            (this.lastCSSStylesheetSetName != null &&
                sheet.title === this.lastCSSStylesheetSetName)
        ) {
            sheet.disabledFlag = false;
            return;
        }
        // S5
        sheet.disabledFlag = true;
    }

    // https://www.w3.org/TR/cssom-1/#last-css-style-sheet-set-name
    lastCSSStylesheetSetName: string | null = null;

    // https://www.w3.org/TR/cssom-1/#preferred-css-style-sheet-set-name
    preferredCSSStyleSheetSetName: string = "";

    // https://www.w3.org/TR/cssom-1/#change-the-preferred-css-style-sheet-set-name
    changePreferredStylesheetSetName(name: string): void {
        const current = this.preferredCSSStyleSheetSetName;
        this.preferredCSSStyleSheetSetName = name;
        if (name !== current && this.lastCSSStylesheetSetName == null) {
            enableCSSStyleSheetSet(name);
        }
    }
}

// https://www.w3.org/TR/cssom-1/#css-style-sheet-set
class CSSStyleSheetSet {
    list: CSSStyleSheet[] = [];

    name(): string {
        const sheet = this.list[0];
        if (sheet === undefined) {
            throw Error("The set is empty");
        }
        return sheet.title;
    }
}

//==============================================================================
// Below doesn't follow the spec.. because spec wasn't very helpful in this case.
// Maybe I'll rewrite these when CSSOM becomes more mature.
//==============================================================================

export type Rule = AtRule | StyleRule;

// STUB type
export class AtRule {
    name: string;
    prelude: Token[];
    value: Token[];

    constructor(name: string, prelude: Token[], value: Token[]) {
        this.name = name;
        this.prelude = prelude;
        this.value = value;
    }
}

export class StyleRule {
    selector: Selector;
    declarations: StyleDeclaration[];
    atRules: AtRule[];

    constructor(
        selector: Selector,
        declarations: StyleDeclaration[],
        atRules: AtRule[],
    ) {
        this.selector = selector;
        this.declarations = declarations;
        this.atRules = atRules;
    }
}

export class StyleDeclaration {
    name: string;
    value: unknown;
    important: boolean;

    constructor(name: string, value: unknown, important: boolean) {
        this.name = name;
        this.value = value;
        this.important = important;
    }

    applyStyleRule(propertySet: UnfinalizedPropertySet): void {
        const prop = propertySet.list.get(this.name);
        if (prop !== undefined) {
            prop.value = this.value;
        }
    }
}
