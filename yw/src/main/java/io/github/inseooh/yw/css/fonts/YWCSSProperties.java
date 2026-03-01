package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.ywsupport.YWCSSShorthandProperty;
import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "font-family", type = YWCSSFontFamily.FamilyList.class)
    public static class FontFamily {
        public static YWCSSFontFamily.FamilyList getInitialValue() {
            return new YWCSSFontFamily.FamilyList(new YWCSSFontFamily[] { YWCSSFontFamily.SANS_SERIF });
        }
    }

    @YWCSSSimpleProperty(name = "font-weight", type = YWCSSFontWeight.class)
    public static class FontWeight {
        public static YWCSSFontFamily.FamilyList getInitialValue() {
            return new YWCSSFontFamily.FamilyList(new YWCSSFontFamily[] { YWCSSFontFamily.SANS_SERIF });
        }
    }

    @YWCSSSimpleProperty(name = "font-stretch", type = YWCSSFontStretch.class)
    public static class FontStretch {
        public static YWCSSFontStretch getInitialValue() {
            return YWCSSFontStretch.NORMAL;
        }
    }

    @YWCSSSimpleProperty(name = "font-style", type = YWCSSFontStyle.class)
    public static class FontStyle {
        public static YWCSSFontStyle getInitialValue() {
            return YWCSSFontStyle.NORMAL;
        }
    }

    @YWCSSSimpleProperty(name = "font-size", type = YWCSSFontSize.class)
    public static class FontSize {
        public static YWCSSFontSize getInitialValue() {
            return YWCSSFontSize.Absolute.MEDIUM;
        }
    }

    @YWCSSShorthandProperty(name = "font", type = YWCSSShorthandProperty.Type.ANY, properties = {
            FontFamily.class, FontWeight.class, FontStretch.class, FontStyle.class, FontSize.class
    })
    public static class Font {
    }

}
