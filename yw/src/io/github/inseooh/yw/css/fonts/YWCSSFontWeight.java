/**
 * This file is part of YW project. Copyright 2026 Oh Inseo (YJK)
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE for details, and LICENSE_WHATWG_SPECS for WHATWG license information.
 */
package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSNumber;

public class YWCSSFontWeight {
	public static final int NORMAL = 400;
	public static final int BOLD = 800;
	
	public static int parseFontWeight(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("normal")) {
			return NORMAL;
		}
		if (ts.expectIdent("bold")) {
			return BOLD;
		}
		return (int) YWCSSNumber.parseNumber(ts);
	}
}
