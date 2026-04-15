// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    Element,
    type Node,
    type Document,
    type DocumentFragment,
    type ShadowRoot,
    Attr,
    Text,
    Comment,
    DocumentType,
} from "../../dom.js";
import {
    HTML_NAMESPACE,
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    XLINK_NAMESPACE,
    XML_NAMESPACE,
    XMLNS_NAMESPACE,
} from "../../infra.js";
import { isVoidElement } from "../elements.js";

// https://html.spec.whatwg.org/multipage/parsing.html#serializes-as-void
function serializesToVoid(element: Element): boolean {
    return (
        isVoidElement(element) ||
        element.isElement(HTML_NAMESPACE, "basefont") ||
        element.isElement(HTML_NAMESPACE, "bgsound") ||
        element.isElement(HTML_NAMESPACE, "frame") ||
        element.isElement(HTML_NAMESPACE, "keygen") ||
        element.isElement(HTML_NAMESPACE, "param")
    );
}

// https://html.spec.whatwg.org/multipage/parsing.html#html-fragment-serialisation-algorithm
export default function serializeHTMLFragment(
    node: Element | Document | DocumentFragment,
    serializableShadowRoots: boolean,
    shadowRoots: ShadowRoot[],
): string {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.10.)

    // S1.
    if (node instanceof Element && serializesToVoid(node)) {
        return "";
    }

    // S2.
    let s = "";

    // S3.
    if (node instanceof Element && node.isElement(HTML_NAMESPACE, "template")) {
        // STUB: For now we treat template as if it was normal element.
    }

    // S4.
    let currentNode: Node = node;
    if (currentNode instanceof Element && currentNode.isShadowHost()) {
        throw new Error("TODO");
    }

    // S5.
    for (const child of node.children) {
        // S5-1.
        currentNode = child;

        // S5-2.
        if (currentNode instanceof Element) {
            const tagName =
                currentNode.namespace === HTML_NAMESPACE ||
                currentNode.namespace === MATHML_NAMESPACE ||
                currentNode.namespace === SVG_NAMESPACE
                    ? currentNode.localName
                    : currentNode.qualifiedName();
            s += `<${tagName}`;

            if (
                currentNode.isValue !== null &&
                currentNode.attribute(null, "is") === undefined
            ) {
                throw new Error("TODO");
            }

            for (const attr of currentNode.attributeList) {
                s += ` ${serializedNameOfAttribute(attr)}="${escapeString(attr.value, true)}"`;
            }

            s += ">";

            if (serializesToVoid(currentNode)) {
                continue;
            }

            s += serializeHTMLFragment(
                currentNode,
                serializableShadowRoots,
                shadowRoots,
            );
            s += `</${tagName}>`;
        } else if (currentNode instanceof Text) {
            if (
                currentNode.parent instanceof Element &&
                (currentNode.parent.isElement(HTML_NAMESPACE, "style") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "script") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "xmp") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "iframe") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "noembed") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "noframes") ||
                    currentNode.parent.isElement(HTML_NAMESPACE, "plaintext"))
            ) {
                s += currentNode.data;
            }
            // TODO: Handle noscript element
        } else if (currentNode instanceof Comment) {
            s += `<!--${currentNode.data}-->`;
        } else if (currentNode instanceof DocumentType) {
            s += `<!DOCTYPE ${currentNode.name}>`;
        }
        // TODO: ProcessingInstruction node
    }

    // S6.
    return s;
}

// https://html.spec.whatwg.org/multipage/parsing.html#attribute's-serialised-name
function serializedNameOfAttribute(attr: Attr): string {
    switch (attr.namespace) {
        case null:
            return attr.localName;
        case XML_NAMESPACE:
            return `xml:${attr.localName}`;
        case XMLNS_NAMESPACE:
            if (attr.localName === "xmlns") {
                return `xmlns`;
            } else {
                return `xmlns:${attr.localName}`;
            }
        case XLINK_NAMESPACE:
            return `xlink:${attr.localName}`;
        default:
            return attr.qualifiedName();
    }
}

// https://html.spec.whatwg.org/multipage/parsing.html#escapingString
function escapeString(s: string, isAttributeMode: boolean = false): string {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.10.)

    // S1.
    s = s.replace("&", "&amp;");

    // S2.
    s = s.replace("\u00a0", "&nbsp;");

    // S3.
    s = s.replace("<", "&lt;");

    // S4.
    s = s.replace(">", "&gt;");

    // S5.
    if (isAttributeMode) {
        s = s.replace('"', "&quot;");
    }

    return s;
}
