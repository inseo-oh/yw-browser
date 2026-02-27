/**
 * This file is part of YW project. Copyright 2026 Oh Inseo (YJK)
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE for details, and LICENSE_WHATWG_SPECS for WHATWG license information.
 */
package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSToken.Ident;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public class YWCSSFontFamily {
	public static final YWCSSFontFamily SERIF = new YWCSSFontFamily(GenericFamily.SERIF);
	public static final YWCSSFontFamily SANS_SERIF = new YWCSSFontFamily(GenericFamily.SANS_SERIF);
	public static final YWCSSFontFamily CURSIVE = new YWCSSFontFamily(GenericFamily.CURSIVE);
	public static final YWCSSFontFamily FANTASY = new YWCSSFontFamily(GenericFamily.FANTASY);
	public static final YWCSSFontFamily MONOSPACE = new YWCSSFontFamily(GenericFamily.MONOSPACE);

	public enum GenericFamily {
		SERIF, SANS_SERIF, CURSIVE, FANTASY, MONOSPACE
	}

	private final GenericFamily genericFamily; /* null if it's non-generic */
	private final String family; /* Only valid if genericFamily is null */

	public YWCSSFontFamily(String family) {
		this.genericFamily = null;
		this.family = family;
	}

	private YWCSSFontFamily(GenericFamily genericFamily) {
		this.genericFamily = genericFamily;
		this.family = null;
	}

	public GenericFamily getGenericFamily() {
		return genericFamily;
	}

	public String getFamily() {
		return family;
	}

	public static YWCSSFontFamily[] parseFontFamily(YWCSSTokenStream ts) throws YWSyntaxError {
		YWCSSFontFamily[] families = ts.parseCommaSeparatedRepeation(new YWCSSFontFamily[0], () -> {
			if (ts.expectIdent("serif")) {
				return SERIF;
			}
			if (ts.expectIdent("sans-serif")) {
				return SANS_SERIF;
			}
			if (ts.expectIdent("cursive")) {
				return CURSIVE;
			}
			if (ts.expectIdent("fantasy")) {
				return FANTASY;
			}
			if (ts.expectIdent("monospace")) {
				return MONOSPACE;
			}
			YWCSSToken.Str str = (YWCSSToken.Str) ts.expectToken(YWCSSToken.Type.STRING);
			if (str != null) {
				return new YWCSSFontFamily(str.getValue());
			}
			String[] idents = ts.parseRepeation(new String[0], () -> {
				YWCSSToken.Ident ident = (Ident) ts.expectToken(YWCSSToken.Type.IDENT);
				if (ident == null) {
					return null;
				}
				return ident.getValue();
			});
			if (idents.length != 0) {
				return new YWCSSFontFamily(String.join(" ", idents));
			}
			throw new YWSyntaxError();
		});
		if (families.length != 0) {
			return families;
		}
		throw new YWSyntaxError();
	}

}
