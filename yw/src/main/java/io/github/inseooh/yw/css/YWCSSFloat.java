/**
 * This file is part of YW project. Copyright 2026 Oh Inseo (YJK)
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE for details, and LICENSE_WHATWG_SPECS for WHATWG license information.
 */
package io.github.inseooh.yw.css;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public enum YWCSSFloat {
	NONE,
	LEFT,
	RIGHT;
	
	public static YWCSSFloat parseFloat(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("none")) {
			return NONE;
		}
		if (ts.expectIdent("left")) {
			return LEFT;
		}
		if (ts.expectIdent("right")) {
			return RIGHT;
		}
		throw new YWSyntaxError();
	}

}
