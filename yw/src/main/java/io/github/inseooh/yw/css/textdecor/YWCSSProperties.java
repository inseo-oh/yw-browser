package io.github.inseooh.yw.css.textdecor;

import io.github.inseooh.yw.css.color.YWCSSColor;
import io.github.inseooh.ywsupport.YWCSSShorthandProperty;
import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "text-decoration-line", type = YWCSSTextDecorationLine.class)
    public static class TextDecorationLine {
        public static YWCSSTextDecorationLine getInitialValue() {
            return new YWCSSTextDecorationLine();
        }
    }

    @YWCSSSimpleProperty(name = "text-decoration-style", type = YWCSSTextDecorationStyle.class)
    public static class TextDecorationStyle {
        public static YWCSSTextDecorationStyle getInitialValue() {
            return YWCSSTextDecorationStyle.SOLID;
        }
    }

    @YWCSSSimpleProperty(name = "text-decoration-color", type = YWCSSColor.class)
    public static class TextDecorationColor {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CURRENT_COLOR;
        }
    }

    @YWCSSShorthandProperty(name = "text-decoration", type = YWCSSShorthandProperty.Type.ANY, properties = {
            TextDecorationLine.class, TextDecorationStyle.class, TextDecorationColor.class,
    })
    public static class TextDecoration {
    }
}
