// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    Comment,
    Document,
    DocumentType,
    Element,
    Text,
    type Node,
} from "../../dom.js";
import elementInterfaceFor from "../../element_interface_for.js";
import {
    HTML_NAMESPACE,
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    XLINK_NAMESPACE,
    XML_NAMESPACE,
    XMLNS_NAMESPACE,
    isASCIICaseInsensitiveMatch,
    isASCIIWhitespace,
    toASCIILowercase,
} from "../../infra.js";
import { hasPrefixASCIICaseInsensitive, toCodePoint } from "../../utility.js";
import {
    isFormAssociatedCustomElement,
    lookupCustomElementDefinition,
} from "../custom_elements.js";
import {
    isFormAssociatedElement,
    isListedElement,
    isResettableElement,
} from "../forms.js";
import {
    tokenize,
    type Token,
    type TokenFor,
    type Tokenizer,
} from "./token.js";

type ActiveFormattingElement = "marker" | Element;

type InsertionMode =
    | "initial"
    | "before html"
    | "before head"
    | "in head"
    | "in head noscript"
    | "after head"
    | "in body"
    | "text"
    | "in table"
    | "in table text"
    | "in caption"
    | "in column group"
    | "in table body"
    | "in row"
    | "in cell"
    | "in template"
    | "after body"
    | "in frameset"
    | "after frameset"
    | "after after body"
    | "after after frameset";

type InsertionLocation = { rel: "after last child"; parentNode: Node };

function tagAttributeEquals(
    token: TokenFor<"tag">,
    attr: string,
    value: string,
): boolean {
    for (const data of token.attributes) {
        if (data.localName !== attr) {
            continue;
        }
        return isASCIICaseInsensitiveMatch(data.value, value);
    }
    return false;
}

function tagAttribute(
    token: TokenFor<"tag">,
    attr: string,
): string | undefined {
    for (const data of token.attributes) {
        if (data.localName !== attr) {
            continue;
        }
        return data.value;
    }
    return undefined;
}

function insertAtLocation(node: Node, location: InsertionLocation) {
    switch (location.rel) {
        case "after last child":
            location.parentNode.appendChild(node);
            break;
        default:
            throw new Error("not implemented yet");
    }
}

function unexpectedToken(token: Token) {
    console.trace("WARNING: potential bug: unexpected token:", token);
}

class Parser {
    document: Document = new Document();
    isFragmentParsing = false;
    runParser = true;
    ignoreNextNewline = false;
    // We don't have speculative parsing support, so this is mostly just a placeholder, just in case decide to we support it later.
    hasActiveSpeculativeParser = false;

    reprocessToken(tkr: Tokenizer, token: Token) {
        this.useRulesFor(this.insertionMode, tkr, token);
    }

    //==========================================================================
    // HTML Standard - 13.2.4.1.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#insertion-mode
    insertionMode: InsertionMode = "initial";

    // https://html.spec.whatwg.org/multipage/parsing.html#using-the-rules-for
    useRulesFor(mode: InsertionMode, tkr: Tokenizer, token: Token) {
        switch (mode) {
            case "initial":
                this.#imodeInitial(tkr, token);
                break;
            case "before html":
                this.#imodeBeforeHtml(tkr, token);
                break;
            case "before head":
                this.#imodeBeforeHead(tkr, token);
                break;
            case "in head":
                this.#imodeInHead(tkr, token);
                break;
            case "in head noscript":
                this.#imodeInHeadNoscript(tkr, token);
                break;
            case "after head":
                this.#imodeAfterHead(tkr, token);
                break;
            case "in body":
                this.#imodeInBody(tkr, token);
                break;
            case "text":
                this.#imodeText(tkr, token);
                break;
            case "in table":
                this.#imodeInTable(tkr, token);
                break;
            case "in table text":
                this.#imodeInTableText(tkr, token);
                break;
            case "in caption":
                this.#imodeInCaption(tkr, token);
                break;
            case "in column group":
                this.#imodeInColumnGroup(tkr, token);
                break;
            case "in table body":
                this.#imodeInTableBody(tkr, token);
                break;
            case "in row":
                this.#imodeInRow(tkr, token);
                break;
            case "in cell":
                this.#imodeInCell(tkr, token);
                break;
            case "in template":
                this.#imodeInTemplate(tkr, token);
                break;
            case "after body":
                this.#imodeAfterBody(tkr, token);
                break;
            case "in frameset":
                this.#imodeInFrameset(tkr, token);
                break;
            case "after frameset":
                this.#imodeAfterFrameset(tkr, token);
                break;
            case "after after body":
                this.#imodeAfterAfterBody(tkr, token);
                break;
            case "after after frameset":
                this.#imodeAfterAfterFrameset(tkr, token);
                break;
            default:
                throw new Error("bad mode value");
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#original-insertion-mode
    originalInsertionMode: InsertionMode = "initial"; // DUMMY

    // https://html.spec.whatwg.org/multipage/parsing.html#stack-of-template-insertion-modes
    stackOfTemplateInsertionModes: InsertionMode[] = [];

    // https://html.spec.whatwg.org/multipage/parsing.html#reset-the-insertion-mode-appropriately
    resetInsertionModeAppropriately() {
        throw new Error("not yet implemented");
    }

    //==========================================================================
    // HTML Standard - 13.2.4.2.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#stack-of-open-elements
    stackOfOpenElements: Element[] = [];

    // https://html.spec.whatwg.org/multipage/parsing.html#current-node
    currentNode(): Element {
        return this.stackOfOpenElementsNodeAt(-1);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#adjusted-current-node
    adjustedCurrentNode(): Element {
        if (this.isFragmentParsing) {
            throw new Error("not yet implemented");
        }
        return this.currentNode();
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#special
    isSpecialElement(element: Element): boolean {
        const SPECIAL_ELEMENTS = [
            { namespace: HTML_NAMESPACE, localName: "address" },
            { namespace: HTML_NAMESPACE, localName: "applet" },
            { namespace: HTML_NAMESPACE, localName: "area" },
            { namespace: HTML_NAMESPACE, localName: "article" },
            { namespace: HTML_NAMESPACE, localName: "aside" },
            { namespace: HTML_NAMESPACE, localName: "base" },
            { namespace: HTML_NAMESPACE, localName: "basefont" },
            { namespace: HTML_NAMESPACE, localName: "bgsound" },
            { namespace: HTML_NAMESPACE, localName: "blockquote" },
            { namespace: HTML_NAMESPACE, localName: "body" },
            { namespace: HTML_NAMESPACE, localName: "br" },
            { namespace: HTML_NAMESPACE, localName: "button" },
            { namespace: HTML_NAMESPACE, localName: "caption" },
            { namespace: HTML_NAMESPACE, localName: "center" },
            { namespace: HTML_NAMESPACE, localName: "col" },
            { namespace: HTML_NAMESPACE, localName: "colgroup" },
            { namespace: HTML_NAMESPACE, localName: "dd" },
            { namespace: HTML_NAMESPACE, localName: "details" },
            { namespace: HTML_NAMESPACE, localName: "dir" },
            { namespace: HTML_NAMESPACE, localName: "div" },
            { namespace: HTML_NAMESPACE, localName: "dl" },
            { namespace: HTML_NAMESPACE, localName: "dt" },
            { namespace: HTML_NAMESPACE, localName: "embed" },
            { namespace: HTML_NAMESPACE, localName: "fieldset" },
            { namespace: HTML_NAMESPACE, localName: "figcaption" },
            { namespace: HTML_NAMESPACE, localName: "figure" },
            { namespace: HTML_NAMESPACE, localName: "footer" },
            { namespace: HTML_NAMESPACE, localName: "form" },
            { namespace: HTML_NAMESPACE, localName: "frame" },
            { namespace: HTML_NAMESPACE, localName: "frameset" },
            { namespace: HTML_NAMESPACE, localName: "h1" },
            { namespace: HTML_NAMESPACE, localName: "h2" },
            { namespace: HTML_NAMESPACE, localName: "h3" },
            { namespace: HTML_NAMESPACE, localName: "h4" },
            { namespace: HTML_NAMESPACE, localName: "h5" },
            { namespace: HTML_NAMESPACE, localName: "h6" },
            { namespace: HTML_NAMESPACE, localName: "head" },
            { namespace: HTML_NAMESPACE, localName: "header" },
            { namespace: HTML_NAMESPACE, localName: "hgroup" },
            { namespace: HTML_NAMESPACE, localName: "hr" },
            { namespace: HTML_NAMESPACE, localName: "html" },
            { namespace: HTML_NAMESPACE, localName: "iframe" },
            { namespace: HTML_NAMESPACE, localName: "img" },
            { namespace: HTML_NAMESPACE, localName: "input" },
            { namespace: HTML_NAMESPACE, localName: "keygen" },
            { namespace: HTML_NAMESPACE, localName: "li" },
            { namespace: HTML_NAMESPACE, localName: "link" },
            { namespace: HTML_NAMESPACE, localName: "listing" },
            { namespace: HTML_NAMESPACE, localName: "main" },
            { namespace: HTML_NAMESPACE, localName: "marquee" },
            { namespace: HTML_NAMESPACE, localName: "menu" },
            { namespace: HTML_NAMESPACE, localName: "meta" },
            { namespace: HTML_NAMESPACE, localName: "nav" },
            { namespace: HTML_NAMESPACE, localName: "noembed" },
            { namespace: HTML_NAMESPACE, localName: "noframes" },
            { namespace: HTML_NAMESPACE, localName: "noscript" },
            { namespace: HTML_NAMESPACE, localName: "object" },
            { namespace: HTML_NAMESPACE, localName: "ol" },
            { namespace: HTML_NAMESPACE, localName: "p" },
            { namespace: HTML_NAMESPACE, localName: "param" },
            { namespace: HTML_NAMESPACE, localName: "plaintext" },
            { namespace: HTML_NAMESPACE, localName: "pre" },
            { namespace: HTML_NAMESPACE, localName: "script" },
            { namespace: HTML_NAMESPACE, localName: "search" },
            { namespace: HTML_NAMESPACE, localName: "section" },
            { namespace: HTML_NAMESPACE, localName: "select" },
            { namespace: HTML_NAMESPACE, localName: "source" },
            { namespace: HTML_NAMESPACE, localName: "style" },
            { namespace: HTML_NAMESPACE, localName: "summary" },
            { namespace: HTML_NAMESPACE, localName: "table" },
            { namespace: HTML_NAMESPACE, localName: "tbody" },
            { namespace: HTML_NAMESPACE, localName: "td" },
            { namespace: HTML_NAMESPACE, localName: "template" },
            { namespace: HTML_NAMESPACE, localName: "textarea" },
            { namespace: HTML_NAMESPACE, localName: "tfoot" },
            { namespace: HTML_NAMESPACE, localName: "th" },
            { namespace: HTML_NAMESPACE, localName: "thead" },
            { namespace: HTML_NAMESPACE, localName: "title" },
            { namespace: HTML_NAMESPACE, localName: "tr" },
            { namespace: HTML_NAMESPACE, localName: "track" },
            { namespace: HTML_NAMESPACE, localName: "ul" },
            { namespace: HTML_NAMESPACE, localName: "wbr" },
            { namespace: HTML_NAMESPACE, localName: "xmp" },

            { namespace: MATHML_NAMESPACE, localName: "mi" },
            { namespace: MATHML_NAMESPACE, localName: "mo" },
            { namespace: MATHML_NAMESPACE, localName: "mn" },
            { namespace: MATHML_NAMESPACE, localName: "ms" },
            { namespace: MATHML_NAMESPACE, localName: "mtext" },
            { namespace: MATHML_NAMESPACE, localName: "annotation-xml" },

            { namespace: SVG_NAMESPACE, localName: "foreignObject" },
            { namespace: SVG_NAMESPACE, localName: "desc" },
            { namespace: SVG_NAMESPACE, localName: "title" },
        ];

        for (const entry of SPECIAL_ELEMENTS) {
            if (element.isElement(entry.namespace, entry.localName)) {
                return true;
            }
        }
        return false;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#formatting
    isFormattingElement(element: Element): boolean {
        const SPECIAL_ELEMENTS = [
            { namespace: HTML_NAMESPACE, localName: "a" },
            { namespace: HTML_NAMESPACE, localName: "b" },
            { namespace: HTML_NAMESPACE, localName: "big" },
            { namespace: HTML_NAMESPACE, localName: "code" },
            { namespace: HTML_NAMESPACE, localName: "em" },
            { namespace: HTML_NAMESPACE, localName: "font" },
            { namespace: HTML_NAMESPACE, localName: "i" },
            { namespace: HTML_NAMESPACE, localName: "nobr" },
            { namespace: HTML_NAMESPACE, localName: "s" },
            { namespace: HTML_NAMESPACE, localName: "small" },
            { namespace: HTML_NAMESPACE, localName: "strike" },
            { namespace: HTML_NAMESPACE, localName: "strong" },
            { namespace: HTML_NAMESPACE, localName: "tt" },
            { namespace: HTML_NAMESPACE, localName: "u" },
        ];

        for (const entry of SPECIAL_ELEMENTS) {
            if (element.isElement(entry.localName, entry.localName)) {
                return true;
            }
        }
        return false;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#formatting
    isOrdinaryElement(element: Element): boolean {
        return (
            !this.isSpecialElement(element) &&
            !this.isFormattingElement(element)
        );
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-the-specific-scope
    hasElementInSpecificScope(
        types: { namespace: string; localName: string }[],
        test: (e: Element) => boolean,
    ): boolean {
        let elemIdx = this.stackOfOpenElements.length - 1;
        while (true) {
            const element = this.stackOfOpenElementsNodeAt(elemIdx);
            if (test(element)) {
                return true;
            }
            for (const type of types) {
                if (element.isElement(type.namespace, type.localName)) {
                    return false;
                }
            }
            elemIdx--;
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-scope
    hasElementInScope(test: (e: Element) => boolean): boolean {
        const TYPES = [
            { namespace: HTML_NAMESPACE, localName: "applet" },
            { namespace: HTML_NAMESPACE, localName: "caption" },
            { namespace: HTML_NAMESPACE, localName: "html" },
            { namespace: HTML_NAMESPACE, localName: "table" },
            { namespace: HTML_NAMESPACE, localName: "td" },
            { namespace: HTML_NAMESPACE, localName: "th" },
            { namespace: HTML_NAMESPACE, localName: "marquee" },
            { namespace: HTML_NAMESPACE, localName: "object" },
            { namespace: HTML_NAMESPACE, localName: "select" },
            { namespace: HTML_NAMESPACE, localName: "template" },
            { namespace: MATHML_NAMESPACE, localName: "mi" },
            { namespace: MATHML_NAMESPACE, localName: "mo" },
            { namespace: MATHML_NAMESPACE, localName: "mn" },
            { namespace: MATHML_NAMESPACE, localName: "ms" },
            { namespace: MATHML_NAMESPACE, localName: "mtext" },
            { namespace: MATHML_NAMESPACE, localName: "annotation-xml" },
            { namespace: SVG_NAMESPACE, localName: "foreignObject" },
            { namespace: SVG_NAMESPACE, localName: "desc" },
            { namespace: SVG_NAMESPACE, localName: "title" },
        ];
        return this.hasElementInSpecificScope(TYPES, test);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-list-item-scope
    hasElementInListItemScope(test: (e: Element) => boolean): boolean {
        const TYPES = [
            { namespace: HTML_NAMESPACE, localName: "ol" },
            { namespace: HTML_NAMESPACE, localName: "ul" },
            // Below are the same as above "element scope"
            { namespace: HTML_NAMESPACE, localName: "applet" },
            { namespace: HTML_NAMESPACE, localName: "caption" },
            { namespace: HTML_NAMESPACE, localName: "html" },
            { namespace: HTML_NAMESPACE, localName: "table" },
            { namespace: HTML_NAMESPACE, localName: "td" },
            { namespace: HTML_NAMESPACE, localName: "th" },
            { namespace: HTML_NAMESPACE, localName: "marquee" },
            { namespace: HTML_NAMESPACE, localName: "object" },
            { namespace: HTML_NAMESPACE, localName: "select" },
            { namespace: HTML_NAMESPACE, localName: "template" },
            { namespace: MATHML_NAMESPACE, localName: "mi" },
            { namespace: MATHML_NAMESPACE, localName: "mo" },
            { namespace: MATHML_NAMESPACE, localName: "mn" },
            { namespace: MATHML_NAMESPACE, localName: "ms" },
            { namespace: MATHML_NAMESPACE, localName: "mtext" },
            { namespace: MATHML_NAMESPACE, localName: "annotation-xml" },
            { namespace: SVG_NAMESPACE, localName: "foreignObject" },
            { namespace: SVG_NAMESPACE, localName: "desc" },
            { namespace: SVG_NAMESPACE, localName: "title" },
        ];
        return this.hasElementInSpecificScope(TYPES, test);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-button-scope
    hasElementInButtonScope(test: (e: Element) => boolean): boolean {
        const TYPES = [
            { namespace: HTML_NAMESPACE, localName: "button" },
            // Below are the same as above "element scope"
            { namespace: HTML_NAMESPACE, localName: "applet" },
            { namespace: HTML_NAMESPACE, localName: "caption" },
            { namespace: HTML_NAMESPACE, localName: "html" },
            { namespace: HTML_NAMESPACE, localName: "table" },
            { namespace: HTML_NAMESPACE, localName: "td" },
            { namespace: HTML_NAMESPACE, localName: "th" },
            { namespace: HTML_NAMESPACE, localName: "marquee" },
            { namespace: HTML_NAMESPACE, localName: "object" },
            { namespace: HTML_NAMESPACE, localName: "select" },
            { namespace: HTML_NAMESPACE, localName: "template" },
            { namespace: MATHML_NAMESPACE, localName: "mi" },
            { namespace: MATHML_NAMESPACE, localName: "mo" },
            { namespace: MATHML_NAMESPACE, localName: "mn" },
            { namespace: MATHML_NAMESPACE, localName: "ms" },
            { namespace: MATHML_NAMESPACE, localName: "mtext" },
            { namespace: MATHML_NAMESPACE, localName: "annotation-xml" },
            { namespace: SVG_NAMESPACE, localName: "foreignObject" },
            { namespace: SVG_NAMESPACE, localName: "desc" },
            { namespace: SVG_NAMESPACE, localName: "title" },
        ];
        return this.hasElementInSpecificScope(TYPES, test);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#has-an-element-in-table-scope
    hasElementInTableScope(test: (e: Element) => boolean): boolean {
        const TYPES = [
            { namespace: HTML_NAMESPACE, localName: "html" },
            { namespace: HTML_NAMESPACE, localName: "table" },
            { namespace: HTML_NAMESPACE, localName: "template" },
        ];
        return this.hasElementInSpecificScope(TYPES, test);
    }

    /*
     * Returns an item from stack of open elements.
     * - 0 or positive index starts from the top of the stack (first pushed item first).
     * - Negative index starts from the bottom of the stack (most recent item first).
     */
    stackOfOpenElementsNodeAt(idx: number): Element {
        let res;
        if (0 <= idx) {
            res = this.stackOfOpenElements[idx];
        } else if (idx < 0) {
            res =
                this.stackOfOpenElements[this.stackOfOpenElements.length + idx];
        }
        if (res === undefined) {
            throw Error(`${idx} is not valid index`);
        }
        return res;
    }

    pushToStackOfOpenElements(element: Element) {
        this.stackOfOpenElements.push(element);
    }

    popFromStackOfOpenElements(): Element {
        // TODO: https://html.spec.whatwg.org/multipage/parsing.html#the-stack-of-open-elements
        // When the current node is removed from the stack of open elements, process internal resource links given the current node's node document.

        const element = this.stackOfOpenElements.pop();
        if (element === undefined) {
            throw Error("SOE was empty!");
        }
        element.onPoppedFromStackOfOpenElements();

        return element;
    }

    removeFromStackOfOpenElements(idx: number): Element {
        // TODO: https://html.spec.whatwg.org/multipage/parsing.html#the-stack-of-open-elements
        // When the current node is removed from the stack of open elements, process internal resource links given the current node's node document.
        const element = this.stackOfOpenElements.splice(idx, 1);
        if (element === undefined || element[0] === undefined) {
            throw Error(`No element was there at SOE index ${idx}`);
        }
        element[0].onPoppedFromStackOfOpenElements();
        return element[0];
    }

    stackOfOpenElementsContainsHTMLElement(tagName: string): boolean {
        for (let i = 0; i < this.stackOfOpenElements.length; i++) {
            const elem = this.stackOfOpenElementsNodeAt(i);
            if (
                elem instanceof Element &&
                elem.isElement(HTML_NAMESPACE, tagName)
            ) {
                return true;
            }
        }
        return false;
    }

    //==========================================================================
    // HTML Standard - 13.2.4.3.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#list-of-active-formatting-elements
    listOfActiveFormattingElements: ActiveFormattingElement[] = [];

    // https://html.spec.whatwg.org/multipage/parsing.html#push-onto-the-list-of-active-formatting-elements
    pushOntoListOfActiveFormattingElements(element: Element) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.03)

        // S1.
        const lastMarkerIndex =
            this.listOfActiveFormattingElements.lastIndexOf("marker");
        let checkStartIndex = 0;
        if (0 <= lastMarkerIndex) {
            checkStartIndex = lastMarkerIndex + 1;
        }
        const matchingItemIndices = [];
        for (
            let i = checkStartIndex;
            i < this.listOfActiveFormattingElements.length;
            i++
        ) {
            let match = true;
            const otherElem = this.listOfActiveFormattingElements[i];
            if (!(otherElem instanceof Element)) {
                throw Error(`expected element, got ${otherElem}`);
            }
            check: {
                if (element.localName !== otherElem.localName) {
                    match = false;
                    break check;
                }
                if (element.namespace !== otherElem.namespace) {
                    match = false;
                    break check;
                }
                const attrs = element.attributeList;
                const attrsLen = element.attributeList.length;
                const otherAttrs = otherElem.attributeList;
                const otherAttrsLen = otherElem.attributeList.length;
                if (attrsLen !== otherAttrsLen) {
                    match = false;
                    break check;
                }
                for (let i = 0; i < attrsLen; i++) {
                    if (
                        attrs[i]?.localName !== otherAttrs[i]?.localName &&
                        attrs[i]?.value !== otherAttrs[i]?.value
                    ) {
                        match = false;
                        break check;
                    }
                }
            }
            if (match) {
                matchingItemIndices.push(i);
            }
        }
        if (3 <= matchingItemIndices.length) {
            this.removeFromActiveFormattingElementsList(
                matchingItemIndices[0]!,
            );
        }

        // S2.
        this.listOfActiveFormattingElements.push(element);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#reconstruct-the-active-formatting-elements
    reconstructActiveFormattingElements() {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.03)

        // S1.
        if (this.listOfActiveFormattingElements.length === 0) {
            return;
        }

        // S2.
        const lastEntry =
            this.listOfActiveFormattingElements[
                this.listOfActiveFormattingElements.length - 1
            ];
        if (
            lastEntry === undefined ||
            lastEntry === "marker" ||
            this.stackOfOpenElements.indexOf(lastEntry) !== -1
        ) {
            return;
        }

        // S3.
        let entryIdx = this.listOfActiveFormattingElements.length - 1;
        let entry = this.listOfActiveFormattingElements[entryIdx];
        if (entry === undefined) {
            throw Error(`invalid ActiveFormattingElements index ${entryIdx}`);
        }
        const updateEntry = () => {
            const e = this.listOfActiveFormattingElements[entryIdx];
            if (e === undefined) {
                throw Error(
                    `invalid ActiveFormattingElements index ${entryIdx}`,
                );
            }
            entry = e;
        };

        let state: "rewind" | "advance" | "create" = "rewind";
        while (true) {
            switch (state) {
                case "rewind":
                    // S4.
                    if (
                        this.listOfActiveFormattingElements.indexOf(entry) === 0
                    ) {
                        state = "create";
                        continue;
                    }

                    // S5.
                    entryIdx--;
                    updateEntry();

                    // S6.
                    if (
                        entry !== "marker" &&
                        this.stackOfOpenElements.indexOf(entry) !== -1
                    ) {
                        state = "rewind";
                        continue;
                    }

                // eslint-disable-next-line no-fallthrough
                case "advance":
                    // S7.
                    entryIdx++;
                    updateEntry();

                // eslint-disable-next-line no-fallthrough
                case "create": {
                    // S8.
                    if (entry === "marker") {
                        throw Error("we should not have marker at this point");
                    }
                    const elem = this.insertHTMLElement(entry.tagToken);

                    // S9.
                    this.listOfActiveFormattingElements[entryIdx] = elem;

                    // S10.
                    if (
                        this.listOfActiveFormattingElements.indexOf(entry) !=
                        this.listOfActiveFormattingElements.length - 1
                    ) {
                        state = "advance";
                        continue;
                    }
                }
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
    clearListOfActiveFormattingElementsUpToLastMarker() {
        while (true) {
            // S1.
            const afe =
                this.listOfActiveFormattingElements[
                    this.listOfActiveFormattingElements.length - 1
                ];

            // S2.
            const wasMarker = afe === "marker";
            this.removeFromActiveFormattingElementsList(
                this.listOfActiveFormattingElements.length - 1,
            );

            // S3.
            if (wasMarker) {
                break;
            }

            // S4.
        }
    }

    removeFromActiveFormattingElementsList(idx: number) {
        this.listOfActiveFormattingElements.splice(idx, 1);
    }

    //==========================================================================
    // HTML Standard - 13.2.4.4.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#head-element-pointer
    headElementPointer: Element | null = null;

    // https://html.spec.whatwg.org/multipage/parsing.html#form-element-pointer
    formElementPointer: Element | null = null;

    //==========================================================================
    // HTML Standard - 13.2.4.5.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#frameset-ok-flag
    framesetOKFlag: "ok" | "not ok" = "ok";
    // https://html.spec.whatwg.org/multipage/parsing.html#scripting-mode
    scriptingMode: "Normal" | "Disabled" | "Inert" | "Fragment" = "Disabled";

    //==========================================================================
    // HTML Standard - 13.2.6.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
    treeConstructionDispatcher(tkr: Tokenizer, token: Token) {
        if (!this.runParser) {
            return;
        }
        if (
            this.ignoreNextNewline &&
            token.kind === "character" &&
            token.data === "\n"
        ) {
            return;
        }
        if (
            this.stackOfOpenElements.length === 0 ||
            (this.adjustedCurrentNode().namespace !== null &&
                this.adjustedCurrentNode().namespace === HTML_NAMESPACE) ||
            (this.isMathMLTextIntegrationPoint(this.adjustedCurrentNode()) &&
                (!(token.kind === "tag") ||
                    token.type !== "start" ||
                    (token.name !== "mglyph" &&
                        token.name !== "malignmark"))) ||
            (this.isMathMLTextIntegrationPoint(this.adjustedCurrentNode()) &&
                token.kind === "character") ||
            (this.adjustedCurrentNode().isElement(
                MATHML_NAMESPACE,
                "annotation-xml",
            ) &&
                token.kind === "tag" &&
                token.type === "start" &&
                token.name === "svg") ||
            (this.isHTMLIntegrationPoint(this.adjustedCurrentNode()) &&
                token.kind === "tag" &&
                token.type === "start") ||
            (this.isHTMLIntegrationPoint(this.adjustedCurrentNode()) &&
                token.kind === "character") ||
            token.kind === "eof"
        ) {
            this.useRulesFor(this.insertionMode, tkr, token);
        } else {
            // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign

            if (token.kind === "character" && token.data === "\u0000") {
                // PARSE ERROR
                this.insertCharacter({ kind: "character", data: "\ufffd" });
            } else if (
                token.kind === "character" &&
                (token.data === "\t" ||
                    token.data === "\n" ||
                    token.data === "\f" ||
                    token.data === "\r" ||
                    token.data === " ")
            ) {
                this.insertCharacter(token);
            } else if (token.kind === "character") {
                this.insertCharacter(token);
                this.framesetOKFlag = "not ok";
            } else if (token.kind === "comment") {
                this.insertComment(token, null);
            } else if (token.kind === "doctype") {
                // PARSE ERROR
            } else if (
                (token.kind === "tag" &&
                    token.type === "start" &&
                    (token.name === "b" ||
                        token.name === "big" ||
                        token.name === "blockquote" ||
                        token.name === "body" ||
                        token.name === "br" ||
                        token.name === "center" ||
                        token.name === "code" ||
                        token.name === "dd" ||
                        token.name === "div" ||
                        token.name === "dl" ||
                        token.name === "dt" ||
                        token.name === "em" ||
                        token.name === "embed" ||
                        token.name === "h1" ||
                        token.name === "h2" ||
                        token.name === "h3" ||
                        token.name === "h4" ||
                        token.name === "h5" ||
                        token.name === "h6" ||
                        token.name === "head" ||
                        token.name === "hr" ||
                        token.name === "i" ||
                        token.name === "img" ||
                        token.name === "li" ||
                        token.name === "listing" ||
                        token.name === "menu" ||
                        token.name === "meta" ||
                        token.name === "nobr" ||
                        token.name === "ol" ||
                        token.name === "p" ||
                        token.name === "pre" ||
                        token.name === "ruby" ||
                        token.name === "s" ||
                        token.name === "small" ||
                        token.name === "span" ||
                        token.name === "strong" ||
                        token.name === "strike" ||
                        token.name === "sub" ||
                        token.name === "sup" ||
                        token.name === "table" ||
                        token.name === "tt" ||
                        token.name === "u" ||
                        token.name === "ul" ||
                        token.name === "var")) ||
                (token.kind === "tag" &&
                    token.type === "start" &&
                    token.name === "font" &&
                    token.attributes.filter(
                        (a) =>
                            a.localName === "color" ||
                            a.localName === "face" ||
                            a.localName === "size",
                    ).length !== 0) ||
                (token.kind === "tag" &&
                    token.type === "end" &&
                    (token.name === "br" || token.name === "p"))
            ) {
                // PARSE ERROR
                while (
                    !this.isMathMLTextIntegrationPoint(this.currentNode()) &&
                    !this.isHTMLIntegrationPoint(this.currentNode()) &&
                    this.currentNode().namespace !== HTML_NAMESPACE
                ) {
                    this.popFromStackOfOpenElements();
                }
                this.reprocessToken(tkr, token);
            } else if (token.kind === "tag" && token.type === "start") {
                if (this.adjustedCurrentNode().namespace === MATHML_NAMESPACE) {
                    this.adjustMathmlAttributes(token);
                }
                if (this.adjustedCurrentNode().namespace === SVG_NAMESPACE) {
                    const ADJUST_TAG_NAME = [
                        { localName: "altglyph", newLocalName: "altGlyph" },
                        {
                            localName: "altglyphdef",
                            newLocalName: "altGlyphDef",
                        },
                        {
                            localName: "altglyphitem",
                            newLocalName: "altGlyphItem",
                        },
                        {
                            localName: "animatecolor",
                            newLocalName: "animateColor",
                        },
                        {
                            localName: "animatemotion",
                            newLocalName: "animateMotion",
                        },
                        {
                            localName: "animatetransform",
                            newLocalName: "animateTransform",
                        },
                        { localName: "clippath", newLocalName: "clipPath" },
                        { localName: "feblend", newLocalName: "feBlend" },
                        {
                            localName: "fecolormatrix",
                            newLocalName: "feColorMatrix",
                        },
                        {
                            localName: "fecomponenttransfer",
                            newLocalName: "feComponentTransfer",
                        },
                        {
                            localName: "fecomposite",
                            newLocalName: "feComposite",
                        },
                        {
                            localName: "feconvolvematrix",
                            newLocalName: "feConvolveMatrix",
                        },
                        {
                            localName: "fediffuselighting",
                            newLocalName: "feDiffuseLighting",
                        },
                        {
                            localName: "fedisplacementmap",
                            newLocalName: "feDisplacementMap",
                        },
                        {
                            localName: "fedistantlight",
                            newLocalName: "feDistantLight",
                        },
                        {
                            localName: "fedropshadow",
                            newLocalName: "feDropShadow",
                        },
                        { localName: "feflood", newLocalName: "feFlood" },
                        { localName: "fefunca", newLocalName: "feFuncA" },
                        { localName: "fefuncb", newLocalName: "feFuncB" },
                        { localName: "fefuncg", newLocalName: "feFuncG" },
                        { localName: "fefuncr", newLocalName: "feFuncR" },
                        {
                            localName: "fegaussianblur",
                            newLocalName: "feGaussianBlur",
                        },
                        { localName: "feimage", newLocalName: "feImage" },
                        { localName: "femerge", newLocalName: "feMerge" },
                        {
                            localName: "femergenode",
                            newLocalName: "feMergeNode",
                        },
                        {
                            localName: "femorphology",
                            newLocalName: "feMorphology",
                        },
                        { localName: "feoffset", newLocalName: "feOffset" },
                        {
                            localName: "fepointlight",
                            newLocalName: "fePointLight",
                        },
                        {
                            localName: "fespecularlighting",
                            newLocalName: "feSpecularLighting",
                        },
                        {
                            localName: "fespotlight",
                            newLocalName: "feSpotLight",
                        },
                        { localName: "fetile", newLocalName: "feTile" },
                        {
                            localName: "feturbulence",
                            newLocalName: "feTurbulence",
                        },
                        {
                            localName: "foreignobject",
                            newLocalName: "foreignObject",
                        },
                        { localName: "glyphref", newLocalName: "glyphRef" },
                        {
                            localName: "lineargradient",
                            newLocalName: "linearGradient",
                        },
                        {
                            localName: "radialgradient",
                            newLocalName: "radialGradient",
                        },
                        { localName: "textpath", newLocalName: "textPath" },
                    ];
                    for (const adjustTagName of ADJUST_TAG_NAME) {
                        if (token.name === adjustTagName.localName) {
                            token.name = adjustTagName.newLocalName;
                            break;
                        }
                    }
                    this.adjustSVGAttributes(token);
                }
                this.adjustForeignAttributes(token);
                console.assert(this.adjustedCurrentNode().namespace !== null);
                this.insertForeignElement(
                    token,
                    this.adjustedCurrentNode().namespace!,
                    false,
                );
                if (token.isSelfClosing) {
                    if (
                        token.name === "script" &&
                        this.currentNode().namespace === SVG_NAMESPACE
                    ) {
                        throw new Error("not yet implemented");
                    } else {
                        this.popFromStackOfOpenElements();
                    }
                }
            } else if (
                token.kind === "tag" &&
                token.type === "end" &&
                this.currentNode().isElement(SVG_NAMESPACE, "script")
            ) {
                throw new Error("not yet implemented");
            } else if (token.kind === "tag" && token.type === "end") {
                // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.10.)

                // S1.
                let nodeIdx = this.stackOfOpenElements.length - 1;
                let node = this.stackOfOpenElementsNodeAt(nodeIdx);

                // S2.
                if (toASCIILowercase(node.tagToken.name) !== token.name) {
                    // PARSE ERROR
                }

                while (true) {
                    // S3.
                    if (nodeIdx === 0) {
                        return;
                    }

                    // S4.
                    if (toASCIILowercase(node.tagToken.name) === token.name) {
                        while (true) {
                            const poppedNode =
                                this.popFromStackOfOpenElements();
                            if (poppedNode === node) {
                                break;
                            }
                        }
                        return;
                    }

                    // S5.
                    nodeIdx--;
                    node = this.stackOfOpenElementsNodeAt(nodeIdx);

                    // S6.
                    if (node.namespace === HTML_NAMESPACE) {
                        break;
                    }
                }

                // S7.
                this.useRulesFor(this.insertionMode, tkr, token);
            } else {
                unexpectedToken(token);
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#mathml-text-integration-point
    isMathMLTextIntegrationPoint(element: Element): boolean {
        const SPECIAL_ELEMENTS = [
            { namespace: MATHML_NAMESPACE, localName: "mi" },
            { namespace: MATHML_NAMESPACE, localName: "mo" },
            { namespace: MATHML_NAMESPACE, localName: "mn" },
            { namespace: MATHML_NAMESPACE, localName: "ms" },
            { namespace: MATHML_NAMESPACE, localName: "mtext" },
        ];

        for (const entry of SPECIAL_ELEMENTS) {
            if (element.isElement(entry.localName, entry.localName)) {
                return true;
            }
        }
        return false;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#html-integration-point
    isHTMLIntegrationPoint(element: Element): boolean {
        if (element.isElement(MATHML_NAMESPACE, "annotation-xml")) {
            if (tagAttributeEquals(element.tagToken, "encoding", "text/html")) {
                return true;
            }
        }

        const SPECIAL_ELEMENTS = [
            { namespace: SVG_NAMESPACE, localName: "foreignObject" },
            { namespace: SVG_NAMESPACE, localName: "desc" },
            { namespace: SVG_NAMESPACE, localName: "title" },
        ];

        for (const entry of SPECIAL_ELEMENTS) {
            if (element.isElement(entry.localName, entry.localName)) {
                return true;
            }
        }
        return false;
    }

    //==========================================================================
    // HTML Standard - 13.2.6.1.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#foster-parent
    enableFosterParenting = false;

    // https://html.spec.whatwg.org/multipage/parsing.html#appropriate-place-for-inserting-a-node
    appropriatePlaceForInsertingNode(
        overrideTarget: Element | null,
    ): InsertionLocation {
        let out: InsertionLocation;
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.11)

        // S1.
        let target = overrideTarget;
        if (target === null) {
            target = this.currentNode();
        }

        // S2.
        if (
            this.enableFosterParenting &&
            (target.isElement(HTML_NAMESPACE, "table") ||
                target.isElement(HTML_NAMESPACE, "tbody") ||
                target.isElement(HTML_NAMESPACE, "tfoot") ||
                target.isElement(HTML_NAMESPACE, "thead") ||
                target.isElement(HTML_NAMESPACE, "tr"))
        ) {
            throw new Error("not yet implemented");
        } else {
            out = { rel: "after last child", parentNode: target };
        }

        // S3.
        if (target.isInside(HTML_NAMESPACE, "template")) {
            throw new Error("not yet implemented");
        }
        // S4.
        return out;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#create-an-element-for-the-token
    createElementForToken(
        token: TokenFor<"tag">,
        namespace: string,
        intendedParent: Node,
    ): Element {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.11)

        // S1.
        if (this.hasActiveSpeculativeParser) {
            throw new Error("not yet implemented");
        }

        // S2.

        // S3.
        const document = intendedParent.nodeDocument;

        // S4.
        const localName = token.name;

        // S5.
        const is = tagAttribute(token, "is") ?? null;

        // S6.
        const registry = intendedParent.lookupCustomElementRegistry();

        // S7.
        const definition = lookupCustomElementDefinition(
            registry,
            namespace,
            localName,
            is,
        );

        // S8.
        let willExecuteScript = false;
        if (definition !== null && this.isFragmentParsing) {
            willExecuteScript = true;
        }

        // S9.
        if (willExecuteScript) {
            throw new Error("not yet implemented");
        }

        // S10.
        const element = Element.create(
            document,
            localName,
            namespace,
            elementInterfaceFor,
            token,
            null,
            is,
            willExecuteScript,
            registry,
        );

        // S11.
        for (const data of token.attributes) {
            element.appendAttr(data);
        }

        // S12.
        if (willExecuteScript) {
            throw new Error("not yet implemented");
        }

        // S13.
        const xmlns = element.attribute(XMLNS_NAMESPACE, "xmlns");
        if (xmlns !== null && xmlns !== element.namespace) {
            // PARSE ERROR
        }

        // S14.
        if (
            isResettableElement(element) &&
            !isFormAssociatedCustomElement(element)
        ) {
            element.onRunResetAlgorithm();
        }

        // S15.
        if (
            isFormAssociatedElement(element) &&
            this.formElementPointer !== null &&
            !this.stackOfOpenElementsContainsHTMLElement("template") &&
            (isListedElement(element) ||
                element.attribute(null, "form") === null) &&
            intendedParent.inTheSameTreeAs(this.formElementPointer)
        ) {
            throw new Error("not yet implemented");
        }

        // S16.
        return element;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#insert-an-element-at-the-adjusted-insertion-location
    insertElementAtAdjustedInsertionLocation(element: Element) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        const adjustedInsertionLocation =
            this.appropriatePlaceForInsertingNode(null);

        // S2.
        // TODO (How do we know if it's not possible to insert at the location?)

        // S3.
        if (!this.isFragmentParsing) {
            // TODO
        }

        // S4.
        insertAtLocation(element, adjustedInsertionLocation);

        // S5.
        if (!this.isFragmentParsing) {
            // TODO
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#insert-a-foreign-element
    insertForeignElement(
        token: TokenFor<"tag">,
        namespace: string,
        onlyAddToElementStack: boolean,
    ): Element {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        const adjustedInsertionLocation =
            this.appropriatePlaceForInsertingNode(null);

        // S2.
        const element = this.createElementForToken(
            token,
            namespace,
            adjustedInsertionLocation.parentNode,
        );

        // S3.
        if (!onlyAddToElementStack) {
            this.insertElementAtAdjustedInsertionLocation(element);
        }

        // S4.
        this.pushToStackOfOpenElements(element);

        // S5.
        return element;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#insert-an-html-element
    insertHTMLElement(token: TokenFor<"tag">): Element {
        return this.insertForeignElement(token, HTML_NAMESPACE, false);
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#adjust-mathml-attributes
    adjustMathmlAttributes(token: TokenFor<"tag">) {
        const ADJUST_ATTRS = [
            { localName: "definitionurl", newLocalName: "definitionURL" },
        ];
        for (const data of token.attributes) {
            const attrName = data.localName;
            for (const adjustAttr of ADJUST_ATTRS) {
                if (attrName === adjustAttr.localName) {
                    data.localName = adjustAttr.newLocalName;
                    break;
                }
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes
    adjustSVGAttributes(token: TokenFor<"tag">) {
        const ADJUST_ATTRS = [
            { localName: "attributename", newLocalName: "attributeName" },
            { localName: "attributetype", newLocalName: "attributeType" },
            { localName: "basefrequency", newLocalName: "baseFrequency" },
            { localName: "baseprofile", newLocalName: "baseProfile" },
            { localName: "calcmode", newLocalName: "calcMode" },
            { localName: "clippathunits", newLocalName: "clipPathUnits" },
            { localName: "diffuseconstant", newLocalName: "diffuseConstant" },
            { localName: "edgemode", newLocalName: "edgeMode" },
            { localName: "filterunits", newLocalName: "filterUnits" },
            { localName: "glyphref", newLocalName: "glyphRef" },
            {
                localName: "gradienttransform",
                newLocalName: "gradientTransform",
            },
            { localName: "gradientunits", newLocalName: "gradientUnits" },
            { localName: "kernelmatrix", newLocalName: "kernelMatrix" },
            {
                localName: "kernelunitlength",
                newLocalName: "kernelUnitLength",
            },
            { localName: "keypoints", newLocalName: "keyPoints" },
            { localName: "keysplines", newLocalName: "keySplines" },
            { localName: "keytimes", newLocalName: "keyTimes" },
            { localName: "lengthadjust", newLocalName: "lengthAdjust" },
            {
                localName: "limitingconeangle",
                newLocalName: "limitingConeAngle",
            },
            { localName: "markerheight", newLocalName: "markerHeight" },
            { localName: "markerunits", newLocalName: "markerUnits" },
            { localName: "markerwidth", newLocalName: "markerWidth" },
            {
                localName: "maskcontentunits",
                newLocalName: "maskContentUnits",
            },
            { localName: "maskunits", newLocalName: "maskUnits" },
            { localName: "numoctaves", newLocalName: "numOctaves" },
            { localName: "pathlength", newLocalName: "pathLength" },
            {
                localName: "patterncontentunits",
                newLocalName: "patternContentUnits",
            },
            {
                localName: "patterntransform",
                newLocalName: "patternTransform",
            },
            { localName: "patternunits", newLocalName: "patternUnits" },
            { localName: "pointsatx", newLocalName: "pointsAtX" },
            { localName: "pointsaty", newLocalName: "pointsAtY" },
            { localName: "pointsatz", newLocalName: "pointsAtZ" },
            { localName: "preservealpha", newLocalName: "preserveAlpha" },
            {
                localName: "preserveaspectratio",
                newLocalName: "preserveAspectRatio",
            },
            { localName: "primitiveunits", newLocalName: "primitiveUnits" },
            { localName: "refx", newLocalName: "refX" },
            { localName: "refy", newLocalName: "refY" },
            { localName: "repeatcount", newLocalName: "repeatCount" },
            { localName: "repeatdur", newLocalName: "repeatDur" },
            {
                localName: "requiredextensions",
                newLocalName: "requiredExtensions",
            },
            {
                localName: "requiredfeatures",
                newLocalName: "requiredFeatures",
            },
            {
                localName: "specularconstant",
                newLocalName: "specularConstant",
            },
            {
                localName: "specularexponent",
                newLocalName: "specularExponent",
            },
            { localName: "spreadmethod", newLocalName: "spreadMethod" },
            { localName: "startoffset", newLocalName: "startOffset" },
            { localName: "stddeviation", newLocalName: "stdDeviation" },
            { localName: "stitchtiles", newLocalName: "stitchTiles" },
            { localName: "surfacescale", newLocalName: "surfaceScale" },
            { localName: "systemlanguage", newLocalName: "systemLanguage" },
            { localName: "tablevalues", newLocalName: "tableValues" },
            { localName: "targetx", newLocalName: "targetX" },
            { localName: "targety", newLocalName: "targetY" },
            { localName: "textlength", newLocalName: "textLength" },
            { localName: "viewbox", newLocalName: "viewBox" },
            { localName: "viewtarget", newLocalName: "viewTarget" },
            {
                localName: "xchannelselector",
                newLocalName: "xChannelSelector",
            },
            {
                localName: "ychannelselector",
                newLocalName: "yChannelSelector",
            },
            { localName: "zoomandpan", newLocalName: "zoomAndPan" },
        ];
        for (const data of token.attributes) {
            const attrName = data.localName;
            for (const adjustAttr of ADJUST_ATTRS) {
                if (attrName === adjustAttr.localName) {
                    data.localName = adjustAttr.newLocalName;
                    break;
                }
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
    adjustForeignAttributes(token: TokenFor<"tag">) {
        const ADJUST_ATTRS = [
            {
                localName: "xlink:actuate",
                newPrefix: "xlink",
                newLocalName: "actuate",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:arcrole",
                newPrefix: "xlink",
                newLocalName: "arcrole",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:href",
                newPrefix: "xlink",
                newLocalName: "href",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:role",
                newPrefix: "xlink",
                newLocalName: "role",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:show",
                newPrefix: "xlink",
                newLocalName: "show",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:title",
                newPrefix: "xlink",
                newLocalName: "title",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xlink:type",
                newPrefix: "xlink",
                newLocalName: "type",
                newNamespace: XLINK_NAMESPACE,
            },
            {
                localName: "xml:lang",
                newPrefix: "xml",
                newLocalName: "lang",
                newNamespace: XML_NAMESPACE,
            },
            {
                localName: "xml:space",
                newPrefix: "xml",
                newLocalName: "space",
                newNamespace: XML_NAMESPACE,
            },
            {
                localName: "xmlns",
                newPrefix: null,
                newLocalName: "xmlns",
                newNamespace: XMLNS_NAMESPACE,
            },
            {
                localName: "xmlns:xlink",
                newPrefix: "xmlns",
                newLocalName: "xlink",
                newNamespace: XMLNS_NAMESPACE,
            },
        ];
        for (const data of token.attributes) {
            const attrName = data.localName;
            for (const adjustAttr of ADJUST_ATTRS) {
                if (attrName === adjustAttr.localName) {
                    data.namespacePrefix = adjustAttr.newPrefix;
                    data.localName = adjustAttr.newLocalName;
                    data.namespace = adjustAttr.newNamespace;
                    break;
                }
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#insert-a-character
    insertCharacter(token: TokenFor<"character">) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        const data = token.data;

        // S2.
        const location = this.appropriatePlaceForInsertingNode(null);

        // S3.
        if (location.parentNode instanceof Document) {
            return;
        }

        // S4.
        switch (location.rel) {
            case "after last child": {
                const parentNode = location.parentNode;
                let target: Text | null = null;
                if (parentNode.children.length !== 0) {
                    const lastNode =
                        parentNode.children[parentNode.children.length - 1];
                    if (lastNode instanceof Text) {
                        target = lastNode;
                    }
                }
                if (target !== null) {
                    target.data = target.data + data;
                } else {
                    target = new Text(location.parentNode.nodeDocument, data);
                    insertAtLocation(target, location);
                }
                break;
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#insert-a-comment
    insertComment(
        token: TokenFor<"comment">,
        location: InsertionLocation | null,
    ) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        const data = token.data;

        // S2.
        location = location ?? this.appropriatePlaceForInsertingNode(null);

        // S3.
        const comment = new Comment(location.parentNode.nodeDocument, data);

        // S4.
        insertAtLocation(comment, location);
    }

    //==========================================================================
    // HTML Standard - 13.2.6.2.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#generic-raw-text-element-parsing-algorithm
    parseGenericRawTextElement(tkr: Tokenizer, token: TokenFor<"tag">) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        this.insertHTMLElement(token);

        // S2.
        tkr.state = "RAWTEXT";

        // S3.
        this.originalInsertionMode = this.insertionMode;

        // S4.
        this.insertionMode = "text";
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#generic-raw-text-element-parsing-algorithm
    parseGenericRCDATAElement(tkr: Tokenizer, token: TokenFor<"tag">) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.12)

        // S1.
        this.insertHTMLElement(token);

        // S2.
        tkr.state = "RCDATA";

        // S3.
        this.originalInsertionMode = this.insertionMode;

        // S4.
        this.insertionMode = "text";
    }

    //==========================================================================
    // HTML Standard - 13.2.6.3.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#generate-implied-end-tags
    generateImpliedEndTags(except: string[]) {
        while (true) {
            const element = this.currentNode();
            let found = false;
            for (const tag of except) {
                if (element.isElement(HTML_NAMESPACE, tag)) {
                    found = true;
                }
            }
            if (!found) {
                this.popFromStackOfOpenElements();
            } else {
                break;
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#generate-all-implied-end-tags-thoroughly
    generateImpliedEndTagsThroughly() {
        while (true) {
            const element = this.currentNode();
            if (
                element.isElement(HTML_NAMESPACE, "caption") ||
                element.isElement(HTML_NAMESPACE, "colgroup") ||
                element.isElement(HTML_NAMESPACE, "dd") ||
                element.isElement(HTML_NAMESPACE, "dt") ||
                element.isElement(HTML_NAMESPACE, "li") ||
                element.isElement(HTML_NAMESPACE, "optgroup") ||
                element.isElement(HTML_NAMESPACE, "option") ||
                element.isElement(HTML_NAMESPACE, "p") ||
                element.isElement(HTML_NAMESPACE, "rb") ||
                element.isElement(HTML_NAMESPACE, "rp") ||
                element.isElement(HTML_NAMESPACE, "rtc") ||
                element.isElement(HTML_NAMESPACE, "tbody") ||
                element.isElement(HTML_NAMESPACE, "td") ||
                element.isElement(HTML_NAMESPACE, "tfoot") ||
                element.isElement(HTML_NAMESPACE, "th") ||
                element.isElement(HTML_NAMESPACE, "thead") ||
                element.isElement(HTML_NAMESPACE, "tr")
            ) {
                this.popFromStackOfOpenElements();
            } else {
                break;
            }
        }
    }

    //==========================================================================
    // HTML Standard - 13.2.6.4.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode
    #imodeInitial(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            return;
        } else if (token.kind === "comment") {
            this.insertComment(token, {
                rel: "after last child",
                parentNode: this.document,
            });
        } else if (token.kind === "doctype") {
            const doctype = new DocumentType(this.document, token.name ?? "");
            doctype.publicID = token.publicID ?? "";
            doctype.systemID = token.systemID ?? "";
            this.document.mode = "no-quirks";
            if (
                !this.document.isIframeSrcdocDocument &&
                !this.document.parserCannotChangeMode
            ) {
                if (
                    token.forceQuirks ||
                    (token.name === null && token.name !== "html") ||
                    (token.publicID !== null &&
                        isASCIICaseInsensitiveMatch(
                            token.publicID,
                            "//W3O//DTD W3 HTML Strict 3.0//EN//",
                        )) ||
                    (token.publicID !== null &&
                        isASCIICaseInsensitiveMatch(
                            token.publicID,
                            "-/W3C/DTD HTML 4.0 Transitional/EN",
                        )) ||
                    (token.publicID !== null &&
                        isASCIICaseInsensitiveMatch(token.publicID, "HTML")) ||
                    (token.systemID !== null &&
                        isASCIICaseInsensitiveMatch(
                            token.systemID,
                            "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "+//Silmaril//dtd html Pro v0r11 19970101//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//AS//DTD HTML 3.0 asWedit + extensions//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//AdvaSoft Ltd//DTD HTML 3.0 asWedit + extensions//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0 Level 1//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0 Level 2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0 Strict Level 1//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0 Strict Level 2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0 Strict//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 2.1E//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 3.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 3.2 Final//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 3.2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML 3//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Level 0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Level 1//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Level 2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Level 3//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Strict Level 0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Strict Level 1//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Strict Level 2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Strict Level 3//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML Strict//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//IETF//DTD HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Metrius//DTD Metrius Presentational//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 2.0 HTML Strict//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 2.0 HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 2.0 Tables//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 3.0 HTML Strict//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 3.0 HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Microsoft//DTD Internet Explorer 3.0 Tables//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Netscape Comm. Corp.//DTD HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Netscape Comm. Corp.//DTD Strict HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//O'Reilly and Associates//DTD HTML 2.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//O'Reilly and Associates//DTD HTML Extended 1.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//O'Reilly and Associates//DTD HTML Extended Relaxed 1.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//SQ//DTD HTML 2.0 HoTMetaL + extensions//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//SoftQuad Software//DTD HoTMetaL PRO 6.0::19990601::extensions to HTML 4.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//SoftQuad//DTD HoTMetaL PRO 4.0::19971010::extensions to HTML 4.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Spyglass//DTD HTML 2.0 Extended//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Sun Microsystems Corp.//DTD HotJava HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//Sun Microsystems Corp.//DTD HotJava Strict HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 3 1995-03-24//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 3.2 Draft//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 3.2 Final//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 3.2//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 3.2S Draft//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.0 Frameset//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.0 Transitional//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML Experimental 19960712//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML Experimental 970421//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD W3 HTML//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3O//DTD W3 HTML 3.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//WebTechs//DTD Mozilla HTML 2.0//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//WebTechs//DTD Mozilla HTML//",
                        )) ||
                    ((token.systemID === null || token.systemID[0] === "\0") &&
                        token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.01 Frameset//",
                        )) ||
                    ((token.systemID === null || token.systemID[0] === "\0") &&
                        token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.01 Transitional//",
                        ))
                ) {
                    this.document.mode = "quirks";
                } else if (
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD XHTML 1.0 Frameset//",
                        )) ||
                    (token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD XHTML 1.0 Transitional//",
                        )) ||
                    (token.systemID !== null &&
                        token.systemID[0] !== "\0" &&
                        token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.01 Frameset//",
                        )) ||
                    (token.systemID !== null &&
                        token.systemID[0] !== "\0" &&
                        token.publicID !== null &&
                        hasPrefixASCIICaseInsensitive(
                            token.publicID,
                            "-//W3C//DTD HTML 4.01 Transitional//",
                        ))
                ) {
                    this.document.mode = "limited-quirks";
                }
            }
            this.insertionMode = "before html";
        } else {
            if (!this.document.isIframeSrcdocDocument) {
                if (!this.document.parserCannotChangeMode) {
                    // PARSE ERROR
                    this.document.mode = "quirks";
                }
                this.insertionMode = "before html";
                this.reprocessToken(tkr, token);
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#the-before-html-insertion-mode
    #imodeBeforeHtml(tkr: Tokenizer, token: Token) {
        const anythingElse = () => {
            const element = Element.create(
                this.document,
                "html",
                HTML_NAMESPACE,
                elementInterfaceFor,
            );
            this.document.appendChild(element);
            this.pushToStackOfOpenElements(element);
            this.insertionMode = "before head";
            this.reprocessToken(tkr, token);
        };

        if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (token.kind === "comment") {
            this.insertComment(token, {
                rel: "after last child",
                parentNode: this.document,
            });
        } else if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            const element = this.createElementForToken(
                token,
                HTML_NAMESPACE,
                this.document,
            );
            this.document.appendChild(element);
            this.pushToStackOfOpenElements(element);
            this.insertionMode = "before head";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "head" ||
                token.name === "body" ||
                token.name === "html" ||
                token.name === "br")
        ) {
            anythingElse();
        } else if (token.kind === "tag" && token.type === "end") {
            // PARSE ERROR
            return;
        } else {
            anythingElse();
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#the-before-head-insertion-mode
    #imodeBeforeHead(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            return;
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "head"
        ) {
            const element = this.insertHTMLElement(token);
            this.headElementPointer = element;
            this.insertionMode = "in head";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name !== "head" &&
            token.name !== "body" &&
            token.name !== "html" &&
            token.name !== "br"
        ) {
            // PARSE ERROR
            return;
        } else {
            const element = this.insertHTMLElement({
                kind: "tag",
                name: "head",
                attributes: [],
                type: "start",
                isSelfClosing: false,
                selfClosingAcknowledged: false,
            });
            this.headElementPointer = element;
            this.insertionMode = "in head";
            this.reprocessToken(tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead
    #imodeInHead(tkr: Tokenizer, token: Token) {
        if (token.kind === "character") {
            this.insertCharacter(token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "base" ||
                token.name === "basefont" ||
                token.name === "bgsound" ||
                token.name === "link")
        ) {
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            if (token.isSelfClosing) {
                token.selfClosingAcknowledged = true;
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "meta"
        ) {
            const element = this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            if (!this.hasActiveSpeculativeParser) {
                const charsetAttr = element.attribute(null, "charset");
                const httpEquivAttr = element.attribute(null, "http-equiv");
                if (charsetAttr !== undefined) {
                    // TODO: Set encoding based on charset
                }
                if (
                    httpEquivAttr !== undefined &&
                    isASCIICaseInsensitiveMatch(httpEquivAttr, "content-type")
                ) {
                    // TODO: Set encoding based on http-equiv Content-Type value
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "title"
        ) {
            this.parseGenericRCDATAElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            ((token.type === "start" &&
                token.name === "noscript" &&
                this.scriptingMode !== "Disabled") ||
                (token.type === "start" &&
                    (token.name === "noframes" || token.name === "style")))
        ) {
            this.parseGenericRawTextElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "noscript" &&
            this.scriptingMode === "Disabled"
        ) {
            this.insertHTMLElement(token);
            this.insertionMode = "in head noscript";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "script"
        ) {
            // STUB.
            this.parseGenericRawTextElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "head"
        ) {
            this.popFromStackOfOpenElements();
            this.insertionMode = "after head";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "template"
        ) {
            throw new Error("not yet implemented");
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "template"
        ) {
            throw new Error("not yet implemented");
        } else if (
            token.kind === "tag" &&
            ((token.type === "end" &&
                token.name !== "body" &&
                token.name !== "html" &&
                token.name !== "br") ||
                (token.type === "start" && token.name === "head"))
        ) {
            // PARSE ERROR
            return;
        } else {
            this.popFromStackOfOpenElements();
            this.insertionMode = "after head";
            this.reprocessToken(tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inheadnoscript
    #imodeInHeadNoscript(tkr: Tokenizer, token: Token) {
        if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "noscript"
        ) {
            this.popFromStackOfOpenElements();
            this.insertionMode = "in head";
        } else if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (token.kind === "comment") {
            this.useRulesFor("in head", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "basefont" ||
                token.name === "bgsound" ||
                token.name === "link" ||
                token.name === "meta" ||
                token.name === "noframes" ||
                token.name === "style")
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "br") ||
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "head" || token.name === "noscript"))
        ) {
            // PARSE ERROR
            return;
        } else {
            // PARSE ERROR
            this.popFromStackOfOpenElements();
            this.insertionMode = "in head";
            this.reprocessToken(tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#the-after-head-insertion-mode
    #imodeAfterHead(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.insertCharacter(token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "body"
        ) {
            this.insertHTMLElement(token);
            this.framesetOKFlag = "not ok";
            this.insertionMode = "in body";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "frameset"
        ) {
            this.insertHTMLElement(token);
            this.insertionMode = "in frameset";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "base" ||
                token.name === "basefont" ||
                token.name === "bgsound" ||
                token.name === "link" ||
                token.name === "meta" ||
                token.name === "noframes" ||
                token.name === "script" ||
                token.name === "style" ||
                token.name === "template" ||
                token.name === "title")
        ) {
            // PARSE ERROR
            if (this.headElementPointer === null) {
                throw Error("head element pointer must be set at this point");
            }
            this.pushToStackOfOpenElements(this.headElementPointer);
            this.insertionMode = "in head";
            const removeIdx = this.stackOfOpenElements.indexOf(
                this.headElementPointer,
            );
            this.removeFromStackOfOpenElements(removeIdx);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "template"
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (
            token.kind === "tag" &&
            ((token.type === "end" &&
                token.name !== "body" &&
                token.name !== "html" &&
                token.name !== "br") ||
                (token.type === "start" && token.name === "head"))
        ) {
            // PARSE ERROR
            return;
        } else {
            this.insertHTMLElement({
                kind: "tag",
                name: "body",
                attributes: [],
                type: "start",
                isSelfClosing: false,
                selfClosingAcknowledged: false,
            });
            this.insertionMode = "in body";
            this.useRulesFor("in body", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
    #imodeInBody(tkr: Tokenizer, token: Token) {
        if (token.kind === "character" && token.data === "\0") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.reconstructActiveFormattingElements();
            this.insertCharacter(token);
        } else if (token.kind === "character") {
            this.reconstructActiveFormattingElements();
            this.insertCharacter(token);
            this.framesetOKFlag = "not ok";
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            // PARSE ERROR
            if (this.stackOfOpenElementsContainsHTMLElement("template")) {
                return;
            } else {
                throw new Error("not yet implemented");
            }
        } else if (
            token.kind === "tag" &&
            ((token.type === "start" &&
                (token.name === "base" ||
                    token.name === "basefont" ||
                    token.name === "bgsound" ||
                    token.name === "link" ||
                    token.name === "meta" ||
                    token.name === "noframes" ||
                    token.name === "script" ||
                    token.name === "style" ||
                    token.name === "template" ||
                    token.name === "title")) ||
                (token.type === "end" && token.name === "template"))
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "body"
        ) {
            // PARSE ERROR
            if (
                this.stackOfOpenElements.length === 1 ||
                !this.stackOfOpenElementsNodeAt(1).isElement(
                    HTML_NAMESPACE,
                    "body",
                ) ||
                this.stackOfOpenElementsContainsHTMLElement("template")
            ) {
                return;
            } else {
                this.framesetOKFlag = "not ok";
                const bodyElem = this.stackOfOpenElementsNodeAt(1);
                for (const attr of token.attributes) {
                    if (
                        bodyElem.attribute(null, attr.localName) === undefined
                    ) {
                        bodyElem.appendAttr(attr);
                    }
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "frameset"
        ) {
            // PARSE ERROR
            if (
                this.stackOfOpenElements.length === 1 ||
                !this.stackOfOpenElementsNodeAt(1).isElement(
                    HTML_NAMESPACE,
                    "body",
                )
            ) {
                return;
            } else if (this.framesetOKFlag === "not ok") {
                return;
            } else {
                throw new Error("not yet implemented");
            }
        } else if (token.kind === "eof") {
            if (this.stackOfTemplateInsertionModes.length !== 0) {
                this.useRulesFor("in template", tkr, token);
            } else {
                if (
                    this.stackOfOpenElementsContainsHTMLElement("dd") ||
                    this.stackOfOpenElementsContainsHTMLElement("dt") ||
                    this.stackOfOpenElementsContainsHTMLElement("li") ||
                    this.stackOfOpenElementsContainsHTMLElement("optgroup") ||
                    this.stackOfOpenElementsContainsHTMLElement("option") ||
                    this.stackOfOpenElementsContainsHTMLElement("p") ||
                    this.stackOfOpenElementsContainsHTMLElement("rb") ||
                    this.stackOfOpenElementsContainsHTMLElement("rp") ||
                    this.stackOfOpenElementsContainsHTMLElement("rt") ||
                    this.stackOfOpenElementsContainsHTMLElement("rtc") ||
                    this.stackOfOpenElementsContainsHTMLElement("tbody") ||
                    this.stackOfOpenElementsContainsHTMLElement("td") ||
                    this.stackOfOpenElementsContainsHTMLElement("tfoot") ||
                    this.stackOfOpenElementsContainsHTMLElement("th") ||
                    this.stackOfOpenElementsContainsHTMLElement("thead") ||
                    this.stackOfOpenElementsContainsHTMLElement("tr") ||
                    this.stackOfOpenElementsContainsHTMLElement("body") ||
                    this.stackOfOpenElementsContainsHTMLElement("html")
                ) {
                    // PARSE ERROR
                }
                this.stopParsing();
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "body"
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "body"),
                )
            ) {
                // PARSE ERROR
                return;
            } else if (
                this.stackOfOpenElementsContainsHTMLElement("dd") ||
                this.stackOfOpenElementsContainsHTMLElement("dt") ||
                this.stackOfOpenElementsContainsHTMLElement("li") ||
                this.stackOfOpenElementsContainsHTMLElement("optgroup") ||
                this.stackOfOpenElementsContainsHTMLElement("option") ||
                this.stackOfOpenElementsContainsHTMLElement("p") ||
                this.stackOfOpenElementsContainsHTMLElement("rb") ||
                this.stackOfOpenElementsContainsHTMLElement("rp") ||
                this.stackOfOpenElementsContainsHTMLElement("rt") ||
                this.stackOfOpenElementsContainsHTMLElement("rtc") ||
                this.stackOfOpenElementsContainsHTMLElement("tbody") ||
                this.stackOfOpenElementsContainsHTMLElement("td") ||
                this.stackOfOpenElementsContainsHTMLElement("tfoot") ||
                this.stackOfOpenElementsContainsHTMLElement("th") ||
                this.stackOfOpenElementsContainsHTMLElement("thead") ||
                this.stackOfOpenElementsContainsHTMLElement("tr") ||
                this.stackOfOpenElementsContainsHTMLElement("body") ||
                this.stackOfOpenElementsContainsHTMLElement("html")
            ) {
                // PARSE ERROR
            }
            this.insertionMode = "after body";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "html"
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "body"),
                )
            ) {
                // PARSE ERROR
                return;
            } else if (
                this.stackOfOpenElementsContainsHTMLElement("dd") ||
                this.stackOfOpenElementsContainsHTMLElement("dt") ||
                this.stackOfOpenElementsContainsHTMLElement("li") ||
                this.stackOfOpenElementsContainsHTMLElement("optgroup") ||
                this.stackOfOpenElementsContainsHTMLElement("option") ||
                this.stackOfOpenElementsContainsHTMLElement("p") ||
                this.stackOfOpenElementsContainsHTMLElement("rb") ||
                this.stackOfOpenElementsContainsHTMLElement("rp") ||
                this.stackOfOpenElementsContainsHTMLElement("rt") ||
                this.stackOfOpenElementsContainsHTMLElement("rtc") ||
                this.stackOfOpenElementsContainsHTMLElement("tbody") ||
                this.stackOfOpenElementsContainsHTMLElement("td") ||
                this.stackOfOpenElementsContainsHTMLElement("tfoot") ||
                this.stackOfOpenElementsContainsHTMLElement("th") ||
                this.stackOfOpenElementsContainsHTMLElement("thead") ||
                this.stackOfOpenElementsContainsHTMLElement("tr") ||
                this.stackOfOpenElementsContainsHTMLElement("body") ||
                this.stackOfOpenElementsContainsHTMLElement("html")
            ) {
                // PARSE ERROR
            }
            this.insertionMode = "after body";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "address" ||
                token.name === "article" ||
                token.name === "aside" ||
                token.name === "blockquote" ||
                token.name === "center" ||
                token.name === "details" ||
                token.name === "dialog" ||
                token.name === "dir" ||
                token.name === "div" ||
                token.name === "dl" ||
                token.name === "fieldset" ||
                token.name === "figcaption" ||
                token.name === "figure" ||
                token.name === "footer" ||
                token.name === "header" ||
                token.name === "hgroup" ||
                token.name === "main" ||
                token.name === "menu" ||
                token.name === "nav" ||
                token.name === "ol" ||
                token.name === "p" ||
                token.name === "search" ||
                token.name === "section" ||
                token.name === "summary" ||
                token.name === "ul")
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "h1" ||
                token.name === "h2" ||
                token.name === "h3" ||
                token.name === "h4" ||
                token.name === "h5" ||
                token.name === "h6")
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            if (
                this.currentNode().isElement(HTML_NAMESPACE, "h1") ||
                this.currentNode().isElement(HTML_NAMESPACE, "h2") ||
                this.currentNode().isElement(HTML_NAMESPACE, "h3") ||
                this.currentNode().isElement(HTML_NAMESPACE, "h4") ||
                this.currentNode().isElement(HTML_NAMESPACE, "h5") ||
                this.currentNode().isElement(HTML_NAMESPACE, "h6")
            ) {
                // PARSE ERROR
                this.popFromStackOfOpenElements();
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "pre" || token.name === "listing")
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
            this.ignoreNextNewline = true;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "form"
        ) {
            if (
                this.formElementPointer !== null &&
                !this.stackOfOpenElementsContainsHTMLElement("template")
            ) {
                // PARSE ERROR
                return;
            } else {
                if (
                    this.hasElementInButtonScope((e) =>
                        e.isElement(HTML_NAMESPACE, "p"),
                    )
                ) {
                    this.#closePElement();
                }
                const element = this.insertHTMLElement(token);
                if (!this.stackOfOpenElementsContainsHTMLElement("template")) {
                    this.formElementPointer = element;
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "li"
        ) {
            this.framesetOKFlag = "not ok";
            let node = this.currentNode();
            while (true) {
                if (node.isElement(HTML_NAMESPACE, "li")) {
                    this.generateImpliedEndTags(["li"]);
                    if (!this.currentNode().isElement(HTML_NAMESPACE, "li")) {
                        // PARSE ERROR
                    }
                    while (true) {
                        const poppedElem = this.popFromStackOfOpenElements();
                        if (poppedElem.isElement(HTML_NAMESPACE, "li")) {
                            break;
                        }
                    }
                    break;
                }
                if (
                    this.isSpecialElement(node) &&
                    !(
                        this.currentNode().isElement(
                            HTML_NAMESPACE,
                            "address",
                        ) ||
                        this.currentNode().isElement(HTML_NAMESPACE, "div") ||
                        this.currentNode().isElement(HTML_NAMESPACE, "p")
                    )
                ) {
                    break;
                } else {
                    const nodeIdx = this.stackOfOpenElements.indexOf(node) - 1;
                    node = this.stackOfOpenElementsNodeAt(nodeIdx);
                }
            }
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "dt" || token.name === "dd")
        ) {
            this.framesetOKFlag = "not ok";
            let node = this.currentNode();
            while (true) {
                if (node.isElement(HTML_NAMESPACE, "dd")) {
                    this.generateImpliedEndTags(["dd"]);
                    if (!this.currentNode().isElement(HTML_NAMESPACE, "dd")) {
                        // PARSE ERROR
                    }
                    while (true) {
                        const poppedElem = this.popFromStackOfOpenElements();
                        if (poppedElem.isElement(HTML_NAMESPACE, "dd")) {
                            break;
                        }
                    }
                    break;
                } else if (node.isElement(HTML_NAMESPACE, "dt")) {
                    this.generateImpliedEndTags(["dt"]);
                    if (!this.currentNode().isElement(HTML_NAMESPACE, "dt")) {
                        // PARSE ERROR
                    }
                    while (true) {
                        const poppedElem = this.popFromStackOfOpenElements();
                        if (poppedElem.isElement(HTML_NAMESPACE, "dt")) {
                            break;
                        }
                    }
                    break;
                }
                if (
                    this.isSpecialElement(node) &&
                    !(
                        this.currentNode().isElement(
                            HTML_NAMESPACE,
                            "address",
                        ) ||
                        this.currentNode().isElement(HTML_NAMESPACE, "div") ||
                        this.currentNode().isElement(HTML_NAMESPACE, "p")
                    )
                ) {
                    break;
                } else {
                    const nodeIdx = this.stackOfOpenElements.indexOf(node) - 1;
                    node = this.stackOfOpenElementsNodeAt(nodeIdx);
                }
            }
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "plaintext"
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
            tkr.state = "PLAINTEXT";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "button"
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "button"),
                )
            ) {
                // PARSE ERROR
                this.generateImpliedEndTags([]);
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, "button")) {
                        break;
                    }
                }
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
            this.framesetOKFlag = "not ok";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "address" ||
                token.name === "article" ||
                token.name === "aside" ||
                token.name === "blockquote" ||
                token.name === "button" ||
                token.name === "center" ||
                token.name === "details" ||
                token.name === "dialog" ||
                token.name === "dir" ||
                token.name === "dl" ||
                token.name === "fieldset" ||
                token.name === "figcaption" ||
                token.name === "figure" ||
                token.name === "footer" ||
                token.name === "header" ||
                token.name === "hgroup" ||
                token.name === "listing" ||
                token.name === "main" ||
                token.name === "menu" ||
                token.name === "nav" ||
                token.name === "ol" ||
                token.name === "pre" ||
                token.name === "search" ||
                token.name === "section" ||
                token.name === "select" ||
                token.name === "summary" ||
                token.name === "ul")
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            } else {
                this.generateImpliedEndTags([]);
                if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                    // PARSE ERROR
                }
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, token.name)) {
                        break;
                    }
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "form"
        ) {
            if (this.stackOfOpenElementsContainsHTMLElement("template")) {
                const node = this.formElementPointer;
                if (
                    node === null ||
                    !this.hasElementInScope((e) => e === node)
                ) {
                    // PARSE ERROR
                    return;
                }
                this.generateImpliedEndTags([]);
                if (this.currentNode() !== node) {
                    // PARSE ERROR
                }
                const removeIdx = this.stackOfOpenElements.indexOf(node);
                this.removeFromStackOfOpenElements(removeIdx);
            } else {
                if (
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "form"),
                    )
                ) {
                    // PARSE ERROR
                    return;
                }
                this.generateImpliedEndTags([]);
                if (!this.currentNode().isElement(HTML_NAMESPACE, "form")) {
                    // PARSE ERROR
                }
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, "form")) {
                        break;
                    }
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "p"
        ) {
            if (
                !this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                // PARSE ERROR
                this.insertHTMLElement({
                    kind: "tag",
                    name: "p",
                    attributes: [],
                    type: "start",
                    isSelfClosing: false,
                    selfClosingAcknowledged: false,
                });
            }
            this.#closePElement();
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "li"
        ) {
            if (
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "li"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags(["li"]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, "li")) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, "li")) {
                    break;
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "dt" || token.name === "dd")
        ) {
            if (
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            }

            let except;
            if (token.name === "dt") {
                except = ["dt"];
            } else if (token.name === "dd") {
                except = ["dd"];
            } else {
                throw new Error("unreachable");
            }
            this.generateImpliedEndTags(except);
            if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, token.name)) {
                    break;
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "h1" ||
                token.name === "h2" ||
                token.name === "h3" ||
                token.name === "h4" ||
                token.name === "h5" ||
                token.name === "h6")
        ) {
            if (
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h1"),
                ) ||
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h2"),
                ) ||
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h3"),
                ) ||
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h4"),
                ) ||
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h5"),
                ) ||
                !this.hasElementInListItemScope((e) =>
                    e.isElement(HTML_NAMESPACE, "h6"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags([]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (
                    poppedElem.isElement(HTML_NAMESPACE, "h1") ||
                    poppedElem.isElement(HTML_NAMESPACE, "h2") ||
                    poppedElem.isElement(HTML_NAMESPACE, "h3") ||
                    poppedElem.isElement(HTML_NAMESPACE, "h4") ||
                    poppedElem.isElement(HTML_NAMESPACE, "h5") ||
                    poppedElem.isElement(HTML_NAMESPACE, "h6")
                ) {
                    break;
                }
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "a"
        ) {
            {
                const lastMarkerIdx =
                    this.listOfActiveFormattingElements.lastIndexOf("marker");
                let checkStartIdx = 0;
                if (0 <= lastMarkerIdx) {
                    checkStartIdx = lastMarkerIdx + 1;
                }
                let aElem;
                for (
                    let i = checkStartIdx;
                    i < this.listOfActiveFormattingElements.length;
                    i++
                ) {
                    const elem = this.listOfActiveFormattingElements[i];
                    if (!(elem instanceof Element)) {
                        throw Error(`expected element, got ${elem}`);
                    }
                    if (elem.isElement(HTML_NAMESPACE, "a")) {
                        aElem = elem;
                    }
                }
                if (aElem !== undefined) {
                    // PARSE ERROR
                    this.#adoptionAgencyAlgorithm(token);
                    let removeIdx = -1;
                    for (
                        let i = 0;
                        i < this.listOfActiveFormattingElements.length;
                        i++
                    ) {
                        if (this.listOfActiveFormattingElements[i] === aElem) {
                            removeIdx = i;
                        }
                    }
                    this.removeFromActiveFormattingElementsList(removeIdx);
                    removeIdx = this.stackOfOpenElements.indexOf(aElem);
                    this.removeFromStackOfOpenElements(removeIdx);
                }
            }
            this.reconstructActiveFormattingElements();
            const element = this.insertHTMLElement(token);
            this.pushOntoListOfActiveFormattingElements(element);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "b" ||
                token.name === "big" ||
                token.name === "code" ||
                token.name === "em" ||
                token.name === "font" ||
                token.name === "i" ||
                token.name === "s" ||
                token.name === "small" ||
                token.name === "strike" ||
                token.name === "strong" ||
                token.name === "tt" ||
                token.name === "u")
        ) {
            this.reconstructActiveFormattingElements();
            const element = this.insertHTMLElement(token);
            this.pushOntoListOfActiveFormattingElements(element);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "nobr"
        ) {
            this.reconstructActiveFormattingElements();
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "nobr"),
                )
            ) {
                // PARSE ERROR
                this.#adoptionAgencyAlgorithm(token);
                this.reconstructActiveFormattingElements();
            }
            const element = this.insertHTMLElement(token);
            this.pushOntoListOfActiveFormattingElements(element);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "a" ||
                token.name === "b" ||
                token.name === "big" ||
                token.name === "code" ||
                token.name === "em" ||
                token.name === "font" ||
                token.name === "i" ||
                token.name === "nobr" ||
                token.name === "s" ||
                token.name === "small" ||
                token.name === "strike" ||
                token.name === "strong" ||
                token.name === "tt" ||
                token.name === "u")
        ) {
            this.#adoptionAgencyAlgorithm(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "applet" ||
                token.name === "marquee" ||
                token.name === "object")
        ) {
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);

            this.listOfActiveFormattingElements.push("marker");
            this.framesetOKFlag = "not ok";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "applet" ||
                token.name === "marquee" ||
                token.name === "object")
        ) {
            if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags([]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, token.name)) {
                    break;
                }
            }
            this.clearListOfActiveFormattingElementsUpToLastMarker();
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "table"
        ) {
            if (
                this.document.mode !== "quirks" &&
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.insertHTMLElement(token);
            this.framesetOKFlag = "not ok";
            this.insertionMode = "in table";
        } else if (
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "br") ||
            (token.type === "start" &&
                (token.name === "area" ||
                    token.name === "br" ||
                    token.name === "embed" ||
                    token.name === "img" ||
                    token.name === "keygen"))
        ) {
            if (token.type === "end" && token.name === "br") {
                // PARSE ERROR
                token.attributes = [];
                token.type = "start";
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            token.selfClosingAcknowledged = true;
            this.framesetOKFlag = "not ok";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "input"
        ) {
            if (this.isFragmentParsing) {
                throw new Error("not yet implemented");
            }
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "select"),
                )
            ) {
                // PARSE ERROR
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, "select")) {
                        break;
                    }
                }
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            token.selfClosingAcknowledged = true;
            if (!tagAttributeEquals(token, "type", "hidden")) {
                this.framesetOKFlag = "not ok";
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "hr"
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "select"),
                )
            ) {
                this.generateImpliedEndTags([]);
                if (
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "option"),
                    ) ||
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "optgroup"),
                    )
                ) {
                    // PARSE ERROR
                }
            }
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            token.selfClosingAcknowledged = true;
            this.framesetOKFlag = "not ok";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "image"
        ) {
            // PARSE ERROR
            token.name = "img";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "textarea"
        ) {
            this.insertHTMLElement(token);
            this.ignoreNextNewline = true;
            tkr.state = "RCDATA";
            this.originalInsertionMode = this.insertionMode;
            this.framesetOKFlag = "not ok";
            this.insertionMode = "text";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "xmp"
        ) {
            if (
                this.hasElementInButtonScope((e) =>
                    e.isElement(HTML_NAMESPACE, "p"),
                )
            ) {
                this.#closePElement();
            }
            this.reconstructActiveFormattingElements();
            this.framesetOKFlag = "not ok";
            this.parseGenericRawTextElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "iframe"
        ) {
            this.framesetOKFlag = "not ok";
            this.parseGenericRawTextElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            ((token.type === "start" && token.name === "noembed") ||
                (token.type === "start" &&
                    token.name === "noscript" &&
                    this.scriptingMode !== "Disabled"))
        ) {
            this.parseGenericRawTextElement(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "select"
        ) {
            if (this.isFragmentParsing) {
                throw new Error("not yet implemented");
            }
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "select"),
                )
            ) {
                // PARSE ERROR
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, "select")) {
                        break;
                    }
                }
                return;
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
            this.framesetOKFlag = "not ok";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "option"
        ) {
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "select"),
                )
            ) {
                this.generateImpliedEndTags(["optgroup"]);
                if (
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "option"),
                    )
                ) {
                    // PARSE ERROR
                }
            } else {
                if (this.currentNode().isElement(HTML_NAMESPACE, "option")) {
                    this.popFromStackOfOpenElements();
                }
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "optgroup"
        ) {
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "select"),
                )
            ) {
                this.generateImpliedEndTags([]);
                if (
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "option"),
                    ) ||
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "optgroup"),
                    )
                ) {
                    // PARSE ERROR
                }
            } else {
                if (this.currentNode().isElement(HTML_NAMESPACE, "option")) {
                    this.popFromStackOfOpenElements();
                }
            }
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "rb" || token.name === "rtc")
        ) {
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "ruby"),
                )
            ) {
                this.generateImpliedEndTags([]);
                if (!this.currentNode().isElement(HTML_NAMESPACE, "ruby")) {
                    // PARSE ERROR
                }
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "rp" || token.name === "rt")
        ) {
            if (
                this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "ruby"),
                )
            ) {
                this.generateImpliedEndTags(["rtc"]);
                if (
                    !this.currentNode().isElement(HTML_NAMESPACE, "rtc") &&
                    !this.currentNode().isElement(HTML_NAMESPACE, "ruby")
                ) {
                    // PARSE ERROR
                }
            }
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "math"
        ) {
            this.reconstructActiveFormattingElements();
            this.adjustMathmlAttributes(token);
            this.adjustForeignAttributes(token);
            this.insertForeignElement(token, MATHML_NAMESPACE, false);
            if (token.isSelfClosing) {
                this.popFromStackOfOpenElements();
                token.selfClosingAcknowledged = true;
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "svg"
        ) {
            this.reconstructActiveFormattingElements();
            this.adjustSVGAttributes(token);
            this.adjustForeignAttributes(token);
            this.insertForeignElement(token, SVG_NAMESPACE, false);
            if (token.isSelfClosing) {
                this.popFromStackOfOpenElements();
                token.selfClosingAcknowledged = true;
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "frame" ||
                token.name === "head" ||
                token.name === "tbody" ||
                token.name === "td" ||
                token.name === "tfoot" ||
                token.name === "th" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            // PARSE ERROR
            return;
        } else if (token.kind === "tag" && token.type !== "end") {
            this.reconstructActiveFormattingElements();
            this.insertHTMLElement(token);
        } else if (token.kind === "tag" && token.type === "end") {
            let nodeIdx = this.stackOfOpenElements.length - 1;
            while (true) {
                const node = this.stackOfOpenElementsNodeAt(nodeIdx);
                if (node.isElement(HTML_NAMESPACE, token.name)) {
                    this.generateImpliedEndTags([token.name]);
                    if (node !== this.currentNode()) {
                        // PARSE ERROR
                    }
                    const targetNode = node;
                    while (true) {
                        const element = this.popFromStackOfOpenElements();
                        const found = element === targetNode;
                        if (found) {
                            break;
                        }
                    }
                    return;
                }
                if (this.isSpecialElement(node)) {
                    // PARSE ERROR
                    return;
                }
                nodeIdx--;
            }
        } else {
            unexpectedToken(token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#close-a-p-element
    #closePElement() {
        this.generateImpliedEndTags(["p"]);
        if (!this.currentNode().isElement(HTML_NAMESPACE, "p")) {
            // PARSE ERROR
        }
        while (true) {
            const poppedElem = this.popFromStackOfOpenElements();
            if (poppedElem.isElement(HTML_NAMESPACE, "p")) {
                break;
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#adoption-agency-algorithm
    #adoptionAgencyAlgorithm(token: TokenFor<"tag">) {
        const subject = token.name;
        if (this.currentNode().isElement(HTML_NAMESPACE, subject)) {
            for (const element of this.listOfActiveFormattingElements) {
                if (element === this.currentNode()) {
                    this.popFromStackOfOpenElements();
                    return;
                }
            }
        }
        throw new Error("not yet implemented");
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-incdata
    #imodeText(tkr: Tokenizer, token: Token) {
        if (token.kind === "character") {
            this.insertCharacter(token);
        } else if (token.kind === "eof") {
            // PARSE ERROR
            if (this.currentNode().isElement(HTML_NAMESPACE, "script")) {
                // TODO: Set script element's "already started" to true.
            }
            this.popFromStackOfOpenElements();
            this.insertionMode = this.originalInsertionMode;
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "script"
        ) {
            // STUB.
            this.popFromStackOfOpenElements();
            this.insertionMode = this.originalInsertionMode;
        } else if (token.kind === "tag" && token.type === "end") {
            this.popFromStackOfOpenElements();
            this.insertionMode = this.originalInsertionMode;
        } else {
            unexpectedToken(token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#concept-pending-table-char-tokens
    #pendingTableCharacterTokens: TokenFor<"character">[] = [];

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable
    #imodeInTable(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (this.currentNode().isElement(HTML_NAMESPACE, "table") ||
                this.currentNode().isElement(HTML_NAMESPACE, "tbody") ||
                this.currentNode().isElement(HTML_NAMESPACE, "template") ||
                this.currentNode().isElement(HTML_NAMESPACE, "tfoot") ||
                this.currentNode().isElement(HTML_NAMESPACE, "thead") ||
                this.currentNode().isElement(HTML_NAMESPACE, "tr"))
        ) {
            this.originalInsertionMode = this.insertionMode;
            this.insertionMode = "in table text";
            this.reprocessToken(tkr, token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "caption"
        ) {
            this.#clearStackBackToTableContext();
            this.listOfActiveFormattingElements.push("marker");
            this.insertHTMLElement(token);
            this.insertionMode = "in caption";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "colgroup"
        ) {
            this.#clearStackBackToTableContext();
            this.insertHTMLElement(token);
            this.insertionMode = "in column group";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "col"
        ) {
            this.#clearStackBackToTableContext();
            this.insertHTMLElement({
                kind: "tag",
                name: "colgroup",
                attributes: [],
                type: "start",
                isSelfClosing: false,
                selfClosingAcknowledged: false,
            });
            this.insertionMode = "in column group";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "tbody" ||
                token.name === "tfoot" ||
                token.name === "thead" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            this.#clearStackBackToTableContext();
            this.insertionMode = "in table body";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "td" || token.name === "th" || token.name === "tr")
        ) {
            this.#clearStackBackToTableContext();
            this.insertHTMLElement({
                kind: "tag",
                name: "tbody",
                attributes: [],
                type: "start",
                isSelfClosing: false,
                selfClosingAcknowledged: false,
            });
            this.useRulesFor("in table body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "table"
        ) {
            // PARSE ERROR
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "table"),
                )
            ) {
                return;
            } else {
                while (true) {
                    const poppedElem = this.popFromStackOfOpenElements();
                    if (poppedElem.isElement(HTML_NAMESPACE, "table")) {
                        break;
                    }
                }
                this.resetInsertionModeAppropriately();
                this.reprocessToken(tkr, token);
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "table"
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, "table"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, "table")) {
                    break;
                }
            }
            this.resetInsertionModeAppropriately();
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "body" ||
                token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "html" ||
                token.name === "tbody" ||
                token.name === "td" ||
                token.name === "tfoot" ||
                token.name === "th" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            // PARSE ERROR
            return;
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "style" ||
                    token.name === "script" ||
                    token.name === "template")) ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "template")
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "input" &&
            tagAttributeEquals(token, "type", "hidden")
        ) {
            // PARSE ERROR
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            token.selfClosingAcknowledged = true;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "form"
        ) {
            if (this.stackOfOpenElementsContainsHTMLElement("template")) {
                const node = this.formElementPointer;
                if (
                    node === null ||
                    !this.hasElementInScope((e) => e === node)
                ) {
                    // PARSE ERROR
                    return;
                }
                this.generateImpliedEndTags([]);
                if (this.currentNode() !== node) {
                    // PARSE ERROR
                }
                const removeIdx = this.stackOfOpenElements.indexOf(node);
                this.removeFromStackOfOpenElements(removeIdx);
            } else {
                // PARSE ERROR
                if (
                    this.hasElementInScope((e) =>
                        e.isElement(HTML_NAMESPACE, "form"),
                    ) ||
                    this.formElementPointer !== null
                ) {
                    return;
                }
                this.insertHTMLElement(token);
                this.popFromStackOfOpenElements();
            }
        } else if (token.kind === "eof") {
            this.useRulesFor("in body", tkr, token);
        } else {
            // PARSE ERROR
            this.enableFosterParenting = true;
            this.useRulesFor("in body", tkr, token);
            this.enableFosterParenting = false;
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#clear-the-stack-back-to-a-table-context
    #clearStackBackToTableContext() {
        while (
            !(
                this.currentNode().isElement(HTML_NAMESPACE, "table") ||
                this.currentNode().isElement(HTML_NAMESPACE, "template") ||
                this.currentNode().isElement(HTML_NAMESPACE, "html")
            )
        ) {
            this.popFromStackOfOpenElements();
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intabletext
    #imodeInTableText(tkr: Tokenizer, token: Token) {
        if (token.kind === "character" && token.data === "\u0000") {
            // PARSE ERROR
            return;
        } else if (token.kind === "character") {
            this.#pendingTableCharacterTokens.push(token);
        } else {
            let containsNonWhitespace = false;
            for (const token of this.#pendingTableCharacterTokens) {
                if (!isASCIIWhitespace(toCodePoint(token.data))) {
                    containsNonWhitespace = true;
                }
            }
            if (containsNonWhitespace) {
                // PARSE ERROR
                // Below do the same thing as "else" in "in table" insertion mode.
                this.enableFosterParenting = true;
                for (const token of this.#pendingTableCharacterTokens) {
                    this.useRulesFor("in body", tkr, token);
                }
                this.enableFosterParenting = false;
            } else {
                for (const token of this.#pendingTableCharacterTokens) {
                    this.insertCharacter(token);
                }
            }
            this.insertionMode = this.originalInsertionMode;
            this.reprocessToken(tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-incaption
    #imodeInCaption(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "caption"
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, "caption"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags([]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, "caption")) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, "caption")) {
                    break;
                }
            }
            this.clearListOfActiveFormattingElementsUpToLastMarker();
            this.insertionMode = "in table";
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "caption" ||
                    token.name === "col" ||
                    token.name === "colgroup" ||
                    token.name === "tbody" ||
                    token.name === "td" ||
                    token.name === "tfoot" ||
                    token.name === "th" ||
                    token.name === "thead" ||
                    token.name === "tr")) ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "table")
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, "caption"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags([]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, "caption")) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, "caption")) {
                    break;
                }
            }
            this.clearListOfActiveFormattingElementsUpToLastMarker();
            this.insertionMode = "in table";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "body" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "html" ||
                token.name === "tbody" ||
                token.name === "td" ||
                token.name === "tfoot" ||
                token.name === "th" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            // PARSE ERROR
            return;
        } else {
            this.useRulesFor("in body", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-incolgroup
    #imodeInColumnGroup(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.insertCharacter(token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "col"
        ) {
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            if (token.isSelfClosing) {
                token.selfClosingAcknowledged = true;
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "colgroup"
        ) {
            if (!this.currentNode().isElement(HTML_NAMESPACE, "colgroup")) {
                // PARSE ERROR
                return;
            }
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "col"
        ) {
            // PARSE ERROR
            return;
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                token.name === "template") ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "template")
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (token.kind === "eof") {
            this.useRulesFor("in body", tkr, token);
        } else {
            if (!this.currentNode().isElement(HTML_NAMESPACE, "colgroup")) {
                // PARSE ERROR
                return;
            }
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table";
            this.reprocessToken(tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intbody
    #imodeInTableBody(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "tr"
        ) {
            this.#clearStackBackToTableBodyContext();
            this.insertHTMLElement(token);
            this.insertionMode = "in row";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "th" || token.name === "td")
        ) {
            // PARSE ERROR
            this.#clearStackBackToTableBodyContext();
            this.insertHTMLElement({
                kind: "tag",
                name: "tr",
                attributes: [],
                type: "start",
                isSelfClosing: false,
                selfClosingAcknowledged: false,
            });
            this.insertionMode = "in row";
            this.useRulesFor("in row", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "tbody" ||
                token.name === "tfoot" ||
                token.name === "thead")
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.#clearStackBackToTableBodyContext();
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table";
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "caption" ||
                    token.name === "col" ||
                    token.name === "colgroup" ||
                    token.name === "tbody" ||
                    token.name === "tfoot" ||
                    token.name === "thead")) ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "table")
        ) {
            if (
                !(
                    this.hasElementInTableScope((e) =>
                        e.isElement(HTML_NAMESPACE, "tbody"),
                    ) ||
                    this.hasElementInTableScope((e) =>
                        e.isElement(HTML_NAMESPACE, "thead"),
                    ) ||
                    this.hasElementInTableScope((e) =>
                        e.isElement(HTML_NAMESPACE, "tfoot"),
                    )
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.#clearStackBackToTableBodyContext();
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table";
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "body" ||
                token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "html" ||
                token.name === "td" ||
                token.name === "th" ||
                token.name === "tr")
        ) {
            // PARSE ERROR
            return;
        } else {
            this.useRulesFor("in table", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#clear-the-stack-back-to-a-table-body-context
    #clearStackBackToTableBodyContext() {
        while (
            !(
                this.currentNode().isElement(HTML_NAMESPACE, "tbody") ||
                this.currentNode().isElement(HTML_NAMESPACE, "tfoot") ||
                this.currentNode().isElement(HTML_NAMESPACE, "thead") ||
                this.currentNode().isElement(HTML_NAMESPACE, "template") ||
                this.currentNode().isElement(HTML_NAMESPACE, "html")
            )
        ) {
            this.popFromStackOfOpenElements();
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intr
    #imodeInRow(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "th" || token.name === "td")
        ) {
            this.#clearStackBackToTableRowContext();
            this.insertHTMLElement(token);
            this.insertionMode = "in cell";
            this.listOfActiveFormattingElements.push("marker");
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "tr"
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, "tr"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.#clearStackBackToTableRowContext();
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table body";
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "caption" ||
                    token.name === "col" ||
                    token.name === "colgroup" ||
                    token.name === "tbody" ||
                    token.name === "tfoot" ||
                    token.name === "thead" ||
                    token.name === "tr")) ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "table")
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, "tr"),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.#clearStackBackToTableRowContext();
            this.popFromStackOfOpenElements();
            this.insertionMode = "in table body";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "tbody" ||
                token.name === "tfoot" ||
                token.name === "thead")
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            }
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, "tr"),
                )
            ) {
                return;
            } else {
                this.#clearStackBackToTableRowContext();
                this.popFromStackOfOpenElements();
                this.insertionMode = "in table body";
            }
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "body" ||
                token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "html" ||
                token.name === "td" ||
                token.name === "th")
        ) {
            // PARSE ERROR
            return;
        } else {
            this.useRulesFor("in table", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#clear-the-stack-back-to-a-table-row-context
    #clearStackBackToTableRowContext() {
        while (
            !(
                this.currentNode().isElement(HTML_NAMESPACE, "tr") ||
                this.currentNode().isElement(HTML_NAMESPACE, "template") ||
                this.currentNode().isElement(HTML_NAMESPACE, "html")
            )
        ) {
            this.popFromStackOfOpenElements();
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intd
    #imodeInCell(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "th" || token.name === "td")
        ) {
            if (
                !this.hasElementInTableScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.generateImpliedEndTags([]);
            if (!this.currentNode().isElement(HTML_NAMESPACE, token.name)) {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, token.name)) {
                    break;
                }
            }
            this.clearListOfActiveFormattingElementsUpToLastMarker();
            this.insertionMode = "in row";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "tbody" ||
                token.name === "td" ||
                token.name === "tfoot" ||
                token.name === "th" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            if (
                !(
                    this.hasElementInTableScope((e) =>
                        e.isElement(HTML_NAMESPACE, "td"),
                    ) ||
                    this.hasElementInTableScope((e) =>
                        e.isElement(HTML_NAMESPACE, "th"),
                    )
                )
            ) {
                throw new Error("we should have td or th in SOE at this point");
            }
            this.#closeCell();
            this.useRulesFor("in row", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "body" ||
                token.name === "caption" ||
                token.name === "col" ||
                token.name === "colgroup" ||
                token.name === "html")
        ) {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            (token.name === "table" ||
                token.name === "tbody" ||
                token.name === "tfoot" ||
                token.name === "thead" ||
                token.name === "tr")
        ) {
            if (
                !this.hasElementInScope((e) =>
                    e.isElement(HTML_NAMESPACE, token.name),
                )
            ) {
                // PARSE ERROR
                return;
            }
            this.#closeCell();
            this.useRulesFor("in row", tkr, token);
        } else {
            this.useRulesFor("in body", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#close-the-cell
    #closeCell() {
        this.generateImpliedEndTags([]);

        if (
            !(
                this.currentNode().isElement(HTML_NAMESPACE, "td") ||
                this.currentNode().isElement(HTML_NAMESPACE, "th")
            )
        ) {
            // PARSE ERROR
        }
        while (true) {
            const poppedElem = this.popFromStackOfOpenElements();
            if (
                poppedElem.isElement(HTML_NAMESPACE, "td") ||
                poppedElem.isElement(HTML_NAMESPACE, "th")
            ) {
                break;
            }
        }
        this.clearListOfActiveFormattingElementsUpToLastMarker();
        this.insertionMode = "in row";
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intemplate
    #imodeInTemplate(tkr: Tokenizer, token: Token) {
        if (token.kind === "character") {
            this.useRulesFor("in body", tkr, token);
        } else if (token.kind === "comment") {
            this.useRulesFor("in body", tkr, token);
        } else if (token.kind === "doctype") {
            this.useRulesFor("in body", tkr, token);
        } else if (
            (token.kind === "tag" &&
                token.type === "start" &&
                (token.name === "base" ||
                    token.name === "basefont" ||
                    token.name === "bgsound" ||
                    token.name === "link" ||
                    token.name === "meta" ||
                    token.name === "noframes" ||
                    token.name === "script" ||
                    token.name === "script" ||
                    token.name === "style" ||
                    token.name === "template" ||
                    token.name === "title")) ||
            (token.kind === "tag" &&
                token.type === "end" &&
                token.name === "template")
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "caption" ||
                token.name === "colgroup" ||
                token.name === "tbody" ||
                token.name === "tfoot" ||
                token.name === "thead")
        ) {
            this.stackOfTemplateInsertionModes.pop();
            this.stackOfTemplateInsertionModes.push("in table");
            this.insertionMode = "in table";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "col"
        ) {
            this.stackOfTemplateInsertionModes.pop();
            this.stackOfTemplateInsertionModes.push("in column group");
            this.insertionMode = "in column group";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "tr"
        ) {
            this.stackOfTemplateInsertionModes.pop();
            this.stackOfTemplateInsertionModes.push("in table body");
            this.insertionMode = "in table body";
            this.reprocessToken(tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            (token.name === "th" || token.name === "td")
        ) {
            this.stackOfTemplateInsertionModes.pop();
            this.stackOfTemplateInsertionModes.push("in row");
            this.insertionMode = "in row";
            this.reprocessToken(tkr, token);
        } else if (token.kind === "tag" && token.type === "start") {
            this.stackOfTemplateInsertionModes.pop();
            this.stackOfTemplateInsertionModes.push("in body");
            this.insertionMode = "in body";
            this.reprocessToken(tkr, token);
        } else if (token.kind === "tag" && token.type === "end") {
            // PARSE ERROR
            return;
        } else if (token.kind === "eof") {
            if (!this.stackOfOpenElementsContainsHTMLElement("template")) {
                this.stopParsing();
            } else {
                // PARSE ERROR
            }
            while (true) {
                const poppedElem = this.popFromStackOfOpenElements();
                if (poppedElem.isElement(HTML_NAMESPACE, "template")) {
                    break;
                }
            }
            this.clearListOfActiveFormattingElementsUpToLastMarker();
            this.stackOfTemplateInsertionModes.pop();
            this.resetInsertionModeAppropriately();
            this.reprocessToken(tkr, token);
        } else {
            unexpectedToken(token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody
    #imodeAfterBody(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (token.kind === "comment") {
            this.insertComment(token, {
                rel: "after last child",
                parentNode: this.stackOfOpenElementsNodeAt(0),
            });
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "html"
        ) {
            if (this.isFragmentParsing) {
                // PARSE ERROR
                return;
            }
            this.insertionMode = "after after body";
        } else if (token.kind === "eof") {
            this.stopParsing();
        } else {
            // PARSE ERROR
            this.insertionMode = "in body";
            this.useRulesFor("in body", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inframeset
    #imodeInFrameset(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.insertCharacter(token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "frameset"
        ) {
            this.insertHTMLElement(token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "framesets"
        ) {
            if (
                this.currentNode().isElement(HTML_NAMESPACE, "html") &&
                this.currentNode().parent !== null
            ) {
                // PARSE ERROR
                return;
            }
            this.popFromStackOfOpenElements();
            if (
                !this.isFragmentParsing &&
                !this.currentNode().isElement(HTML_NAMESPACE, "frameset")
            ) {
                this.insertionMode = "after frameset";
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "frame"
        ) {
            this.insertHTMLElement(token);
            this.popFromStackOfOpenElements();
            if (token.isSelfClosing) {
                token.selfClosingAcknowledged = true;
            }
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "noframes"
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (token.kind === "eof") {
            if (
                !this.currentNode().isElement(HTML_NAMESPACE, "html") ||
                this.currentNode().parent !== null
            ) {
                // PARSE ERROR
            }
            this.stopParsing();
        } else {
            // PARSE ERROR
            return;
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterframeset
    #imodeAfterFrameset(tkr: Tokenizer, token: Token) {
        if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.insertCharacter(token);
        } else if (token.kind === "comment") {
            this.insertComment(token, null);
        } else if (token.kind === "doctype") {
            // PARSE ERROR
            return;
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "end" &&
            token.name === "html"
        ) {
            this.insertionMode = "after after frameset";
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "noframes"
        ) {
            this.useRulesFor("in head", tkr, token);
        } else if (token.kind === "eof") {
            this.stopParsing();
        } else {
            // PARSE ERROR
            return;
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-body-insertion-mode
    #imodeAfterAfterBody(tkr: Tokenizer, token: Token) {
        if (token.kind === "comment") {
            this.insertComment(token, {
                rel: "after last child",
                parentNode: this.document,
            });
        } else if (token.kind === "doctype") {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (token.kind === "eof") {
            this.stopParsing();
        } else {
            // PARSE ERROR
            this.insertionMode = "in body";
            this.useRulesFor("in body", tkr, token);
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-frameset-insertion-mode
    #imodeAfterAfterFrameset(tkr: Tokenizer, token: Token) {
        if (token.kind === "comment") {
            this.insertComment(token, {
                rel: "after last child",
                parentNode: this.document,
            });
        } else if (token.kind === "doctype") {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "character" &&
            (token.data === "\t" ||
                token.data === "\n" ||
                token.data === "\f" ||
                token.data === "\r" ||
                token.data === " ")
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "html"
        ) {
            this.useRulesFor("in body", tkr, token);
        } else if (token.kind === "eof") {
            this.stopParsing();
        } else if (
            token.kind === "tag" &&
            token.type === "start" &&
            token.name === "noframes"
        ) {
            this.useRulesFor("in head", tkr, token);
        } else {
            // PARSE ERROR
            return;
        }
    }

    //==========================================================================
    // HTML Standard - 13.2.7.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#stop-parsing
    stopParsing() {
        this.runParser = false;
        // TODO
    }
}

export function parse(source: string) {
    const par = new Parser();
    tokenize(source, (tkr, token) =>
        par.treeConstructionDispatcher(tkr, token),
    );
    return par.document;
}
