package io.github.inseooh.yw.css.selector;

import io.github.inseooh.yw.dom.YWNode;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.dom.YWElement;

public class YWCSSComplexSelector {
	private final YWCSSCompoundSelector base;
	private final Rest[] rests;

	public static class Rest {
		private final YWCSSCompoundSelector selector;
		private final Combinator combinator;

		public Rest(YWCSSCompoundSelector selector, Combinator combinator) {
			this.selector = selector;
			this.combinator = combinator;
		}

		public YWCSSCompoundSelector getSelector() {
			return selector;
		}

		public Combinator getCombinator() {
			return combinator;
		}
	};

	public enum Combinator {
		CHILD_COMBINATOR, // A B
		DIRECT_CHILD_COMBINATOR, // A + B
	}

	public YWCSSComplexSelector(YWCSSCompoundSelector base, Rest[] rests) {
		this.base = base;
		this.rests = rests;
	}

	public YWCSSCompoundSelector getBase() {
		return base;
	}

	public Rest[] getRests() {
		return rests;
	}

	public boolean matchAgainst(YWElement element) {
		for (int i = rests.length - 1; 0 <= i; i--) {
			YWCSSCompoundSelector prevSel = (i != 0) ? rests[i - 1].selector : base;
			YWCSSCompoundSelector currentSel = rests[i].selector;

			if (!currentSel.matchAgainst(element)) {
				return false;
			}

			switch (rests[i].combinator) {
			case CHILD_COMBINATOR: {
				// A B
				YWNode currElem = element;
				boolean found = false;
				while (currElem != null) {
					if (!(currElem instanceof YWElement)) {
						break;
					}
					if (prevSel.matchAgainst((YWElement) currElem)) {
						found = true;
						break;
					}
					currElem = currElem.getParent();
				}
				return found;
			}
			case DIRECT_CHILD_COMBINATOR: {
				// A > B
				if (element.getParent() == null || !(element.getParent() instanceof YWElement)
						|| !prevSel.matchAgainst((YWElement) element.getParent())) {
					return false;
				}
				return true;
			}
			}
		}
		throw new RuntimeException("unreachable");
	}

	public static YWCSSComplexSelector parseComplexSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		List<Rest> rests = new ArrayList<>();
		YWCSSCompoundSelector base = YWCSSCompoundSelector.parseCompoundSelector(ts);
		while (true) {
			int cursorBeforeComb = ts.getCursor();
			Combinator comb;

			ts.skipWhitespaces();
			if (ts.expectDelim('>')) {
				comb = Combinator.DIRECT_CHILD_COMBINATOR;
			} else {
				comb = Combinator.CHILD_COMBINATOR;
			}
			if (!ts.expectDelim('=')) {
				ts.setCursor(cursorBeforeComb);
				break;
			}
			// TODO: Other combinators
			ts.skipWhitespaces();

			YWCSSCompoundSelector compSel = YWCSSCompoundSelector.parseCompoundSelector(ts);
			rests.add(new Rest(compSel, comb));
		}
		return new YWCSSComplexSelector(base, rests.toArray(new Rest[0]));
	}

	public static YWCSSComplexSelector[] parseComplexSelectorList(YWCSSTokenStream ts) throws YWSyntaxError {
		return ts.parseCommaSeparatedRepeation(new YWCSSComplexSelector[0], () -> parseComplexSelector(ts));
	}
}
