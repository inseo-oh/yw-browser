package io.github.inseooh.yw.css.om;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.github.inseooh.yw.dom.YWDocumentOrShadowRoot;
import io.github.inseooh.yw.dom.YWNode;

public final class YWCSSStyleSheetSetManager {

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#documentorshadowroot-document-or-shadow-root-css-style-sheets">
     *      Relevant section in CSS specification</a>
     */
    private static YWCSSStyleSheet[] getDocumentOrShadowRootCSSStyleSheets() {
        throw new RuntimeException("TODO");
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#add-a-css-style-sheet">
     *      Relevant section in CSS specification</a>
     */
    public void addCSSStyleSheet(YWCSSStyleSheet sheet) {
        // S1.
        ((YWDocumentOrShadowRoot) sheet.getOwnerNode()).getStyleSheets().add(sheet);
        // S2.
        if (sheet.isDisabledFlag()) {
            return;
        }
        // S3.
        if (!sheet.getTitle().isEmpty() && !sheet.isAlternateFlag() && preferredCSSStyleSheetSetName.isEmpty()) {
            changePreferredStylesheetSetName(sheet.getTitle());
        }
        // S4.
        if ((sheet.getTitle().isEmpty()) ||
                (lastCSSStylesheetSetName == null && sheet.getTitle().equals(preferredCSSStyleSheetSetName)) ||
                (lastCSSStylesheetSetName != null && sheet.getTitle().equals(lastCSSStylesheetSetName))) {
            sheet.setDisabledFlag(false);
            return;
        }
        // S5
        sheet.setDisabledFlag(true);
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#remove-a-css-style-sheet">
     *      Relevant section in CSS specification</a>
     */
    public static void removeCSSStyleSheet(YWCSSStyleSheet sheet) {
        // S1.
        ((YWDocumentOrShadowRoot) sheet.getOwnerNode()).getStyleSheets().remove(sheet);

        // S2.
        sheet.setParentStyleSheet(null);
        sheet.setOwnerNode(null);
        sheet.setOwnerRule(null);
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#persistent-css-style-sheet">
     *      Relevant section in CSS specification</a>
     */
    public static YWCSSStyleSheet[] getPersistentCSSStylesheets() {
        List<YWCSSStyleSheet> res = new ArrayList<>();
        YWCSSStyleSheet[] sheets = getDocumentOrShadowRootCSSStyleSheets();
        for (YWCSSStyleSheet sheet : sheets) {
            String title = sheet.getTitle();
            if (!title.isEmpty() || sheet.isAlternateFlag()) {
                continue;
            }
            res.add(sheet);
        }
        return res.toArray(new YWCSSStyleSheet[0]);
    }

    @FunctionalInterface
    public interface SheetFilter {
        boolean filter(YWCSSStyleSheet sheet);
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#css-style-sheet-set">
     *      Relevant section in CSS specification</a>
     */
    public static YWCSSStyleSheetSet[] getCSSStyleSheetSets(SheetFilter filter) {
        List<YWCSSStyleSheetSet> res = new ArrayList<>();
        Map<String, YWCSSStyleSheetSet> titleMap = new HashMap<>();
        YWCSSStyleSheet[] sheets = getDocumentOrShadowRootCSSStyleSheets();
        for (YWCSSStyleSheet sheet : sheets) {
            if (filter != null && !filter.filter(sheet)) {
                continue;
            }
            String title = sheet.getTitle();
            if (title.isEmpty()) {
                continue;
            }
            YWCSSStyleSheetSet dest;
            if (titleMap.containsKey(title)) {
                dest = titleMap.get(title);
            } else {
                dest = new YWCSSStyleSheetSet();
                titleMap.put(title, dest);
                res.add(dest);
            }
            dest.list().add(sheet);
        }
        return res.toArray(new YWCSSStyleSheetSet[0]);
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#css-style-sheet-set">
     *      Relevant section in CSS specification</a>
     */
    public static YWCSSStyleSheetSet[] getCSSStyleSheetSets() {
        return getCSSStyleSheetSets(null);
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#enabled-css-style-sheet-set">
     *      Relevant section in CSS specification</a>
     */
    public static YWCSSStyleSheetSet[] getEnabledCSSStyleSheetSets() {
        return getCSSStyleSheetSets(sheet -> !sheet.isDisabledFlag());
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#enable-a-css-style-sheet-set">
     *      Relevant section in CSS specification</a>
     */
    public void enableCSSStyleSheetSet(String name) {
        for (YWCSSStyleSheetSet set : getCSSStyleSheetSets()) {
            for (YWCSSStyleSheet sheet : set.list()) {
                sheet.setDisabledFlag(true);
            }
        }
        if (name.isEmpty()) {
            return;
        }
        for (YWCSSStyleSheetSet set : getCSSStyleSheetSets()) {
            for (YWCSSStyleSheet sheet : set.list()) {
                sheet.setDisabledFlag(!set.name().equals(name));
            }
        }
    }

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#last-css-style-sheet-set-name">
     *      Relevant section in CSS specification</a>
     */
    private String lastCSSStylesheetSetName = null;

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#preferred-css-style-sheet-set-name">
     *      Relevant section in CSS specification</a>
     */
    private String preferredCSSStyleSheetSetName = "";

    /**
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#change-the-preferred-css-style-sheet-set-name">
     *      Relevant section in CSS specification</a>
     */
    public void changePreferredStylesheetSetName(String name) {
        String current = preferredCSSStyleSheetSetName;
        preferredCSSStyleSheetSetName = name;
        if (!name.equals(current) && lastCSSStylesheetSetName == null) {
            enableCSSStyleSheetSet(name);
        }
    }

    /**
     * @return A style sheet, or null if not associated.
     * @see <a href=
     *      "https://www.w3.org/TR/2021/WD-cssom-1-20210826/#associated-css-style-sheet">
     *      Relevant section in CSS specification</a>
     */
    public static YWCSSStyleSheet getAssociatedCSSStyleSheet(YWNode node) {
        for (YWCSSStyleSheet sheet : getDocumentOrShadowRootCSSStyleSheets()) {
            if (sheet.getOwnerNode() == node) {
                return sheet;
            }
        }
        return null;
    }

}
