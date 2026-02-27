/**
 * This file is part of YW project. Copyright 2026 Oh Inseo (YJK)
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE for details, and LICENSE_WHATWG_SPECS for WHATWG license information.
 */
package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public enum YWCSSFontStretch {
	ULTRA_CONDENSED,
	EXTRA_CONDENSED,
	CONDENSED,
	SEMI_CONDENSED,
	NORMAL,
	SEMI_EXPANDED,
	EXPANDED,
	EXTRA_EXPANDED,
	ULTRA_EXPANDED;
	
	public static YWCSSFontStretch parseFontStretch(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("ultra-condensed")) {
			return ULTRA_CONDENSED;
		}
		if (ts.expectIdent("extra-condensed")) {
			return EXTRA_CONDENSED;
		}
		if (ts.expectIdent("condensed")) {
			return CONDENSED;
		}
		if (ts.expectIdent("semi-condensed")) {
			return SEMI_CONDENSED;
		}
		if (ts.expectIdent("normal")) {
			return NORMAL;
		}
		if (ts.expectIdent("semi-expanded")) {
			return SEMI_EXPANDED;
		}
		if (ts.expectIdent("expanded")) {
			return EXPANDED;
		}
		if (ts.expectIdent("extra-expanded")) {
			return EXTRA_EXPANDED;
		}
		if (ts.expectIdent("ultra-expanded")) {
			return ULTRA_EXPANDED;
		}
		throw new YWSyntaxError();
	}
}
