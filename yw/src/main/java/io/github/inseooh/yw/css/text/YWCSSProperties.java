package io.github.inseooh.yw.css.text;

import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "text-transform", type = YWCSSTextTransform.class)
    public static class TextTransform {
        public static YWCSSTextTransform getInitialValue() {
            return YWCSSTextTransform.NONE;
        }
    }
}
