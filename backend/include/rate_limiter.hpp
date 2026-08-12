#ifndef RATE_LIMITER_HPP
#define RATE_LIMITER_HPP

#include <string>
#include <chrono>
#include <unordered_map>
#include <deque>
#include <algorithm>

#ifdef _WIN32
  #include <windows.h>
  class SimpleMutex {
      CRITICAL_SECTION cs;
  public:
      SimpleMutex() { InitializeCriticalSection(&cs); }
      ~SimpleMutex() { DeleteCriticalSection(&cs); }
      void lock() { EnterCriticalSection(&cs); }
      void unlock() { LeaveCriticalSection(&cs); }
  };
#else
  #include <mutex>
  using SimpleMutex = std::mutex;
#endif

class SlidingWindowRateLimiter {
private:
    int max_requests_;
    int window_seconds_;
    SimpleMutex mutex_;
    std::unordered_map<std::string, std::deque<int64_t>> request_history_;

public:
    SlidingWindowRateLimiter(int max_requests = 10, int window_seconds = 60)
        : max_requests_(max_requests), window_seconds_(window_seconds) {}

    bool is_allowed(const std::string& client_key) {
        mutex_.lock();
        
        auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();

        int64_t window_start_ms = now_ms - (window_seconds_ * 1000);

        auto& timestamps = request_history_[client_key];

        while (!timestamps.empty() && timestamps.front() < window_start_ms) {
            timestamps.pop_front();
        }

        if (timestamps.size() < static_cast<size_t>(max_requests_)) {
            timestamps.push_back(now_ms);
            mutex_.unlock();
            return true;
        }

        mutex_.unlock();
        return false;
    }

    int get_remaining(const std::string& client_key) {
        mutex_.lock();
        auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        int64_t window_start_ms = now_ms - (window_seconds_ * 1000);

        auto& timestamps = request_history_[client_key];
        while (!timestamps.empty() && timestamps.front() < window_start_ms) {
            timestamps.pop_front();
        }

        int remaining = std::max(0, max_requests_ - static_cast<int>(timestamps.size()));
        mutex_.unlock();
        return remaining;
    }
};

#endif // RATE_LIMITER_HPP
