// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    isValidElementLocalName,
    type Document,
    type Element,
} from "../dom.js";
import { isASCIILowerAlpha } from "../infra.js";

//==============================================================================
// HTML Standard - 4.13.3.
//==============================================================================

// https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-element
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isFormAssociatedCustomElement(_element: Element) {
    // STUB
    return false;
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
export function isValidCustomElementName(name: string) {
    return (
        isValidElementLocalName(name) &&
        isASCIILowerAlpha(name.codePointAt(0)) &&
        name.match(/[A-Z]/) === null &&
        name.indexOf("-") !== -1 &&
        name !== "annotation-xml" &&
        name !== "color-profile" &&
        name !== "font-face" &&
        name !== "font-face-src" &&
        name !== "font-face-uri" &&
        name !== "font-face-format" &&
        name !== "font-face-name" &&
        name !== "missing-glyph"
    );
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-definition
export type CustomElementDefinition = {
    name: string;
    localName: string;
    // STUB
};

// https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
export function lookupCustomElementDefinition(
    registry: CustomElementRegistry | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _namespace: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _localName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _is: string | null,
): CustomElementDefinition | null {
    // S1.
    if (registry === null) {
        return null;
    }

    // S2. ~ S5.
    throw new Error("TODO");
}

//==============================================================================
// HTML Standard - 4.13.4.
//==============================================================================

// https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
export class CustomElementRegistry {
    //==========================================================================
    // HTML Standard - 4.13.4.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/custom-elements.html#is-scoped
    isScoped: boolean = false;

    // https://html.spec.whatwg.org/multipage/custom-elements.html#scoped-document-set
    scopedDocumentSet: Document[] = [];
}

//==============================================================================
// HTML Standard - 4.13.5.
//==============================================================================

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-try-upgrade
export function tryUpgradeElement(element: Element) {
    const definition = lookupCustomElementDefinition(
        element.customElementRegistry,
        element.namespace,
        element.localName,
        element.isValue,
    );
    if (definition != null) {
        // TODO: enqueue a custom element upgrade reaction given element and definition.
        throw new Error(
            "TODO[https://html.spec.whatwg.org/multipage/custom-elements.html#concept-try-upgrade]",
        );
    }
}
