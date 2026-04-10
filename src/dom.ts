// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause
/* eslint-disable @typescript-eslint/no-this-alias */

import { UTF8_ENCODING, type Encoding } from "./encoding.js";
import {
    CustomElementRegistry,
    isValidCustomElementName,
    lookupCustomElementDefinition,
    tryUpgradeElement,
} from "./html/custom_elements.js";
import { type TokenFor } from "./html/parsing/token.js";
import {
    HTML_NAMESPACE,
    isASCIIAlpha,
    isASCIIDigit,
    isASCIIWhitespace,
} from "./infra.js";

//==============================================================================
// DOM Standard - 1.4.
//==============================================================================

// https://dom.spec.whatwg.org/#valid-element-local-name
export function isValidElementLocalName(name: string) {
    // S1.
    if (name.length === 0) {
        return false;
    }

    // S2.
    const firstCodePoint = name.codePointAt(0);
    if (isASCIIAlpha(firstCodePoint)) {
        // S2-1.
        for (let i = 0; i < name.length; i++) {
            const cp = name.codePointAt(i);
            if (
                isASCIIWhitespace(cp) ||
                cp === 0x000 ||
                cp === 0x002f ||
                cp === 0x003e
            ) {
                return false;
            }
        }

        // S2-2.
        return true;
    }

    // S3.
    if (
        firstCodePoint !== 0x003a &&
        firstCodePoint !== 0x005f &&
        (firstCodePoint === undefined ||
            firstCodePoint < 0x0080 ||
            0x10ffff < firstCodePoint)
    ) {
        return false;
    }

    // S4.
    for (let i = 1; i < name.length; i++) {
        const cp = name.codePointAt(i);
        if (
            !isASCIIAlpha(cp) &&
            !isASCIIDigit(cp) &&
            cp !== 0x002d &&
            cp !== 0x002e &&
            cp !== 0x003a &&
            cp !== 0x005f &&
            (cp === undefined || cp < 0x0080 || 0x10ffff < cp)
        ) {
            return false;
        }
    }

    // S5.
    return true;
}

//==============================================================================
// DOM Standard - 4.2. and 4.4.
//==============================================================================

// https://dom.spec.whatwg.org/#concept-node
export class Node {
    styleSheets = [];

    constructor(nodeDocument: Document) {
        this.nodeDocument = nodeDocument;
    }

    inTheSameTreeAs(other: Node): boolean {
        return this.root() === other.root();
    }

    //==========================================================================
    // DOM Standard - 1.1.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-tree-parent
    parent: Node | null = null;

    // https://dom.spec.whatwg.org/#concept-tree-child
    children: Node[] = [];

    // https://dom.spec.whatwg.org/#concept-tree-root
    root(): Node {
        let res: Node = this;
        while (res.parent !== null) {
            res = res.parent;
        }
        return res;
    }

    // https://dom.spec.whatwg.org/#concept-tree-descendant
    descendants(): Node[] {
        const nodes = this.inclusiveDescendants();
        return nodes.slice(1);
    }

    // https://dom.spec.whatwg.org/#concept-tree-inclusive-descendant
    inclusiveDescendants(): Node[] {
        // In a nutshell: It's just DFS search.
        const resNodes = [];
        let lastNode: Node | null = null;

        while (true) {
            let res: Node | null;

            if (lastNode === null) {
                // This is our first call

                res = this;
            } else {
                let currNode: Node | null = lastNode;
                res = currNode.children[0] ?? null;
                // If we don't have more children, move to the next sibling
                while (res === null) {
                    res = currNode.nextSibling();
                    if (res !== null) {
                        break;
                    }
                    // We don't even have the next sibling -> Move to the parent
                    currNode = currNode.parent;
                    if (currNode === this || currNode === null) {
                        // We don't have parent, or we are currently at root. We stop here.
                        res = null;
                        break;
                    }
                }
            }
            if (res === null) {
                break;
            }
            lastNode = res;
            resNodes.push(res);
        }
        return resNodes;
    }

    // https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor
    inclusiveAncestors(): Node[] {
        const resNodes = [];
        resNodes.push(this);

        let p: Node = this;
        while (p.parent !== null) {
            p = p.parent;
            resNodes.push(p);
        }
        return resNodes;
    }

    // https://dom.spec.whatwg.org/#concept-tree-ancestor
    ancestors(): Node[] {
        const nodes = this.inclusiveAncestors();
        return nodes.slice(1);
    }

    // https://dom.spec.whatwg.org/#concept-tree-first-child
    firstChild(): Node | null {
        return this.children[0] ?? null;
    }

    // https://dom.spec.whatwg.org/#concept-tree-last-child
    lastChild(): Node | null {
        return this.children[this.children.length - 1] ?? null;
    }

    // https://dom.spec.whatwg.org/#concept-tree-previous-sibling
    prevSibling(): Node | null {
        if (this.parent === null) {
            return null;
        }
        const idx = this.index();
        return this.parent.children[idx - 1] ?? null;
    }

    // https://dom.spec.whatwg.org/#concept-tree-next-sibling
    nextSibling(): Node | null {
        if (this.parent === null) {
            return null;
        }
        const idx = this.index();
        return this.parent.children[idx + 1] ?? null;
    }

    // https://dom.spec.whatwg.org/#concept-tree-index
    index(): number {
        if (parent === null) {
            return 0;
        }
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === this) {
                return i;
            }
        }
        throw new Error("not a children");
    }

    //==========================================================================
    // DOM Standard - 4.2.1.
    //==========================================================================

    // https://dom.spec.whatwg.org/#in-a-document-tree
    isInDocumentTree(): boolean {
        return this.root() instanceof Document;
    }

    //==========================================================================
    // DOM Standard - 4.2.2.
    //==========================================================================

    // https://dom.spec.whatwg.org/#connected
    isConnected(): boolean {
        return this.shadowIncludingRoot() === this.nodeDocument;
    }

    //==========================================================================
    // DOM Standard - 4.2.3.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-node-post-connection-ext
    onRunPostConnectionSteps() {}

    // https://dom.spec.whatwg.org/#concept-node-children-changed-ext
    onRunChildrenChangedSteps() {}

    // https://dom.spec.whatwg.org/#concept-node-insert
    insert(parent: Node, beforeChild: Node | null, suppressObservers: boolean) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2025.11.13)

        // S1.
        let nodes: Node[];
        if (this instanceof DocumentFragment) {
            nodes = [...this.children];
        } else {
            nodes = [this];
        }

        // S2.
        const count = nodes.length;

        // S3.
        if (count === 0) {
            return;
        }

        // S4.
        if (this instanceof DocumentFragment) {
            throw new Error(
                "TODO[https://dom.spec.whatwg.org/#concept-node-insert]",
            );
        }

        // S5.
        if (beforeChild !== null) {
            // TODO[https://dom.spec.whatwg.org/#concept-node-insert]
            // 1. For each live range whose start node is parent and start offset is greater
            // than child’s index, increase its start offset by count.
            // 2. For each live range whose end node is parent and end offset is greater
            // than child’s index, increase its end offset by count.
        }

        // S6.
        let prevSibling = parent.lastChild();
        if (beforeChild !== null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            prevSibling = beforeChild.prevSibling();
        }

        // S7.
        for (const node of nodes) {
            // S7-1.
            node.adoptNodeInto(parent.nodeDocument);
            
            if (beforeChild === null) {
                // S7-2.
                parent.children.push(node);
            } else {
                // S7-3.
                const insertIndex = beforeChild.index();
                parent.children.splice(insertIndex, 0, node);
            }
            node.parent = parent;

            // S7-4.
            if (parent instanceof Element && parent.isShadowHost()) {
                throw new Error(
                    "TODO[https://dom.spec.whatwg.org/#concept-node-insert]",
                );
            }

            // S7-5.
            const parentRoot = parent.root();
            if (parentRoot instanceof ShadowRoot) {
                throw new Error(
                    "TODO[https://dom.spec.whatwg.org/#concept-node-insert]",
                );
            }

            // S7-6.
            // TODO

            // S7-7.
            for (const inclusiveDescendant of node.shadowIncludingDescendants()) {
                // S7-7-1.
                inclusiveDescendant.onRunInsertionSteps(this);
                if (inclusiveDescendant instanceof Element) {
                    const inclusiveDescendantElem = inclusiveDescendant;
                    // S7-7-2.
                    let reg = inclusiveDescendantElem.customElementRegistry;
                    if (reg === null) {
                        // NOTE: inclusiveDescendant must have parent at this point
                        reg =
                            inclusiveDescendant.parent!.lookupCustomElementRegistry();
                        inclusiveDescendantElem.customElementRegistry = reg;
                    } else if (reg.isScoped) {
                        reg.scopedDocumentSet.push(
                            inclusiveDescendant.nodeDocument,
                        );
                    } else if (inclusiveDescendantElem.isCustom()) {
                        // TODO
                        throw new Error(
                            "TODO[https://dom.spec.whatwg.org/#concept-node-insert]",
                        );
                    } else {
                        tryUpgradeElement(inclusiveDescendantElem);
                    }
                } else if (inclusiveDescendant instanceof ShadowRoot) {
                    // S7-7-3.

                    // TODO
                    throw new Error(
                        "TODO[https://dom.spec.whatwg.org/#concept-node-insert]",
                    );
                }
            }
        }

        // S8.
        if (!suppressObservers) {
            // TODO
        }

        // S9.
        parent.onRunChildrenChangedSteps();

        // S10.
        const staticNodeList = [];

        // S11.
        for (const node of nodes) {
            staticNodeList.push(...node.shadowIncludingDescendants());
        }

        // S12.
        for (const node of staticNodeList) {
            if (node.isConnected()) {
                node.onRunPostConnectionSteps();
            }
        }
    }

    // TODO: Replace with https://dom.spec.whatwg.org/#concept-node-append
    appendChild(child: Node) {
        child.insert(this, null, false);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onRunInsertionSteps(_insertedNode: Node) {}

    //==========================================================================
    // DOM Standard - 4.4.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-node-document
    nodeDocument: Document;

    //==========================================================================
    // DOM Standard - 4.5.
    //==========================================================================

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onRunAdoptingSteps(_oldDocument: Document) {}

    // https://dom.spec.whatwg.org/#concept-node-adopt
    adoptNodeInto(document: Document) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2025.11.13)

        // S1.
        const oldDocument = this.nodeDocument;
        // S2.
        if (this.parent !== null) {
            console.log(this.parent);
            console.trace("what");
            // TODO: remove node
            throw new Error(
                "TODO[https://dom.spec.whatwg.org/#concept-node-adopt]",
            );
        }
        // S3.
        if (document !== oldDocument) {
            // S3-1.
            for (const inclusiveDescendant of this.shadowIncludingDescendants()) {
                // S3-1-1.
                inclusiveDescendant.nodeDocument = document;
                if (
                    inclusiveDescendant instanceof ShadowRoot &&
                    isGlobalCustomElementRegistry(
                        inclusiveDescendant.lookupCustomElementRegistry(),
                    )
                ) {
                    // S3-1-2.
                    const inclusiveDescendantSr = inclusiveDescendant;
                    inclusiveDescendantSr.customElementRegistry =
                        document.effectiveGlobalCustomElementRegistry();
                    throw new Error(
                        "TODO[https://dom.spec.whatwg.org/#concept-node-adopt]",
                    );
                } else if (inclusiveDescendant instanceof Element) {
                    const inclusiveDescendantElem = inclusiveDescendant;
                    // S3-1-3.
                    // S3-1-3-1.
                    for (const attr of inclusiveDescendantElem.attributeList) {
                        attr.nodeDocument = document;
                    }
                    // S3-1-3-2.
                    if (
                        isGlobalCustomElementRegistry(
                            inclusiveDescendant.lookupCustomElementRegistry(),
                        )
                    ) {
                        inclusiveDescendant.customElementRegistry =
                            document.effectiveGlobalCustomElementRegistry();
                    }
                }
            }
            // S3-2.
            for (const inclusiveDescendant of this.shadowIncludingDescendants()) {
                if (
                    inclusiveDescendant instanceof Element &&
                    inclusiveDescendant.isCustom()
                ) {
                    continue;
                }
                // TODO: enqueue a custom element callback reaction with inclusiveDescendant, callback name "adoptedCallback", and « oldDocument, document ».
                throw new Error(
                    "TODO[https://dom.spec.whatwg.org/#concept-node-adopt]",
                );
            }
            // S3-3.
            for (const inclusiveDescendant of this.shadowIncludingDescendants()) {
                inclusiveDescendant.onRunAdoptingSteps(oldDocument);
            }
        }
    }

    //==========================================================================
    // DOM Standard - 4.8.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-shadow-including-root
    shadowIncludingRoot(): Node {
        const root = this.root();
        if (root instanceof ShadowRoot) {
            return root.getHost().shadowIncludingRoot();
        }
        return root;
    }

    // https://dom.spec.whatwg.org/#concept-shadow-including-descendant
    shadowIncludingDescendants(): Node[] {
        const nodes = this.inclusiveDescendants();
        return nodes.slice(1);
    }

    // https://dom.spec.whatwg.org/#concept-shadow-including-inclusive-descendant
    shadowIncludingInclusiveDescendants(): Node[] {
        const descendants = this.inclusiveDescendants();
        const resNodes = [];
        for (const desc of descendants) {
            if (desc instanceof ShadowRoot) {
                resNodes.push(...desc.shadowIncludingInclusiveDescendants());
            } else {
                resNodes.push(desc);
            }
        }
        return resNodes;
    }

    //==========================================================================
    // DOM Standard - 4.11.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-child-text-content
    childTextContent(): string {
        let res = "";
        for (const node of this.children) {
            if (node instanceof Text) {
                res += node.data;
            }
        }
        return res;
    }

    // TODO: Move this to HTML
    lookupCustomElementRegistry(): CustomElementRegistry | null {
        if (this instanceof Element) {
            return this.customElementRegistry;
        }
        if (this instanceof Document) {
            return this.customElementRegistry;
        }
        if (this instanceof ShadowRoot) {
            return this.customElementRegistry;
        }
        return null;
    }
}

//==============================================================================
// DOM Standard - 4.5.
//==============================================================================

// https://dom.spec.whatwg.org/#concept-document
export class Document extends Node {
    isIframeSrcdocDocument: boolean = false;

    //==========================================================================
    // DOM Standard - 4.5.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-document-encoding
    encoding: Encoding = UTF8_ENCODING;

    // https://dom.spec.whatwg.org/#concept-document-content-type
    contentType: string = "application/xml";

    // https://dom.spec.whatwg.org/#concept-document-url
    url: URL = new URL("about:blank");

    // https://dom.spec.whatwg.org/#concept-document-origin
    origin = "opaque" as const; // STUB

    // https://dom.spec.whatwg.org/#concept-document-type
    type: "xml" | "html" = "xml";

    // https://dom.spec.whatwg.org/#concept-document-mode
    mode: "no-quirks" | "quirks" | "limited-quirks" = "no-quirks";

    // https://dom.spec.whatwg.org/#document-allow-declarative-shadow-roots
    allowDeclarativeShadowRoots = false;

    // https://dom.spec.whatwg.org/#document-custom-element-registry
    customElementRegistry: CustomElementRegistry | null = null;

    // https://dom.spec.whatwg.org/#effective-global-custom-element-registry
    effectiveGlobalCustomElementRegistry(): CustomElementRegistry | null {
        if (isGlobalCustomElementRegistry(this.customElementRegistry)) {
            return this.customElementRegistry;
        }
        return null;
    }

    //==========================================================================
    // HTML Standard - 3.1.1.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/dom.html#concept-document-about-base-url
    aboutBaseURL: URL | null = null;

    //==========================================================================
    // HTML Standard - 13.2.6.4.1.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#parser-cannot-change-the-mode-flag
    parserCannotChangeMode: boolean = false;

    constructor() {
        // Document is special: the node document of Document is itself.
        super(undefined!);
        this.nodeDocument = this;
    }
}

export type ElementInterface = (
    nodeDocument: Document,
    args: ElementConstructionArgs,
) => Element;

// https://dom.spec.whatwg.org/#is-a-global-custom-element-registry
export function isGlobalCustomElementRegistry(
    registry: CustomElementRegistry | null,
) {
    return registry != null && !registry.isScoped;
}

//==============================================================================
// DOM Standard - 4.6.
//==============================================================================

// https://dom.spec.whatwg.org/#concept-doctype
export class DocumentType extends Node {
    //==========================================================================
    // DOM Standard - 4.6.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-doctype-name
    name: string;

    // https://dom.spec.whatwg.org/#concept-doctype-publicid
    publicID: string = "";

    // https://dom.spec.whatwg.org/#concept-doctype-systemid
    systemID: string = "";

    constructor(nodeDocument: Document, name: string) {
        super(nodeDocument);
        this.name = name;
    }
}

//==============================================================================
// DOM Standard - 4.7.
//==============================================================================

// https://dom.spec.whatwg.org/#documentfragment
export class DocumentFragment extends Node {
    //==========================================================================
    // DOM Standard - 4.7.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-documentfragment-host
    host: Node | null = null;
}

//==============================================================================
// DOM Standard - 4.8.
//==============================================================================

// https://dom.spec.whatwg.org/#concept-shadow-root
export class ShadowRoot extends DocumentFragment {
    // https://dom.spec.whatwg.org/#shadowroot-custom-element-registry
    customElementRegistry: CustomElementRegistry | null = null;

    getHost(): Node {
        if (this.host === null) {
            throw Error("ShadowRoot's host must not be null");
        }
        return this.host;
    }
}

//==============================================================================
// DOM Standard - 4.9.
//==============================================================================

export type ElementConstructionArgs = {
    namespace: string | null;
    namespacePrefix: string | null;
    localName: string;
    customElementRegistry: CustomElementRegistry | null;
    customElementState:
        | "undefined"
        | "failed"
        | "uncustomized"
        | "precustomized"
        | "custom";
    customElementDefinition: null;
    isValue: string | null;
    tagToken: TokenFor<"tag">;
};

// https://dom.spec.whatwg.org/#concept-element
export class Element extends Node {
    tagToken: TokenFor<"tag">; // STUB
    cssPropertySet: null = null; // STUB

    onPoppedFromStackOfOpenElements() {}
    onRunResetAlgorithm() {}

    /**
     * Do NOT use this constructor unless you need to.
     */
    constructor(nodeDocument: Document, args: ElementConstructionArgs) {
        super(nodeDocument);
        this.namespace = args.namespace;
        this.namespacePrefix = args.namespacePrefix;
        this.localName = args.localName;
        this.customElementRegistry = args.customElementRegistry;
        this.customElementState = args.customElementState;
        this.customElementDefinition = args.customElementDefinition;
        this.isValue = args.isValue;
        this.tagToken = args.tagToken;
    }

    isInside(namespace: string, localName: string) {
        let current = this.parent;
        while (current !== null) {
            if (!(current instanceof Element)) {
                break;
            }
            if (current.isElement(namespace, localName)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    isElement(namespace: string, localName: string) {
        return (
            this.namespace !== null &&
            this.namespace === namespace &&
            this.localName === localName
        );
    }

    appendAttr({
        localName,
        value,
        namespace = null,
        namespacePrefix = null,
    }: {
        localName: string;
        value: string;
        namespace: string | null;
        namespacePrefix: string | null;
    }) {
        const attr = new Attr(this.nodeDocument, localName);
        attr.value = value;
        attr.namespace = namespace;
        attr.namespacePrefix = namespacePrefix;
        this.attributeList.push(attr);
    }

    /**
     * Finds an attribute in the element.
     *
     * @param namespace Namespace of attribute or null. If null, attributes with
     *                  namespace will not be matched, and if it's non-null,
     *                  attributes without namespace will not be matched.
     * @param localName Local name of the attribute.
     * @return Value of the attribute, or undefined if not found.
     */
    attribute(namespace: string | null, localName: string): string | undefined {
        for (const attr of this.attributeList) {
            if (
                ((namespace == null && attr.namespace == null) ||
                    (namespace != null && attr.namespace == namespace)) &&
                attr.localName == localName
            ) {
                return attr.value;
            }
        }
        return undefined;
    }

    //==========================================================================
    // DOM Standard - 4.9.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-element-namespace
    namespace: string | null;

    // https://dom.spec.whatwg.org/#concept-element-namespace-prefix
    namespacePrefix: string | null;

    // https://dom.spec.whatwg.org/#concept-element-local-name
    localName: string;

    // https://dom.spec.whatwg.org/#element-custom-element-registry
    customElementRegistry: CustomElementRegistry | null;

    // https://dom.spec.whatwg.org/#concept-element-custom-element-state
    customElementState:
        | "undefined"
        | "failed"
        | "uncustomized"
        | "precustomized"
        | "custom";

    // https://dom.spec.whatwg.org/#concept-element-custom-element-definition
    customElementDefinition: null; // STUB

    // https://dom.spec.whatwg.org/#concept-element-is-value
    isValue: string | null;

    // https://dom.spec.whatwg.org/#concept-element-defined
    isDefined() {
        return (
            this.customElementState === "uncustomized" ||
            this.customElementState === "custom"
        );
    }

    // https://dom.spec.whatwg.org/#concept-element-custom
    isCustom() {
        return this.customElementState === "custom";
    }

    // https://dom.spec.whatwg.org/#concept-element-shadow-root
    shadowRoot: ShadowRoot | null = null;

    // https://dom.spec.whatwg.org/#element-shadow-host
    isShadowHost() {
        return this.shadowRoot !== null;
    }

    // https://dom.spec.whatwg.org/#concept-create-element
    static create(
        document: Document,
        localName: string,
        namespace: string | null,
        // Non-standard parameter, needed to eliminate circular dependency between
        // DOM and other parts of the engine.
        elementInterfaceFor: (
            namespace: string | null,
            localName: string,
        ) => ElementInterface,
        tagToken: TokenFor<"tag"> = {
            kind: "tag",
            name: localName,
            attributes: [],
            type: "start",
            isSelfClosing: false,
            selfClosingAcknowledged: false,
        },
        prefix: string | null = null,
        is: string | null = null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _synchronousCustomElements: boolean = false,
        registry: "default" | null | CustomElementRegistry = "default",
    ) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.04.)

        // S1.
        let result;

        // S2.
        if (registry === "default") {
            registry = document.lookupCustomElementRegistry();
        }

        // S3.
        const definition = lookupCustomElementDefinition(
            registry,
            namespace,
            localName,
            is,
        );

        // S4.
        if (definition !== null && definition.name !== definition.localName) {
            // TODO: S4-1. ~ S4-4.
            throw new Error("TODO");
        }

        // S5.
        else if (definition !== null) {
            // TODO: S5-1. ~ S5-2.
            throw new Error("TODO");
        }

        // S6.
        else {
            // S6-1.
            const interfce = elementInterfaceFor(namespace, localName);

            // S6-2.
            result = Element.createInternal(
                document,
                interfce,
                localName,
                namespace,
                prefix,
                "uncustomized",
                is,
                registry,
                tagToken,
            );

            // S6-3.
            if (
                namespace === HTML_NAMESPACE &&
                (isValidCustomElementName(localName) || is !== null)
            ) {
                result.customElementState = "undefined";
            }

            // S7.
            return result;
        }
    }

    // https://dom.spec.whatwg.org/#create-an-element-internal
    static createInternal(
        document: Document,
        interfce: ElementInterface,
        localName: string,
        namespace: string | null,
        prefix: string | null,
        state: Element["customElementState"],
        is: string | null,
        registry: null | CustomElementRegistry,
        tagToken: TokenFor<"tag">,
    ) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.04.04.)

        // S1.
        const element = interfce(document, {
            namespace,
            namespacePrefix: prefix,
            localName,
            customElementRegistry: registry,
            customElementState: state,
            customElementDefinition: null,
            isValue: is,
            tagToken,
        });

        // S2.
        console.assert(element.attributeList.length === 0);

        // S3.
        return element;
    }

    // https://dom.spec.whatwg.org/#concept-element-attribute
    attributeList: Attr[] = [];
}

//==============================================================================
// DOM Standard - 4.9.2.
//==============================================================================

// https://dom.spec.whatwg.org/#concept-attribute
export class Attr extends Node {
    constructor(nodeDocument: Document, localName: string) {
        super(nodeDocument);

        this.localName = localName;
    }

    //==========================================================================
    // DOM Standard - 4.9.2.
    //==========================================================================

    // https://dom.spec.whatwg.org/#concept-attribute-namespace
    namespace: string | null = null;

    // https://dom.spec.whatwg.org/#concept-attribute-namespace-prefix
    namespacePrefix: string | null = null;

    // https://dom.spec.whatwg.org/#concept-attribute-local-name
    localName: string;

    // https://dom.spec.whatwg.org/#concept-attribute-value
    value: string = "";

    // https://dom.spec.whatwg.org/#concept-attribute-element
    element: Element | null = null;
}

//==============================================================================
// DOM Standard - 4.10.
//==============================================================================

// https://dom.spec.whatwg.org/#characterdata
export class CharacterData extends Node {
    // https://dom.spec.whatwg.org/#concept-cd-data
    data: string;

    constructor(nodeDocument: Document, data: string) {
        super(nodeDocument);

        this.data = data;
    }
}

//==============================================================================
// DOM Standard - 4.11.
//==============================================================================

// https://dom.spec.whatwg.org/#text
export class Text extends CharacterData {
    constructor(nodeDocument: Document, data: string) {
        super(nodeDocument, data);
    }
}

//==============================================================================
// DOM Standard - 4.14.
//==============================================================================

// https://dom.spec.whatwg.org/#comment
export class Comment extends CharacterData {
    constructor(nodeDocument: Document, data: string) {
        super(nodeDocument, data);
    }
}
