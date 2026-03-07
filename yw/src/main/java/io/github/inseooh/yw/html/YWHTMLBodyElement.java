package io.github.inseooh.yw.html;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.css.YWCSSPresentationalHint;
import io.github.inseooh.yw.css.color.YWCSSColor;
import io.github.inseooh.yw.css.color.YWCSSRGBColor;
import io.github.inseooh.yw.css.om.YWCSSRule;
import io.github.inseooh.yw.css.om.YWCSSStyleDeclaration;
import io.github.inseooh.yw.css.selector.YWCSSComplexSelector;
import io.github.inseooh.yw.css.selector.YWCSSSimpleSelector;
import io.github.inseooh.yw.dom.YWDocument;

public class YWHTMLBodyElement extends YWHTMLElement implements YWCSSPresentationalHint {
    public YWHTMLBodyElement(YWDocument nodeDocument, String namespace, String namespacePrefix, String is,
            String localName, Object tagToken, CustomElementState customElementState) {
        super(nodeDocument, namespace, namespacePrefix, is, localName, tagToken, customElementState);
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/rendering.html#the-page">
     *      Relevant section in HTML Specification</a>
     */
    @Override
    public YWCSSRule.StyleRule[] getPresentationalHints() {
        List<YWCSSStyleDeclaration> decls = new ArrayList<>();

        String bgColorAttr = getAttr("bgcolor");
        String textAttr = getAttr("text");
        if (bgColorAttr != null) {
            decls.add(new YWCSSStyleDeclaration("background-color", parseLegacyColor(bgColorAttr), false));
        }
        if (textAttr != null) {
            decls.add(new YWCSSStyleDeclaration("color", parseLegacyColor(textAttr), false));
        }
        YWCSSRule.StyleRule rule = new YWCSSRule.StyleRule(
                new YWCSSComplexSelector[] { new YWCSSComplexSelector(new YWCSSSimpleSelector.Reference(this)) },
                decls.toArray(new YWCSSStyleDeclaration[0]),
                new YWCSSRule.AtRule[0]);
        return new YWCSSRule.StyleRule[] {
                rule
        };
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value">
     *      Relevant section in HTML Specification</a>
     */
    private YWCSSColor parseLegacyColor(String input) {
        if (input.isEmpty()) {
            return null;
        }
        input = YWUtility.removeLeadingAndTrailingWhitespace(input);
        if (input.toLowerCase(Locale.ROOT).equals("transparent")) {
            // transparent
            return null;
        }
        YWCSSColor namedColor = YWCSSColor.NAMED_COLORS.get(input.toLowerCase(Locale.ROOT));
        if (namedColor != null) {
            // CSS named colors
            return namedColor;
        }
        if (input.length() == 4 && input.codePointAt(0) == '#') {
            // #rgb
            try {
                int red = Integer.parseInt(Character.toString(input.codePointAt(1)), 16);
                int green = Integer.parseInt(Character.toString(input.codePointAt(2)), 16);
                int blue = Integer.parseInt(Character.toString(input.codePointAt(3)), 16);
                return new YWCSSRGBColor(red, green, blue);
            } catch (NumberFormatException e) {
                return null;
            }

        }
        // Now we assume the format is #rrggbb -------------------------------------
        {
            StringBuilder inputSb = new StringBuilder();
            input.codePoints().forEach(cp -> {
                // Replace characters beyond BMP with "00"
                if (cp > 0xffff) {
                    inputSb.appendCodePoint('0');
                    inputSb.appendCodePoint('0');
                } else {
                    inputSb.appendCodePoint(cp);
                }
            });
            input = inputSb.toString();
        }

        if (128 < input.length()) {
            input = input.substring(0, 128);
        }
        if (input.codePointAt(0) == '#') {
            input = input.substring(1);
        }

        // Replace non-hex characters with '0'
        {
            StringBuilder inputSb = new StringBuilder();
            input.codePoints().forEach(cp -> {
                if (!YWUtility.isAsciiHexDigit(cp)) {
                    inputSb.appendCodePoint('0');
                } else {
                    inputSb.appendCodePoint(cp);
                }
            });
            input = inputSb.toString();
        }
        // Length must be nonzero, and multiple of 3. If not, append '0's.
        while (input.length() == 0 || input.length() % 3 != 0) {
            input += '0';
        }

        int compLen = input.length() / 3;
        String[] comps = new String[] {
                input.substring(0, compLen * 1),
                input.substring(compLen * 1, compLen * 2),
                input.substring(compLen * 2, compLen * 3),
        };
        if (compLen > 8) {
            for (int i = 0; i < 3; i++) {
                comps[i] = comps[i].substring(compLen - 8);
            }
            compLen = 8;
        }
        while (compLen > 2) {
            for (int i = 0; i < 3; i++) {
                if (comps[i].codePointAt(0) == '0') {
                    comps[i] = comps[i].substring(1);
                }
            }
            compLen--;
        }
        if (compLen > 2) {
            for (int i = 0; i < 3; i++) {
                comps[i] = comps[i].substring(0, 2);
            }
            compLen = 2;
        }
        int red = Integer.parseInt(comps[0], 16);
        int green = Integer.parseInt(comps[1], 16);
        int blue = Integer.parseInt(comps[2], 16);
        return new YWCSSRGBColor(red, green, blue);
    }

}
