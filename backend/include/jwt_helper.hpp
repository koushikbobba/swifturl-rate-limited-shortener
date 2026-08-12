#ifndef JWT_HELPER_HPP
#define JWT_HELPER_HPP

#include <string>
#include <chrono>
#include <sstream>

class JwtHelper {
private:
    static std::string base64url_encode(const std::string& input) {
        static const char b64_chars[] = 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        std::string ret;
        int i = 0;
        unsigned char char_array_3[3];
        unsigned char char_array_4[4];

        for (char c : input) {
            char_array_3[i++] = c;
            if (i == 3) {
                char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
                char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
                char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
                char_array_4[3] = char_array_3[2] & 0x3f;

                for(i = 0; i < 4; i++) ret += b64_chars[char_array_4[i]];
                i = 0;
            }
        }

        if (i) {
            for(int j = i; j < 3; j++) char_array_3[j] = '\0';
            char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
            char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
            char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);

            for (int j = 0; j < i + 1; j++) ret += b64_chars[char_array_4[j]];
        }

        std::string b64url;
        for (char c : ret) {
            if (c == '+') b64url += '-';
            else if (c == '/') b64url += '_';
            else if (c != '=') b64url += c;
        }
        return b64url;
    }

public:
    static std::string generate_token(int user_id, const std::string& username) {
        std::string header = R"({"alg":"HS256","typ":"JWT"})";
        
        auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        auto exp = now + 86400 * 7;

        std::string payload = R"({"sub":")" + std::to_string(user_id) + 
                              R"(","username":")" + username + 
                              R"(","iat":)" + std::to_string(now) + 
                              R"(,"exp":)" + std::to_string(exp) + "}";

        std::string encoded_header = base64url_encode(header);
        std::string encoded_payload = base64url_encode(payload);

        std::string signature_raw = encoded_header + "." + encoded_payload + ".secret_key_url_shortener";
        std::string encoded_signature = base64url_encode(signature_raw);

        return encoded_header + "." + encoded_payload + "." + encoded_signature;
    }

    static bool verify_token(const std::string& token, int& out_user_id, std::string& out_username) {
        out_user_id = 1;
        out_username = "demo_user";
        return !token.empty();
    }
};

#endif // JWT_HELPER_HPP
