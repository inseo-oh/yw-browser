package io.github.inseooh.yw.layout;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

sealed class YWFormattingContext {
    private final YWLayoutBox ownerBox;

    public YWFormattingContext(YWLayoutBox ownerBox) {
        this.ownerBox = ownerBox;
    }

    public YWLayoutBox getOwnerBox() {
        return ownerBox;
    }

    public static final class Block extends YWFormattingContext {
        private static final Logger LOGGER = Logger.getLogger(Block.class.getSimpleName());

        private float naturalPos = 0;
        private final List<YWLayoutBox> leftFloatingBoxes = new ArrayList<>();
        private final List<YWLayoutBox> rightFloatingBoxes = new ArrayList<>();

        public Block(YWLayoutBox ownerBox) {
            super(ownerBox);
        }

        public float getNaturalPos() {
            return naturalPos;
        }

        public void setNaturalPos(float naturalPos) {
            this.naturalPos = naturalPos;
        }

        public void incrementNaturalPos(float naturalPos) {
            this.naturalPos += naturalPos;
            if (naturalPos < 0) {
                LOGGER.warning("warning: attempted to increment natural position with negative value " + naturalPos);
            }
        }

        public List<YWLayoutBox> getLeftFloatingBoxes() {
            return leftFloatingBoxes;
        }

        public List<YWLayoutBox> getRightFloatingBoxes() {
            return rightFloatingBoxes;
        }

        public float getLeftFloatWidth(float forPhysicalY) {
            float sum = 0;
            for (YWLayoutBox bx : leftFloatingBoxes) {
                YWPhysicalRect mRect = bx.getMarginRect();
                if (mRect.getY() <= forPhysicalY && forPhysicalY <= (mRect.getY() + mRect.getHeight())) {
                    sum += bx.getPhysicalContentWidth();
                }
            }
            return sum;
        }

        public float getRightFloatWidth(float forPhysicalY) {
            float sum = 0;
            for (YWLayoutBox bx : rightFloatingBoxes) {
                YWPhysicalRect mRect = bx.getMarginRect();
                if (mRect.getY() <= forPhysicalY && forPhysicalY <= (mRect.getY() + mRect.getHeight())) {
                    sum += bx.getPhysicalContentWidth();
                }
            }
            return sum;
        }

        public float getFloatWidth(float forPhysicalY) {
            return getLeftFloatWidth(forPhysicalY) + getRightFloatWidth(forPhysicalY);
        }
    }

    public static final class LineBox {
        private float leftOffset;
        private float availableWidth;
        private float lineHeight;
        private float naturalPos = 0;
        private final float initialLogicalY;

        public LineBox(float initialLogicalY) {
            this.initialLogicalY = initialLogicalY;
        }

        public float getLeftOffset() {
            return leftOffset;
        }

        public void setLeftOffset(float leftOffset) {
            this.leftOffset = leftOffset;
        }

        public float getAvailableWidth() {
            return availableWidth;
        }

        public void setAvailableWidth(float availableWidth) {
            this.availableWidth = availableWidth;
        }

        public float getNaturalPos() {
            return naturalPos;
        }

        public void setNaturalPos(float naturalPos) {
            this.naturalPos = naturalPos;
        }

        public float getLineHeight() {
            return lineHeight;
        }

        public void setLineHeight(float lineHeight) {
            this.lineHeight = lineHeight;
        }

        public float getInitialLogicalY() {
            return initialLogicalY;
        }
    }

    public static final class Inline extends YWFormattingContext {
        private final YWLayoutBox.BlockContainer blockContainer;
        private final List<LineBox> lineBoxes = new ArrayList<>();
        private final float initialAvailableWidth;
        private final float initialLogicalY;
        private final StringBuilder writtenText = new StringBuilder();

        public Inline(
                YWLayoutBox ownerBox, YWLayoutBox.BlockContainer blockContainer, float initialAvailableWidth,
                float initialLogicalY) {
            super(ownerBox);
            this.blockContainer = blockContainer;
            this.initialAvailableWidth = initialAvailableWidth;
            this.initialLogicalY = initialLogicalY;
        }

        public YWLayoutBox.BlockContainer getBlockContainer() {
            return blockContainer;
        }

        public List<LineBox> getLineBoxes() {
            return lineBoxes;
        }

        public float getInitialAvailableWidth() {
            return initialAvailableWidth;
        }

        public float getInitialLogicalY() {
            return initialLogicalY;
        }

        public StringBuilder getWrittenText() {
            return writtenText;
        }

        public LineBox getCurrentLineBox() {
            return lineBoxes.getLast();
        }

        public float getNaturalPos() {
            return getCurrentLineBox().naturalPos;
        }

        public void incrementNaturalPos(float naturalPos) {
            if (lineBoxes.isEmpty()) {
                throw new IllegalStateException("attempted to increment natural position without creating LineBox");
            }
            LineBox lb = getCurrentLineBox();
            if (lb.availableWidth < lb.naturalPos) {
                throw new IllegalStateException("content overflow");
            }
            lb.naturalPos += naturalPos;
        }

        public void addLineBox(float lineHeight) {
            float initialLogicalY;
            if (!lineBoxes.isEmpty()) {
                LineBox lastLb = getCurrentLineBox();
                initialLogicalY = lastLb.initialLogicalY + lastLb.lineHeight;
            } else {
                initialLogicalY = this.initialLogicalY;
            }
            LineBox lb = new LineBox(initialLogicalY);
            lb.lineHeight = lineHeight;
            lb.availableWidth = initialAvailableWidth - blockContainer.getBfc().getFloatWidth(lb.initialLogicalY);
            lb.leftOffset = blockContainer.getBfc().getLeftFloatWidth(lb.initialLogicalY);
            lineBoxes.add(lb);
        }
    }
}
