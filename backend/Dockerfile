FROM alpine:3.18 AS build

RUN apk add --no-cache g++ cmake make git boost-dev libpq-dev hiredis-dev

WORKDIR /app
COPY . .

RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

FROM alpine:3.18
RUN apk add --no-cache libstdc++ libpq hiredis boost

WORKDIR /app
COPY --from=build /app/build/url_shortener_server /app/url_shortener_server

EXPOSE 8080
CMD ["/app/url_shortener_server"]
