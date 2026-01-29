type NodeSlot = number;

export class RemoteNode {
    wi: WorkerInterface;
    slot: NodeSlot;

    constructor(wi: WorkerInterface, slot: NodeSlot) {
        this.wi = wi;
        this.slot = slot;
    }
    async detach() {
        await this.wi.request("detachNode", [], this.slot);
        this.slot = -1;
    }
    async setNodeParent(par: RemoteNode) {
        await this.wi.request("setNodeParent", [], this.slot, par.slot);
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

interface WorkerAnyRequest {
    detachNode(slot: NodeSlot): void;
    createDocument(): NodeSlot;
    createDocumentType(
        name: string,
        publicId: string,
        systemId: string,
    ): NodeSlot;
    createElement(localName: string): NodeSlot;
    createText(data: string): NodeSlot;
    appendAttributeToElement(
        elemSlot: NodeSlot,
        attrName: string,
        attrValue: string,
    ): void;
    setNodeParent(nodeSlot: NodeSlot, parentSlot: NodeSlot): void;
}
export type WorkerCommand = keyof WorkerAnyRequest;
export type WorkerParams<C extends WorkerCommand> = Parameters<
    WorkerAnyRequest[C]
>;
export type WorkerReturnType<C extends WorkerCommand> = ReturnType<
    WorkerAnyRequest[C]
>;

export type WorkerRequest<C extends WorkerCommand> = {
    cmd: C;
    requestId: number;
    args: WorkerParams<C>;
};

export type WorkerResponse<T, C, R> = {
    type: T;
    requestId: number;
    cmd: C;
    data: R;
};
export type WorkerOkResponse<C extends WorkerCommand> = WorkerResponse<
    "ok",
    C,
    ReturnType<WorkerAnyRequest[C]>
>;
export type WorkerErrorResponse = WorkerResponse<"error", string, string>;

export class WorkerInterface {
    pendingRequests = new Map<
        number,
        {
            resolve: (res: unknown) => void;
            reject: (msg: string) => void;
        }
    >();
    worker: Worker;
    nextReqId = 0;

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (ev: MessageEvent) => {
            const queuedReq = this.pendingRequests.get(ev.data.requestId);
            if (queuedReq === undefined) {
                console.error(`no such request with ID ${ev.data.requestId}`);
                return;
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

    async request<C extends WorkerCommand, R extends WorkerRequest<C>>(
        cmd: C,
        transfer: Transferable[],
        ...args: R["args"]
    ): Promise<ReturnType<WorkerAnyRequest[C]>> {
        const requestId = this.nextReqId++;
        const req = { cmd, requestId, args };
        this.worker.postMessage(req, transfer);
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, {
                resolve: (res) => {
                    const okRes = res as WorkerOkResponse<C>;
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
