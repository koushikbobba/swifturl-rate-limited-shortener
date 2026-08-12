#include "../include/crow_light.hpp"
#include "../include/base62.hpp"
#include "../include/rate_limiter.hpp"
#include "../include/jwt_helper.hpp"

#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <atomic>

struct UrlRecord {
    int id;
    int user_id;
    std::string short_code;
    std::string original_url;
    std::string created_at;
    uint64_t click_count;
};

struct ClickLog {
    std::string short_code;
    std::string timestamp;
    std::string ip_address;
    std::string user_agent;
    std::string referrer;
};

// Memory Storage + Redis Cache Simulation
std::atomic<uint64_t> global_url_counter{100000};
CrossPlatformMutex db_mutex;
std::unordered_map<std::string, UrlRecord> url_by_code;
std::unordered_map<std::string, std::string> redis_cache;
std::vector<ClickLog> click_analytics_logs;
std::vector<ClickLog> rabbitmq_queue;

// Rate Limiter: Max 10 requests / 60 seconds per client IP
SlidingWindowRateLimiter rate_limiter(10, 60);

// Helper function to extract JSON key string value cleanly
std::string extract_json_value(const std::string& json, const std::string& key) {
    size_t key_pos = json.find("\"" + key + "\"");
    if (key_pos == std::string::npos) return "";

    size_t colon_pos = json.find(':', key_pos);
    if (colon_pos == std::string::npos) return "";

    size_t quote_start = json.find('"', colon_pos);
    if (quote_start == std::string::npos) return "";

    size_t quote_end = json.find('"', quote_start + 1);
    if (quote_end == std::string::npos) return "";

    return json.substr(quote_start + 1, quote_end - quote_start - 1);
}

int main() {
    crow_light::App app;

    // 1. Health check
    app.get("/health", [](const crow_light::Request& req) {
        return crow_light::Response(200, R"({"status":"OK","engine":"SwiftURL C++ High-Performance Server"})");
    });

    // 2. Auth: Register
    app.post("/api/auth/register", [](const crow_light::Request& req) {
        std::string token = JwtHelper::generate_token(1, "demo_user");
        std::string res_json = R"({"status":"success","token":")" + token + R"(","user":{"id":1,"username":"demo_user"}})";
        return crow_light::Response(200, res_json);
    });

    // 3. Auth: Login
    app.post("/api/auth/login", [](const crow_light::Request& req) {
        std::string token = JwtHelper::generate_token(1, "demo_user");
        std::string res_json = R"({"status":"success","token":")" + token + R"(","user":{"id":1,"username":"demo_user"}})";
        return crow_light::Response(200, res_json);
    });

    // 4. Shorten URL Endpoint (Rate-Limited + Redis Pre-warm)
    app.post("/api/shorten", [](const crow_light::Request& req) {
        std::string client_ip = req.remote_ip.empty() ? "127.0.0.1" : req.remote_ip;

        if (!rate_limiter.is_allowed(client_ip)) {
            std::string err_json = R"({"error":"Rate limit exceeded. Maximum 10 requests / 60s allowed.","remaining_requests":)" + 
                                   std::to_string(rate_limiter.get_remaining(client_ip)) + "}";
            return crow_light::Response(429, err_json);
        }

        std::string original_url = extract_json_value(req.body, "original_url");
        std::string custom_slug = extract_json_value(req.body, "custom_slug");

        if (original_url.empty()) {
            return crow_light::Response(400, R"({"error":"Missing or invalid original_url"})");
        }

        if (original_url.find("http://") != 0 && original_url.find("https://") != 0) {
            original_url = "https://" + original_url;
        }

        std::string short_code = custom_slug.empty() ? Base62::encode(++global_url_counter) : custom_slug;

        {
            ScopedLock lock(db_mutex);
            UrlRecord rec;
            rec.id = static_cast<int>(url_by_code.size() + 1);
            rec.user_id = 1;
            rec.short_code = short_code;
            rec.original_url = original_url;
            rec.click_count = 0;
            
            auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
            rec.created_at = std::ctime(&now);
            if (!rec.created_at.empty()) rec.created_at.pop_back();

            url_by_code[short_code] = rec;
            redis_cache[short_code] = original_url;
        }

        std::string res_json = R"({"status":"success","short_code":")" + short_code + 
                               R"(","short_url":"http://localhost:8080/r/)" + short_code + 
                               R"(","original_url":")" + original_url + 
                               R"(","rate_limit_remaining":)" + std::to_string(rate_limiter.get_remaining(client_ip)) + "}";

        return crow_light::Response(200, res_json);
    });

    // 5. Short Link Redirect Endpoint (Cache -> RabbitMQ Async Click Event)
    app.get("/r/<string>", [](const crow_light::Request& req) {
        std::string short_code = req.path.substr(3);
        std::string target_url = "";
        bool cache_hit = false;

        {
            ScopedLock lock(db_mutex);
            if (redis_cache.count(short_code)) {
                target_url = redis_cache[short_code];
                cache_hit = true;
            } else if (url_by_code.count(short_code)) {
                target_url = url_by_code[short_code].original_url;
                redis_cache[short_code] = target_url;
            }
        }

        if (target_url.empty()) {
            return crow_light::Response(404, R"({"error":"Short code not found"})");
        }

        ClickLog log_event;
        log_event.short_code = short_code;
        log_event.ip_address = req.remote_ip;
        
        auto ua_it = req.headers.find("User-Agent");
        log_event.user_agent = (ua_it != req.headers.end()) ? ua_it->second : "Mozilla/5.0";
        
        auto ref_it = req.headers.find("Referer");
        log_event.referrer = (ref_it != req.headers.end()) ? ref_it->second : "Direct";

        auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
        log_event.timestamp = std::ctime(&now);
        if (!log_event.timestamp.empty()) log_event.timestamp.pop_back();

        {
            ScopedLock lock(db_mutex);
            url_by_code[short_code].click_count++;
            rabbitmq_queue.push_back(log_event);
            click_analytics_logs.push_back(log_event);
        }

        crow_light::Response res(302, "");
        res.add_header("Location", target_url);
        res.add_header("X-Cache-Status", cache_hit ? "HIT" : "MISS");
        return res;
    });

    // 6. Analytics Endpoint
    app.get("/api/analytics/<string>", [](const crow_light::Request& req) {
        std::string short_code = req.path.substr(15);
        
        ScopedLock lock(db_mutex);
        if (!url_by_code.count(short_code)) {
            return crow_light::Response(404, R"({"error":"Short code not found"})");
        }

        const auto& rec = url_by_code[short_code];
        std::string res_json = R"({"short_code":")" + short_code + 
                               R"(","original_url":")" + rec.original_url + 
                               R"(","created_at":")" + rec.created_at + 
                               R"(","total_clicks":)" + std::to_string(rec.click_count) + 
                               R"(,"click_history":[)";

        bool first = true;
        for (const auto& log : click_analytics_logs) {
            if (log.short_code == short_code) {
                if (!first) res_json += ",";
                res_json += R"({"timestamp":")" + log.timestamp + 
                            R"(","ip":")" + log.ip_address + 
                            R"(","user_agent":")" + log.user_agent + 
                            R"(","referrer":")" + log.referrer + R"(})";
                first = false;
            }
        }
        res_json += "]}";

        return crow_light::Response(200, res_json);
    });

    // 7. Get All User URLs Endpoint
    app.get("/api/user/urls", [](const crow_light::Request& req) {
        ScopedLock lock(db_mutex);
        
        std::string res_json = R"({"urls":[)";
        bool first = true;
        for (const auto& pair : url_by_code) {
            const auto& rec = pair.second;
            if (!first) res_json += ",";
            res_json += R"({"id":)" + std::to_string(rec.id) + 
                        R"(,"short_code":")" + rec.short_code + 
                        R"(","short_url":"http://localhost:8080/r/)" + rec.short_code + 
                        R"(","original_url":")" + rec.original_url + 
                        R"(","click_count":)" + std::to_string(rec.click_count) + 
                        R"(,"created_at":")" + rec.created_at + R"(})";
            first = false;
        }
        res_json += R"(],"total_urls":)" + std::to_string(url_by_code.size()) + "}";

        return crow_light::Response(200, res_json);
    });

    app.listen(8080);
    return 0;
}
