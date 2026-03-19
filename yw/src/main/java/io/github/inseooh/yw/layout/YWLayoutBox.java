package io.github.inseooh.yw.layout;

import java.awt.Graphics;
import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.css.display.YWCSSDisplay;
import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.dom.YWNode;

sealed abstract class YWLayoutBox {
    private final YWLayoutBox parent;
    private final YWElement element;
    private final YWPhysicalRect marginRect;
    private final YWPhysicalEdges margin;
    private final YWPhysicalEdges padding;
    private final boolean physicalWidthAuto;
    private final boolean physicalHeightAuto;
    private final List<YWLayoutBox> childBoxes = new ArrayList<>();
    private final List<YWLayoutText> childTexts = new ArrayList<>();

    public YWLayoutBox(
            YWLayoutBox parent, YWElement element, YWPhysicalRect marginRect, YWPhysicalEdges margin,
            YWPhysicalEdges padding, boolean physicalWidthAuto, boolean physicalHeightAuto) {
        this.parent = parent;
        this.element = element;
        this.marginRect = marginRect;
        this.margin = margin;
        this.padding = padding;
        this.physicalWidthAuto = physicalWidthAuto;
        this.physicalHeightAuto = physicalHeightAuto;
    }

    public static final class BlockContainer extends YWLayoutBox {
        private final YWFormattingContext.Block bfc;
        private final YWFormattingContext.Inline ifc;
        private final YWFormattingContext parentFctx;
        private final YWLayoutBox.BlockContainer parentBcon;
        private final boolean isInlineFlowRoot;
        private boolean ownsBfc = false;
        private boolean ownsIfc = false;
        private boolean isAnonymous = false;
        private float accumulatedMarginLeft = 0;
        private float accumulatedPaddingLeft = 0;
        private float accumulatedMarginRight = 0;
        private float accumulatedPaddingRight = 0;

        public BlockContainer(
                Graphics graphics,
                YWFormattingContext parentFctx,
                YWFormattingContext.Inline ifc,
                YWLayoutBox parentBox,
                YWLayoutBox.BlockContainer parentBcon,
                YWElement element,
                YWPhysicalRect marginRect,
                YWPhysicalEdges margin, YWPhysicalEdges padding,
                boolean physicalWidthAuto, boolean physicalHeightAuto,
                boolean isInlineFlowRoot,
                YWNode[] children, YWLayoutText.DecorationOptions[] textDecors,
                YWWritingMode writingMode) {
            super(parentBox, element, marginRect, margin, padding, physicalWidthAuto, physicalHeightAuto);
            YWFormattingContext.Block bfc;

            // ICBs don't have any formatting context yet -- we have to create one.
            if (parentFctx == null) {
                bfc = new YWFormattingContext.Block(this);
                parentFctx = bfc;
            }
            // ICBs don't have any IFC yet -- we have to create one.
            if (ifc == null) {
                ifc = new YWFormattingContext.Inline(this, this, marginRect.toLogical(writingMode).getWidth(), 0);
            }

            if (parentBcon != null) {
                accumulatedMarginLeft = parentBcon.getAccumulatedMarginLeft() + margin.getLeft();
                accumulatedMarginRight = parentBcon.getAccumulatedMarginRight() + margin.getRight();
                accumulatedPaddingLeft = parentBcon.getAccumulatedPaddingLeft() + padding.getLeft();
                accumulatedPaddingRight = parentBcon.getAccumulatedPaddingRight() + padding.getRight();
            }
            if (!(parentFctx instanceof YWFormattingContext.Block parentBfc) || isInlineFlowRoot) {
                bfc = new YWFormattingContext.Block(this);
                ownsBfc = true;
            } else {
                bfc = parentBfc;
            }

            // Check each children's display type.
            boolean hasInline = false;
            boolean hasBlock = false;
            boolean[] isInline = new boolean[children.length];
            for (int i = 0; i < children.length; i++) {
                YWNode childNode = children[i];
                boolean isBlockLevel = YWTreeBuilder.isElementBlockLevel(parentFctx, childNode);
                isInline[i] = false;
                if (isBlockLevel) {
                    hasBlock = true;
                } else {
                    hasInline = true;
                    isInline[i] = true;
                }
            }

            // If we have both inline and block-level, we need anonymous block container for
            // inline nodes.
            // (This is actually part of CSS spec)
            boolean needAnonymousBlockContainer = hasInline && hasBlock;

            if (hasInline && !hasBlock) {
                // ======================================================================
                // We only have inline contents
                // ======================================================================

                // Calculate current initial available width ---------------------------
                float currrentInitialAvailableWidth;
                if (!ifc.getLineBoxes().isEmpty()) {
                    currrentInitialAvailableWidth = ifc.getCurrentLineBox().getAvailableWidth();
                } else {
                    currrentInitialAvailableWidth = ifc.getInitialAvailableWidth();
                }
                // Initialize new IFC --------------------------------------------------
                float initialAvailableWidth;
                // If display mode is inline flow-root, and width is auto, we inherit initial
                // available width from parent.
                if (isInlineFlowRoot && isPhysicalWidthAuto()) {
                    initialAvailableWidth = currrentInitialAvailableWidth;
                } else {
                    initialAvailableWidth = marginRect.toLogical(writingMode).getWidth();
                }
                ownsIfc = true;
                // Calculate common margin-top -----------------------------------------
                float commonMarginTop = 0;
                float commonMarginBottom = 0;
                for (YWNode childNode : children) {
                    YWPhysicalEdges childMargin;
                    if (!(childNode instanceof YWElement childElem)) {
                        continue;
                    }
                    YWCSSDisplay styleDisplay = childElem.getCSSPropertySet().getDisplay();
                    if ((styleDisplay.getOuterMode() != YWCSSDisplay.OuterMode.INLINE
                            || styleDisplay.getInnerMode() == YWCSSDisplay.InnerMode.FLOW_ROOT)) {
                        childMargin = YWTreeBuilder.elementMargin(element, this);
                        commonMarginTop = Math.max(commonMarginTop, childMargin.getTop());
                        commonMarginBottom = Math.max(commonMarginBottom, childMargin.getBottom());
                    }
                }
                // Create root inline box ----------------------------------------------
                bfc.incrementNaturalPos(commonMarginTop);
                float initialLogicalY = bfc.getOwnerBox().getContentRect().toLogical(writingMode).getY()
                        + bfc.getNaturalPos();
                ifc = new YWFormattingContext.Inline(this, this, initialAvailableWidth, initialLogicalY);
                YWLayoutBox.Inline ibox = new YWLayoutBox.Inline(
                        graphics, this, null, getContentRect(),
                        new YWPhysicalEdges(0, 0, 0, 0), new YWPhysicalEdges(0, 0, 0, 0), false, true, children,
                        textDecors);
                bfc.incrementNaturalPos(commonMarginBottom);
                getChildBoxes().add(ibox);
                incrementSize(0, commonMarginTop + commonMarginBottom);
            } else {
                // ======================================================================
                // We have either only block contents, or mix of inline and block contents.
                // (In the latter case, we create anonymous block container, so we end up having
                // only block contents)
                // ======================================================================

                List<YWNode> anonChildren = new ArrayList<>();
                for (int i = 0; i < children.length; i++) {
                    YWNode childNode = children[i];
                    Object[] boxes = null;
                    if (isInline[i] && needAnonymousBlockContainer) {
                        anonChildren.add(childNode);
                        if (i == children.length - 1 || !isInline[i + 1]) {
                            // Create anonymous block container
                            YWLogicalPoint logicalPoint = YWTreeBuilder.computeNextPosition(bfc, ifc, this, true);
                            YWLogicalRect boxRect = new YWLogicalRect(logicalPoint.getX(), logicalPoint.getY(),
                                    marginRect.toLogical(writingMode).getWidth(), 0);
                            YWLayoutBox.BlockContainer anonBcon = new YWLayoutBox.BlockContainer(graphics, parentFctx,
                                    ifc, this, this,
                                    (YWElement) null, boxRect.toPhysical(writingMode), new YWPhysicalEdges(0, 0, 0, 0),
                                    new YWPhysicalEdges(0, 0, 0, 0), false, true, false,
                                    anonChildren.toArray(new YWNode[0]), textDecors, writingMode);
                            anonBcon.isAnonymous = true;
                            bfc.incrementNaturalPos(anonBcon.getMarginRect().toLogical(writingMode).getHeight());
                            anonChildren.clear();
                            boxes = new Object[] { anonBcon };
                        }

                    } else {
                        // Create layout node normally
                        boxes = YWTreeBuilder.layoutNode(graphics, parentFctx, bfc, ifc, textDecors, this, childNode);
                    }
                    if (boxes == null || boxes.length == 0) {
                        continue;
                    }
                    for (Object bx : boxes) {
                        // NOTE: We should only have boxes at this point
                        getChildBoxes().add((YWLayoutBox) bx);
                    }
                }
            }

            this.bfc = bfc;
            this.ifc = ifc;
            this.parentBcon = parentBcon;
            this.parentFctx = parentFctx;
            this.isInlineFlowRoot = isInlineFlowRoot;
        }

        public YWFormattingContext.Block getBfc() {
            return bfc;
        }

        public YWFormattingContext.Inline getIfc() {
            return ifc;
        }

        public YWFormattingContext getParentFctx() {
            return parentFctx;
        }

        public YWLayoutBox.BlockContainer getParentBcon() {
            return parentBcon;
        }

        public boolean isOwnsBfc() {
            return ownsBfc;
        }

        public void setOwnsBfc(boolean ownsBfc) {
            this.ownsBfc = ownsBfc;
        }

        public boolean isOwnsIfc() {
            return ownsIfc;
        }

        public void setOwnsIfc(boolean ownsIfc) {
            this.ownsIfc = ownsIfc;
        }

        public boolean isAnonymous() {
            return isAnonymous;
        }

        public boolean isInlineFlowRoot() {
            return isInlineFlowRoot;
        }

        public float getAccumulatedMarginLeft() {
            return accumulatedMarginLeft;
        }

        public void setAccumulatedMarginLeft(float accumulatedMarginLeft) {
            this.accumulatedMarginLeft = accumulatedMarginLeft;
        }

        public float getAccumulatedPaddingLeft() {
            return accumulatedPaddingLeft;
        }

        public void setAccumulatedPaddingLeft(float accumulatedPaddingLeft) {
            this.accumulatedPaddingLeft = accumulatedPaddingLeft;
        }

        public float getAccumulatedMarginRight() {
            return accumulatedMarginRight;
        }

        public void setAccumulatedMarginRight(float accumulatedMarginRight) {
            this.accumulatedMarginRight = accumulatedMarginRight;
        }

        public float getAccumulatedPaddingRight() {
            return accumulatedPaddingRight;
        }

        public void setAccumulatedPaddingRight(float accumulatedPaddingRight) {
            this.accumulatedPaddingRight = accumulatedPaddingRight;
        }

    }

    public static final class Inline extends YWLayoutBox {
        private final YWLayoutBox.BlockContainer parentBcon;

        public Inline(
                Graphics graphics,
                YWLayoutBox.BlockContainer parentBcon,
                YWElement element,
                YWPhysicalRect marginRect,
                YWPhysicalEdges margin, YWPhysicalEdges padding,
                boolean physicalWidthAuto, boolean physicalHeightAuto,
                YWNode[] children, YWLayoutText.DecorationOptions[] textDecors) {
            super(parentBcon, element, marginRect, margin, padding, physicalWidthAuto, physicalHeightAuto);
            this.parentBcon = parentBcon;

            for (YWNode childNode : children) {
                Object[] layoutNodes = YWTreeBuilder.layoutNode(
                        graphics, parentBcon.getIfc(), parentBcon.getBfc(), parentBcon.getIfc(),
                        textDecors, this, childNode);
                if (layoutNodes.length == 0) {
                    continue;
                }
                for (Object node : layoutNodes) {
                    switch (node) {
                        case YWLayoutBox box:
                            getChildBoxes().add(box);
                            break;
                        case YWLayoutText text:
                            getChildTexts().add(text);
                            break;
                        default:
                            throw new RuntimeException("Unexpected node " + node);
                    }
                }
            }
        }

    }

    public YWLayoutBox getParent() {
        return parent;
    }

    public YWElement getElement() {
        return element;
    }

    public YWPhysicalRect getMarginRect() {
        return marginRect;
    }

    public YWPhysicalRect getPaddingRect() {
        return getMarginRect().addPadding(margin);
    }

    public YWPhysicalRect getContentRect() {
        return getPaddingRect().addPadding(padding);
    }

    public YWPhysicalEdges getMargin() {
        return margin;
    }

    public YWPhysicalEdges getPadding() {
        return padding;
    }

    public float getPhysicalContentWidth() {
        return getContentRect().getWidth();
    }

    public float getPhysicalContentHeight() {
        return getContentRect().getHeight();
    }

    public boolean isPhysicalWidthAuto() {
        return physicalWidthAuto;
    }

    public boolean isPhysicalHeightAuto() {
        return physicalHeightAuto;
    }

    public List<YWLayoutBox> getChildBoxes() {
        return childBoxes;
    }

    public List<YWLayoutText> getChildTexts() {
        return childTexts;
    }

    public void incrementSize(float logicalWidth, float logicalHeight) {
        if (logicalWidth == 0 && logicalHeight == 0) {
            return;
        }
        // TODO: Support vertical writing mode.
        marginRect.setWidth(logicalWidth);
        marginRect.setHeight(logicalHeight);
        YWLayoutBox parent = getParent();
        if (parent != null) {
            float w = logicalWidth;
            float h = logicalHeight;
            if (!parent.isPhysicalWidthAuto()) {
                w = 0;
            }
            if (!parent.isPhysicalHeightAuto()) {
                h = 0;
            }
            parent.incrementSize(w, h);
        }
    }

    public void incrementIfNeeded(float minLogicalWidth, float minLogicalHeight) {
        // TODO: Support vertical writing mode.
        float wDiff = Math.max(minLogicalWidth - getContentRect().getWidth(), 0);
        float hDiff = Math.max(minLogicalHeight - getContentRect().getHeight(), 0);
        incrementSize(wDiff, hDiff);
    }

    public YWElement closestElement() {
        YWLayoutBox currBox = this;
        while (currBox.element == null) {
            YWLayoutBox parent = currBox.parent;
            if (parent == null) {
                break;
            }
            currBox = parent;
        }
        return currBox.element;
    }

    public BlockContainer closestParentBlockContainer() {
        YWLayoutBox currBox = this;
        while (true) {
            if (currBox instanceof BlockContainer) {
                break;
            }
            currBox = currBox.parent;
        }
        return (BlockContainer) currBox;
    }
}
