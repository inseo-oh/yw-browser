import { WorkerRequest } from "./worker_api";

console.log("YW started");

self.onmessage = function (msg: MessageEvent<WorkerRequest>) {
    console.log("got msg:", msg.data.cmd);
};
