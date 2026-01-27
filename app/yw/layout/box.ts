import {
    BlockFormattingContext,
    FormattingContext,
    InlineFormattingContext,
} from "./formatting_context";
import { PhysicalEdges, PhysicalPos, PhysicalRect } from "./types";

export class Box {
    parent: Box | null;
    element: Element | null;
    margin: PhysicalEdges;
    padding: PhysicalEdges;
    physicalWidthAuto: boolean;
    physicalHeightAuto: boolean;
    childBoxes: Box[] = [];
    childTexts: Text[] = [];

    constructor(
        parent: Box | null,
        elem: Element | null,
        margin: PhysicalEdges,
        padding: PhysicalEdges,
        physicalWidthAuto: boolean,
        physicalHeightAuto: boolean,
        marginArea: PhysicalRect,
    ) {
        this.parent = parent;
        this.element = elem;
        this.margin = margin;
        this.padding = padding;
        this.physicalWidthAuto = physicalWidthAuto;
        this.physicalHeightAuto = physicalHeightAuto;
        this.marginArea = marginArea;
    }

    // https://www.w3.org/TR/css-box-3/#margin-area
    marginArea: PhysicalRect;

    // https://www.w3.org/TR/css-box-3/#padding-area
    get paddingArea(): PhysicalRect {
        return this.marginArea.addPadding(this.margin);
    }

    // https://www.w3.org/TR/css-box-3/#border-area
    get borderArea(): PhysicalRect {
        // STUB
        return this.paddingArea;
    }

    // https://www.w3.org/TR/css-box-3/#content-area
    get contentArea(): PhysicalRect {
        return this.borderArea.addPadding(this.padding);
    }

    // https://www.w3.org/TR/css-writing-modes-4/#logical-width
    get logicalWidth(): number {
        // TODO: Support vertical writing modes
        return this.contentArea.width;
    }

    // https://www.w3.org/TR/css-writing-modes-4/#logical-height
    get logicalHeight(): number {
        // TODO: Support vertical writing modes
        return this.contentArea.height;
    }

    /**
     * Increments this box's width/height by given amount, and propagate it to
     * its parent if parent's width/height is auto.
     * @param width Width to consume
     * @param height Height to consume
     */
    consumeSize(width: PhysicalPos, height: PhysicalPos) {
        if (width == 0 && height == 0) {
            return;
        }
        if (width < 0 || height < 0) {
            throw RangeError("width/height cannot be negative");
        }
        const parent = this.parent;
        if (parent != null) {
            let w = width;
            let h = height;
            if (!parent.physicalWidthAuto) {
                w = 0;
            }
            if (!parent.physicalHeightAuto) {
                h = 0;
            }
            parent.consumeSize(w, h);
        }
    }

    /**
     * Increments size to satisfy given minimum width/height. If box is already
     * large enough, this will not do anything.
     * @param minWidth Minimum width
     * @param minHeight Minimum height
     * @returns Incremented delta size.
     */
    consumeSizeIfNeeded(
        minWidth: PhysicalPos,
        minHeight: PhysicalPos,
    ): [PhysicalPos, PhysicalPos] {
        const wDiff = Math.max(minWidth - this.contentArea.width, 0);
        const hDiff = Math.max(minHeight - this.contentArea.height, 0);
        this.consumeSize(wDiff, hDiff);
        return [wDiff, hDiff];
    }
}

// https://www.w3.org/TR/css-display-3/#block-container
export class BlockContainerBox extends Box {
    bfc: BlockFormattingContext;
    ifc: InlineFormattingContext;
    parentFctx: FormattingContext | null;
    parentBcon: BlockContainerBox | null;
    ownsBfc: boolean;
    ownsIfc: boolean;
    isAnonymous: boolean;
    isInlineFlowRoot: boolean;

    accumulatedMarginLeft: PhysicalPos;
    accumulatedPaddingLeft: PhysicalPos;
    accumulatedMarginRight: PhysicalPos;
    accumulatedPaddingRight: PhysicalPos;

    constructor(
        parentFctx: FormattingContext | null,
        ifc: InlineFormattingContext | null,
        parentBox: Box,
        parentBcon: BlockContainerBox | null,
        elem: Element | null,
        marginArea: PhysicalRect,
        margin: PhysicalEdges,
        padding: PhysicalEdges,
        physWidthAuto: boolean,
        physHeightAuto: boolean,
        isInlineFlowRoot: boolean,
    ) {
        super(
            parentBox,
            elem,
            margin,
            padding,
            physWidthAuto,
            physHeightAuto,
            marginArea,
        );

        // ICBs don't have any formatting context yet -- we have to create one.
        if (parentFctx === null) {
            const bfc = new BlockFormattingContext(this);
            parentFctx = bfc;
        }
        // ICBs don't have any IFC yet -- we have to create one.
        if (ifc === null) {
            ifc = new InlineFormattingContext(this, this, marginArea.width, 0);
            this.ownsIfc = true;
        }

        this.parentBcon = parentBcon;
        this.parentFctx = parentFctx;
        this.ifc = ifc;
        this.isInlineFlowRoot = isInlineFlowRoot;
        this.ownsIfc = false;
        this.isAnonymous = false;

        if (parentBcon !== null) {
            this.accumulatedMarginLeft =
                parentBcon.accumulatedMarginLeft + margin.left;
            this.accumulatedMarginRight =
                parentBcon.accumulatedMarginRight + margin.right;
            this.accumulatedPaddingLeft =
                parentBcon.accumulatedPaddingLeft + padding.left;
            this.accumulatedPaddingRight =
                parentBcon.accumulatedPaddingRight + padding.right;
        } else {
            this.accumulatedMarginLeft = 0;
            this.accumulatedMarginRight = 0;
            this.accumulatedPaddingLeft = 0;
            this.accumulatedPaddingRight = 0;
        }

        if (!(parentFctx instanceof BlockFormattingContext)) {
            this.bfc = new BlockFormattingContext(this);
            this.ownsBfc = true;
        } else {
            this.bfc = parentFctx;
            this.ownsBfc = false;
        }
    }
}

// https://www.w3.org/TR/css-display-3/#inline-box
export class InlineBox extends Box {
    parentBcon: BlockContainerBox;

    constructor(
        parentBox: Box,
        parentBcon: BlockContainerBox,
        elem: Element | null,
        marginArea: PhysicalRect,
        margin: PhysicalEdges,
        padding: PhysicalEdges,
        physWidthAuto: boolean,
        physHeightAuto: boolean,
    ) {
        super(
            parentBox,
            elem,
            margin,
            padding,
            physWidthAuto,
            physHeightAuto,
            marginArea,
        );
        this.parentBcon = parentBcon;
    }
}
