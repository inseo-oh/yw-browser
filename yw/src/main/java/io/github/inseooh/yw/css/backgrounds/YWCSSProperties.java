package io.github.inseooh.yw.css.backgrounds;

import io.github.inseooh.yw.css.color.YWCSSColor;
import io.github.inseooh.yw.css.values.YWCSSLength;
import io.github.inseooh.ywsupport.YWCSSShorthandProperty;
import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    // background-color ========================================================
    @YWCSSSimpleProperty(name = "background-color", type = YWCSSColor.class)
    public static class BackgroundColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.TRANSPARENT;
        }
    }

    // border-color ============================================================

    @YWCSSSimpleProperty(name = "border-top-color", type = YWCSSColor.class)
    public static class BorderTopColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CURRENT_COLOR;
        }
    }

    @YWCSSSimpleProperty(name = "border-right-color", type = YWCSSColor.class)
    public static class BorderRightColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CURRENT_COLOR;
        }
    }

    @YWCSSSimpleProperty(name = "border-bottom-color", type = YWCSSColor.class)
    public static class BorderBottomColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CURRENT_COLOR;
        }
    }

    @YWCSSSimpleProperty(name = "border-left-color", type = YWCSSColor.class)
    public static class BorderLeftColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CURRENT_COLOR;
        }
    }

    @YWCSSShorthandProperty(name = "border-color", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            BorderTopColor.class, BorderRightColor.class, BorderBottomColor.class, BorderLeftColor.class
    })
    public static class BorderColor {
    }

    // border-style ============================================================

    @YWCSSSimpleProperty(name = "border-top-style", type = YWCSSLineStyle.class)
    public static class BorderTopStyle {
        public static YWCSSLineStyle getInitialValue() {
            return YWCSSLineStyle.NONE;
        }
    }

    @YWCSSSimpleProperty(name = "border-right-style", type = YWCSSLineStyle.class)
    public static class BorderRightStyle {
        public static YWCSSLineStyle getInitialValue() {
            return YWCSSLineStyle.NONE;
        }
    }

    @YWCSSSimpleProperty(name = "border-bottom-style", type = YWCSSLineStyle.class)
    public static class BorderBottomStyle {
        public static YWCSSLineStyle getInitialValue() {
            return YWCSSLineStyle.NONE;
        }
    }

    @YWCSSSimpleProperty(name = "border-left-style", type = YWCSSLineStyle.class)
    public static class BorderLeftStyle {
        public static YWCSSLineStyle getInitialValue() {
            return YWCSSLineStyle.NONE;
        }
    }

    @YWCSSShorthandProperty(name = "border-style", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            BorderTopStyle.class, BorderRightStyle.class, BorderBottomStyle.class, BorderLeftStyle.class
    })
    public static class BorderStyle {
    }

    // border-width ============================================================

    @YWCSSSimpleProperty(name = "border-top-width", type = YWCSSLength.class)
    public static class BorderTopWidth {
        public static YWCSSLength getInitialValue() {
            return YWCSSLineWidth.MEDIUM;
        }
    }

    @YWCSSSimpleProperty(name = "border-right-width", type = YWCSSLength.class)
    public static class BorderRightWidth {
        public static YWCSSLength getInitialValue() {
            return YWCSSLineWidth.MEDIUM;
        }
    }

    @YWCSSSimpleProperty(name = "border-bottom-width", type = YWCSSLength.class)
    public static class BorderBottomWidth {
        public static YWCSSLength getInitialValue() {
            return YWCSSLineWidth.MEDIUM;
        }
    }

    @YWCSSSimpleProperty(name = "border-left-width", type = YWCSSLength.class)
    public static class BorderLeftWidth {
        public static YWCSSLength getInitialValue() {
            return YWCSSLineWidth.MEDIUM;
        }
    }

    @YWCSSShorthandProperty(name = "border-width", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            BorderTopColor.class, BorderRightWidth.class, BorderBottomWidth.class, BorderLeftWidth.class
    })
    public static class BorderWidth {
    }

    // border ==================================================================

    @YWCSSShorthandProperty(name = "border-top", type = YWCSSShorthandProperty.Type.ANY, properties = {
            BorderTopWidth.class, BorderTopStyle.class, BorderTopColor.class
    })
    public static class BorderTop {
    }

    @YWCSSShorthandProperty(name = "border-right", type = YWCSSShorthandProperty.Type.ANY, properties = {
            BorderRightWidth.class, BorderRightStyle.class, BorderRightColor.class
    })
    public static class BorderRight {
    }

    @YWCSSShorthandProperty(name = "border-bottom", type = YWCSSShorthandProperty.Type.ANY, properties = {
            BorderBottomWidth.class, BorderBottomStyle.class, BorderBottomColor.class
    })
    public static class BorderBottom {
    }

    @YWCSSShorthandProperty(name = "border-left", type = YWCSSShorthandProperty.Type.ANY, properties = {
            BorderLeftWidth.class, BorderLeftStyle.class, BorderLeftColor.class
    })
    public static class BorderLeft {
    }

    @YWCSSShorthandProperty(name = "border", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            BorderTop.class, BorderRight.class, BorderBottom.class, BorderLeft.class
    })
    public static class Border {
    }
}
