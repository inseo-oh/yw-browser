import { CSSSyntaxError, TokenStream } from "./syntax";

// https://www.w3.org/TR/css-display-3/#outer-role
export type OuterMode = "block" | "inline" | "run-in";

// https://www.w3.org/TR/css-display-3/#inner-model
export type InnerMode =
    | "flow"
    | "flow-root"
    | "table"
    | "flex"
    | "grid"
    | "ruby";

export type Display =
    | { type: "normal"; outer: OuterMode; inner: InnerMode }
    | { type: "table-row-group" }
    | { type: "table-header-group" }
    | { type: "table-footer-group" }
    | { type: "table-row" }
    | { type: "table-cell" }
    | { type: "table-column-group" }
    | { type: "table-column" }
    | { type: "table-caption" }
    | { type: "ruby-base" }
    | { type: "ruby-text" }
    | { type: "ruby-base-container" }
    | { type: "ruby-text-container" }
    | { type: "contents" }
    | { type: "none" };

export function parseColor(ts: TokenStream, _args: void): Display {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    // Try legacy keywords -----------------------------------------------------
    if (tk.value === "inline-block") {
        ts.consumeToken();
        return { type: "normal", outer: "inline", inner: "flow-root" };
    } else if (tk.value === "inline-table") {
        ts.consumeToken();
        return { type: "normal", outer: "inline", inner: "table" };
    } else if (tk.value === "inline-flex") {
        ts.consumeToken();
        return { type: "normal", outer: "inline", inner: "flex" };
    } else if (tk.value === "inline-grid") {
        ts.consumeToken();
        return { type: "normal", outer: "inline", inner: "grid" };
    }
    // Try display-internal and display-box ------------------------------------
    switch (tk.value) {
        case "table-row-group":
        case "table-header-group":
        case "table-footer-group":
        case "table-row":
        case "table-cell":
        case "table-column-group":
        case "table-column":
        case "table-caption":
        case "ruby-base":
        case "ruby-text":
        case "ruby-base-container":
        case "ruby-text-container":
        case "contents":
        case "none":
            ts.consumeToken();
            return { type: tk.value };
    }
    // Try display-outside + display-inside ------------------------------------
    let outerMode: OuterMode | null = null;
    let innerMode: InnerMode | null = null;
    while (outerMode === null || innerMode === null) {
        const tk = ts.nextToken();
        if (tk.type !== "ident") {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        let gotSomething = false;
        if (outerMode === null) {
            switch (tk.value) {
                case "block":
                case "inline":
                case "run-in":
                    ts.consumeToken();
                    outerMode = tk.value;
                    gotSomething = true;
                    break;
            }
        }
        if (innerMode === null) {
            switch (tk.value) {
                case "flow":
                case "flow-root":
                case "table":
                case "flex":
                case "grid":
                case "ruby":
                    ts.consumeToken();
                    innerMode = tk.value;
                    gotSomething = true;
                    break;
            }
        }
        if (!gotSomething) {
            break;
        }
    }
    if (outerMode !== null || innerMode !== null) {
        if (innerMode === null) {
            innerMode = "flow";
        }
        if (outerMode === null) {
            if (innerMode == "ruby") {
                outerMode = "inline";
            } else {
                outerMode = "block";
            }
        }
        return { type: "normal", outer: outerMode, inner: innerMode };
    }
    // Try display-listitem ------------------------------------------------
    // https://www.w3.org/TR/css-display-3/#typedef-display-listitem
    if (tk.value === "list-item") {
        throw Error("not implemented");
    }

    throw new CSSSyntaxError(ts.prevOrFirstToken());
}
