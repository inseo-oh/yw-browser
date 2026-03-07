package io.github.inseooh.yw.css.om;

import io.github.inseooh.yw.css.YWCSSPropertyDescriptor;
import io.github.inseooh.yw.css.YWCSSPropertySet;
import io.github.inseooh.yw.css.YWCSSUnfinalizedPropertySet;

public record YWCSSStyleDeclaration(String name, Object value, boolean isImportant) {
    public void applyStyleRules(YWCSSUnfinalizedPropertySet propertySet) {
        YWCSSPropertyDescriptor desc = YWCSSPropertySet.DESCRIPTORS.get(name);
        desc.apply(propertySet, value);
    }
}
