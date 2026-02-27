/**
 * This file is part of YW project. Copyright 2026 Oh Inseo (YJK)
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE for details, and LICENSE_WHATWG_SPECS for WHATWG license information.
 */
package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public enum YWCSSFontStyle {
	NORMAL, ITALIC, OBLIQUE;
	
	public static YWCSSFontStyle parseFontStretch(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("normal")) {
			return NORMAL;
		}
		if (ts.expectIdent("italic")) {
			return ITALIC;
		}
		if (ts.expectIdent("oblique")) {
			return OBLIQUE;
		}
		throw new YWSyntaxError();
	}
}
