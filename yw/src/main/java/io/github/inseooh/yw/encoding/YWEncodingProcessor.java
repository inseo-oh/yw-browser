package io.github.inseooh.yw.encoding;

import io.github.inseooh.yw.YWUtility;

public abstract class YWEncodingProcessor {
	public enum Kind {
		ENCODER, DECODER
	}

	private Kind kind;

	public YWEncodingProcessor(Kind kind) {
		this.kind = kind;
	}

	public abstract YWEncodingResult handler(YWIOQueue queue, int byteItem);

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-encoding-run">
	 *      Relevant section in Encoding specification</a>
	 */
	public YWEncodingResult processQueue(YWIOQueue input, YWIOQueue output, YWEncodingErrorMode mode) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.10.)

		// S1.
		while (true) {
			// S1-1.
			int item = input.read();
			YWEncodingResult res = processItem(item, input, output, mode);

			// S1-2.
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
		// S1.
		assert kind != Kind.ENCODER || mode != YWEncodingErrorMode.REPLACEMENT;

		// S2.
		assert kind != Kind.DECODER || mode != YWEncodingErrorMode.HTML;

		// S3.
		assert kind != Kind.ENCODER || !YWUtility.isSurrogateChar(item);

		// S4.
		YWEncodingResult result = this.handler(input, item);

		// S5.
		if (result == YWEncodingResult.FINISHED) {
			// S5-1.
			// Nothing to do (our queue does not have explicit End-of-queue item)

			// S5-2.
			return result;
		}

		// S6.
		if (result == YWEncodingResult.ITEMS) {
			// S6-1.
			if (kind == Kind.DECODER) {
				for (int c : result.getItems()) {
					if (YWUtility.isSurrogateChar(c)) {
						throw new RuntimeException("result cannot contain surrogate char");
					}
				}
			}

			// S6-2.
			output.push(result.getItems());
		}

		// S7.
		else if (result == YWEncodingResult.ERROR) {
			switch (mode) {
				case REPLACEMENT:
					output.push(0xfffd);
					break;
				case HTML: {
					output.push('&');
					output.push('#');
					String v = Integer.toString(result.getItems()[0]);
					for (int i = 0; i < v.length(); i++) {
						output.push(v.codePointAt(i));
					}
					break;
				}
				case FATAL:
					return result;
			}
		}

		// S8.
		return YWEncodingResult.CONTINUE;
	}
}
