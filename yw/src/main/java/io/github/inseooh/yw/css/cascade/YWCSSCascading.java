package io.github.inseooh.yw.css.cascade;

import io.github.inseooh.yw.css.om.YWCSSStyleDeclaration;
import io.github.inseooh.yw.css.om.YWCSSStyleSheet;
import io.github.inseooh.yw.css.selector.YWCSSComplexSelector;
import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.dom.YWNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.github.inseooh.yw.css.YWCSSPresentationalHint;
import io.github.inseooh.yw.css.YWCSSPropertySet;
import io.github.inseooh.yw.css.YWCSSUnfinalizedPropertySet;
import io.github.inseooh.yw.css.om.YWCSSRule;

public final class YWCSSCascading {
    private final static int PRIORITY_TRANSITION = 0; // Highest priority
    private final static int PRIORITY_IMPORTANT_USER_AGENT = 1;
    private final static int PRIORITY_IMPORTANT_USER = 2;
    private final static int PRIORITY_IMPORTANT_AUTHOR = 3;
    private final static int PRIORITY_ANIMATION = 4;
    private final static int PRIORITY_NORMAL_AUTHOR = 5;
    private final static int PRIORITY_NORMAL_USER = 6;
    private final static int PRIORITY_NORMAL_USER_AGENT = 7; // Lowest priority

    private static record DeclarationEntry(YWCSSRule.StyleRule rule, YWCSSStyleDeclaration declaration) {
    }

    private static final class PropertySetFinalizer {
        private final Map<YWElement, YWCSSUnfinalizedPropertySet> input;
        private final Map<YWElement, YWCSSPropertySet> output = new HashMap<>();

        public PropertySetFinalizer(Map<YWElement, YWCSSUnfinalizedPropertySet> input) {
            this.input = input;
        }

        private YWCSSPropertySet finalizeForElement(YWElement element) {
            YWCSSPropertySet propertySet = output.get(element);
            if (propertySet != null) {
                return propertySet;
            }
            YWCSSPropertySet parentPropertySet = element.getParent() != null
                    && element.getParent() instanceof YWElement parentElement
                            ? finalizeForElement(parentElement)
                            : null;
            YWCSSPropertySet result = input.get(element).finalizeProperties(parentPropertySet);
            output.put(element, result);
            return result;
        }

        public void run() {
            for (YWElement entry : input.keySet()) {
                finalizeForElement(entry);
            }
        }
    };

    public static void run(YWCSSStyleSheet uaStyleSheet, YWNode rootNode) {
        List<List<DeclarationEntry>> declGroups = new ArrayList<>();
        // Higher priority first, lower priority last
        declGroups.add(new ArrayList<>()); // Transition declarations
        declGroups.add(new ArrayList<>()); // Important user agent declarations
        declGroups.add(new ArrayList<>()); // Important user declarations
        declGroups.add(new ArrayList<>()); // Important author declarations
        declGroups.add(new ArrayList<>()); // Animation declarations
        declGroups.add(new ArrayList<>()); // Normal author declarations
        declGroups.add(new ArrayList<>()); // Normal user declarations
        declGroups.add(new ArrayList<>()); // Normal user agent declarations

        List<YWElement> elems = new ArrayList<>();

        for (YWNode node : rootNode.getInclusiveDescendants()) {
            if (node instanceof YWElement elem) {
                elems.add(elem);
            }
        }

        // User agent declarations -----------------------------------------------------
        for (YWCSSRule rule : uaStyleSheet.getStyleRules()) {
            if (!(rule instanceof YWCSSRule.StyleRule styleRule)) {
                continue;
            }
            for (YWCSSStyleDeclaration decl : styleRule.getDeclarations()) {
                if (decl.isImportant()) {
                    declGroups.get(PRIORITY_IMPORTANT_USER_AGENT).add(new DeclarationEntry(styleRule, decl));
                } else {
                    declGroups.get(PRIORITY_NORMAL_USER_AGENT).add(new DeclarationEntry(styleRule, decl));
                }
            }
        }

        // Author declarations ---------------------------------------------------------
        for (YWCSSStyleSheet sheet : rootNode.getStyleSheets()) {
            for (YWCSSRule rule : sheet.getStyleRules()) {
                if (!(rule instanceof YWCSSRule.StyleRule styleRule)) {
                    continue;
                }
                for (YWCSSStyleDeclaration decl : styleRule.getDeclarations()) {
                    if (decl.isImportant()) {
                        declGroups.get(PRIORITY_IMPORTANT_AUTHOR).add(new DeclarationEntry(styleRule, decl));
                    } else {
                        declGroups.get(PRIORITY_NORMAL_AUTHOR).add(new DeclarationEntry(styleRule, decl));
                    }
                }
            }
        }

        // Presentational hints --------------------------------------------------------
        for (YWElement elem : elems) {
            if (!(elem instanceof YWCSSPresentationalHint hint)) {
                continue;
            }
            for (YWCSSRule rule : hint.getPresentationalHints()) {
                if (!(rule instanceof YWCSSRule.StyleRule styleRule)) {
                    continue;
                }
                for (YWCSSStyleDeclaration decl : styleRule.getDeclarations()) {
                    if (decl.isImportant()) {
                        declGroups.get(PRIORITY_IMPORTANT_AUTHOR).add(new DeclarationEntry(styleRule, decl));
                    } else {
                        declGroups.get(PRIORITY_NORMAL_AUTHOR).add(new DeclarationEntry(styleRule, decl));
                    }
                }
            }
        }

        // Apply specificity -----------------------------------------------------------
        // TODO: Apply specificity

        // Apply collected rules -------------------------------------------------------
        Map<YWElement, YWCSSUnfinalizedPropertySet> props = new HashMap<>();
        for (int i = declGroups.size() - 1; 0 <= i; i--) {
            List<DeclarationEntry> declGroup = declGroups.get(i);

            for (DeclarationEntry declEntry : declGroup) {
                YWElement[] selectedElements = YWCSSComplexSelector.matchAgainstTree(
                        declEntry.rule.getSelectors(), rootNode);
                for (YWElement elem : selectedElements) {
                    YWCSSUnfinalizedPropertySet propertySet = props.get(elem);
                    if (propertySet == null) {
                        propertySet = new YWCSSUnfinalizedPropertySet();
                        props.put(elem, propertySet);
                    }
                    declEntry.declaration.applyStyleRules(propertySet);
                }
            }
        }

        // Finalize property set -------------------------------------------------------
        PropertySetFinalizer finalizer = new PropertySetFinalizer(props);
        finalizer.run();
        for (Map.Entry<YWElement, YWCSSPropertySet> entry : finalizer.output.entrySet()) {
            entry.getKey().setCSSPropertySet(entry.getValue());
        }
    }
}
