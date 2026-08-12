#ifndef RATE_LIMITER_HPP
#define RATE_LIMITER_HPP

#include <string>
#include <chrono>
#include <unordered_map>
#include <deque>
#include <algorithm>

#ifdef _WIN32
  #include <windows.h>
  class CrossPlatformMutex {
      CRITICAL_SECTION cs;
  public:
      CrossPlatformMutex() { InitializeCriticalSection(&cs); }
      ~CrossPlatformMutex() { DeleteCriticalSection(&cs); }
      void lock() { EnterCriticalSection(&cs); }
      void unlock() { LeaveCriticalSection(&cs); }
  };
#else
  #include <mutex>
  class CrossPlatformMutex {
      std::mutex m;
  public:
      void lock() { m.lock(); }
      void unlock() { m.unlock(); }
  };
#endif

class ScopedLock {
private:
    CrossPlatformMutex& m_;
public:
    ScopedLock(CrossPlatformMutex& m) : m_(m) { m_.lock(); }
    ~ScopedLock() { m_.unlock(); }
};

class SlidingWindowRateLimiter {
private:
    int max_requests_;
    int window_seconds_;
    CrossPlatformMutex mutex_;
    std::unordered_map<std::string, std::deque<int64_t>> request_history_;

public:
    SlidingWindowRateLimiter(int max_requests = 10, int window_seconds = 60)
        : max_requests_(max_requests), window_seconds_(window_seconds) {}

    bool is_allowed(const std::string& client_key) {
        ScopedLock lock(mutex_);
        
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
            return true;
        }

        return false;
    }

    int get_remaining(const std::string& client_key) {
        ScopedLock lock(mutex_);
        auto now_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        int64_t window_start_ms = now_ms - (window_seconds_ * 1000);

        auto& timestamps = request_history_[client_key];
        while (!timestamps.empty() && timestamps.front() < window_start_ms) {
            timestamps.pop_front();
        }

        return std::max(0, max_requests_ - static_cast<int>(timestamps.size()));
    }
};

#endif // RATE_LIMITER_HPP
