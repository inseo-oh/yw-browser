// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import type { Document, Element } from "../dom.js";

//==============================================================================
// HTML Standard - 4.13.3.
//==============================================================================

// https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
export function lookupCustomElementDefinition(
    registry: CustomElementRegistry | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _namespace: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _localName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _is: string | null,
): CustomElementRegistry | null {
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
