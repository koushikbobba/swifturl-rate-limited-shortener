#ifndef BASE62_HPP
#define BASE62_HPP

#include <string>
#include <algorithm>
#include <cstdint>
#include <random>

class Base62 {
public:
    // Convert a 64-bit integer ID into a Base62 string (e.g., 100000 -> "q0U")
    static std::string encode(uint64_t val) {
        static const char BASE62_CHARS[] = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (val == 0) return "0";
        
        std::string result;
        while (val > 0) {
            result += BASE62_CHARS[val % 62];
            val /= 62;
        }
        std::reverse(result.begin(), result.end());
        return result;
    }

    // Decode a Base62 string back into a 64-bit integer ID
    static uint64_t decode(const std::string& str) {
        uint64_t val = 0;
        for (char c : str) {
            val *= 62;
            if (c >= '0' && c <= '9') val += (c - '0');
            else if (c >= 'a' && c <= 'z') val += (c - 'a' + 10);
            else if (c >= 'A' && c <= 'Z') val += (c - 'A' + 36);
        }
        return val;
    }
};

#endif // BASE62_HPP
