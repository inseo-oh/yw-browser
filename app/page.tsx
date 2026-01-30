"use client";

import { useEffect, useRef } from "react";
import { RemoteNode, WorkerInterface } from "./yw/worker";

async function buildYwDOMFor(
    workerIf: WorkerInterface,
    node: Node,
    parentNode: RemoteNode | null,
): Promise<RemoteNode> {
    let resNode: RemoteNode;
    switch (node.nodeType) {
        case Node.DOCUMENT_NODE: {
            resNode = await workerIf.createDocument();
            break;
        }
        case Node.DOCUMENT_TYPE_NODE: {
            const doctypeNode = node as DocumentType;
            resNode = await workerIf.createDocumentType(
                doctypeNode.name,
                doctypeNode.publicId,
                doctypeNode.systemId,
            );
            break;
        }
        case Node.ELEMENT_NODE: {
            const elementNode = node as Element;
            const resElem = await workerIf.createElement(elementNode.localName);
            for (const attr of elementNode.attributes) {
                await resElem.appendAttribute(attr.name, attr.value);
            }
            resNode = resElem;
            break;
        }
        case Node.TEXT_NODE: {
            const textNode = node as Text;
            resNode = await workerIf.createText(textNode.data);
            break;
        }
        default:
            throw Error("TODO: node type " + node.nodeType);
    }
    await resNode.setNodeParent(parentNode);
    for (const child of node.childNodes) {
        const childDom = await buildYwDOMFor(workerIf, child, resNode);
        await resNode.appendChild(childDom);
        await childDom.detach();
    }
    return resNode;
}
async function buildYwDOM(
    workerIf: WorkerInterface,
    iframe: HTMLIFrameElement,
): Promise<RemoteNode> {
    if (iframe.contentDocument === null) {
        throw new Error("iframe content document is not accessible");
    }
    return buildYwDOMFor(workerIf, iframe.contentDocument, null);
}

export default function Contents() {
    const workerIf = useRef<WorkerInterface>(null);
    const ifr = useRef<HTMLIFrameElement>(null);

    const initWorker = async function (fr: HTMLIFrameElement) {
        console.log("iframe loaded");
        if (workerIf.current === null) {
            const worker = new Worker(
                new URL("./yw/worker.ts", import.meta.url),
            );
            workerIf.current = new WorkerInterface(worker);
        }
        const doc = await buildYwDOM(workerIf.current, fr);
        doc.printTree();
    };
    useEffect(() => {
        if (ifr.current === null) {
            return;
        }
        if (ifr.current.contentDocument?.readyState === "complete") {
            console.log("already loaded");
            initWorker(ifr.current);
        } else {
            ifr.current.addEventListener("load", function () {
                initWorker(this);
            });
        }
    }, [ifr]);

    return <iframe src="/demo/index.html" ref={ifr}></iframe>;
}
