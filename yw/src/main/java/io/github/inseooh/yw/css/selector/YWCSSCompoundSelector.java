package io.github.inseooh.yw.css.selector;

import io.github.inseooh.yw.dom.YWElement;

public class YWCSSCompoundSelector {
	private final YWCSSSimpleSelector typeSelector; // May be null
	private final YWCSSSimpleSelector[] subclassSelectors;

	public YWCSSCompoundSelector(YWCSSSimpleSelector typeSelector, YWCSSSimpleSelector[] subclassSelectors) {
		this.typeSelector = typeSelector;
		this.subclassSelectors = subclassSelectors;
	}

	public YWCSSSimpleSelector getTypeSelector() {
		return typeSelector;
	}

	public YWCSSSimpleSelector[] getSubclassSelectors() {
		return subclassSelectors;
	}

	public boolean matchAgainst(YWElement element) {
		if (typeSelector != null && !typeSelector.matchAgainst(element)) {
			return false;
		}
		for (YWCSSSimpleSelector ss : subclassSelectors) {
			if (!ss.matchAgainst(element)) {
				return false;
			}
		}
		return true;
	}

}
