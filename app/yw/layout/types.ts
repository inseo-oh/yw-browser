export type LogicalPos = number;

export type PhysicalPos = number;

export type WritingMode = "horizontal" | "vertical";

export class PhysicalEdges {
    top: PhysicalPos;
    right: PhysicalPos;
    bottom: PhysicalPos;
    left: PhysicalPos;

    constructor(
        top: PhysicalPos,
        right: PhysicalPos,
        bottom: PhysicalPos,
        left: PhysicalPos,
    ) {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
    }
    verticalSum(): PhysicalPos {
        return this.top + this.bottom;
    }
    horizontalSum(): PhysicalPos {
        return this.left + this.right;
    }
}

class BaseRect {
    x: LogicalPos;
    y: LogicalPos;
    width: LogicalPos;
    height: LogicalPos;

    constructor(
        x: LogicalPos,
        y: LogicalPos,
        width: LogicalPos,
        height: LogicalPos,
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    get left(): number {
        return this.x;
    }
    get top(): number {
        return this.y;
    }
    get right(): number {
        return this.x + this.width - 1;
    }
    get bottom(): number {
        return this.y + this.height - 1;
    }
}

export class LogicalRect extends BaseRect {
    toPhysical(): PhysicalRect {
        // TODO: Support vertical writing mode
        return new PhysicalRect(this.x, this.y, this.width, this.height);
    }
}
export class PhysicalRect extends BaseRect {
    addPadding(edges: PhysicalEdges): PhysicalRect {
        return new PhysicalRect(
            edges.top,
            edges.left,
            edges.horizontalSum(),
            edges.verticalSum(),
        );
    }
    logicalX(mode: WritingMode): number {
        if (mode === "vertical") {
            throw Error("not implemented");
        }
        return this.x;
    }
    logicalY(mode: WritingMode): number {
        if (mode === "vertical") {
            throw Error("not implemented");
        }
        return this.y;
    }
    logicalWidth(mode: WritingMode): number {
        if (mode === "vertical") {
            throw Error("not implemented");
        }
        return this.width;
    }
    logicalHeight(mode: WritingMode): number {
        if (mode === "vertical") {
            throw Error("not implemented");
        }
        return this.height;
    }

    logicalLeft(mode: WritingMode): number {
        return this.logicalX(mode);
    }
    logicalTop(mode: WritingMode): number {
        return this.logicalY(mode);
    }
    logicalRight(mode: WritingMode): number {
        return this.logicalX(mode) + this.logicalWidth(mode) - 1;
    }
    logicalBottom(mode: WritingMode): number {
        return this.logicalY(mode) + this.logicalHeight(mode) - 1;
    }

    containsLogicalY(y: LogicalPos): boolean {
        // TODO: Support vertical writing mode
        return this.top <= y && y <= this.bottom;
    }
}

export function physicalSizeToLogical(
    width: PhysicalPos,
    height: PhysicalPos,
): [LogicalPos, LogicalPos] {
    // TODO: Support vertical writing mode
    return [width, height];
}
