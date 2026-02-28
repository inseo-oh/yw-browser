package io.github.inseooh.yw.css.selector;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
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
	
	public static YWCSSCompoundSelector parseCompoundSelector(YWCSSTokenStream ts) throws YWSyntaxError {
	    int oldCursor = ts.getCursor();
	    YWCSSSimpleSelector typeSel = null;
	    try {
	    	typeSel = YWCSSSimpleSelector.parseTypeSelector(ts);
	    } catch (YWSyntaxError e) {
	    	ts.setCursor(oldCursor);
	    }
	    
	    List<YWCSSSimpleSelector> subclassSels = new ArrayList<>();
	    while (true) {
	    	oldCursor = ts.getCursor();
	        try {
	         	YWCSSSimpleSelector sel = YWCSSSimpleSelector.parseSubclassSelector(ts);
		    	subclassSels.add(sel);
		    } catch (YWSyntaxError e) {
		    	ts.setCursor(oldCursor);
		    	break;
		    }
	    }
	    // TODO: pseudo elements
	    return new YWCSSCompoundSelector(typeSel, subclassSels.toArray(new YWCSSSimpleSelector[0]));
	}

}
