import { $Attr, $Document, $DocumentType, $Element, $Node, $Text } from "./dom";
import {
    unwrapWorkerParams,
    WorkerCommand,
    WorkerErrorResponse,
    WorkerOkResponse,
    WorkerParams,
    WorkerRequest,
    WorkerReturnType,
} from "./worker_api";

console.log("YW started");

function sendErrorResponse(requestId: number, cmd: string, msg: string) {
    const resp: WorkerErrorResponse = {
        type: "error",
        cmd,
        requestId,
        data: msg,
    };
    self.postMessage(resp);
}
function sendOkResponse<C extends WorkerCommand>(resp: WorkerOkResponse<C>) {
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
function handleCommand<C extends WorkerCommand>(
    request: WorkerRequest<C>,
    unpacked: (...args: WorkerParams<C>) => WorkerReturnType<C>,
) {
    const data = unpacked(...request.args);
    sendOkResponse({
        requestId: request.requestId,
        cmd: request.cmd,
        type: "ok",
        data,
    });
}

self.onmessage = function (msgEvent: MessageEvent) {
    const msg = msgEvent.data;
    const { cmd, requestId } = msg;
    try {
        switch (cmd as WorkerCommand) {
            case "detachNode": {
                const { slot } = msg.args;
                detachNodeFromSlot(slot);
                sendOkResponse({ requestId, cmd, type: "ok", data: null });
            }
            case "createDocument": {
                const doc = new $Document();
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({
                    requestId,
                    cmd,
                    type: "ok",
                    data: { slot: attachedSlot },
                });
                break;
            }
            case "createDocumentType": {
                const { name, publicId, systemId } = msg.args;
                const doc = new $DocumentType(name, publicId, systemId);
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({
                    requestId,
                    cmd,
                    type: "ok",
                    data: { slot: attachedSlot },
                });
                break;
            }
            case "createElement": {
                const { localName } = msg.args;
                const doc = new $Element(localName);
                const attachedSlot = attachNodeToSlot(doc);
                sendOkResponse({
                    requestId,
                    cmd,
                    type: "ok",
                    data: { slot: attachedSlot },
                });
                break;
            }
            case "createText": {
                const { localName } = msg.args;
                const text = new $Text(localName);
                const attachedSlot = attachNodeToSlot(text);
                sendOkResponse({
                    requestId,
                    cmd,
                    type: "ok",
                    data: { slot: attachedSlot },
                });
                break;
            }
            case "appendAttributeToElement": {
                const { attrName, attrValue, elemSlot } = msg.args;
                const elem = nodeSlots[elemSlot];
                if (!(elem instanceof $Element)) {
                    sendErrorResponse(requestId, cmd, "bad elemSlot");
                    break;
                }
                elem.attrs.push(new $Attr(attrName, attrValue));
                sendOkResponse({ requestId, cmd, type: "ok", data: null });
                break;
            }
            case "setNodeParent": {
                unwrapWorkerParams<"setNodeParent">(
                    msg.args,
                    (nodeSlot, parentSlot) => {},
                );
            }
            default:
                sendErrorResponse(requestId, cmd, `bad command`);
                break;
        }
    } catch (e) {
        console.error(e);
        sendErrorResponse(requestId, cmd, `uncaught exception: ${e}`);
    }
};
