cmake_minimum_required(VERSION 3.14)
project(url_shortener_backend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(url_shortener_server
    src/main.cpp
)

find_package(Threads REQUIRED)
target_link_libraries(url_shortener_server PRIVATE Threads::Threads)

if(MSVC)
    target_compile_options(url_shortener_server PRIVATE /W4)
else()
    target_compile_options(url_shortener_server PRIVATE -Wall -Wextra)
endif()
