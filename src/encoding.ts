// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { isASCIICodePoint, isSurrogate } from "./infra.js";
import { removeLeadingAndTrailingWhitespace } from "./utility.js";

export type EndOfIOQueue = typeof IOQueue.END_OF_IO_QUEUE;

export default class IOQueue {
    static END_OF_IO_QUEUE = undefined;

    items: number[] = [];

    static fromArray(items: number[]) {
        const queue = new IOQueue();
        for (const item of items) {
            queue.items.push(item);
        }
        return queue;
    }
    toArray() {
        const result = [];
        for (const item of this.items) {
            result.push(item);
        }
        return result;
    }
    toString() {
        const result = [];
        for (const item of this.items) {
            result.push(String.fromCodePoint(item));
        }
        return result.join("");
    }

    // https://encoding.spec.whatwg.org/#concept-stream-read
    readOne() {
        if (this.items.length === 0) {
            return undefined;
        }
        return this.items.splice(0, 1)[0];
    }

    // https://encoding.spec.whatwg.org/#concept-stream-read
    read(count: number) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const item = this.readOne();
            if (item === IOQueue.END_OF_IO_QUEUE) {
                continue;
            }
            result.push(item);
        }
        return result;
    }

    // https://encoding.spec.whatwg.org/#concept-stream-read
    peek(count: number) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const item = this.items[i];
            if (item === IOQueue.END_OF_IO_QUEUE) {
                break;
            }
            result.push(item);
        }
        return result;
    }

    // https://encoding.spec.whatwg.org/#concept-stream-push
    pushOne(item: number) {
        this.items.push(item);
    }

    // https://encoding.spec.whatwg.org/#concept-stream-push
    push(items: number[]) {
        for (const item of items) {
            this.pushOne(item);
        }
    }

    // https://encoding.spec.whatwg.org/#concept-stream-prepend
    restoreOne(item: number) {
        this.items.unshift(item);
    }

    // https://encoding.spec.whatwg.org/#concept-stream-prepend
    restore(items: number[]) {
        for (const item of items) {
            this.restoreOne(item);
        }
    }
}

//==============================================================================
// Encoding Standard - 4.1.
//==============================================================================

// https://encoding.spec.whatwg.org/#encoding
export interface Encoding {
    // https://encoding.spec.whatwg.org/#decoder
    createDecoder(): Handler;

    // https://encoding.spec.whatwg.org/#encoder
    createEncoder(): Handler;
}

// https://encoding.spec.whatwg.org/#handler
export interface Handler {
    getKind(): HandlerKind;
    handler(queue: IOQueue, item: number | EndOfIOQueue): HandlerResult;
}

// https://encoding.spec.whatwg.org/#handler
export type HandlerResult =
    | { type: "finished" }
    | { type: "error"; codepoint: number | undefined }
    | { type: "continue" }
    | { type: "items"; items: number[] };

export type HandlerKind = "encoder" | "decoder";

// https://encoding.spec.whatwg.org/#error-mode
type ErrorMode = "replacement" | "fatal" | "html";

// https://encoding.spec.whatwg.org/#concept-encoding-run
export function processQueue(
    encoderDecoder: Handler,
    input: IOQueue,
    output: IOQueue,
    mode: ErrorMode,
): HandlerResult {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.10.)

    // S1.
    while (true) {
        // S1-1.
        const item = input.readOne();
        const res = processItem(item, encoderDecoder, input, output, mode);

        // S1-2.
        if (res.type !== "continue") {
            return res;
        }
    }
}

// https://encoding.spec.whatwg.org/#concept-encoding-process
export function processItem(
    item: number | EndOfIOQueue,
    encoderDecoder: Handler,
    input: IOQueue,
    output: IOQueue,
    mode: ErrorMode,
): HandlerResult {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.10.)
    // S1.
    console.assert(
        encoderDecoder.getKind() !== "encoder" || mode !== "replacement",
    );

    // S2.
    console.assert(encoderDecoder.getKind() !== "decoder" || mode !== "html");

    // S3.
    console.assert(
        encoderDecoder.getKind() !== "encoder" ||
            item === IOQueue.END_OF_IO_QUEUE ||
            !isSurrogate(item),
    );

    // S4.
    const result = encoderDecoder.handler(input, item);

    // S5.
    if (result.type === "finished") {
        // S5-1.
        // Nothing to do (our queue does not have explicit End-of-queue item)

        // S5-2.
        return result;
    }

    // S6.
    if (result.type === "items") {
        // S6-1.
        if (encoderDecoder.getKind() === "decoder") {
            for (const c of result.items) {
                if (isSurrogate(c)) {
                    throw new Error("result cannot contain surrogate char");
                }
            }
        }

        // S6-2.
        output.push(result.items);
    }

    // S7.
    else if (result.type === "error") {
        switch (mode) {
            case "replacement":
                output.pushOne(0xfffd);
                break;
            case "html": {
                output.pushOne(0x26); // &
                output.pushOne(0x23); // #
                const v = `${result.codepoint}`;
                for (let i = 0; ; i++) {
                    const cp = v.codePointAt(i);
                    if (cp === undefined) {
                        break;
                    }
                    output.pushOne(cp);
                }
                break;
            }
            case "fatal":
                return result;
        }
    }

    // S8.
    return { type: "continue" };
}

//==============================================================================
// Encoding Standard - 4.2.
//==============================================================================

// https://encoding.spec.whatwg.org/#names-and-labels
const LABELS = new Map<string, Encoding>();

// https://encoding.spec.whatwg.org/#concept-encoding-get
export function getEncodingFromLabel(label: string) {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.29.)

    // S1.
    label = removeLeadingAndTrailingWhitespace(label);

    // S2.
    return LABELS.get(label);
}

function initLabels() {
    // The encoding ============================================================
    LABELS.set("unicode-1-1-utf-8", UTF8_ENCODING);
    LABELS.set("unicode11utf8", UTF8_ENCODING);
    LABELS.set("unicode20utf8", UTF8_ENCODING);
    LABELS.set("utf-8", UTF8_ENCODING);
    LABELS.set("utf8", UTF8_ENCODING);
    LABELS.set("x-unicode20utf8", UTF8_ENCODING);

    // Legacy single-byte encodings ============================================
    LABELS.set("866", IBM866_ENCODING);
    LABELS.set("cp866", IBM866_ENCODING);
    LABELS.set("csibm866", IBM866_ENCODING);
    LABELS.set("ibm866", IBM866_ENCODING);

    LABELS.set("csisolatin2", ISO8859_2_ENCODING);
    LABELS.set("iso-8859-2", ISO8859_2_ENCODING);
    LABELS.set("iso-ir-101", ISO8859_2_ENCODING);
    LABELS.set("iso8859-2", ISO8859_2_ENCODING);
    LABELS.set("iso88592", ISO8859_2_ENCODING);
    LABELS.set("iso_8859-2", ISO8859_2_ENCODING);
    LABELS.set("iso_8859-2:1987", ISO8859_2_ENCODING);
    LABELS.set("l2", ISO8859_2_ENCODING);
    LABELS.set("latin2", ISO8859_2_ENCODING);

    LABELS.set("csisolatin3", ISO8859_3_ENCODING);
    LABELS.set("iso-8859-3", ISO8859_3_ENCODING);
    LABELS.set("iso-ir-109", ISO8859_3_ENCODING);
    LABELS.set("iso8859-3", ISO8859_3_ENCODING);
    LABELS.set("iso88593", ISO8859_3_ENCODING);
    LABELS.set("iso_8859-3", ISO8859_3_ENCODING);
    LABELS.set("iso_8859-3:1988", ISO8859_3_ENCODING);
    LABELS.set("l3", ISO8859_3_ENCODING);
    LABELS.set("latin3", ISO8859_3_ENCODING);

    LABELS.set("csisolatin4", ISO8859_4_ENCODING);
    LABELS.set("iso-8859-4", ISO8859_4_ENCODING);
    LABELS.set("iso-ir-110", ISO8859_4_ENCODING);
    LABELS.set("iso8859-4", ISO8859_4_ENCODING);
    LABELS.set("iso88594", ISO8859_4_ENCODING);
    LABELS.set("iso_8859-4", ISO8859_4_ENCODING);
    LABELS.set("iso_8859-4:1988", ISO8859_4_ENCODING);
    LABELS.set("l4", ISO8859_4_ENCODING);
    LABELS.set("latin4", ISO8859_4_ENCODING);

    LABELS.set("csisolatincyrillic", ISO8859_5_ENCODING);
    LABELS.set("cyrillic", ISO8859_5_ENCODING);
    LABELS.set("iso-8859-5", ISO8859_5_ENCODING);
    LABELS.set("iso-ir-144", ISO8859_5_ENCODING);
    LABELS.set("iso8859-5", ISO8859_5_ENCODING);
    LABELS.set("iso88595", ISO8859_5_ENCODING);
    LABELS.set("iso_8859-5", ISO8859_5_ENCODING);
    LABELS.set("iso_8859-5:1988", ISO8859_5_ENCODING);

    LABELS.set("arabic", ISO8859_6_ENCODING);
    LABELS.set("asmo-708", ISO8859_6_ENCODING);
    LABELS.set("csiso88596e", ISO8859_6_ENCODING);
    LABELS.set("csiso88596i", ISO8859_6_ENCODING);
    LABELS.set("csisolatinarabic", ISO8859_6_ENCODING);
    LABELS.set("ecma-114", ISO8859_6_ENCODING);
    LABELS.set("iso-8859-6", ISO8859_6_ENCODING);
    LABELS.set("iso-8859-6-e", ISO8859_6_ENCODING);
    LABELS.set("iso-8859-6-i", ISO8859_6_ENCODING);
    LABELS.set("iso-ir-127", ISO8859_6_ENCODING);
    LABELS.set("iso8859-6", ISO8859_6_ENCODING);
    LABELS.set("iso88596", ISO8859_6_ENCODING);
    LABELS.set("iso_8859-6", ISO8859_6_ENCODING);
    LABELS.set("iso_8859-6:1987", ISO8859_6_ENCODING);

    LABELS.set("csisolatingreek", ISO8859_7_ENCODING);
    LABELS.set("ecma-118", ISO8859_7_ENCODING);
    LABELS.set("elot_928", ISO8859_7_ENCODING);
    LABELS.set("greek", ISO8859_7_ENCODING);
    LABELS.set("greek8", ISO8859_7_ENCODING);
    LABELS.set("iso-8859-7", ISO8859_7_ENCODING);
    LABELS.set("iso-ir-126", ISO8859_7_ENCODING);
    LABELS.set("iso8859-7", ISO8859_7_ENCODING);
    LABELS.set("iso88597", ISO8859_7_ENCODING);
    LABELS.set("iso_8859-7", ISO8859_7_ENCODING);
    LABELS.set("iso_8859-7:1987", ISO8859_7_ENCODING);
    LABELS.set("sun_eu_greek", ISO8859_7_ENCODING);

    LABELS.set("csiso88598e", ISO8859_8_ENCODING);
    LABELS.set("csisolatinhebrew", ISO8859_8_ENCODING);
    LABELS.set("hebrew", ISO8859_8_ENCODING);
    LABELS.set("iso-8859-8", ISO8859_8_ENCODING);
    LABELS.set("iso-8859-8-e", ISO8859_8_ENCODING);
    LABELS.set("iso-ir-138", ISO8859_8_ENCODING);
    LABELS.set("iso8859-8", ISO8859_8_ENCODING);
    LABELS.set("iso88598", ISO8859_8_ENCODING);
    LABELS.set("iso_8859-8", ISO8859_8_ENCODING);
    LABELS.set("iso_8859-8:1988", ISO8859_8_ENCODING);
    LABELS.set("visual", ISO8859_8_ENCODING);

    LABELS.set("csiso88598i", ISO8859_8I_ENCODING);
    LABELS.set("iso-8859-8-i", ISO8859_8I_ENCODING);
    LABELS.set("logical", ISO8859_8I_ENCODING);

    LABELS.set("csisolatin6", ISO8859_10_ENCODING);
    LABELS.set("iso-8859-10", ISO8859_10_ENCODING);
    LABELS.set("iso-ir-157", ISO8859_10_ENCODING);
    LABELS.set("iso8859-10", ISO8859_10_ENCODING);
    LABELS.set("iso885910", ISO8859_10_ENCODING);
    LABELS.set("l6", ISO8859_10_ENCODING);
    LABELS.set("latin6", ISO8859_10_ENCODING);

    LABELS.set("iso-8859-13", ISO8859_13_ENCODING);
    LABELS.set("iso8859-13", ISO8859_13_ENCODING);
    LABELS.set("iso885913", ISO8859_13_ENCODING);

    LABELS.set("iso-8859-14", ISO8859_14_ENCODING);
    LABELS.set("iso8859-14", ISO8859_14_ENCODING);
    LABELS.set("iso885914", ISO8859_14_ENCODING);

    LABELS.set("csisolatin9", ISO8859_15_ENCODING);
    LABELS.set("iso-8859-15", ISO8859_15_ENCODING);
    LABELS.set("iso8859-15", ISO8859_15_ENCODING);
    LABELS.set("iso885915", ISO8859_15_ENCODING);
    LABELS.set("iso_8859-15", ISO8859_15_ENCODING);
    LABELS.set("l9", ISO8859_15_ENCODING);

    LABELS.set("iso-8859-16", ISO8859_16_ENCODING);

    LABELS.set("cskoi8r", KOI8R_ENCODING);
    LABELS.set("koi", KOI8R_ENCODING);
    LABELS.set("koi8", KOI8R_ENCODING);
    LABELS.set("koi8-r", KOI8R_ENCODING);
    LABELS.set("koi8_r", KOI8R_ENCODING);

    LABELS.set("koi8-ru", KOI8U_ENCODING);
    LABELS.set("koi8-u", KOI8U_ENCODING);

    LABELS.set("csmacintosh", MACINTOSH_ENCODING);
    LABELS.set("mac", MACINTOSH_ENCODING);
    LABELS.set("macintosh", MACINTOSH_ENCODING);
    LABELS.set("x-mac-roman", MACINTOSH_ENCODING);

    LABELS.set("dos-874", WINDOWS874_ENCODING);
    LABELS.set("iso-8859-11", WINDOWS874_ENCODING);
    LABELS.set("iso8859-11", WINDOWS874_ENCODING);
    LABELS.set("iso885911", WINDOWS874_ENCODING);
    LABELS.set("tis-620", WINDOWS874_ENCODING);
    LABELS.set("windows-874", WINDOWS874_ENCODING);

    LABELS.set("cp1250", WINDOWS1250_ENCODING);
    LABELS.set("windows-1250", WINDOWS1250_ENCODING);
    LABELS.set("x-cp1250", WINDOWS1250_ENCODING);

    LABELS.set("cp1251", WINDOWS1251_ENCODING);
    LABELS.set("windows-1251", WINDOWS1251_ENCODING);
    LABELS.set("x-cp1251", WINDOWS1251_ENCODING);

    LABELS.set("ansi_x3.4-1968", WINDOWS1252_ENCODING);
    LABELS.set("ascii", WINDOWS1252_ENCODING);
    LABELS.set("cp1252", WINDOWS1252_ENCODING);
    LABELS.set("cp819", WINDOWS1252_ENCODING);
    LABELS.set("csisolatin1", WINDOWS1252_ENCODING);
    LABELS.set("ibm819", WINDOWS1252_ENCODING);
    LABELS.set("iso-8859-1", WINDOWS1252_ENCODING);
    LABELS.set("iso-ir-100", WINDOWS1252_ENCODING);
    LABELS.set("iso8859-1", WINDOWS1252_ENCODING);
    LABELS.set("iso88591", WINDOWS1252_ENCODING);
    LABELS.set("iso_8859-1", WINDOWS1252_ENCODING);
    LABELS.set("iso_8859-1:1987", WINDOWS1252_ENCODING);
    LABELS.set("l1", WINDOWS1252_ENCODING);
    LABELS.set("latin1", WINDOWS1252_ENCODING);
    LABELS.set("us-ascii", WINDOWS1252_ENCODING);
    LABELS.set("windows-1252", WINDOWS1252_ENCODING);
    LABELS.set("x-cp1252", WINDOWS1252_ENCODING);

    LABELS.set("cp1253", WINDOWS1253_ENCODING);
    LABELS.set("windows-1253", WINDOWS1253_ENCODING);
    LABELS.set("x-cp1253", WINDOWS1253_ENCODING);

    LABELS.set("cp1254", WINDOWS1254_ENCODING);
    LABELS.set("csisolatin5", WINDOWS1254_ENCODING);
    LABELS.set("iso-8859-9", WINDOWS1254_ENCODING);
    LABELS.set("iso-ir-148", WINDOWS1254_ENCODING);
    LABELS.set("iso8859-9", WINDOWS1254_ENCODING);
    LABELS.set("iso88599", WINDOWS1254_ENCODING);
    LABELS.set("iso_8859-9", WINDOWS1254_ENCODING);
    LABELS.set("iso_8859-9:1989", WINDOWS1254_ENCODING);
    LABELS.set("l5", WINDOWS1254_ENCODING);
    LABELS.set("latin5", WINDOWS1254_ENCODING);
    LABELS.set("windows-1254", WINDOWS1254_ENCODING);
    LABELS.set("x-cp1254", WINDOWS1254_ENCODING);

    LABELS.set("cp1255", WINDOWS1255_ENCODING);
    LABELS.set("windows-1255", WINDOWS1255_ENCODING);
    LABELS.set("x-cp1255", WINDOWS1255_ENCODING);

    LABELS.set("cp1256", WINDOWS1256_ENCODING);
    LABELS.set("windows-1256", WINDOWS1256_ENCODING);
    LABELS.set("x-cp1256", WINDOWS1256_ENCODING);

    LABELS.set("cp1257", WINDOWS1257_ENCODING);
    LABELS.set("windows-1257", WINDOWS1257_ENCODING);
    LABELS.set("x-cp1257", WINDOWS1257_ENCODING);

    LABELS.set("cp1258", WINDOWS1258_ENCODING);
    LABELS.set("windows-1258", WINDOWS1258_ENCODING);
    LABELS.set("x-cp1258", WINDOWS1258_ENCODING);

    LABELS.set("x-mac-cyrillic", X_MAC_CYRILLIC_ENCODING);
    LABELS.set("x-mac-ukrainian", X_MAC_CYRILLIC_ENCODING);

    // Legacy multi-byte Chinese (simplified) encodings ========================
    LABELS.set("chinese", GBK_ENCODING);
    LABELS.set("csgb2312", GBK_ENCODING);
    LABELS.set("csiso58gb231280", GBK_ENCODING);
    LABELS.set("gb2312", GBK_ENCODING);
    LABELS.set("gb_2312", GBK_ENCODING);
    LABELS.set("gb_2312-80", GBK_ENCODING);
    LABELS.set("gbk", GBK_ENCODING);
    LABELS.set("iso-ir-58", GBK_ENCODING);
    LABELS.set("x-gbk", GBK_ENCODING);

    LABELS.set("gb18030", GB18030_ENCODING);

    // Legacy multi-byte Chinese (traditional) encodings =======================
    LABELS.set("big5", BIG5_ENCODING);
    LABELS.set("big5-hkscs", BIG5_ENCODING);
    LABELS.set("cn-big5", BIG5_ENCODING);
    LABELS.set("csbig5", BIG5_ENCODING);
    LABELS.set("x-x-big5", BIG5_ENCODING);

    // Legacy multi-byte Japanese encodings ====================================
    LABELS.set("cseucpkdfmtjapanese", EUC_JP_ENCODING);
    LABELS.set("euc-jp", EUC_JP_ENCODING);
    LABELS.set("x-euc-jp", EUC_JP_ENCODING);

    LABELS.set("csiso2022jp", ISO2022_JP_ENCODING);
    LABELS.set("iso-2022-jp", ISO2022_JP_ENCODING);

    LABELS.set("csshiftjis", SHIFT_JIS_ENCODING);
    LABELS.set("ms932", SHIFT_JIS_ENCODING);
    LABELS.set("ms_kanji", SHIFT_JIS_ENCODING);
    LABELS.set("shift-jis", SHIFT_JIS_ENCODING);
    LABELS.set("shift_jis", SHIFT_JIS_ENCODING);
    LABELS.set("sjis", SHIFT_JIS_ENCODING);
    LABELS.set("windows-31j", SHIFT_JIS_ENCODING);
    LABELS.set("x-sjis", SHIFT_JIS_ENCODING);

    // Legacy multi-byte Korean encodings ======================================
    LABELS.set("cseuckr", EUC_KR_ENCODING);
    LABELS.set("csksc56011987", EUC_KR_ENCODING);
    LABELS.set("euc-kr", EUC_KR_ENCODING);
    LABELS.set("iso-ir-149", EUC_KR_ENCODING);
    LABELS.set("korean", EUC_KR_ENCODING);
    LABELS.set("ks_c_5601-1987", EUC_KR_ENCODING);
    LABELS.set("ks_c_5601-1989", EUC_KR_ENCODING);
    LABELS.set("ksc5601", EUC_KR_ENCODING);
    LABELS.set("ksc_5601", EUC_KR_ENCODING);
    LABELS.set("windows-949", EUC_KR_ENCODING);

    // Legacy miscellaneous encodings ==========================================
    LABELS.set("csiso2022kr", REPLACEMENT_ENCODING);
    LABELS.set("hz-gb-2312", REPLACEMENT_ENCODING);
    LABELS.set("iso-2022-cn", REPLACEMENT_ENCODING);
    LABELS.set("iso-2022-cn-ext", REPLACEMENT_ENCODING);
    LABELS.set("iso-2022-kr", REPLACEMENT_ENCODING);
    LABELS.set("replacement", REPLACEMENT_ENCODING);

    LABELS.set("unicodefffe", UTF16_BE_ENCODING);
    LABELS.set("utf-16be", UTF16_BE_ENCODING);

    LABELS.set("csunicode", UTF16_LE_ENCODING);
    LABELS.set("iso-10646-ucs-2", UTF16_LE_ENCODING);
    LABELS.set("ucs-2", UTF16_LE_ENCODING);
    LABELS.set("unicode", UTF16_LE_ENCODING);
    LABELS.set("unicodefeff", UTF16_LE_ENCODING);
    LABELS.set("utf-16", UTF16_LE_ENCODING);
    LABELS.set("utf-16le", UTF16_LE_ENCODING);

    LABELS.set("x-user-defined", X_USER_DEFINED_ENCODING);
}

//==============================================================================
// Encoding Standard - 4.3.
//==============================================================================

// https://encoding.spec.whatwg.org/#get-an-output-encoding
export function getOutputEncoding(encoding: Encoding) {
    switch (encoding) {
        case REPLACEMENT_ENCODING:
        case UTF16_BE_ENCODING:
        case UTF16_LE_ENCODING:
            return UTF8_ENCODING;
        default:
            return encoding;
    }
}

//==============================================================================
// Encoding Standard - 6.1.
//==============================================================================

// https://encoding.spec.whatwg.org/#decode
export function decode(
    inputQueue: IOQueue,
    encoding: Encoding,
    output: IOQueue = new IOQueue(),
) {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.29.)

    // S1.
    const bomEncoding = bomSniff(inputQueue);
    // 2.
    if (bomEncoding !== null) {
        // S2-1.
        encoding = bomEncoding;

        // S2-2.
        if (bomEncoding === UTF8_ENCODING) {
            inputQueue.read(3);
        } else {
            inputQueue.read(2);
        }
    }

    // S3.
    let decoder;
    switch (encoding) {
        case UTF8_ENCODING:
            decoder = UTF8_ENCODING.createDecoder();
            break;
        default:
            throw new Error(`TODO: Add support for this encoding`);
    }
    processQueue(decoder, inputQueue, output, "replacement");

    // S4.
    return output;
}

// https://encoding.spec.whatwg.org/#bom-sniff
export function bomSniff(queue: IOQueue) {
    const bytes = queue.peek(3);
    if (
        3 <= bytes.length &&
        bytes[0] === 0xef &&
        bytes[1] === 0xbb &&
        bytes[2] === 0xbf
    ) {
        return UTF8_ENCODING;
    } else if (2 <= bytes.length && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return UTF16_BE_ENCODING;
    } else if (2 <= bytes.length && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return UTF16_LE_ENCODING;
    }
    return null;
}

// https://encoding.spec.whatwg.org/#encode
export function encode(
    ioQueue: IOQueue,
    encoding: Encoding,
    output: IOQueue = new IOQueue(),
) {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.11.)

    // S1.
    const encoder = getEncoder(encoding);

    // S2.
    processQueue(encoder, ioQueue, output, "html");

    // S3.
    return output;
}

// https://encoding.spec.whatwg.org/#get-an-encoder
export function getEncoder(encoding: Encoding) {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.10.)

    // S1.
    console.assert(
        encoding !== REPLACEMENT_ENCODING &&
            encoding !== UTF16_BE_ENCODING &&
            encoding !== UTF16_LE_ENCODING,
    );

    // S2.
    switch (encoding) {
        case UTF8_ENCODING:
            return UTF8_ENCODING.createEncoder();
        default:
            throw new Error("TODO: Add support for this encoding");
    }
}

// https://encoding.spec.whatwg.org/#encode-or-fail
/**
 * @return null on success, code point that caused failure on failure.
 */
export function encodeOrFail(
    ioQueue: IOQueue,
    encoder: Handler,
    output: IOQueue,
) {
    // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.10.)

    // S1.
    const potentialError = processQueue(encoder, ioQueue, output, "fatal");

    // S2.
    // NOTE: We don't have explicit "end-of-queue" item.

    // S3.
    if (potentialError.type === "error") {
        return potentialError.codepoint;
    }

    // S4.
    return null;
}

//==============================================================================
// Encoding Standard - 8.
//==============================================================================

export const UTF8_ENCODING: Encoding = {
    createEncoder(): Handler {
        return new UTF8Encoder();
    },
    createDecoder(): Handler {
        return new UTF8Decoder();
    },
};

// https://encoding.spec.whatwg.org/#utf-8-decoder
class UTF8Decoder implements Handler {
    codePoint = 0;
    bytesSeen = 0;
    bytesNeeded = 0;
    lowerBoundary = 0x80;
    upperBoundary = 0xbf;

    getKind(): HandlerKind {
        return "decoder";
    }

    handler(queue: IOQueue, byte: number | EndOfIOQueue): HandlerResult {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.29.)

        // S1.
        if (byte === IOQueue.END_OF_IO_QUEUE && this.bytesNeeded !== 0) {
            this.bytesNeeded = 0;
            return { type: "error", codepoint: undefined };
        }

        // S2.
        if (byte === IOQueue.END_OF_IO_QUEUE) {
            return { type: "finished" };
        }

        // S3.
        if (this.bytesNeeded === 0) {
            if (byte <= 0x7f) {
                return { type: "items", items: [byte] };
            } else if (0xc2 <= byte && byte <= 0xdf) {
                // S3-1.
                this.bytesNeeded = 1;

                // S3-2.
                this.codePoint = byte & 0x1f;
            } else if (0xe0 <= byte && byte <= 0xef) {
                switch (byte) {
                    // S3-1.
                    case 0xe0:
                        this.lowerBoundary = 0xa0;
                        break;
                    // S3-2.
                    case 0xed:
                        this.upperBoundary = 0x9f;
                        break;
                }
                // S3-3.
                this.bytesNeeded = 2;

                // S3-3.
                this.codePoint = byte & 0xf;
            } else if (0xf0 <= byte && byte <= 0xf4) {
                switch (byte) {
                    // S3-1.
                    case 0xf0:
                        this.lowerBoundary = 0x90;
                        break;
                    // S3-2.
                    case 0xf4:
                        this.upperBoundary = 0x8f;
                        break;
                }
                // S3-3.
                this.bytesNeeded = 3;

                // S3-4.
                this.codePoint = byte & 0x7;
            } else {
                return { type: "error", codepoint: undefined };
            }
            return { type: "continue" };
        }
        // S4.
        if (byte < this.lowerBoundary || this.upperBoundary < byte) {
            // S4-1.
            this.codePoint = 0;
            this.bytesNeeded = 0;
            this.bytesSeen = 0;
            this.lowerBoundary = 0x80;
            this.upperBoundary = 0xbf;

            // S4-2.
            queue.restoreOne(byte);

            // S4-3.
            return { type: "error", codepoint: undefined };
        }
        // S5.
        this.lowerBoundary = 0x80;
        this.upperBoundary = 0xbf;

        // S6.
        this.codePoint = (this.codePoint << 6) | (byte & 0x3f);

        // S7.
        this.bytesSeen++;

        // S8.
        if (this.bytesSeen !== this.bytesNeeded) {
            return { type: "continue" };
        }

        // S9.
        const codePoint = this.codePoint;

        // S10.
        this.codePoint = 0;
        this.bytesNeeded = 0;
        this.bytesSeen = 0;

        // S11.
        return { type: "items", items: [codePoint] };
    }
}

// https://encoding.spec.whatwg.org/#utf-8-encoder
class UTF8Encoder implements Handler {
    getKind(): HandlerKind {
        return "encoder";
    }

    handler(queue: IOQueue, codePoint: number | EndOfIOQueue): HandlerResult {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.03.10.)

        // S1.
        if (codePoint === IOQueue.END_OF_IO_QUEUE) {
            return { type: "finished" };
        }

        // S2.
        if (isASCIICodePoint(codePoint)) {
            return { type: "items", items: [codePoint] };
        }

        // S3.
        let count, offset;
        if (0x0080 <= codePoint && codePoint <= 0x7ff) {
            count = 1;
            offset = 0xc0;
        } else if (0x0800 <= codePoint && codePoint <= 0xffff) {
            count = 2;
            offset = 0xe0;
        } else if (0x10000 <= codePoint && codePoint <= 0x10ffff) {
            count = 3;
            offset = 0xf0;
        } else {
            throw new RangeError("code point is out of range");
        }

        // S4.
        const bytes = [];
        bytes[0] = (codePoint >> (6 * count)) + offset;

        // S5.
        let idx = 1;
        while (0 < count) {
            // S5-1.
            const temp = codePoint >> (6 * (count - 1));

            // S5-2.
            bytes[idx] = 0x80 | (temp & 0x3f);

            // S5-3.
            count--;
            idx++;
        }

        // S6.
        return { type: "items", items: bytes };
    }
}

const TODO_ENCODING: Encoding = {
    createEncoder(): Handler {
        throw new Error("TODO_ENCODING.createEncoder() called");
    },
    createDecoder(): Handler {
        throw new Error("TODO_ENCODING.createDecoder() called");
    },
};

//==============================================================================
// Encoding Standard - 9.
//==============================================================================

export const IBM866_ENCODING = TODO_ENCODING;
export const ISO8859_2_ENCODING = TODO_ENCODING;
export const ISO8859_3_ENCODING = TODO_ENCODING;
export const ISO8859_4_ENCODING = TODO_ENCODING;
export const ISO8859_5_ENCODING = TODO_ENCODING;
export const ISO8859_6_ENCODING = TODO_ENCODING;
export const ISO8859_7_ENCODING = TODO_ENCODING;
export const ISO8859_8_ENCODING = TODO_ENCODING;
export const ISO8859_8I_ENCODING = TODO_ENCODING;
export const ISO8859_10_ENCODING = TODO_ENCODING;
export const ISO8859_13_ENCODING = TODO_ENCODING;
export const ISO8859_14_ENCODING = TODO_ENCODING;
export const ISO8859_15_ENCODING = TODO_ENCODING;
export const ISO8859_16_ENCODING = TODO_ENCODING;
export const KOI8R_ENCODING = TODO_ENCODING;
export const KOI8U_ENCODING = TODO_ENCODING;
export const MACINTOSH_ENCODING = TODO_ENCODING;
export const WINDOWS874_ENCODING = TODO_ENCODING;
export const WINDOWS1250_ENCODING = TODO_ENCODING;
export const WINDOWS1251_ENCODING = TODO_ENCODING;
export const WINDOWS1252_ENCODING = TODO_ENCODING;
export const WINDOWS1253_ENCODING = TODO_ENCODING;
export const WINDOWS1254_ENCODING = TODO_ENCODING;
export const WINDOWS1255_ENCODING = TODO_ENCODING;
export const WINDOWS1256_ENCODING = TODO_ENCODING;
export const WINDOWS1257_ENCODING = TODO_ENCODING;
export const WINDOWS1258_ENCODING = TODO_ENCODING;
export const X_MAC_CYRILLIC_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 10.1.
//==============================================================================

export const GBK_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 10.2.
//==============================================================================

export const GB18030_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 11.1.
//==============================================================================

export const BIG5_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 12.1.
//==============================================================================

export const EUC_JP_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 12.2.
//==============================================================================

export const ISO2022_JP_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 12.3.
//==============================================================================

export const SHIFT_JIS_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 13.1.
//==============================================================================

export const EUC_KR_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 14.1.
//==============================================================================
export const REPLACEMENT_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 14.3.
//==============================================================================
export const UTF16_BE_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 14.4.
//==============================================================================
export const UTF16_LE_ENCODING = TODO_ENCODING;

//==============================================================================
// Encoding Standard - 14.5.
//==============================================================================
export const X_USER_DEFINED_ENCODING = TODO_ENCODING;

initLabels();
