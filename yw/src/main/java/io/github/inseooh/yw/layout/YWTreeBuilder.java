package io.github.inseooh.yw.layout;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.font.FontRenderContext;
import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.css.YWCSSPropertySet;
import io.github.inseooh.yw.css.css2.YWCSSFloat;
import io.github.inseooh.yw.css.display.YWCSSDisplay;
import io.github.inseooh.yw.css.fonts.YWCSSFontSize;
import io.github.inseooh.yw.css.sizing.YWCSSSize;
import io.github.inseooh.yw.css.textdecor.YWCSSTextDecorationLine;
import io.github.inseooh.yw.dom.YWComment;
import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.dom.YWNode;
import io.github.inseooh.yw.dom.YWText;

public final class YWTreeBuilder {
    /**
     * @see <a href=
     *      "https://www.w3.org/TR/css-text-3/#white-space-phase-1">
     *      Relevant section in CSS specification</a>
     */
    private static String applyWhiteSpaceCollapsing(String str, YWFormattingContext.Inline ifc) {
        // TODO: Add support for white-space: pre, white-space:pre-wrap, or white-space:
        // break-spaces

        // ==========================================================================
        // Ignore collapsible spaces and tabs immediately following/preceding segment
        // break.
        // ==========================================================================
        // "foo \n bar" --> "foo\nbar"
        str = str.replaceAll("\n +", "\n");
        str = str.replaceAll(" +\n", "\n");

        // ==========================================================================
        // Transform segment breaks according to segment break transform rules.
        // "foo\n\nbar" -> "foo\nbar"
        // ==========================================================================
        str = applySegmentBreakTransform(str);

        // ==========================================================================
        // Replace tabs with spaces.
        // "foo\t\tbar" -> "foo bar"
        // ==========================================================================
        str = str.replaceAll("\t", " ");

        // ==========================================================================
        // Ignore any space following the another, including the ones outside of
        // current text, as long as it's part of the same IFC.
        // "foo bar" -> "foo bar"
        //
        // TODO: CSS says these extra sapces don't have zero-advance width, and thus
        // invisible, but still retains its soft wrap opportunity, if any.
        // ==========================================================================
        if (ifc.getWrittenText().toString().endsWith(" ")) {
            while (str.startsWith(" ")) {
                str = str.substring(1);
            }
        }
        str = str.replaceAll(" +", " ");

        return str;
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/css-text-3/#line-break-transform">
     *      Relevant section in CSS specification</a>
     */
    private static String applySegmentBreakTransform(String str) {
        // ==========================================================================
        // Remove segment breaks immediately following another.
        // "foo\n\nbar" -> "foo\nbar"
        // ==========================================================================
        str = str.replaceAll("\n+", "\n");

        // ==========================================================================
        // Turn remaining segment breaks into spaces.
        // "foo\nbar\njaz" -> "foo bar jaz"
        // ==========================================================================
        str = str.replaceAll("\n", " ");

        return str;
    }

    private static YWLayoutText.DecorationOptions[] elementTextDecoration(
            YWElement element, YWLayoutText.DecorationOptions[] textDecors) {
        YWCSSPropertySet propSet = element.getCSSPropertySet();

        // text decoration in CSS is a bit unusual, because it performs box-level
        // inherit, not normal inheritance.
        // This means, for example, if box A's decoration color is currentColor
        // (value of color property), its children B's decoration color will inherit
        // A's currentColor, not B's one.

        if (propSet.getTextDecorationLine().isAny()) {
            Color decorColor = propSet.getTextDecorationColor().toAWTColor();
            YWLayoutText.DecorationStyle decorStyle = switch (propSet.getTextDecorationStyle()) {
                case SOLID -> YWLayoutText.DecorationStyle.SOLID;
                case DOUBLE -> YWLayoutText.DecorationStyle.DOUBLE;
                case DOTTED -> YWLayoutText.DecorationStyle.DOTTED;
                case DASHED -> YWLayoutText.DecorationStyle.DASHED;
                case WAVY -> YWLayoutText.DecorationStyle.WAVY;
            };

            List<YWLayoutText.DecorationOptions> newTextDecors = new ArrayList<>();
            YWCSSTextDecorationLine decorLine = propSet.getTextDecorationLine();
            if (decorLine.isOverline()) {
                newTextDecors
                        .add(new YWLayoutText.DecorationOptions(YWLayoutText.DecorationType.OVERLINE, decorColor,
                                decorStyle));
            }
            if (decorLine.isUnderline()) {
                newTextDecors
                        .add(new YWLayoutText.DecorationOptions(YWLayoutText.DecorationType.UNDERLINE, decorColor,
                                decorStyle));
            }
            if (decorLine.isLineThrough()) {
                newTextDecors
                        .add(new YWLayoutText.DecorationOptions(YWLayoutText.DecorationType.THROUGH_TEXT, decorColor,
                                decorStyle));
            }
            return newTextDecors.toArray(new YWLayoutText.DecorationOptions[0]);
        }
        return textDecors;
    }

    private record ComputedBoxRect(YWLogicalRect rect, boolean physicalWidthAuto, boolean physicalHeightAuto) {
    }

    private static ComputedBoxRect computeBoxRect(
            YWElement element, YWFormattingContext.Block bfc, YWFormattingContext.Inline ifc,
            YWLayoutBox boxParent, YWLayoutBox.BlockContainer parentBcon,
            YWPhysicalEdges margin, YWPhysicalEdges padding,
            YWCSSDisplay styleDisplay) {
        YWWritingMode writingMode = YWWritingMode.HORIZONTAL; // XXX: Use actual writing mode.

        boolean physWidthAuto = false, physHeightAuto = false;
        YWCSSPropertySet propSet = element.getCSSPropertySet();
        boolean isFloat = propSet.getFloat() != YWCSSFloat.NONE;
        boolean isInline = !isFloat && styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.INLINE;
        boolean isInlineFlowRoot = isInline && styleDisplay.getInnerMode() == YWCSSDisplay.InnerMode.FLOW_ROOT;

        // Calculate left/top position
        YWLogicalPoint logicalPoint = computeNextPosition(bfc, ifc, parentBcon, isInline);

        YWCSSSize boxWidth, boxHeight;
        float boxWidthPhysical = 0, boxHeightPhysical = 0;
        if (!isInline || isInlineFlowRoot) {
            // Calculate width/height using `width` and `height` property
            boxWidth = propSet.getWidth();
            boxHeight = propSet.getHeight();
        } else {
            // Inline elemenrs always have auto size
            boxWidth = YWCSSSize.AUTO;
            boxHeight = YWCSSSize.AUTO;
        }

        // If width or height is auto, we start from 0 and expand it as we layout the
        // children.
        if (!boxWidth.isAuto()) {
            float containerSize = boxParent.getContentRect().getWidth();
            float fontSize = YWCSSFontSize.getComputedValue(propSet.getFontSize());
            boxWidthPhysical = boxWidth.computeUsedValue(fontSize, containerSize);
        } else {
            physWidthAuto = true;
        }
        boxWidthPhysical += margin.getHorizontalSum() + padding.getHorizontalSum();
        if (boxHeight.isAuto()) {
            float containerSize = boxParent.getContentRect().getHeight();
            float fontSize = YWCSSFontSize.getComputedValue(propSet.getFontSize());
            boxHeightPhysical = boxHeight.computeUsedValue(fontSize, containerSize);
        } else {
            physHeightAuto = true;
        }
        boxHeightPhysical += margin.getVerticalSum() + padding.getVerticalSum();
        YWLogicalDimensions logicalDim = new YWPhysicalDimensions(boxWidthPhysical, boxHeightPhysical)
                .toLogical(writingMode);

        return new ComputedBoxRect(
                new YWLogicalRect(logicalPoint.getX(), logicalPoint.getY(), logicalDim.getWidth(),
                        logicalDim.getHeight()),
                physWidthAuto, physHeightAuto);
    }

    static YWPhysicalEdges elementMargin(YWElement element, YWLayoutBox boxParent) {
        YWCSSPropertySet propSet = element.getCSSPropertySet();

        if (propSet.getMarginTop().isAuto() || propSet.getMarginBottom().isAuto()) {
            throw new UnsupportedOperationException("TODO: Support auto margin");
        }
        if (propSet.getMarginLeft().isAuto() || propSet.getMarginRight().isAuto()) {
            throw new UnsupportedOperationException("TODO: Support auto margin");
        }

        float parentPhysicalWidth = boxParent.getPhysicalContentWidth();
        float fontSize = propSet.getFontSize().toComputedValue(0);
        YWPhysicalEdges margin = new YWPhysicalEdges(
                propSet.getMarginTop().getValue().toPx(fontSize, parentPhysicalWidth),
                propSet.getMarginRight().getValue().toPx(fontSize, parentPhysicalWidth),
                propSet.getMarginBottom().getValue().toPx(fontSize, parentPhysicalWidth),
                propSet.getMarginLeft().getValue().toPx(fontSize, parentPhysicalWidth));
        return margin;
    }

    static YWPhysicalEdges elementPadding(YWElement element, YWLayoutBox boxParent) {
        YWCSSPropertySet propSet = element.getCSSPropertySet();

        float parentPhysicalWidth = boxParent.getPhysicalContentWidth();
        float fontSize = YWCSSFontSize.getComputedValue(propSet.getFontSize());
        YWPhysicalEdges padding = new YWPhysicalEdges(
                propSet.getPaddingTop().toPx(fontSize, parentPhysicalWidth),
                propSet.getPaddingRight().toPx(fontSize, parentPhysicalWidth),
                propSet.getPaddingBottom().toPx(fontSize, parentPhysicalWidth),
                propSet.getPaddingLeft().toPx(fontSize, parentPhysicalWidth));
        return padding;
    }

    static YWLogicalPoint computeNextPosition(
            YWFormattingContext.Block bfc, YWFormattingContext.Inline ifc, YWLayoutBox.BlockContainer parentBcon,
            boolean isInline) {
        YWWritingMode writingMode = YWWritingMode.HORIZONTAL; // XXX: Use actual writing mode.

        float logicalX, logicalY;
        if (isInline) {
            float baseLogicalY = bfc.getOwnerBox().getContentRect().toLogical(writingMode).getX();
            float baseLogicalX = bfc.getOwnerBox().getContentRect().toLogical(writingMode).getY();
            logicalX = baseLogicalX;
            if (!ifc.getLineBoxes().isEmpty()) {
                YWFormattingContext.LineBox lb = ifc.getCurrentLineBox();
                logicalY = lb.getInitialLogicalY();
                logicalX += ifc.getNaturalPos();
            } else {
                logicalY = baseLogicalY + bfc.getNaturalPos();
            }
        } else {
            float baseLogicalX = bfc.getOwnerBox().getContentRect().toLogical(writingMode).getX();
            float baseLogicalY = bfc.getOwnerBox().getContentRect().toLogical(writingMode).getY();
            logicalY = bfc.getNaturalPos() + baseLogicalY;
            logicalX = baseLogicalX;
        }
        logicalX += parentBcon.getAccumulatedMarginLeft();
        logicalX += parentBcon.getAccumulatedPaddingLeft();
        return new YWLogicalPoint(logicalX, logicalY);
    }

    static boolean isElementBlockLevel(YWFormattingContext parentFctx, YWNode domNode) {
        if (domNode instanceof YWComment) {
            return false;
        }
        if (domNode instanceof YWText) {
            return false;
        }
        if (domNode instanceof YWElement elem) {
            YWCSSPropertySet propSet = elem.getCSSPropertySet();
            YWCSSDisplay styleDisplay = propSet.getDisplay();
            switch (styleDisplay.getType()) {
                case NONE:
                    return false;
                case NORMAL:
                    switch (styleDisplay.getInnerMode()) {
                        case FLOW:
                            // ==================================================================
                            // "flow" mode (block, inline, run-in, list-item, inline list-item display
                            // modes)
                            // ==================================================================

                            // https://www.w3.org/TR/css-display-3/#valdef-display-flow

                            boolean shouldMakeInlineBox = false;
                            if (styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.INLINE
                            /* TODO: || styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.RUN_IN */) {
                                switch (parentFctx) {
                                    case YWFormattingContext.Block _:
                                    case YWFormattingContext.Inline _:
                                        shouldMakeInlineBox = true;
                                        break;
                                    default:
                                        shouldMakeInlineBox = false;
                                        break;
                                }
                            }
                            if (shouldMakeInlineBox) {
                                return false;
                            }
                            return true;
                        case FLOW_ROOT:
                            // ==================================================================
                            // "flow-root" mode (flow-root, inline-block display modes)
                            // ==================================================================

                            // https://www.w3.org/TR/css-display-3/#valdef-display-flow-root
                            return false;
                    }
            }
            throw new UnsupportedOperationException(
                    "Support for display mode" + styleDisplay + " is not implemented yet");
        }
        throw new UnsupportedOperationException(
                "Support for DOM node" + domNode.getClass().getCanonicalName() + " is not implemented yet");
    }

    private static Object[] layoutText(Graphics graphics, YWText txt, YWLayoutBox boxParent,
            YWFormattingContext.Block bfc, YWFormattingContext.Inline ifc,
            YWLayoutText.DecorationOptions[] textDecors) {

        YWElement parentElem = boxParent.closestElement();
        YWLayoutBox.BlockContainer parentBcon = boxParent.closestParentBlockContainer();
        YWCSSPropertySet parentStyleSet = parentElem.getCSSPropertySet();

        String str = applyWhiteSpaceCollapsing(txt.getText(), ifc);
        if (str.isEmpty()) {
            return null;
        }
        ifc.getWrittenText().append(str);

        // Apply text-transform
        if (parentStyleSet.getTextTransform() != null) {
            str = parentStyleSet.getTextTransform().apply(str);
        }

        float fontSize = YWCSSFontSize.getComputedValue(parentStyleSet.getFontSize());
        Font font = new Font(Font.SANS_SERIF, Font.PLAIN, (int) fontSize);
        FontMetrics metrics = graphics.getFontMetrics();

        String fragmentRemaining = str;
        List<YWLayoutText> textNodes = new ArrayList<>();

        while (!fragmentRemaining.isEmpty()) {
            // https://www.w3.org/TR/css-text-3/#white-space-phase-2
            // S1.
            fragmentRemaining = YWUtility.removePrefix(fragmentRemaining, " ");
            if (fragmentRemaining.isEmpty()) {
                break;
            }

            // Create line box if needed
            boolean firstLineBoxCreated = false;
            if (ifc.getLineBoxes().isEmpty()) {
                ifc.addLineBox(metrics.getHeight());
                firstLineBoxCreated = true;
            }
            YWFormattingContext.LineBox lineBox = ifc.getCurrentLineBox();

            YWPhysicalRect rect;
            float logicalWidth;
            int strLen = fragmentRemaining.length();

            // Figure out where we should end current fragment, so that we don't
            // overflow the line box.
            // TODO: We should not do this if we are not doing text wrapping(e.g.
            // whitespace: nowrap).
            while (true) {
                // FIXME: This is very brute-force way of fragmenting text.
                // We need smarter way to handle this.

                // Calculate physWidth/height using dimensions of the text

                float physWidth = (float) font.getStringBounds(fragmentRemaining.substring(0, strLen),
                        new FontRenderContext(null, true, true)).getWidth();

                rect = new YWPhysicalRect(0, 0, physWidth, metrics.getHeight());

                // Check if parent's size is auto and we have to grow its size.
                logicalWidth = rect.getWidth();
                // Check if we overflow beyond available size
                if (lineBox.getNaturalPos() + logicalWidth <= lineBox.getAvailableWidth()) {
                    // If not, we don't have to fragment text further.
                    break;
                }
                strLen--; // Decrement length and try again
            }
            if (strLen == 0) {
                // Display at least one chracter per line
                strLen = 1;
            }
            String fragment = fragmentRemaining.substring(0, strLen);
            fragmentRemaining = fragmentRemaining.substring(strLen);

            lineBox.setLineHeight(Math.max(lineBox.getLineHeight(), rect.getHeight()));

            // If we just created a line box, we may have to increase the height.
            if (firstLineBoxCreated && boxParent.isPhysicalHeightAuto()) {
                boxParent.incrementSize(0, lineBox.getLineHeight());
            }

            // https://www.w3.org/TR/css-text-3/#white-space-phase-2
            // S3.
            fragment = YWUtility.removeSuffix(fragment, " ");

            if (fragment.isEmpty()) {
                continue;
            }

            // Calculate left/top position -------------------------------------
            YWLogicalPoint logicalPoint = computeNextPosition(bfc, ifc, parentBcon, true);
            rect.setX(logicalPoint.getX());
            rect.setY(logicalPoint.getY());

            // Make text node --------------------------------------------------
            Color color = parentStyleSet.getColor().toAWTColor();
            YWLayoutText textNode = new YWLayoutText(fragment, rect, color, font, (int) fontSize, textDecors);

            if (boxParent.isPhysicalWidthAuto()) {
                boxParent.incrementSize(rect.getWidth(), 0);
            }

            ifc.incrementNaturalPos(logicalWidth);
            textNodes.add(textNode);
            if (fragmentRemaining.length() != 0 && !YWUtility.removePrefix(fragmentRemaining, " ").isEmpty()) {
                // Create next line --------------------------------------------
                ifc.addLineBox(metrics.getHeight());
                if (boxParent.isPhysicalHeightAuto()) {
                    boxParent.incrementSize(0, metrics.getHeight());
                }
            }
        }

        return textNodes.toArray();
    }

    private static YWLayoutBox layoutElement(
            Graphics graphics, YWElement elem, YWLayoutBox boxParent, YWFormattingContext parentFctx,
            YWFormattingContext.Block bfc, YWFormattingContext.Inline ifc,
            YWLayoutText.DecorationOptions[] textDecors) {
        YWWritingMode writingMode = YWWritingMode.HORIZONTAL; // XXX: Use actual writing mode.

        YWLayoutBox.BlockContainer parentBcon = boxParent.closestParentBlockContainer();

        YWCSSPropertySet propSet = elem.getCSSPropertySet();

        textDecors = elementTextDecoration(elem, textDecors);
        YWPhysicalEdges margin = elementMargin(elem, boxParent);
        YWPhysicalEdges padding = elementPadding(elem, boxParent);

        YWCSSDisplay styleDisplay = propSet.getDisplay();
        YWCSSFloat styleFloat = propSet.getFloat();
        switch (styleDisplay.getType()) {
            case NONE:
                return null;
            case NORMAL: {
                if (styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.INLINE) {
                    // Top and bottom margins are handled when creating inline box.
                    margin.setTop(0);
                    margin.setBottom(0);
                }

                ComputedBoxRect computedBoxRect = computeBoxRect(elem, bfc, ifc, boxParent, parentBcon, margin, padding,
                        styleDisplay);
                YWPhysicalRect boxRect = computedBoxRect.rect().toPhysical(writingMode);
                boolean physWidthAuto = computedBoxRect.physicalWidthAuto();
                boolean physHeightAuto = computedBoxRect.physicalHeightAuto();
                boolean isFloat = styleFloat != YWCSSFloat.NONE;

                switch (styleDisplay.getOuterMode()) {
                    case BLOCK:
                        // Check if we have auto size on a block element. If so, use parent's size and
                        // unset auto.
                        if (physWidthAuto && !isFloat) {
                            boxRect.setWidth(boxParent.getContentRect().getWidth());
                            physWidthAuto = false;
                        }
                        break;
                    case INLINE:
                        // Check if we have auto size on a inline element. If so, use current line
                        // height and unset auto.
                        if (physHeightAuto && !ifc.getLineBoxes().isEmpty()) {
                            boxRect.setHeight(ifc.getCurrentLineBox().getLineHeight());
                            physHeightAuto = false;
                        }
                        break;
                }

                // Increment natural position(if it's auto)
                // XXX: Should we increment width/height if the element uses absolute
                // positioning?
                switch (styleDisplay.getOuterMode()) {
                    case BLOCK:
                        if (boxParent.isPhysicalWidthAuto()) {
                            boxParent.incrementIfNeeded(boxRect.getWidth(), 0);
                        }
                        if (boxParent.isPhysicalHeightAuto()) {
                            boxParent.incrementSize(0, boxRect.getHeight());
                        }
                        break;
                    case INLINE:
                        if (boxParent.isPhysicalWidthAuto()) {
                            boxParent.incrementSize(boxRect.getWidth(), 0);
                        }
                        if (boxParent.isPhysicalHeightAuto()) {
                            // TODO
                        }
                        break;
                }

                YWLayoutBox bx;
                float oldLogicalX = 0;
                float oldLogicalY = bfc.getNaturalPos();
                if (!ifc.getLineBoxes().isEmpty()) {
                    oldLogicalX = ifc.getCurrentLineBox().getNaturalPos();
                }

                switch (styleDisplay.getInnerMode()) {
                    case FLOW: {
                        // ==================================================================
                        // "flow" mode (block, inline, run-in, list-item, inline list-item display
                        // modes)
                        // ==================================================================

                        // https://www.w3.org/TR/css-display-3/#valdef-display-flow

                        boolean shouldMakeInlineBox = false;
                        if (styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.INLINE
                        /* TODO: || styleDisplay.getOuterMode() == YWCSSDisplay.OuterMode.RUN_IN */) {
                            switch (parentFctx) {
                                case YWFormattingContext.Block _:
                                case YWFormattingContext.Inline _:
                                    shouldMakeInlineBox = true;
                                    break;
                                default:
                                    shouldMakeInlineBox = false;
                                    break;
                            }
                        }
                        if (shouldMakeInlineBox) {
                            YWLayoutBox ibox = new YWLayoutBox.Inline(
                                    graphics, parentBcon, elem, boxRect, margin, padding,
                                    physWidthAuto, physHeightAuto, elem.getChildren().toArray(new YWNode[0]),
                                    textDecors);
                            bx = ibox;
                        } else {
                            bfc.incrementNaturalPos(margin.getTop() + padding.getTop()); // Consume top margin+padding
                                                                                         // first
                            YWLayoutBox.BlockContainer bcon = new YWLayoutBox.BlockContainer(
                                    graphics, parentFctx, ifc, boxParent, parentBcon, elem, boxRect, margin, padding,
                                    physWidthAuto, physHeightAuto, false, elem.getChildren().toArray(new YWNode[0]),
                                    textDecors, writingMode);
                            bfc.incrementNaturalPos(margin.getBottom() + padding.getBottom()); // Consume bottom
                                                                                               // margin+padding
                            bx = bcon;
                        }
                        break;
                    }
                    case FLOW_ROOT:
                        // ==================================================================
                        // "flow-root" mode (flow-root, inline-block display modes)
                        // ==================================================================
                        // https://www.w3.org/TR/css-display-3/#valdef-display-flow-root
                        YWLayoutBox.BlockContainer bcon = new YWLayoutBox.BlockContainer(
                                graphics, parentFctx, ifc, boxParent, parentBcon, elem, boxRect, margin, padding,
                                physWidthAuto, physHeightAuto, true, elem.getChildren().toArray(new YWNode[0]),
                                textDecors, writingMode);
                        bx = bcon;
                        break;
                    default:
                        throw new UnsupportedOperationException("Support display: " + styleDisplay);
                }
                float newLogicalY = bfc.getNaturalPos();
                float newLogicalX = 0;
                if (!ifc.getLineBoxes().isEmpty()) {
                    newLogicalX = ifc.getCurrentLineBox().getNaturalPos();
                }

                switch (styleFloat) {
                    case NONE:
                        if (bx instanceof YWLayoutBox.BlockContainer bcon) {
                            // Increment natural position (but only the amount that hasn't been incremented)
                            switch (styleDisplay.getOuterMode()) {
                                case BLOCK: {
                                    float logicalHeight = bcon.getMarginRect().toLogical(writingMode).getHeight();
                                    float posDiff = newLogicalY - oldLogicalY;
                                    bfc.incrementNaturalPos(logicalHeight - posDiff);
                                    break;
                                }
                                case INLINE: {
                                    float logicalWidth = bcon.getMarginRect().toLogical(writingMode).getWidth();
                                    float posDiff = newLogicalX - oldLogicalX;
                                    if (ifc.getLineBoxes().isEmpty()) {
                                        ifc.addLineBox(0);
                                    }
                                    ifc.incrementNaturalPos(logicalWidth - posDiff);

                                    YWFormattingContext.LineBox lb = ifc.getCurrentLineBox();
                                    float heightDiff = bcon.getMarginRect().getHeight()
                                            - lb.getLineHeight();
                                    lb.setLineHeight(Math.max(lb.getLineHeight(), bcon.getMarginRect().getHeight()));
                                    if (boxParent.isPhysicalHeightAuto()) {
                                        boxParent.incrementSize(0, heightDiff);
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                    case LEFT:
                        bfc.getLeftFloatingBoxes().add(bx);
                        break;
                    case RIGHT:
                        bfc.getRightFloatingBoxes().add(bx);
                }
                return bx;
            }
        }
        throw new UnsupportedOperationException("Unsupported display mode" + styleDisplay);
    }

    static Object[] layoutNode(
            Graphics graphics,
            YWFormattingContext parentFctx,
            YWFormattingContext.Block bfc,
            YWFormattingContext.Inline ifc,
            YWLayoutText.DecorationOptions[] textDecors,
            YWLayoutBox boxParent,
            YWNode domNode) {
        switch (domNode) {
            case YWComment _:
                // No layout is needed for comment nodes
                return null;
            case YWText txt:
                return layoutText(graphics, txt, boxParent, bfc, ifc, textDecors);
            case YWElement elem: {
                YWLayoutBox box = layoutElement(graphics, elem, boxParent, parentFctx, bfc, ifc, textDecors);
                if (box == null) {
                    return null;
                }
                return new Object[] { elem };
            }
            default:
                throw new UnsupportedOperationException("Unsupported type of node");
        }
    }

}