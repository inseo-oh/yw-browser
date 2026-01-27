import { BlockContainerBox, Box } from "./box";
import { LogicalPos, PhysicalPos } from "./types";

export abstract class FormattingContext {
    ownerBox: Box;

    constructor(ownerBox: Box) {
        this.ownerBox = ownerBox;
    }
    abstract get naturalPos(): LogicalPos;
    abstract incrementNaturalPos(delta: LogicalPos): void;
}

/**
 * Block Formatting Contexts(BFC for short) are responsible for tracking
 * logical Y-axis.
 *
 * Spec: https://www.w3.org/TR/CSS2/visuren.html#block-formatting
 */
export class BlockFormattingContext extends FormattingContext {
    currentNaturalPos: LogicalPos = 0;
    leftFloatingBoxes: Box[] = [];
    rightFloatingBoxes: Box[] = [];

    get naturalPos(): LogicalPos {
        return this.currentNaturalPos;
    }
    incrementNaturalPos(delta: LogicalPos) {
        if (delta < 0) {
            console.warn(
                "attempted to increment natural position with negative value " +
                    delta,
            );
        }
        this.currentNaturalPos += delta;
    }

    leftFloatWidth(forLogicalY: LogicalPos): LogicalPos {
        let sum = 0;
        for (const box of this.leftFloatingBoxes) {
            if (box.marginArea.containsLogicalY(forLogicalY)) {
                sum += box.logicalWidth;
            }
        }
        return sum;
    }
    rightFloatWidth(forLogicalY: LogicalPos): LogicalPos {
        let sum = 0;
        for (const box of this.rightFloatingBoxes) {
            if (box.marginArea.containsLogicalY(forLogicalY)) {
                sum += box.logicalWidth;
            }
        }
        return sum;
    }
    floatWidth(forLogicalY: LogicalPos): LogicalPos {
        return (
            this.leftFloatWidth(forLogicalY) + this.rightFloatWidth(forLogicalY)
        );
    }
}

/**
 * Inline Formatting Contexts(IFC for short) are responsible for tracking
 * logical X-axis.
 *
 * Spec: https://www.w3.org/TR/CSS2/visuren.html#block-formatting
 */
export class InlineFormattingContext extends FormattingContext {
    blockContainer: BlockContainerBox;
    initialAvailableWidth: LogicalPos;
    initialLogicalY: LogicalPos;
    writtenText: string = "";
    lineBoxes: LineBox[] = [];

    constructor(
        ownerBox: Box,
        blockContainer: BlockContainerBox,
        initialAvailableWidth: LogicalPos,
        initialLogicalY: LogicalPos,
    ) {
        super(ownerBox);
        this.blockContainer = blockContainer;
        this.initialAvailableWidth = initialAvailableWidth;
        this.initialLogicalY = initialLogicalY;
    }

    addLineBox(lineHeight: number) {
        let initialLogicalY;
        if (this.lineBoxes.length !== 0) {
            const lastLb = this.currentLineBox;
            // TODO: Support vertical writing mode
            initialLogicalY = lastLb.initialLogicalY + lastLb.currentLineHeight;
        } else {
            initialLogicalY = this.initialLogicalY;
        }
        this.lineBoxes.push({
            currentNaturalPos: 0,
            currentLineHeight: lineHeight,
            availableWidth:
                this.initialAvailableWidth -
                this.blockContainer.bfc.floatWidth(initialLogicalY),
            leftOffset: this.blockContainer.bfc.leftFloatWidth(initialLogicalY),
            initialLogicalY,
        });
    }

    get currentLineBox(): LineBox {
        if (this.lineBoxes.length === 0) {
            throw new Error("No line box was created");
        }
        return this.lineBoxes[this.lineBoxes.length - 1];
    }
    get naturalPos(): number {
        // TODO: Support vertical writing mode
        return (
            this.currentLineBox.currentNaturalPos +
            this.currentLineBox.leftOffset
        );
    }
    incrementNaturalPos(delta: LogicalPos): void {
        const lb = this.currentLineBox;
        if (lb.availableWidth < lb.currentNaturalPos + delta) {
            throw new Error("content overflow");
        }
        lb.currentNaturalPos += delta;
    }
}

/**
 * Line box holds state needed for placing inline contents, such as next inline
 * position(which gets reset when entering new line).
 *
 *  Spec: https://www.w3.org/TR/css-inline-3/#line-box
 */
type LineBox = {
    leftOffset: PhysicalPos;
    availableWidth: LogicalPos;
    currentNaturalPos: LogicalPos;
    currentLineHeight: number;
    initialLogicalY: LogicalPos;
};
