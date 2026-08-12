#ifndef CROW_LIGHT_HPP
#define CROW_LIGHT_HPP

#include <iostream>
#include <string>
#include <functional>
#include <unordered_map>
#include <vector>
#include <sstream>
#include <memory>
#include <mutex>
#include <thread>

#ifdef _WIN32
  #ifndef _WIN32_WINNT
    #define _WIN32_WINNT 0x0601
  #endif
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #include <windows.h>
  #pragma comment(lib, "ws2_32.lib")
  typedef int socklen_t;
#else
  #include <sys/socket.h>
  #include <netinet/in.h>
  #include <arpa/inet.h>
  #include <unistd.h>
  #define SOCKET int
  #define INVALID_SOCKET -1
  #define SOCKET_ERROR -1
  #define closesocket close
#endif

namespace crow_light {

struct Request {
    std::string method;
    std::string path;
    std::string body;
    std::string remote_ip;
    std::unordered_map<std::string, std::string> headers;
};

struct Response {
    int status_code = 200;
    std::string body;
    std::unordered_map<std::string, std::string> headers;

    Response(int code = 200, const std::string& b = "") : status_code(code), body(b) {
        headers["Content-Type"] = "application/json";
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    }

    void add_header(const std::string& key, const std::string& val) {
        headers[key] = val;
    }
};

class App {
public:
    using Handler = std::function<Response(const Request&)>;

private:
    std::unordered_map<std::string, Handler> routes_get;
    std::unordered_map<std::string, Handler> routes_post;

    struct ClientContext {
        App* app;
        SOCKET socket;
        std::string ip;
    };

#ifdef _WIN32
    static DWORD WINAPI win32_thread_stub(LPVOID param) {
        ClientContext* c = static_cast<ClientContext*>(param);
        c->app->handle_client(c->socket, c->ip);
        delete c;
        return 0;
    }
#endif

public:
    App() {
#ifdef _WIN32
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
#endif
    }

    ~App() {
#ifdef _WIN32
        WSACleanup();
#endif
    }

    void get(const std::string& path, Handler handler) {
        routes_get[path] = handler;
    }

    void post(const std::string& path, Handler handler) {
        routes_post[path] = handler;
    }

    void listen(int port) {
        SOCKET server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (server_fd == INVALID_SOCKET) {
            std::cerr << "Failed to create socket" << std::endl;
            return;
        }

        int opt = 1;
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

        sockaddr_in address{};
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = INADDR_ANY;
        address.sin_port = htons(port);

        if (bind(server_fd, (sockaddr*)&address, sizeof(address)) == SOCKET_ERROR) {
            std::cerr << "Bind failed on port " << port << std::endl;
            return;
        }

        if (::listen(server_fd, 100) == SOCKET_ERROR) {
            std::cerr << "Listen failed" << std::endl;
            return;
        }

        std::cout << "🚀 SwiftURL C++ Engine Server live on http://localhost:" << port << std::endl;

        while (true) {
            sockaddr_in client_addr{};
            socklen_t addrlen = sizeof(client_addr);
            SOCKET client_socket = accept(server_fd, (sockaddr*)&client_addr, &addrlen);

            if (client_socket == INVALID_SOCKET) continue;

            std::string client_ip = inet_ntoa(client_addr.sin_addr);

            ClientContext* ctx = new ClientContext{this, client_socket, client_ip};

#ifdef _WIN32
            HANDLE hThread = CreateThread(NULL, 0, win32_thread_stub, ctx, 0, NULL);
            if (hThread) CloseHandle(hThread);
#else
            std::thread([ctx]() {
                ctx->app->handle_client(ctx->socket, ctx->ip);
                delete ctx;
            }).detach();
#endif
        }
    }

private:
    void handle_client(SOCKET client_socket, const std::string& client_ip) {
        char buffer[4096] = {0};
        int bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
        if (bytes_read <= 0) {
            closesocket(client_socket);
            return;
        }

        std::string raw_req(buffer, bytes_read);
        std::istringstream stream(raw_req);
        
        Request req;
        req.remote_ip = client_ip;
        stream >> req.method >> req.path;

        std::string line;
        std::getline(stream, line);
        while (std::getline(stream, line) && line != "\r" && !line.empty()) {
            size_t colon = line.find(':');
            if (colon != std::string::npos) {
                std::string k = line.substr(0, colon);
                std::string v = line.substr(colon + 1);
                if (!v.empty() && v.back() == '\r') v.pop_back();
                if (!v.empty() && v.front() == ' ') v.erase(0, 1);
                req.headers[k] = v;
            }
        }

        size_t body_pos = raw_req.find("\r\n\r\n");
        if (body_pos != std::string::npos) {
            req.body = raw_req.substr(body_pos + 4);
        }

        Response res(404, R"({"error":"Endpoint not found"})");

        if (req.method == "OPTIONS") {
            res = Response(200, "");
        } else if (req.method == "GET") {
            if (routes_get.count(req.path)) {
                res = routes_get[req.path](req);
            } else if (req.path.rfind("/r/", 0) == 0 && routes_get.count("/r/<string>")) {
                res = routes_get["/r/<string>"](req);
            } else if (req.path.rfind("/api/analytics/", 0) == 0 && routes_get.count("/api/analytics/<string>")) {
                res = routes_get["/api/analytics/<string>"](req);
            }
        } else if (req.method == "POST") {
            if (routes_post.count(req.path)) {
                res = routes_post[req.path](req);
            }
        }

        std::ostringstream raw_res;
        raw_res << "HTTP/1.1 " << res.status_code << " ";
        if (res.status_code == 200) raw_res << "OK\r\n";
        else if (res.status_code == 302) raw_res << "Found\r\n";
        else if (res.status_code == 429) raw_res << "Too Many Requests\r\n";
        else if (res.status_code == 404) raw_res << "Not Found\r\n";
        else raw_res << "Bad Request\r\n";

        for (const auto& h : res.headers) {
            raw_res << h.first << ": " << h.second << "\r\n";
        }
        raw_res << "Content-Length: " << res.body.length() << "\r\n";
        raw_res << "Connection: close\r\n\r\n";
        raw_res << res.body;

        std::string res_str = raw_res.str();
        send(client_socket, res_str.c_str(), (int)res_str.length(), 0);
        closesocket(client_socket);
    }
};

} // namespace crow_light

#endif // CROW_LIGHT_HPP
