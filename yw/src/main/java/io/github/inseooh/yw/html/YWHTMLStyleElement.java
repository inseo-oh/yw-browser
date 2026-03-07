package io.github.inseooh.yw.html;

import java.util.Locale;

import io.github.inseooh.yw.css.om.YWCSSStyleSheet;
import io.github.inseooh.yw.css.om.YWCSSStyleSheetSetManager;
import io.github.inseooh.yw.css.syntax.YWCSSParser;
import io.github.inseooh.yw.dom.YWDocument;

public class YWHTMLStyleElement extends YWHTMLElement {
    public YWHTMLStyleElement(YWDocument nodeDocument, String namespace, String namespacePrefix, String is,
            String localName, Object tagToken, CustomElementState customElementState) {
        super(nodeDocument, namespace, namespacePrefix, is, localName, tagToken, customElementState);
    }

    @Override
    public void poppedFromStackOfOpenElements() {
        super.poppedFromStackOfOpenElements();
        updateStyleBlock();
    }

    @Override
    public void runChildrenChangedSteps() {
        super.runChildrenChangedSteps();
        updateStyleBlock();
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/semantics.html#update-a-style-block">
     *      Relevant section in HTML specification</a>
     */
    private void updateStyleBlock() {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2025.11.13)

        // S1.
        YWHTMLStyleElement element = this;

        // S2.
        YWCSSStyleSheet assSheet = YWCSSStyleSheetSetManager.getAssociatedCSSStyleSheet(element);
        if (assSheet != null) {
            YWCSSStyleSheetSetManager.removeCSSStyleSheet(assSheet);
        }

        // S3.
        if (!element.isConnected()) {
            return;
        }

        // S4.
        String typeAttr = getAttr("type");
        if (typeAttr != null && !typeAttr.isEmpty() && !typeAttr.toLowerCase(Locale.ROOT).equals("text/css")) {
            return;
        }

        // S5.
        // TODO: If the Should element's inline behavior be blocked by Content Security
        // Policy? algorithm returns "Blocked" when executed upon the style element,
        // "style", and the style element's child text content, then return. [CSP]

        // S6.
        String text = element.getChildTextContent();
        YWCSSStyleSheet sheet = YWCSSParser.parseCSSStyleSheet(YWCSSParser.newStyleSheetInput(text), null);
        sheet.setType("text/css");
        sheet.setOwnerNode(element);
        if (getAttr("media") != null) {
            // TODO: Set media of the sheet based on media attribute
            throw new RuntimeException("TODO");
        }
        if (getAttr("title") != null) {
            sheet.setTitle(getAttr("title"));
        } else {
            sheet.setTitle(getAttr(""));
        }
        sheet.setAlternateFlag(false);
        sheet.setOriginCleanFlag(true);
        sheet.setLocation(null);
        sheet.setParentStyleSheet(null);
        sheet.setOwnerCSSRule(null);

        // S7.
        if (element.contributesScriptBlockingStylesheet()) {
            // TODO: append element to its node document's script-blocking style sheet set.
            throw new RuntimeException("TODO");
        }

        // S8.
        // TODO: If element's media attribute's value matches the environment and
        // element is potentially render-blocking, then block rendering on element.

        // TODO: Specs has extra steps after critical subresources has been loaded, but
        // they don't seem *that* important right now
        // (Mostly related to render blocking)

    }
}
