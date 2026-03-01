package io.github.inseooh.yw.css.box;

import io.github.inseooh.yw.css.color.YWCSSColor;
import io.github.inseooh.yw.css.values.YWCSSLength;
import io.github.inseooh.ywapt.YWCSSShorthandProperty;
import io.github.inseooh.ywapt.YWCSSSimpleProperty;

public class YWCSSProperties {
    // margin ==================================================================

    @YWCSSSimpleProperty(name = "margin-top", type = YWCSSMargin.class)
    public static class MarginTop {
        public static YWCSSMargin getInitialValue() {
            return new YWCSSMargin(new YWCSSLength(0, YWCSSLength.Unit.PX));
        }
    }

    @YWCSSSimpleProperty(name = "margin-right", type = YWCSSColor.class)
    public static class MarginRight {
        public static YWCSSMargin getInitialValue() {
            return new YWCSSMargin(new YWCSSLength(0, YWCSSLength.Unit.PX));
        }
    }

    @YWCSSSimpleProperty(name = "margin-bottom", type = YWCSSColor.class)
    public static class MarginBottom {
        public static YWCSSMargin getInitialValue() {
            return new YWCSSMargin(new YWCSSLength(0, YWCSSLength.Unit.PX));
        }
    }

    @YWCSSSimpleProperty(name = "margin-left", type = YWCSSColor.class)
    public static class MarginLeft {
        public static YWCSSMargin getInitialValue() {
            return new YWCSSMargin(new YWCSSLength(0, YWCSSLength.Unit.PX));
        }
    }

    @YWCSSShorthandProperty(name = "margin", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            MarginTop.class, MarginRight.class, MarginBottom.class, MarginLeft.class
    })
    public static class Margin {
    }

    // padding =================================================================

    @YWCSSSimpleProperty(name = "padding-top", type = YWCSSPadding.class)
    public static class PaddingTop {
        public static YWCSSLength getInitialValue() {
            return new YWCSSLength(0, YWCSSLength.Unit.PX);
        }
    }

    @YWCSSSimpleProperty(name = "padding-right", type = YWCSSColor.class)
    public static class PaddingRight {
        public static YWCSSLength getInitialValue() {
            return new YWCSSLength(0, YWCSSLength.Unit.PX);
        }
    }

    @YWCSSSimpleProperty(name = "padding-bottom", type = YWCSSColor.class)
    public static class PaddingBottom {
        public static YWCSSLength getInitialValue() {
            return new YWCSSLength(0, YWCSSLength.Unit.PX);
        }
    }

    @YWCSSSimpleProperty(name = "padding-left", type = YWCSSColor.class)
    public static class PaddingLeft {
        public static YWCSSLength getInitialValue() {
            return new YWCSSLength(0, YWCSSLength.Unit.PX);
        }
    }

    @YWCSSShorthandProperty(name = "padding", type = YWCSSShorthandProperty.Type.SIDES, properties = {
            PaddingTop.class, PaddingRight.class, PaddingBottom.class, PaddingLeft.class
    })
    public static class Padding {
    }
}
