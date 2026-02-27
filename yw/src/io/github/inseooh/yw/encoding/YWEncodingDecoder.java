package io.github.inseooh.yw.encoding;

import io.github.inseooh.yw.YWUtility;

public abstract class YWEncodingDecoder {
	protected abstract YWEncodingResult handler(YWIOQueue queue, int byteItem);

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-encoding-run">
	 *      Relevant section in Encoding specification</a>
	 */
	public YWEncodingResult processQueue(YWIOQueue input, YWIOQueue output, YWEncodingErrorMode mode) {
		/* S1 *************************************************************************/
		while (true) {
			/* S1.1 ***********************************************************************/
			int item = input.read();
			YWEncodingResult res = processItem(item, input, output, mode);

			/* S1.2 ***********************************************************************/
			if (res != YWEncodingResult.CONTINUE) {
				return res;
			}
		}
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-encoding-process">
	 *      Relevant section in Encoding specification</a>
	 */
	private YWEncodingResult processItem(int item, YWIOQueue input, YWIOQueue output, YWEncodingErrorMode mode) {
		/* S1 *************************************************************************/
		/* Not applicable */

		/* S2 *************************************************************************/
		if (mode == YWEncodingErrorMode.HTML) {
			throw new RuntimeException("bad error mode");
		}

		/* S3 *************************************************************************/
		/* Not applicable */

		/* S4 *************************************************************************/
		YWEncodingResult res = this.handler(input, item);

		/* S5 *************************************************************************/
		if (res == YWEncodingResult.FINISHED) {
			/* S5.1 ***********************************************************************/
			/* Nothing to do (our queue does not have explicit End-of-queue item) */

			/* S5.2 ***********************************************************************/
			return res;
		}

		/* S6 *************************************************************************/
		if (res == YWEncodingResult.ITEMS) {
			/* S6.1 ***********************************************************************/
			for (int c : res.getItems()) {
				if (YWUtility.isSurrogateChar(c)) {
					throw new RuntimeException("result cannot contain surrogate char");
				}
			}
			/* S6.2 ***********************************************************************/
			output.push(res.getItems());
		}
		/* S7 *************************************************************************/
		else if (res == YWEncodingResult.ERROR) {
			switch (mode) {
			case REPLACEMENT:
				output.push(0xfffd);
				break;
			case HTML:
				throw new RuntimeException("unreachable");
			case FATAL:
				return res;
			}
		}
		/* S8 *************************************************************************/
		return YWEncodingResult.CONTINUE;
	}
}
