'use strict';

/**
 * The code was extracted from:
 * https://github.com/davidchambers/Base64.js
 * This module provides utilities for encoding and decoding Base64 data and JSON Web Tokens (JWT).
 * It includes functionality to handle URL-safe Base64 strings, decode JWTs to retrieve their payloads or headers,
 * and supports both traditional and URL-safe Base64 variations.
 *
 * The Base64 functionality is extended to support Unicode strings, making it suitable for decoding modern web tokens.
 * Additionally, the module checks for proper formatting and padding of Base64 strings to ensure accurate decoding.
 *
 * Key components:
 * - polyfill: A function to decode Base64 strings when native 'atob' is not available or suitable.
 * - atob: References the browser's native 'atob' function or uses the polyfill.
 * - b64DecodeUnicode: Decodes Base64 strings into human-readable Unicode text.
 * - base64_url_decode: Converts URL-safe Base64-encoded strings to standard Base64 and decodes them.
 * - jwtDecode: Decodes the payload or header of a JWT, handling both regular and URL-safe Base64 encoded tokens.
 *
 * Errors:
 * - InvalidCharacterError: Custom error type for handling invalid characters in Base64 strings.
 * - InvalidTokenError: Custom error type for handling issues with JWT structure or encoding.
 *
 * @module Base64AndJwtUtils
 */

/**
 * Base64 character set including '+' and '/', and '=' for padding.
 */
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
 * Error class constructor for errors related to invalid characters in Base64 encoding.
 * @param {string} message - Error message describing the issue.
 */
function InvalidCharacterError(message) {
    this.message = message;
}

InvalidCharacterError.prototype = new Error();
InvalidCharacterError.prototype.name = "InvalidCharacterError";

/**
 * Polyfills the atob function to decode Base64 encoded strings.
 * Corrects padding issues and checks for properly encoded strings.
 * @param {string} input - The Base64 encoded string to decode.
 * @returns {string} - The decoded string.
 */
function polyfill(input) {
    var str = String(input).replace(/=+$/, "");
    if (str.length % 4 == 1) {
        throw new InvalidCharacterError(
            "'atob' failed: The string to be decoded is not correctly encoded."
        );
    }
    for (
        // initialize result and counters
        var bc = 0, bs, buffer, idx = 0, output = "";
        // get next character
        (buffer = str.charAt(idx++));
        // character found in table? initialize bit storage and add its ascii value;
        ~buffer &&
            ((bs = bc % 4 ? bs * 64 + buffer : buffer),
                // and if not first of each 4 characters,
                // convert the first 8 bits to one ascii character
                bc++ % 4) ?
            (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) :
            0
    ) {
        // try to find character in table (0-63, not found => -1)
        buffer = chars.indexOf(buffer);
    }
    return output;
}

var atob = (typeof window !== "undefined" &&
    window.atob &&
    window.atob.bind(window)) ||
    polyfill;

/**
 * Decodes a Base64-encoded string into a Unicode string.
 * @param {string} str - The Base64 encoded string.
 * @returns {string} - The decoded Unicode string.
 */
function b64DecodeUnicode(str) {
    return decodeURIComponent(
        atob(str).replace(/(.)/g, function (m, p) {
            var code = p.charCodeAt(0).toString(16).toUpperCase();
            if (code.length < 2) {
                code = "0" + code;
            }
            return "%" + code;
        })
    );
}

/**
 * Decodes a URL-safe Base64-encoded string into a Unicode string.
 * Adjusts character set from URL-safe to standard Base64 before decoding.
 * @param {string} str - The URL-safe Base64 string.
 * @returns {string} - The decoded string.
 */
function base64_url_decode(str) {
    var output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch (output.length % 4) {
        case 0:
            break;
        case 2:
            output += "==";
            break;
        case 3:
            output += "=";
            break;
        default:
            throw new Error("base64 string is not of the correct length");
    }

    try {
        return b64DecodeUnicode(output);
    } catch (err) {
        return atob(output);
    }
}

/**
 * Error class constructor for issues related to JSON Web Token (JWT) processing.
 * @param {string} message - Error message describing the issue with the JWT.
 */
function InvalidTokenError(message) {
    this.message = message;
}

InvalidTokenError.prototype = new Error();
InvalidTokenError.prototype.name = "InvalidTokenError";

/**
 * Decodes a JSON Web Token (JWT) to extract either its payload or header based on options.
 * Handles both regular and URL-safe Base64 encoded tokens.
 * @param {string} token - The JWT to decode.
 * @param {Object} [options] - Optional settings such as specifying to decode the header instead of the payload.
 * @returns {Object} - The decoded JSON object from the JWT.
 */
function jwtDecode(token, options) {
    if (typeof token !== "string") {
        throw new InvalidTokenError("Invalid token specified: must be a string");
    }

    options = options || {};
    var pos = options.header === true ? 0 : 1;

    var part = token.split(".")[pos];
    if (typeof part !== "string") {
        throw new InvalidTokenError("Invalid token specified: missing part #" + (pos + 1));
    }

    try {
        var decoded = base64_url_decode(part);
    } catch (e) {
        throw new InvalidTokenError("Invalid token specified: invalid base64 for part #" + (pos + 1) + ' (' + e.message + ')');
    }

    try {
        return JSON.parse(decoded);
    } catch (e) {
        throw new InvalidTokenError("Invalid token specified: invalid json for part #" + (pos + 1) + ' (' + e.message + ')');
    }
}

/*
 * Expose the function on the window object
 */

//use amd or just through the window object.
if (window) {
    if (typeof window.define == "function" && window.define.amd) {
        window.define("jwt_decode", function () {
            return jwtDecode;
        });
    } else if (window) {
        window.jwt_decode = jwtDecode;
    }
}

export default jwtDecode