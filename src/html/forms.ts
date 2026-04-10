// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

//==============================================================================
// HTML Standard - 4.10.2.
//==============================================================================

import type { Element } from "../dom.js";
import { HTML_NAMESPACE, isASCIICaseInsensitiveMatch } from "../infra.js";
import { isFormAssociatedCustomElement } from "./custom_elements.js";

// https://html.spec.whatwg.org/multipage/forms.html#form-associated-element
export function isFormAssociatedElement(element: Element) {
    return (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "button") ||
        element.isElement(HTML_NAMESPACE, "fieldset") ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "object") ||
        element.isElement(HTML_NAMESPACE, "output") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea") ||
        element.isElement(HTML_NAMESPACE, "img")
    );
}

// https://html.spec.whatwg.org/multipage/forms.html#category-listed
export function isListedElement(element: Element) {
    return (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "button") ||
        element.isElement(HTML_NAMESPACE, "fieldset") ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "object") ||
        element.isElement(HTML_NAMESPACE, "output") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea")
    );
}

// https://html.spec.whatwg.org/multipage/forms.html#category-submit
export function isSubmittableElement(element: Element) {
    return (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "button") ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea")
    );
}

// https://html.spec.whatwg.org/multipage/forms.html#category-reset
export function isResettableElement(element: Element) {
    return (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "output") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea")
    );
}

// https://html.spec.whatwg.org/multipage/forms.html#category-autocapitalize
export function isAutocapitalizeAndAutocorrectInheritingElement(
    element: Element,
) {
    return (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "button") ||
        element.isElement(HTML_NAMESPACE, "fieldset") ||
        element.isElement(HTML_NAMESPACE, "input") ||
        element.isElement(HTML_NAMESPACE, "output") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea")
    );
}

// https://html.spec.whatwg.org/multipage/forms.html#category-label
export function isLabelableElement(element: Element) {
    if (
        isFormAssociatedCustomElement(element) ||
        element.isElement(HTML_NAMESPACE, "button") ||
        element.isElement(HTML_NAMESPACE, "meter") ||
        element.isElement(HTML_NAMESPACE, "output") ||
        element.isElement(HTML_NAMESPACE, "progress") ||
        element.isElement(HTML_NAMESPACE, "select") ||
        element.isElement(HTML_NAMESPACE, "textarea")
    ) {
        return true;
    }
    const typeAttr = element.attribute(null, "type");
    return (
        element.isElement(HTML_NAMESPACE, "input") &&
        typeAttr != undefined &&
        !isASCIICaseInsensitiveMatch(typeAttr, "hidden")
    );
}
