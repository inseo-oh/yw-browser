import { $Document, $DocumentType, $Element, $Node } from "./dom";
import {
    WorkerErrorResponse,
    WorkerOkResponse,
    WorkerRequest,
} from "./worker_api";

console.log("YW started");

function sendErrorResponse(cmd: string, msg: string) {
    const resp: WorkerErrorResponse = {
        type: "error",
        cmd,
        msg,
    };
    self.postMessage(resp);
}
function sendOkResponse(resp: WorkerOkResponse) {
    self.postMessage(resp);
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
    if (nodeSlots[slot] !== null) {
        console.error(`Node slot ${slot} is already empty`);
    }
    nodeSlots[slot] = null;
}

self.onmessage = function (msgEvent: MessageEvent<WorkerRequest>) {
    const msg = msgEvent.data;
    const { cmd } = msg;
    try {
        switch (cmd) {
            case "detachNode": {
                const { slot } = msg;
                detachNodeFromSlot(slot);
                sendOkResponse({ cmd, type: "ok" });
            }
            case "createDocument": {
                const doc = new $Document();
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({ cmd, type: "ok", attachedSlot });
                break;
            }
            case "createDocumentType": {
                const { name, publicId, systemId } = msg;
                const doc = new $DocumentType(name, publicId, systemId);
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({ cmd, type: "ok", attachedSlot });
                break;
            }
            case "createElement": {
                const { localName } = msg;
                const doc = new $Element(localName);
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({ cmd, type: "ok", attachedSlot });
                break;
            }
            default:
                sendErrorResponse(cmd, `Unrecognized command`);
                break;
        }
    } catch (e) {
        console.error(e);
        sendErrorResponse(cmd, `Uncaught exception: ${e}`);
    }
};
