package io.github.inseooh.yw.css.selector;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.dom.YWDocument;
import io.github.inseooh.yw.dom.YWElement;

public interface YWCSSSimpleSelector {
	boolean matchAgainst(YWElement element);

	static class Attribute implements YWCSSSimpleSelector {
		private final YWCSSWQName name;
		private final MatchMethod matchMethod;
		private final String value; // Not valid if match method is NAME_ONLY
		private final CaseSensitivity caseSensitivity; // Not valid if match method is NAME_ONLY

		public enum MatchMethod {
			NAME_ONLY, VALUE_EQUALS,
		}

		public enum CaseSensitivity {
			SENSITIVE, INSENSITIVE, DEFAULT_FOR_DOCUMENT_LANGUAGE
		}

		public Attribute(YWCSSWQName name, MatchMethod matchMethod, String value, CaseSensitivity caseSensitivity) {
			this.name = name;
			this.matchMethod = matchMethod;
			this.value = value;
			this.caseSensitivity = caseSensitivity;
		}

		public Attribute(YWCSSWQName name) {
			this.name = name;
			this.matchMethod = MatchMethod.NAME_ONLY;
			this.value = null;
			this.caseSensitivity = null;
		}

		public YWCSSWQName getName() {
			return name;
		}

		public MatchMethod getMatchMethod() {
			return matchMethod;
		}

		public String getValue() {
			return value;
		}

		public CaseSensitivity getCaseSensitivity() {
			return caseSensitivity;
		}

		public boolean isCaseSensitive() {
			switch (caseSensitivity) {
			case SENSITIVE:
			case DEFAULT_FOR_DOCUMENT_LANGUAGE: // STUB
				return true;
			case INSENSITIVE:
				return false;
			}
			throw new RuntimeException("bad caseSensitivity");
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			// TODO: Handle namespace
			String attrValue = element.getAttr(name.getName());
			if (attrValue == null) {
				return false;
			}
			switch (matchMethod) {
			case NAME_ONLY:
				break;
			case VALUE_EQUALS: {
				if (!isCaseSensitive()) {
					return attrValue.toLowerCase().equals(value.toLowerCase());
				}
				return attrValue.equals(value);
			}
			}
			throw new RuntimeException("bad matchMethod");
		}

	}

	static class ClassAttribute implements YWCSSSimpleSelector {
		private final String htmlClass;

		public ClassAttribute(String htmlClass) {
			this.htmlClass = htmlClass;
		}

		public String getHtmlClass() {
			return htmlClass;
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			boolean caseSensitive = true;
			if (element.getNodeDocument().getMode() == YWDocument.Mode.QUIRKS) {
				caseSensitive = false;
			}
			String attrValue = element.getAttr("class");
			if (attrValue == null) {
				return false;
			}
			String[] classes = attrValue.split(" ");
			for (String c : classes) {
				if (c.equals(htmlClass) || (!caseSensitive && c.toLowerCase().equals(htmlClass.toLowerCase()))) {
					return true;
				}
			}
			return false;
		}

	}

	static class IDAttribute implements YWCSSSimpleSelector {
		private final String id;

		public IDAttribute(String id) {
			this.id = id;
		}

		public String getId() {
			return id;
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			boolean caseSensitive = true;
			if (element.getNodeDocument().getMode() == YWDocument.Mode.QUIRKS) {
				caseSensitive = false;
			}
			String attrValue = element.getAttr("id");
			if (attrValue == null) {
				return false;
			}
			return attrValue.equals(id) || (!caseSensitive && attrValue.toLowerCase().equals(attrValue.toLowerCase()));
		}
	}

	static class TagType implements YWCSSSimpleSelector {
		private final YWCSSWQName tagTypeName;

		public TagType(YWCSSWQName tagTypeName) {
			this.tagTypeName = tagTypeName;
		}

		public YWCSSWQName getTagTypeName() {
			return tagTypeName;
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			// TODO: Handle namespace
			return element.getLocalName().equals(tagTypeName.getName());
		}
	}

	static class Universal implements YWCSSSimpleSelector {
		private String nsPrefix; // May be null

		public Universal(String nsPrefix) {
			this.nsPrefix = nsPrefix;
		}

		public Universal() {
			this.nsPrefix = null;
		}

		public String getNsPrefix() {
			return nsPrefix;
		}

		public void setNsPrefix(String nsPrefix) {
			this.nsPrefix = nsPrefix;
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			// TODO: Handle namespaces
			return true;
		}

	}

	/**
	 * @apiNote This is for internal use only, and not part of CSS specification.
	 */
	static class Reference implements YWCSSSimpleSelector {
		private final YWElement element;

		public Reference(YWElement element) {
			this.element = element;
		}

		public YWElement getElement() {
			return element;
		}

		@Override
		public boolean matchAgainst(YWElement element) {
			return element == this.element;
		}

	}

	static YWCSSSimpleSelector parseTypeSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		int oldCursor = ts.getCursor();
		// Try < wq-name > -----------------------------------------------------
		try {
			return new TagType(YWCSSWQName.parseWQName(ts));
		} catch (YWSyntaxError e) {
		}

		// Try < ns-prefix? > * ------------------------------------------------
		String nsPrefix = null;
		try {
			nsPrefix = YWCSSNSPrefix.parseNSPrefix(ts);
		} catch (YWSyntaxError e) {
			ts.setCursor(oldCursor);
		}
		if (!ts.expectDelim('*')) {
			throw new YWSyntaxError();
		}
		return new Universal(nsPrefix);
	}

	static YWCSSSimpleSelector parseIDSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		YWCSSToken.Hash token = (YWCSSToken.Hash) ts.expectToken(YWCSSToken.Type.HASH);
		if (token == null || token.getHashType() != YWCSSToken.Hash.HashType.ID) {
			throw new YWSyntaxError();
		}
		return new IDAttribute(token.getValue());
	}

	static YWCSSSimpleSelector parseClassSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		if (!ts.expectDelim('.')) {
			throw new YWSyntaxError();
		}
		YWCSSToken.Ident ident = (YWCSSToken.Ident) ts.expectToken(YWCSSToken.Type.IDENT);
		if (ident == null) {
			throw new YWSyntaxError();
		}
		return new ClassAttribute(ident.getValue());
	}

	static YWCSSSimpleSelector parseAttributeSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		YWCSSToken.ASTSimpleBlock simpleBlock = ts.expectSimpleBlock(YWCSSToken.Type.LEFT_SQUARE_BRACKET);
		if (simpleBlock == null) {
			throw new YWSyntaxError();
		}
		ts = new YWCSSTokenStream(simpleBlock.getTokens());

		// [ <name> ] ----------------------------------------------------------
		// [ <name> operand value modifier ] -----------------------------------
		ts.skipWhitespaces();
		YWCSSWQName name = YWCSSWQName.parseWQName(ts);
		String value = null;
		Attribute.MatchMethod method;
		Attribute.CaseSensitivity caseSensitivity = Attribute.CaseSensitivity.DEFAULT_FOR_DOCUMENT_LANGUAGE;

		ts.skipWhitespaces();
		if (ts.isEndOfTokens()) {
			method = Attribute.MatchMethod.NAME_ONLY;
		} else {
			// [ name <operand> value modifier ] -------------------------------
			if (ts.expectDelim('=')) {
				method = Attribute.MatchMethod.VALUE_EQUALS;
			} else {
				// TODO: ~=, |=, ^=, $=, *=
				throw new YWSyntaxError();
			}
			// [ name operand <value> modifier ] -------------------------------
			ts.skipWhitespaces();
			YWCSSToken.Ident ident = (YWCSSToken.Ident) ts.expectToken(YWCSSToken.Type.IDENT);
			if (ident != null) {
				value = ident.getValue();
			} else {
				YWCSSToken.Str str = (YWCSSToken.Str) ts.expectToken(YWCSSToken.Type.STRING);
				if (str != null) {
					value = str.getValue();
				} else {
					throw new YWSyntaxError();
				}
			}
			// [ name operand value <modifier> ] -------------------------------
			ts.skipWhitespaces();
			if (ts.expectIdent("i")) {
				caseSensitivity = Attribute.CaseSensitivity.INSENSITIVE;
			} else if (ts.expectIdent("s")) {
				caseSensitivity = Attribute.CaseSensitivity.SENSITIVE;
			}
		}
		if (!ts.isEndOfTokens()) {
			throw new YWSyntaxError();
		}
		return new Attribute(name, method, value, caseSensitivity);
	}

	static YWCSSSimpleSelector parseSubclassSelector(YWCSSTokenStream ts) throws YWSyntaxError {
		try {
			return parseIDSelector(ts);
		} catch (YWSyntaxError e) {
		}
		try {
			return parseClassSelector(ts);
		} catch (YWSyntaxError e) {
		}
		try {
			return parseAttributeSelector(ts);
		} catch (YWSyntaxError e) {
		}
		// TODO: pseudo class selector

		throw new YWSyntaxError();
	}

}
