import {
    $Attr,
    $Document,
    $DocumentType,
    $Element,
    $Node,
    $Text,
    printDOMTree,
} from "./dom";

export type RemoteNodeSlot = number;
export class RemoteNode {
    wi: WorkerInterface;
    slot: RemoteNodeSlot;

    constructor(wi: WorkerInterface, slot: RemoteNodeSlot) {
        this.wi = wi;
        this.slot = slot;
    }
    async detach() {
        await this.wi.request("detachNode", [], this.slot);
        this.slot = -1;
    }
    async setNodeParent(node: RemoteNode | null) {
        await this.wi.request(
            "setNodeParent",
            [],
            this.slot,
            node === null ? null : node.slot,
        );
    }
    async appendChild(node: RemoteNode) {
        await this.wi.request("appendChildToNode", [], this.slot, node.slot);
    }
    async printTree() {
        await this.wi.request("printDOMTree", [], this.slot);
    }
}
export class RemoteElement extends RemoteNode {
    async appendAttribute(name: string, value: string) {
        await this.wi.request(
            "appendAttributeToElement",
            [],
            this.slot,
            name,
            value,
        );
    }
}
export class WorkerInterface {
    __nextRequestId = 0;
    __pendingRequests = new Map<
        number,
        {
            resolve: (res: unknown) => void;
            reject: (msg: string) => void;
        }
    >();
    worker: Worker;
    verbose = true;

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (ev: MessageEvent) => {
            const queuedReq = this.__pendingRequests.get(ev.data.requestId);
            if (queuedReq === undefined) {
                console.error(`no such request with ID ${ev.data.requestId}`);
                return;
            }
            if (this.verbose) {
                console.log(
                    `📩 [${ev.data.requestId}] %c${ev.data.cmd}%c() --> %c${ev.data.type}%c ${ev.data.data}`,
                    "font-weight: bold",
                    "font-weight: normal",
                    "font-weight: bold; text-decoration: underline;",
                    "font-weight: normal; text-decoration: none;",
                );
            }
            if (ev.data.type === "error") {
                queuedReq.reject(
                    `Request ${ev.data.cmd} failed: ${ev.data.msg}`,
                );
            } else {
                queuedReq.resolve(ev.data);
            }
        };
    }
    async request<C extends Command, R extends RequestFor<C>>(
        cmd: C,
        transfer: Transferable[],
        ...args: R["args"]
    ): Promise<ReturnType<Requests[C]>> {
        const requestId = this.__nextRequestId++;
        const req = { cmd, requestId, args };
        if (this.verbose) {
            console.log(
                `📨 [${requestId}] %c${cmd}%c(${args})`,
                "font-weight: bold",
                "font-weight: normal",
            );
        }
        this.worker.postMessage(req, transfer);
        return new Promise((resolve, reject) => {
            this.__pendingRequests.set(requestId, {
                resolve: (res) => {
                    const okRes = res as OKResponse<C>;
                    if (okRes.cmd !== req.cmd) {
                        throw TypeError(`bad cmd ${okRes.cmd} in response`);
                    }
                    resolve(okRes.data);
                },
                reject,
            });
        });
    }

    async createDocument(): Promise<RemoteNode> {
        const slot = await this.request("createDocument", []);
        return new RemoteNode(this, slot);
    }
    async createDocumentType(
        name: string,
        publicId: string,
        systemId: string,
    ): Promise<RemoteNode> {
        const slot = await this.request(
            "createDocumentType",
            [],
            name,
            publicId,
            systemId,
        );
        return new RemoteNode(this, slot);
    }
    async createElement(localName: string): Promise<RemoteElement> {
        const slot = await this.request("createElement", [], localName);
        return new RemoteElement(this, slot);
    }
    async createText(localName: string): Promise<RemoteElement> {
        const slot = await this.request("createText", [], localName);
        return new RemoteElement(this, slot);
    }
}

type Command = keyof Requests;

type Request = {
    cmd: Command;
    requestId: number;
    args: unknown;
};
type RequestFor<C extends Command> = {
    cmd: C;
    requestId: number;
    args: Parameters<Requests[C]>;
};
type Response<T, C, R> = {
    type: T;
    requestId: number;
    cmd: C;
    data: R;
};
type OKResponse<C extends Command> = Response<"ok", C, ReturnType<Requests[C]>>;
type ErrorResponse = Response<"error", string, string>;

interface Requests {
    detachNode(slot: RemoteNodeSlot): void;
    createDocument(): RemoteNodeSlot;
    createDocumentType(
        name: string,
        publicId: string,
        systemId: string,
    ): RemoteNodeSlot;
    createElement(localName: string): RemoteNodeSlot;
    createText(data: string): RemoteNodeSlot;
    setNodeParent(
        nodeSlot: RemoteNodeSlot,
        parentSlot: RemoteNodeSlot | null,
    ): void;
    appendChildToNode(
        nodeSlot: RemoteNodeSlot,
        childSlot: RemoteNodeSlot,
    ): void;
    appendAttributeToElement(
        elemSlot: RemoteNodeSlot,
        attrName: string,
        attrValue: string,
    ): void;
    printDOMTree(nodeSlot: RemoteNodeSlot): void;
}

if (typeof self !== "undefined") {
    self.onmessage = function (msgEvent: MessageEvent) {
        const msg = msgEvent.data;
        const { cmd: _cmd, requestId } = msg;
        const cmd = _cmd as Command;
        try {
            switch (cmd) {
                case "detachNode":
                    handleCommand<"detachNode">(msg, (slot) => {
                        detachNodeFromSlot(slot);
                    });
                    break;
                case "createDocument":
                    handleCommand<"createDocument">(msg, (): RemoteNodeSlot => {
                        const text = new $Document();
                        return attachNodeToSlot(text);
                    });
                    break;
                case "createDocumentType":
                    handleCommand<"createDocumentType">(
                        msg,
                        (name, publicId, systemId): RemoteNodeSlot => {
                            const doctype = new $DocumentType(
                                name,
                                publicId,
                                systemId,
                            );
                            return attachNodeToSlot(doctype);
                        },
                    );
                    break;
                case "createElement":
                    handleCommand<"createElement">(
                        msg,
                        (localName): RemoteNodeSlot => {
                            const text = new $Element(localName);
                            return attachNodeToSlot(text);
                        },
                    );
                    break;
                case "createText":
                    handleCommand<"createText">(msg, (data): RemoteNodeSlot => {
                        const text = new $Text(data);
                        return attachNodeToSlot(text);
                    });
                    break;
                case "appendAttributeToElement":
                    handleCommand<"appendAttributeToElement">(
                        msg,
                        (elemSlot, attrName, attrValue) => {
                            const elem = nodeSlots[elemSlot];
                            if (!(elem instanceof $Element)) {
                                throw Error("bad elemSlot");
                            }
                            elem.attrs.push(new $Attr(attrName, attrValue));
                        },
                    );
                    break;
                case "setNodeParent":
                    handleCommand<"setNodeParent">(
                        msg,
                        (nodeSlot, parentSlot) => {
                            const node = nodeSlots[nodeSlot];
                            if (!(node instanceof $Node)) {
                                throw Error("bad nodeSlot");
                            }
                            if (parentSlot === null) {
                                node.parentNode = null;
                            } else {
                                const parent = nodeSlots[parentSlot];
                                if (!(parent instanceof $Node)) {
                                    throw Error("bad parentSlot");
                                }
                                node.parentNode = parent;
                            }
                        },
                    );
                    break;
                case "appendChildToNode":
                    handleCommand<"appendChildToNode">(
                        msg,
                        (nodeSlot, childSlot) => {
                            const node = nodeSlots[nodeSlot];
                            if (!(node instanceof $Node)) {
                                throw Error("bad nodeSlot");
                            }
                            const child = nodeSlots[childSlot];
                            if (!(child instanceof $Node)) {
                                throw Error("bad childSlot");
                            }
                            node.children.push(child);
                        },
                    );
                    break;
                case "printDOMTree":
                    handleCommand<"printDOMTree">(msg, (nodeSlot) => {
                        const node = nodeSlots[nodeSlot];
                        if (!(node instanceof $Node)) {
                            throw Error("bad nodeSlot");
                        }
                        printDOMTree(node);
                    });
                    break;
                default:
                    throw Error("bad command");
            }
        } catch (e) {
            const resp: ErrorResponse = {
                type: "error",
                cmd,
                requestId,
                data: `${e}`,
            };
            self.postMessage(resp);
        }
    };
}

function handleCommand<C extends Command>(
    request: RequestFor<C>,
    handler: (...args: Parameters<Requests[C]>) => ReturnType<Requests[C]>,
) {
    const data = handler(...request.args);
    self.postMessage({
        requestId: request.requestId,
        cmd: request.cmd,
        type: "ok",
        data,
    });
}

const nodeSlots: ($Node | null)[] = [];
function attachNodeToSlot(node: $Node): number {
    const slot = nodeSlots.findIndex((n) => n === null);
    if (slot === -1) {
        const slot = nodeSlots.length;
        nodeSlots.push(node);
        return slot;
    }
    nodeSlots[slot] = node;
    return slot;
}
function detachNodeFromSlot(slot: number) {
    if (nodeSlots[slot] === null) {
        console.error(`Node slot ${slot} is already empty`);
    }
    nodeSlots[slot] = null;
}

console.log("Welcome to YW");
