package io.github.inseooh.yw.encoding;

public abstract class YWEncodingEncoder extends YWEncodingProcessor {
	public YWEncodingEncoder() {
		super(Kind.ENCODER);
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#get-an-encoder">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWEncodingEncoder getEncoder(YWEncoding encoding) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.10.)

		// S1.
		assert encoding != YWEncoding.REPLACEMENT && encoding != YWEncoding.UTF16_BE && encoding != YWEncoding.UTF16_LE;

		// S2.
		switch (encoding) {
			case UTF8:
				return new YWUTF8Encoder();
			default:
				throw new RuntimeException("TODO: Add support for " + encoding + " encoding");
		}
	}

	/**
	 * @return null on success, code point that caused failure on failure.
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#encode-or-fail">
	 *      Relevant section in Encoding specification</a>
	 */
	public Integer encodeOrFail(YWIOQueue ioQueue, YWIOQueue output) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.10.)

		// S1.
		YWEncodingResult potentialError = processQueue(output, output, YWEncodingErrorMode.FATAL);

		// S2.
		// NOTE: We don't have explicit "end-of-queue" item.

		// S3.
		if (potentialError == YWEncodingResult.ERROR) {
			return potentialError.getItems()[0];
		}

		// S4.
		return null;
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#encode">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue encode(YWIOQueue ioQueue, YWEncoding encoding, YWIOQueue output) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.11.)

		// S1.
		YWEncodingEncoder encoder = getEncoder(encoding);

		// S2.
		encoder.processQueue(ioQueue, output, YWEncodingErrorMode.HTML);

		// S3.
		return output;
	}

	public static YWIOQueue encode(YWIOQueue ioQueue, YWEncoding encoding) {
		return encode(ioQueue, encoding, new YWIOQueue());
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-encode">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8Encode(YWIOQueue ioQueue, YWIOQueue output) {
		return encode(ioQueue, YWEncoding.UTF8, output);
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-encode">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8Encode(YWIOQueue ioQueue) {
		return utf8Encode(ioQueue, new YWIOQueue());
	}
}
