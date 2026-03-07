package io.github.inseooh.yw.css.om;

import io.github.inseooh.yw.css.selector.YWCSSComplexSelector;
import io.github.inseooh.yw.css.syntax.YWCSSToken;

public sealed interface YWCSSRule {
    /**
     * @apiNote {@link YWCSSRule.AtRule#prelude} and {@link YWCSSRule.AtRule#value}
     *          are STUB.
     */
    public final class AtRule implements YWCSSRule {
        private String name;
        private YWCSSToken[] prelude;
        private YWCSSToken[] value;

        public AtRule(String name, YWCSSToken[] prelude, YWCSSToken[] value) {
            this.name = name;
            this.prelude = prelude;
            this.value = value;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public YWCSSToken[] getPrelude() {
            return prelude;
        }

        public void setPrelude(YWCSSToken[] prelude) {
            this.prelude = prelude;
        }

        public YWCSSToken[] getValue() {
            return value;
        }

        public void setValue(YWCSSToken[] value) {
            this.value = value;
        }

    }

    public final class StyleRule implements YWCSSRule {
        private YWCSSComplexSelector[] selectors;
        private YWCSSStyleDeclaration[] declarations;
        private AtRule[] atRules;

        public StyleRule(YWCSSComplexSelector[] selectors, YWCSSStyleDeclaration[] declarations, AtRule[] atRules) {
            this.selectors = selectors;
            this.declarations = declarations;
            this.atRules = atRules;
        }

        public YWCSSComplexSelector[] getSelectors() {
            return selectors;
        }

        public void setSelectors(YWCSSComplexSelector[] selectors) {
            this.selectors = selectors;
        }

        public YWCSSStyleDeclaration[] getDeclarations() {
            return declarations;
        }

        public void setDeclarations(YWCSSStyleDeclaration[] declarations) {
            this.declarations = declarations;
        }

        public AtRule[] getAtRules() {
            return atRules;
        }

        public void setAtRules(AtRule[] atRules) {
            this.atRules = atRules;
        }

    }

}
