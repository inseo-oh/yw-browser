package io.github.inseooh.yw.layout;

class YWPhysicalDimensions {
    private float width, height;

    public YWPhysicalDimensions(float width, float height) {
        this.width = width;
        this.height = height;
    }

    public float getWidth() {
        return width;
    }

    public void setWidth(float width) {
        this.width = width;
    }

    public float getHeight() {
        return height;
    }

    public void setHeight(float height) {
        this.height = height;
    }

    public YWLogicalDimensions toLogical(YWWritingMode writingMode) {
        return switch (writingMode) {
            case HORIZONTAL -> new YWLogicalDimensions(width, height);
            case VERTICAL -> new YWLogicalDimensions(height, width);
        };
    }
}
