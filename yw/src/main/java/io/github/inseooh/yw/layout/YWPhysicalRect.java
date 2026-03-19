package io.github.inseooh.yw.layout;

class YWPhysicalRect {
    private float x, y, width, height;

    public YWPhysicalRect(float x, float y, float width, float height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public float getX() {
        return x;
    }

    public void setX(float x) {
        this.x = x;
    }

    public float getY() {
        return y;
    }

    public void setY(float y) {
        this.y = y;
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

    public YWPhysicalRect addPadding(YWPhysicalEdges edges) {
        return new YWPhysicalRect(
                y + edges.getTop(),
                x + edges.getLeft(),
                width - edges.getHorizontalSum(),
                height - edges.getVerticalSum());
    }

    public YWLogicalRect toLogical(YWWritingMode writingMode) {
        return switch (writingMode) {
            case HORIZONTAL -> new YWLogicalRect(x, y, width, height);
            case VERTICAL -> new YWLogicalRect(y, x, height, width);
        };
    }
}
