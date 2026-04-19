// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { Element, type ElementInterface } from "../dom.js";
import { HTML_NAMESPACE } from "../infra.js";
import { isValidCustomElementName } from "./custom_elements.js";

//==========================================================================
// HTML Standard - 3.2.2.
//==========================================================================

// https://html.spec.whatwg.org/multipage/dom.html#htmlelement
export class HTMLElement extends Element {}

// https://html.spec.whatwg.org/multipage/dom.html#htmlunknownelement
export class HTMLUnknownElement extends HTMLElement {}

// https://html.spec.whatwg.org/multipage/dom.html#htmlelement
export function elementInterfaceForHTML(name: string): ElementInterface {
    switch (name) {
        // S1.
        case "applet":
        case "bgsound":
        case "blink":
        case "isindex":
        case "keygen":
        case "multicol":
        case "nextid":
        case "spacer":
            return (n, a) => new HTMLUnknownElement(n, a);

        // S2.
        case "acronym":
        case "basefont":
        case "big":
        case "center":
        case "nobr":
        case "noembed":
        case "noframes":
        case "plaintext":
        case "rb":
        case "rtc":
        case "strike":
        case "tt":
            return (n, a) => new HTMLElement(n, a);

        // S3.
        case "listing":
        case "xmp":
            return (n, a) => new HTMLPreElement(n, a);

        // S4.
        case "html":
            return (n, a) => new HTMLHtmlElement(n, a);
        case "head":
            return (n, a) => new HTMLHeadElement(n, a);
        case "title":
            return (n, a) => new HTMLTitleElement(n, a);
        case "base":
            return (n, a) => new HTMLBaseElement(n, a);
        case "link":
            return (n, a) => new HTMLLinkElement(n, a);
        case "pre":
            return (n, a) => new HTMLPreElement(n, a);
        case "img":
            return (n, a) => new HTMLImageElement(n, a);

        // S5.
        // TODO
    }

    // S6.
    if (isValidCustomElementName(name)) {
        return (n, a) => new HTMLElement(n, a);
    }

    // S7.
    return (n, a) => new HTMLUnknownElement(n, a);
}

//==========================================================================
// HTML Standard - 4.1.1.
//==========================================================================

// https://html.spec.whatwg.org/multipage/semantics.html#htmlhtmlelement
export class HTMLHtmlElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.2.1.
//==========================================================================

// https://html.spec.whatwg.org/multipage/semantics.html#htmlheadelement
export class HTMLHeadElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.2.2.
//==========================================================================

// https://html.spec.whatwg.org/multipage/semantics.html#htmltitleelement
export class HTMLTitleElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.2.3.
//==========================================================================

// https://html.spec.whatwg.org/multipage/semantics.html#htmlbaseelement
export class HTMLBaseElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.2.4.
//==========================================================================

// https://html.spec.whatwg.org/multipage/semantics.html#htmllinkelement
export class HTMLLinkElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.4.3.
//==========================================================================

// https://html.spec.whatwg.org/multipage/grouping-content.html#htmlpreelement
export class HTMLPreElement extends HTMLElement {}

//==========================================================================
// HTML Standard - 4.8.3.
//==========================================================================

export class HTMLImageElement extends HTMLElement {
    //======================================================================
    // HTML Standard - 4.8.4.
    //======================================================================

    // https://html.spec.whatwg.org/multipage/images.html#source-set
    sourceSet: null[] = []; // STUB
}

//==========================================================================
// HTML Standard - 13.1.2.
//==========================================================================

// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
export function isVoidElement(element: Element): boolean {
    return (
        element.isElement(HTML_NAMESPACE, "area") ||
        element.isElement(HTML_NAMESPACE, "base") ||
        element.isElement(HTML_NAMESPACE, "br") ||
        element.isElement(HTML_NAMESPACE, "col") ||
        element.isElement(HTML_NAMESPACE, "embed") ||
        element.isElement(HTML_NAMESPACE, "hr") ||
        element.isElement(HTML_NAMESPACE, "img") ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "link") ||
        element.isElement(HTML_NAMESPACE, "meta") ||
        element.isElement(HTML_NAMESPACE, "source") ||
        element.isElement(HTML_NAMESPACE, "track") ||
        element.isElement(HTML_NAMESPACE, "wbr")
    );
}
