export class RemoteNode {
    wi: WorkerInterface;
    slot: number;

    constructor(wi: WorkerInterface, slot: number) {
        this.wi = wi;
        this.slot = slot;
    }
    detach() {
        this.wi.detachNode(this.slot);
        this.slot = -1;
    }
}
export class RemoteElement extends RemoteNode {
    async appendAttribute(name: string, value: string) {
        this.wi.handleSimpleResponse(
            "appendAttributeToElement",
            await this.wi.request({
                cmd: "appendAttributeToElement",
                elemSlot: this.slot,
                attrName: name,
                attrValue: value,
            }),
        );
    }
}

export type WorkerRequest =
    | {
          cmd: "detachNode";
          slot: number;
      }
    | {
          cmd: "createDocument";
      }
    | {
          cmd: "createDocumentType";
          name: string;
          publicId: string;
          systemId: string;
      }
    | {
          cmd: "createElement";
          localName: string;
      }
    | {
          cmd: "appendAttributeToElement";
          elemSlot: number;
          attrName: string;
          attrValue: string;
      };

export type WorkerNodeCreationResponse<C> = {
    type: "ok";
    cmd: C;
    attachedSlot: number;
};
export type WorkerSimpleResponse<C> = {
    type: "ok";
    cmd: C;
};
export type WorkerOkResponse =
    | WorkerSimpleResponse<"detachNode">
    | WorkerNodeCreationResponse<"createDocument">
    | WorkerNodeCreationResponse<"createDocumentType">
    | WorkerNodeCreationResponse<"createElement">
    | WorkerSimpleResponse<"appendAttributeToElement">;

export type WorkerErrorResponse = {
    type: "error";
    cmd: string;
    msg: string;
};

export class WorkerInterface {
    requestQueue: {
        req: WorkerRequest;
        resolve: (res: WorkerOkResponse) => void;
        reject: (msg: string) => void;
    }[] = [];
    worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (
            ev: MessageEvent<WorkerOkResponse | WorkerErrorResponse>,
        ) => {
            const queuedReq = this.requestQueue[0];
            this.requestQueue.splice(0, 1);
            if (ev.data.type === "error") {
                queuedReq.reject(
                    `Request ${queuedReq.req.cmd} failed: ${ev.data.msg}`,
                );
            } else {
                queuedReq.resolve(ev.data);
            }
        };
    }

    async request(
        req: WorkerRequest,
        transfer?: Transferable[],
    ): Promise<WorkerOkResponse> {
        if (transfer !== undefined) {
            this.worker.postMessage(req, transfer);
        } else {
            this.worker.postMessage(req);
        }
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ req, resolve, reject });
        });
    }

    async handleSimpleResponse<S>(
        cmd: S,
        res: WorkerOkResponse,
    ): Promise<void> {
        if (res.cmd !== cmd) {
            throw Error(`bad cmd ${res.cmd} in response`);
        }
    }
    async createDocument(): Promise<RemoteNode> {
        const res = await this.request({ cmd: "createDocument" });
        if (res.cmd !== "createDocument") {
            throw Error(`bad cmd ${res.cmd} in response`);
        }
        return new RemoteNode(this, res.attachedSlot);
    }
    async createDocumentType(
        name: string,
        publicId: string,
        systemId: string,
    ): Promise<RemoteNode> {
        const res = await this.request({
            cmd: "createDocumentType",
            name,
            publicId,
            systemId,
        });
        if (res.cmd !== "createDocumentType") {
            throw Error(`bad cmd ${res.cmd} in response`);
        }
        return new RemoteNode(this, res.attachedSlot);
    }
    async createElement(localName: string): Promise<RemoteElement> {
        const res = await this.request({
            cmd: "createElement",
            localName,
        });
        if (res.cmd !== "createElement") {
            throw Error(`bad cmd ${res.cmd} in response`);
        }
        return new RemoteElement(this, res.attachedSlot);
    }
    async detachNode(slot: number): Promise<void> {
        this.handleSimpleResponse(
            "detachNode",
            await this.request({ cmd: "detachNode", slot }),
        );
    }
}
