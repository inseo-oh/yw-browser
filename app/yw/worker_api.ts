import { ComputedStyleMap } from "./css/computed_style_map";
import { $Element } from "./dom";

export type WorkerRequest = {
    cmd: "calculateCsm";
    element: $Element;
};
export type WorkerCalculateCsmResponse = {
    cmd: "calculateCsm";
    csm: ComputedStyleMap;
};
export type WorkerResponse = WorkerCalculateCsmResponse;

export class WorkerInterface {
    responseHandlers: ((res: WorkerResponse) => void)[] = [];
    worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
            const handler = this.responseHandlers[0];
            this.responseHandlers.splice(0, 1);
            handler(ev.data);
        };
    }

    async request(
        req: WorkerRequest,
        transfer?: Transferable[],
    ): Promise<WorkerResponse> {
        if (transfer !== undefined) {
            this.worker.postMessage(req, transfer);
        } else {
            this.worker.postMessage(req);
        }
        return new Promise((resolve, reject) => {
            this.responseHandlers.push((res) => {
                resolve(res);
            });
        });
    }

    async calculateCsm(element: $Element): Promise<WorkerCalculateCsmResponse> {
        const res = await this.request({ cmd: "calculateCsm", element });
        if (res.cmd !== "calculateCsm") {
            throw Error(`bad cmd ${res.cmd} in response`);
        }
        return res;
    }
}
