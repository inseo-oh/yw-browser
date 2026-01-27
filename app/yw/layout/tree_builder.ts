import { ComputedStyleMap } from "../css/computed_style_map";
import { Display } from "../css/display";
import { fontSizeFromSV } from "../css/fonts";
import { computeUsedSizeValue, Size } from "../css/sizing";
import { applyTextTransform } from "../css/text";
import { TextDecorationOptions } from "../css/text_decor";
import { computedStyleProperty, removePrefix, removeSuffix } from "../css/utility";
import { lengthToPx } from "../css/value";
import { BlockContainerBox, Box, InlineBox } from "./box";
import {
    BlockFormattingContext,
    FormattingContext,
    InlineFormattingContext,
} from "./formatting_context";
import { TextFragment } from "./text";
import {
    LogicalPos,
    LogicalRect,
    PhysicalEdges,
    PhysicalRect,
    physicalSizeToLogical,
    WritingMode,
} from "./types";

// https://www.w3.org/TR/css-text-3/#white-space-phase-1
function applyWhitespaceCollapsing(
    str: string,
    ifc: InlineFormattingContext,
): string {
    // TODO: Add support for white-space: pre, white-space:pre-wrap, or white-space: break-spaces

    //==========================================================================
    // Ignore collapsible spaces and tabs immediately following/preceding segment break.
    //==========================================================================
    // "foo   \n   bar" --> "foo\nbar"
    str = str.replace(/\n +/, "\n").replace(/ +\n+/, "\n");

    //==========================================================================
    // Transform segment breaks according to segment break transform rules.
    // "foo\n\nbar" -> "foo\nbar"
    //==========================================================================
    str = applySegmentBreakTransform(str);

    //==========================================================================
    // Replace tabs with spaces.
    // "foo\t\tbar" -> "foo  bar"
    //==========================================================================
    str = str.replace("\t", " ");

    //==========================================================================
    // Ignore any space following the another, including the ones outside of
    // current text, as long as it's part of the same IFC.
    // "foo   bar" -> "foo bar"
    //
    // TODO: CSS says these extra sapces don't have zero-advance width, and thus invisible,
    // but still retains its soft wrap opportunity, if any.
    //==========================================================================
    if (ifc.writtenText.endsWith(" ")) {
        str = removePrefix(str, " ");
    }
    str = str.replace(/ +/, " ");

    return str;
}

// https://www.w3.org/TR/css-text-3/#line-break-transform
function applySegmentBreakTransform(str: string): string {
    //==========================================================================
    // Remove segment breaks immediately following another.
    // "foo\n\nbar" -> "foo\nbar"
    //==========================================================================
    str = str.replace(/\n+/, "\n");

    //==========================================================================
    // Turn remaining segment breaks into spaces.
    // "foo\nbar\njaz" -> "foo bar jaz"
    //==========================================================================
    str = str.replace("\n", " ");

    return str;
}

function closestDomElementForBox(bx: Box): Element {
    let currBox = bx;
    while (currBox.element === null) {
        if (currBox.parent == null) {
            break;
        }
        currBox = currBox.parent;
    }
    if (currBox.element === null) {
        throw Error("The box should have element at this point");
    }
    return currBox.element;
}

function closestParentBlockContainer(bx: Box): BlockContainerBox {
    let currBox = bx;
    while (true) {
        if (currBox instanceof BlockContainerBox) {
            return currBox;
        }
        if (currBox.parent === null) {
            throw Error("ICB should have block container");
        }
        currBox = currBox.parent;
    }
}

const initialFontSize = 14;

function fontSizeOf(elem: Element): number {
    const parentFontSize = () => {
        if (elem.parentElement !== null) {
            return fontSizeOf(elem.parentElement);
        } else {
            return initialFontSize;
        }
    };
    return lengthToPx(
        fontSizeFromSV(computedStyleProperty(elem, "font-size")),
        parentFontSize,
        parentFontSize,
    );
}

function elementTextDecoration(
    elem: Element,
    textDecors: TextDecorationOptions[],
): TextDecorationOptions[] {
    const csm = new ComputedStyleMap(elem);

    // text decoration in CSS is a bit unusual, because it performs box-level inherit, not normal inheritance.
    // This means, for example, if box A's decoration color is currentColor (value of color property), its children B's decoration color will inherit A's currentColor, not B's one.
    if (csm.textDecorationLine.length !== 0) {
        const decorColor = csm.textDecorationColor;
        const decorStyle = csm.textDecorationStyle;

        textDecors = [];
        const decorLine = csm.textDecorationLine;
        if (0 <= decorLine.indexOf("overline")) {
            textDecors.push({
                line: "overline",
                color: decorColor,
                style: decorStyle,
            });
        }
        if (0 <= decorLine.indexOf("underline")) {
            textDecors.push({
                line: "underline",
                color: decorColor,
                style: decorStyle,
            });
        }
        if (0 <= decorLine.indexOf("line-through")) {
            textDecors.push({
                line: "line-through",
                color: decorColor,
                style: decorStyle,
            });
        }
    }

    return textDecors;
}
function elementMarginAndPadding(
    elem: Element,
    boxParent: Box,
): {
    margin: PhysicalEdges;
    padding: PhysicalEdges;
} {
    const csm = new ComputedStyleMap(elem);
    if (csm.marginTop == "auto" || csm.marginBottom == "auto") {
        throw new Error("TODO: Support auto margin");
    }
    if (csm.marginLeft == "auto" || csm.marginRight == "auto") {
        throw new Error("TODO: Support auto margin");
    }
    const parentWidth = () => {
        return boxParent.marginArea.width;
    };
    const fontSize = () => {
        return fontSizeOf(elem);
    };
    const margin = new PhysicalEdges(
        lengthToPx(csm.marginTop, fontSize, parentWidth),
        lengthToPx(csm.marginRight, fontSize, parentWidth),
        lengthToPx(csm.marginBottom, fontSize, parentWidth),
        lengthToPx(csm.marginLeft, fontSize, parentWidth),
    );
    const padding = new PhysicalEdges(
        lengthToPx(csm.paddingTop, fontSize, parentWidth),
        lengthToPx(csm.paddingRight, fontSize, parentWidth),
        lengthToPx(csm.paddingBottom, fontSize, parentWidth),
        lengthToPx(csm.paddingLeft, fontSize, parentWidth),
    );
    return { margin, padding };
}

// Returns logical X, Y
function computeNextPosition(
    bfc: BlockFormattingContext,
    ifc: InlineFormattingContext,
    parentBcon: BlockContainerBox,
    isInline: boolean,
    writingMode: WritingMode,
): [LogicalPos, LogicalPos] {
    let logicalY = 0;
    let logicalX = 0;
    if (isInline) {
        // TODO: Support log
        const baseLogicalY = bfc.ownerBox.contentArea.logicalY(writingMode);
        const baseLogicalX = bfc.ownerBox.contentArea.logicalX(writingMode);
        logicalX = baseLogicalX;
        if (ifc.lineBoxes.length !== 0) {
            const lb = ifc.currentLineBox;
            logicalY = lb.initialLogicalY;
            logicalX += ifc.naturalPos;
        } else {
            logicalY = baseLogicalY + bfc.naturalPos;
        }
    } else {
        const baseLogicalY = bfc.ownerBox.contentArea.logicalY(writingMode);
        const baseLogicalX = bfc.ownerBox.contentArea.logicalX(writingMode);
        logicalY = bfc.naturalPos + baseLogicalY;
        logicalX = baseLogicalX;
    }
    // TODO: Support vertical writing mode.
    logicalX += parentBcon.accumulatedMarginLeft;
    logicalX += parentBcon.accumulatedPaddingLeft;
    return [logicalX, logicalY];
}
function computeBoxRect(
    elem: Element,
    bfc: BlockFormattingContext,
    ifc: InlineFormattingContext,
    boxParent: Box,
    parentBcon: BlockContainerBox,
    margin: PhysicalEdges,
    padding: PhysicalEdges,
    disp: Display,
    writingMode: WritingMode,
): {
    boxRect: LogicalRect;
    physWidthAuto: boolean;
    physHeightAuto: boolean;
} {
    const csm = new ComputedStyleMap(elem);
    const isFloat = csm.float !== "none";
    const isInline =
        !isFloat && disp.type === "normal" && disp.outer === "inline";
    const isInlineFlowRoot = isInline && disp.inner === "flow-root";

    // Calculate left/top position
    const [logicalX, logicalY] = computeNextPosition(
        bfc,
        ifc,
        parentBcon,
        isInline,
        writingMode,
    );

    let boxWidth: Size, boxHeight: Size;
    let physWidth = 0;
    let physHeight = 0;
    let physWidthAuto = false;
    let physHeightAuto = false;
    if (!isInline || isInlineFlowRoot) {
        // inline-block, block, or similar --> calculate width/height using `width` and `height` property
        boxWidth = csm.width;
        boxHeight = csm.height;
    } else {
        // Inline elemenrs always have auto size
        boxWidth = "auto";
        boxHeight = "auto";
    }

    // If width or height is auto, we start from 0 and expand it as we layout the children.
    if (boxWidth != "auto") {
        const containerSize = () => boxParent.contentArea.width;
        const fontSize = () => fontSizeOf(elem);
        physWidth = lengthToPx(
            computeUsedSizeValue(boxWidth),
            containerSize,
            fontSize,
        );
    } else {
        physWidthAuto = true;
    }
    physWidth += margin.horizontalSum() + padding.horizontalSum();
    if (boxHeight != "auto") {
        const containerSize = () => boxParent.contentArea.height;
        const fontSize = () => fontSizeOf(elem);
        physHeight = lengthToPx(
            computeUsedSizeValue(boxHeight),
            containerSize,
            fontSize,
        );
    } else {
        physHeightAuto = true;
    }
    physHeight += margin.verticalSum() + padding.verticalSum();
    const [logicalWidth, logicalHeight] = physicalSizeToLogical(
        physWidth,
        physHeight,
    );

    return {
        boxRect: new LogicalRect(
            logicalX,
            logicalY,
            logicalWidth,
            logicalHeight,
        ),
        physWidthAuto,
        physHeightAuto,
    };
}
function newInlineBox(
    parentBcon: BlockContainerBox,
    elem: Element | null,
    marginArea: PhysicalRect,
    margin: PhysicalEdges,
    padding: PhysicalEdges,
    physWidthAuto: boolean,
    physHeightAuto: boolean,
    children: Node[],
    textDecors: TextDecorationOptions[],
    writingMode: WritingMode,
    canvasCtx: CanvasRenderingContext2D,
): InlineBox {
    const iBox = new InlineBox(
        parentBcon,
        parentBcon,
        elem,
        marginArea,
        margin,
        padding,
        physWidthAuto,
        physHeightAuto,
    );
    for (const childNode of children) {
        const nodes = layoutNode(
            iBox.parentBcon.ifc,
            iBox.parentBcon.bfc,
            iBox.parentBcon.ifc,
            textDecors,
            iBox,
            childNode,
            writingMode,
            canvasCtx,
        );
        if (nodes.length === 0) {
            continue;
        }
        for (const node of nodes) {
            if (node instanceof Box) {
                iBox.childBoxes.push(node);
            } else if (node instanceof Text) {
                iBox.childTexts.push(node);
            } else {
                throw new Error(`unknown node result ${node}`);
            }
        }
    }
    return iBox;
}
function newBlockContainerBox(
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
    children: Node[],
    textDecors: TextDecorationOptions[],
    writingMode: WritingMode,
    canvasCtx: CanvasRenderingContext2D,
): BlockContainerBox {
    const bConBox = new BlockContainerBox(
        parentFctx,
        ifc,
        parentBox,
        parentBcon,
        elem,
        marginArea,
        margin,
        padding,
        physWidthAuto,
        physHeightAuto,
        isInlineFlowRoot,
    );
    // Check each children's display type.
    let hasInline = false;
    let hasBlock = false;
    const isInline = [];
    for (let i = 0; i < children.length; i++) {
        const childNode = children[i];
        const isBlockLevel = isElementBlockLevel(bConBox.parentFctx, childNode);
        isInline[i] = false;
        if (isBlockLevel) {
            hasBlock = true;
        } else {
            hasInline = true;
            isInline[i] = true;
        }
    }

    // If we have both inline and block-level, we need anonymous block container for inline nodes.
    // (This is actually part of CSS spec)
    const needAnonymousBlockContainer = hasInline && hasBlock;

    if (hasInline && !hasBlock) {
        //======================================================================
        // We only have inline contents
        //======================================================================

        // Calculate current initial available width ---------------------------
        let currrentInitialAvailableWidth: LogicalPos;
        if (bConBox.ifc.lineBoxes.length !== 0) {
            currrentInitialAvailableWidth =
                bConBox.ifc.currentLineBox.availableWidth;
        } else {
            currrentInitialAvailableWidth = bConBox.ifc.initialAvailableWidth;
        }
        // Initialize new IFC --------------------------------------------------

        // If display mode is inline flow-root, and width is auto, we inherit initial available width from parent.
        let initialAvailableWidth;
        if (bConBox.isInlineFlowRoot && bConBox.physicalWidthAuto) {
            initialAvailableWidth = currrentInitialAvailableWidth;
        } else {
            initialAvailableWidth =
                bConBox.marginArea.logicalWidth(writingMode);
        }
        bConBox.ifc = new InlineFormattingContext(
            bConBox,
            bConBox,
            initialAvailableWidth,
            0,
        );
        bConBox.ownsIfc = true;
        // Calculate max margin-top/margin-bottom value ------------------------
        let maxMarginTop = 0;
        let maxMarginBottom = 0;
        for (const child of children) {
            if (child instanceof Element) {
                const csm = new ComputedStyleMap(child);
                const disp = csm.display;
                if (
                    disp.type === "normal" &&
                    (disp.outer !== "inline" || disp.inner === "flow-root")
                ) {
                    const { margin } = elementMarginAndPadding(child, bConBox);
                    maxMarginTop = Math.max(maxMarginTop, margin.top);
                    maxMarginBottom = Math.max(maxMarginBottom, margin.bottom);
                }
            }
        }
        // Create root inline box ----------------------------------------------
        bConBox.bfc.incrementNaturalPos(maxMarginTop);
        bConBox.ifc.initialLogicalY =
            bConBox.bfc.ownerBox.contentArea.logicalY(writingMode) +
            bConBox.bfc.currentNaturalPos;
        const iBox = newInlineBox(
            bConBox,
            null,
            bConBox.contentArea,
            new PhysicalEdges(0, 0, 0, 0),
            new PhysicalEdges(0, 0, 0, 0),
            false,
            false,
            children,
            textDecors,
            writingMode,
            canvasCtx,
        );
        bConBox.bfc.incrementNaturalPos(maxMarginBottom);
        bConBox.childBoxes.push(iBox);
        bConBox.consumeSize(0, maxMarginTop + maxMarginBottom);
    } else {
        //======================================================================
        // We have either only block contents, or mix of inline and block contents.
        // (In the latter case, we create anonymous block container, so we end up having only block contents)
        //======================================================================

        const anonChildren = [];
        for (let i = 0; i < children.length; i++) {
            const childNode = children[i];
            let boxes = [];
            if (isInline[i] && needAnonymousBlockContainer) {
                anonChildren.push(childNode);
                if (i == children.length - 1 || !isInline[i + 1]) {
                    // Create anonymous block container
                    const [logicalX, logicalY] = computeNextPosition(
                        bConBox.bfc,
                        bConBox.ifc,
                        bConBox,
                        true,
                        writingMode,
                    );
                    const boxRect = new LogicalRect(
                        logicalX,
                        logicalY,
                        bConBox.marginArea.logicalWidth(writingMode),
                        bConBox.marginArea.logicalHeight(writingMode),
                    );
                    const anonBcon = newBlockContainerBox(
                        bConBox.parentFctx,
                        bConBox.ifc,
                        bConBox,
                        bConBox,
                        null,
                        boxRect.toPhysical(),
                        new PhysicalEdges(0, 0, 0, 0),
                        new PhysicalEdges(0, 0, 0, 0),
                        false,
                        true,
                        false,
                        anonChildren,
                        textDecors,
                        writingMode,
                        canvasCtx,
                    );
                    boxes.push(anonBcon);
                }
            } else {
                // Create layout node normally
                boxes = layoutNode(
                    bConBox.parentFctx,
                    bConBox.bfc,
                    bConBox.ifc,
                    textDecors,
                    bConBox,
                    childNode,
                    writingMode,
                    canvasCtx,
                );
            }
            if (boxes.length === 0) {
                continue;
            }
            for (const box of boxes) {
                if (box instanceof TextFragment) {
                    throw Error(
                        `No TextFragment should've been generated here`,
                    );
                }
                bConBox.childBoxes.push(box);
            }
        }
    }

    return bConBox;
}

function isElementBlockLevel(
    parentFctx: FormattingContext | null,
    domNode: Node,
): boolean {
    if (domNode instanceof Comment) {
        return false;
    }
    if (domNode instanceof Text) {
        return false;
    }
    if (domNode instanceof Element) {
        const csm = new ComputedStyleMap(domNode);
        const disp = csm.display;
        switch (disp.type) {
            case "none":
                return false;
            case "normal":
                switch (disp.inner) {
                    case "flow":
                        //======================================================
                        // "flow" mode (block, inline, run-in, list-item, inline list-item display modes)
                        //======================================================

                        // https://www.w3.org/TR/css-display-3/#valdef-display-flow

                        let shouldMakeInlineBox = false;
                        if (disp.outer == "inline" || disp.outer == "run-in") {
                            if (
                                parentFctx instanceof BlockFormattingContext ||
                                parentFctx instanceof InlineFormattingContext
                            ) {
                                shouldMakeInlineBox = true;
                            }
                        }
                        if (shouldMakeInlineBox) {
                            return false;
                        }
                        return true;
                    case "flow-root":
                        //======================================================
                        // "flow-root" mode (flow-root, inline-block display modes)
                        //======================================================

                        // https://www.w3.org/TR/css-display-3/#valdef-display-flow-root
                        return false;
                    default:
                        throw new Error("not implemented");
                }
            default:
                throw new Error("not implemented");
        }
    }
    throw new Error(`Unknown DOM node ${domNode}`);
}

function layoutText(
    txt: Text,
    boxParent: Box,
    bfc: BlockFormattingContext,
    ifc: InlineFormattingContext,
    textDecors: TextDecorationOptions[],
    writingMode: WritingMode,
    canvasCtx: CanvasRenderingContext2D,
): TextFragment[] {
    const parentElem = closestDomElementForBox(boxParent);
    const parentBcon = closestParentBlockContainer(boxParent);
    const parentCsm = new ComputedStyleMap(parentElem);

    let str = applyWhitespaceCollapsing(txt.data, ifc);
    if (str == "") {
        return [];
    }
    ifc.writtenText += str;

    // Apply text-transform
    if (parentCsm.textTransform != null) {
        str = applyTextTransform(parentCsm.textTransform, str);
    }

    // Calculate the font size
    const fontSize = fontSizeOf(parentElem);
    canvasCtx.font = `${fontSize}px ${parentCsm.fontFamily}`; // NOTE: This will only be used for measuring text
    const { fontBoundingBoxAscent, fontBoundingBoxDescent } =
        canvasCtx.measureText("a");
    const lineHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;

    let fragmentRemaining = str;
    const textNodes = [];

    while (0 < fragmentRemaining.length) {
        // https://www.w3.org/TR/css-text-3/#white-space-phase-2
        // S1.
        fragmentRemaining = removePrefix(fragmentRemaining, " ");
        if (fragmentRemaining == "") {
            break;
        }

        // Create line box if needed
        let firstLineBoxCreated = false;
        if (ifc.lineBoxes.length === 0) {
            ifc.addLineBox(lineHeight);
            firstLineBoxCreated = true;
        }
        const lineBox = ifc.currentLineBox;

        let rect: PhysicalRect;
        let logicalWidth: LogicalPos;
        let strLen = fragmentRemaining.length;

        // Figure out where we should end current fragment, so that we don't
        // overflow the line box.
        // TODO: We should not do this if we are not doing text wrapping(e.g. whitespace: nowrap).
        while (true) {
            // FIXME: This is very brute-force way of fragmenting text.
            //        We need smarter way to handle this.

            // Calculate physWidth/height using dimensions of the text
            const { width: physWidth } = canvasCtx.measureText(
                fragmentRemaining.substring(0, strLen),
            );

            rect = new PhysicalRect(0, 0, physWidth, lineHeight);

            // Check if parent's size is auto and we have to grow its size.
            logicalWidth = rect.width;
            // Check if we overflow beyond available size
            if (
                lineBox.currentNaturalPos + logicalWidth <=
                lineBox.availableWidth
            ) {
                // If not, we don't have to fragment text further.
                break;
            }
            strLen--; // Decrement length and try again
        }
        if (strLen == 0) {
            // Display at least one chracter per line
            strLen = 1;
        }
        let fragment = fragmentRemaining.substring(0, strLen);
        fragmentRemaining = fragmentRemaining.substring(strLen);

        lineBox.currentLineHeight = Math.max(
            lineBox.currentLineHeight,
            rect.height,
        );

        // If we just created a line box, we may have to increase the height.
        if (firstLineBoxCreated && boxParent.physicalHeightAuto) {
            boxParent.consumeSize(0, lineBox.currentLineHeight);
        }

        // https://www.w3.org/TR/css-text-3/#white-space-phase-2
        // S3.
        fragment = removeSuffix(fragment, " ");

        if (fragment == "") {
            continue;
        }

        // Calculate left/top position -------------------------------------
        const [left, top] = computeNextPosition(
            bfc,
            ifc,
            parentBcon,
            true,
            writingMode,
        );
        rect.x = left;
        rect.y = top;

        // Make text node --------------------------------------------------
        const color = parentCsm.color;
        const textNode = new TextFragment(
            rect,
            fragment,
            [],
            fontSize,
            color,
            textDecors,
        );

        if (boxParent.physicalWidthAuto) {
            boxParent.consumeSize(rect.width, 0);
        }

        ifc.incrementNaturalPos(logicalWidth);
        textNodes.push(textNode);
        if (
            fragmentRemaining.length !== 0 &&
            removePrefix(fragmentRemaining, " ") !== ""
        ) {
            // Create next line --------------------------------------------
            ifc.addLineBox(lineHeight);
            if (boxParent.physicalHeightAuto) {
                boxParent.consumeSize(0, lineHeight);
            }
        }
    }

    return textNodes;
}

function layoutElement(
    elem: Element,
    boxParent: Box,
    parentFctx: FormattingContext | null,
    bfc: BlockFormattingContext,
    ifc: InlineFormattingContext,
    textDecors: TextDecorationOptions[],
    writingMode: WritingMode,
    canvasCtx: CanvasRenderingContext2D,
): Box | null {
    const parentBcon = closestParentBlockContainer(boxParent);

    const csm = new ComputedStyleMap(elem);

    textDecors = elementTextDecoration(elem, textDecors);
    const { margin, padding } = elementMarginAndPadding(elem, boxParent);

    const styleDisplay = csm.display;
    const styleFloat = csm.float;
    switch (styleDisplay.type) {
        case "none":
            return null;
        case "normal":
            if (styleDisplay.outer == "inline") {
                // Top and bottom margins are handled when creating inline box.
                margin.top = 0;
                margin.bottom = 0;
            }
            const boxRectRes = computeBoxRect(
                elem,
                bfc,
                ifc,
                boxParent,
                parentBcon,
                margin,
                padding,
                styleDisplay,
                writingMode,
            );
            let { physWidthAuto, physHeightAuto } = boxRectRes;
            const { boxRect } = boxRectRes;
            const isFloat = styleFloat != "none";

            switch (styleDisplay.outer) {
                case "block":
                    // Check if we have auto size on a block element. If so, use parent's size and unset auto.
                    if (physWidthAuto && !isFloat) {
                        boxRect.width =
                            boxParent.contentArea.logicalWidth(writingMode);
                        physWidthAuto = false;
                    }
                case "inline":
                    // Check if we have auto size on a inline element. If so, use current line height and unset auto.
                    if (physHeightAuto && ifc.lineBoxes.length != 0) {
                        boxRect.height = ifc.currentLineBox.currentLineHeight;
                        physHeightAuto = false;
                    }
            }

            // Increment natural position(if it's auto)
            // XXX: Should we increment width/height if the element uses absolute positioning?
            switch (styleDisplay.outer) {
                case "block":
                    if (boxParent.physicalWidthAuto) {
                        boxParent.consumeSizeIfNeeded(
                            boxRect.toPhysical().width,
                            0,
                        );
                    }
                    if (boxParent.physicalHeightAuto) {
                        boxParent.consumeSize(0, boxRect.toPhysical().height);
                    }
                    break;
                case "inline":
                    if (boxParent.physicalWidthAuto) {
                        boxParent.consumeSize(boxRect.toPhysical().width, 0);
                    }
                    if (boxParent.physicalHeightAuto) {
                        // TODO
                    }
                    break;
            }

            let bx: Box;
            let oldLogicalX = 0;
            const oldLogicalY = bfc.currentNaturalPos;
            if (ifc.lineBoxes.length !== 0) {
                oldLogicalX = ifc.currentLineBox.currentNaturalPos;
            }

            switch (styleDisplay.inner) {
                case "flow":
                    //==================================================================
                    // "flow" mode (block, inline, run-in, list-item, inline list-item display modes)
                    //==================================================================

                    // https://www.w3.org/TR/css-display-3/#valdef-display-flow

                    let shouldMakeInlineBox = false;
                    if (
                        styleDisplay.outer == "inline" ||
                        styleDisplay.outer == "run-in"
                    ) {
                        if (
                            parentFctx instanceof BlockFormattingContext ||
                            parentFctx instanceof InlineFormattingContext
                        ) {
                            shouldMakeInlineBox = true;
                        }
                    }
                    if (shouldMakeInlineBox) {
                        const iBox = newInlineBox(
                            parentBcon,
                            elem,
                            boxRect.toPhysical(),
                            margin,
                            padding,
                            physWidthAuto,
                            physHeightAuto,
                            Array.from(elem.childNodes),
                            textDecors,
                            writingMode,
                            canvasCtx,
                        );
                        bx = iBox;
                    } else {
                        bfc.incrementNaturalPos(margin.top + padding.top); // Consume top margin+padding first
                        const bConBox = newBlockContainerBox(
                            parentFctx,
                            ifc,
                            boxParent,
                            parentBcon,
                            elem,
                            boxRect.toPhysical(),
                            margin,
                            padding,
                            physWidthAuto,
                            physHeightAuto,
                            false,
                            Array.from(elem.childNodes),
                            textDecors,
                            writingMode,
                            canvasCtx,
                        );
                        bfc.incrementNaturalPos(margin.bottom + padding.bottom); // Consume bottom margin+padding
                        bx = bConBox;
                    }
                    break;
                case "flow-root":
                    //==================================================================
                    // "flow-root" mode (flow-root, inline-block display modes)
                    //==================================================================
                    // https://www.w3.org/TR/css-display-3/#valdef-display-flow-root
                    const bConBox = newBlockContainerBox(
                        parentFctx,
                        ifc,
                        boxParent,
                        parentBcon,
                        elem,
                        boxRect.toPhysical(),
                        margin,
                        padding,
                        physWidthAuto,
                        physHeightAuto,
                        true,
                        Array.from(elem.childNodes),
                        textDecors,
                        writingMode,
                        canvasCtx,
                    );
                    bx = bConBox;
                    break;
                default:
                    throw new Error(`TODO: Support display: ${styleDisplay}`);
            }
            const newLogicalY = bfc.currentNaturalPos;
            let newLogicalX = 0;
            if (ifc.lineBoxes.length != 0) {
                newLogicalX = ifc.currentLineBox.currentNaturalPos;
            }

            switch (styleFloat) {
                case "none":
                    if (bx instanceof BlockContainerBox) {
                        // Increment natural position (but only the amount that hasn't been incremented)
                        switch (styleDisplay.outer) {
                            case "block": {
                                const logicalHeight =
                                    bx.marginArea.logicalHeight(writingMode);
                                const posDiff = newLogicalY - oldLogicalY;
                                bfc.incrementNaturalPos(
                                    logicalHeight - posDiff,
                                );
                                break;
                            }
                            case "inline":
                                const logicalWidth =
                                    bx.marginArea.logicalWidth(writingMode);
                                const posDiff = newLogicalX - oldLogicalX;
                                if (ifc.lineBoxes.length == 0) {
                                    ifc.addLineBox(0);
                                }
                                ifc.incrementNaturalPos(logicalWidth - posDiff);

                                const lb = ifc.currentLineBox;
                                const heightDiff =
                                    bx.marginArea.height - lb.currentLineHeight;
                                lb.currentLineHeight = Math.max(
                                    lb.currentLineHeight,
                                    bx.marginArea.height,
                                );
                                if (boxParent.physicalHeightAuto) {
                                    boxParent.consumeSize(0, heightDiff);
                                }
                        }
                    }
                case "left":
                    bfc.leftFloatingBoxes.push(bx);
                case "right":
                    bfc.rightFloatingBoxes.push(bx);
            }
            return bx;
    }
    throw new Error(`Support display: ${styleDisplay}`);
}

function layoutNode(
    parentFctx: FormattingContext | null,
    bfc: BlockFormattingContext,
    ifc: InlineFormattingContext,
    textDecors: TextDecorationOptions[],
    boxParent: Box,
    domNode: Node,
    writingMode: WritingMode,
    canvasCtx: CanvasRenderingContext2D,
): (TextFragment | Box)[] {
    if (domNode instanceof Comment) {
        // No layout is needed for comment nodes
        return [];
    }
    if (domNode instanceof Text) {
        const texts = layoutText(
            domNode,
            boxParent,
            bfc,
            ifc,
            textDecors,
            writingMode,
            canvasCtx,
        );
        return texts;
    }
    if (domNode instanceof Element) {
        const elem = layoutElement(
            domNode,
            boxParent,
            parentFctx,
            bfc,
            ifc,
            textDecors,
            writingMode,
            canvasCtx,
        );
        if (elem === null) {
            return [];
        }
        return [elem];
    }
    throw new Error(`Support node: ${domNode}`);
}
