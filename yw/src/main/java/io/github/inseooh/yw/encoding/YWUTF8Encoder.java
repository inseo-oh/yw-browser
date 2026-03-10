package io.github.inseooh.yw.encoding;

import io.github.inseooh.yw.YWUtility;

/**
 * @see <a href="https://encoding.spec.whatwg.org/#utf-8-encoder">Relevant
 *      section in Encoding specification</a>
 */
public class YWUTF8Encoder extends YWEncodingEncoder {
    @Override
    public YWEncodingResult handler(YWIOQueue unused, int codePoint) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.10.)

        // S1.
        if (codePoint == YWIOQueue.END_OF_IO_QUEUE) {
            return YWEncodingResult.FINISHED;
        }

        // S2.
        if (YWUtility.isAsciiCodePoint(codePoint)) {
            YWEncodingResult res = YWEncodingResult.ITEMS;
            res.setItems(new int[] { codePoint });
            return res;
        }

        // S3.
        int count, offset;
        if (0x0080 <= codePoint && codePoint <= 0x7ff) {
            count = 1;
            offset = 0xc0;
        } else if (0x0800 <= codePoint && codePoint <= 0xfff) {
            count = 2;
            offset = 0xe0;
        } else if (0x10000 <= codePoint && codePoint <= 0x10ffff) {
            count = 3;
            offset = 0xf0;
        } else {
            throw new IllegalArgumentException("code point is out of range");
        }

        // S4.
        int[] bytes = new int[count + 1];
        bytes[0] = (codePoint >> (6 * count)) + offset;

        // S5.
        int idx = 1;
        while (0 < count) {
            // S5-1.
            int temp = codePoint >> (6 * (count - 1));

            // S5-2.
            bytes[idx] = 0x80 | (temp & 0x3F);

            // S5-3.
            count--;
            idx++;
        }

        // S6.
        YWEncodingResult res = YWEncodingResult.ITEMS;
        res.setItems(bytes);
        return res;
    }
}
