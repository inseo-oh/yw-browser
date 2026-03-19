package io.github.inseooh.yw.layout;

class YWLogicalRect {
    private float x, y, width, height;

    public YWLogicalRect(float x, float y, float width, float height) {
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

    public YWPhysicalRect toPhysical(YWWritingMode writingMode) {
        return switch (writingMode) {
            case HORIZONTAL -> new YWPhysicalRect(x, y, width, height);
            case VERTICAL -> new YWPhysicalRect(y, x, height, width);
        };
    }
}
