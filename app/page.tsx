"use client";

import { SyntheticEvent, useRef } from "react";
import { WorkerInterface } from "./yw/worker_api";
import {
    $Attr,
    $Document,
    $DocumentType,
    $Element,
    $Node,
    $Text,
    printDOMTree,
} from "./yw/dom";

function buildYwDomFor(node: Node, parentNode: $Node | null): $Node {
    let resNode;
    switch (node.nodeType) {
        case Node.DOCUMENT_NODE:
            resNode = new $Document();
            break;
        case Node.DOCUMENT_TYPE_NODE: {
            const doctypeNode = node as DocumentType;
            resNode = new $DocumentType(
                doctypeNode.name,
                doctypeNode.publicId,
                doctypeNode.systemId,
            );
            break;
        }
        case Node.ELEMENT_NODE: {
            const elementNode = node as Element;
            resNode = new $Element(elementNode.localName);
            for (const attr of elementNode.attributes) {
                resNode.attrs.push(new $Attr(attr.name, attr.value));
            }
            break;
        }
        case Node.TEXT_NODE: {
            const textNode = node as Text;
            resNode = new $Text(textNode.data);
            break;
        }
        default:
            console.log("TODO: node type " + node.nodeType);
            resNode = new $Node();
            break;
    }
    resNode.parentNode = parentNode;
    for (const child of node.childNodes) {
        resNode.children.push(buildYwDomFor(child, resNode));
    }
    return resNode;
}
function buildYwDom(iframe: HTMLIFrameElement): $Node {
    if (iframe.contentDocument === null) {
        throw new Error("iframe content document is not accessible");
    }
    return buildYwDomFor(iframe.contentDocument, null);
}

export default function Contents() {
    const workerIf = useRef<WorkerInterface>(null);

    const onIframeLoad = function (
        e: SyntheticEvent<HTMLIFrameElement, Event>,
    ) {
        const iframe = e.target as HTMLIFrameElement;
        console.log("iframe loaded");
        const doc = buildYwDom(iframe);
        printDOMTree(doc);
        
        if (workerIf.current === null) {
            const worker = new Worker(new URL("./yw/main.ts", import.meta.url));
            workerIf.current = new WorkerInterface(worker);
        }
        workerIf.current.calculateCsm(
            doc.children.filter((v) => v instanceof $Element)[0],
        );
    };

    return <iframe src="/demo/index.html" onLoad={onIframeLoad}></iframe>;
}
