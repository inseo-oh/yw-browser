package io.github.inseooh.yw.css.color;

import io.github.inseooh.ywapt.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "color", type = YWCSSColor.class)
    public static class Color {
        public static YWCSSColor getInitialValue() {
            return YWCSSColor.CANVAS_TEXT;
        }
    }
}
