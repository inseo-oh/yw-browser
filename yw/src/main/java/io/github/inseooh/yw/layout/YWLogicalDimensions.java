package io.github.inseooh.yw.layout;

class YWLogicalDimensions {
    private float width, height;

    public YWLogicalDimensions(float width, float height) {
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

    public YWPhysicalDimensions toPhysical(YWWritingMode writingMode) {
        return switch (writingMode) {
            case HORIZONTAL -> new YWPhysicalDimensions(width, height);
            case VERTICAL -> new YWPhysicalDimensions(height, width);
        };
    }
}
