FROM golang:1.23 AS builder
WORKDIR /src
RUN git clone --depth 1 --branch RELEASE.2023-11-20T22-40-07Z https://github.com/minio/minio.git .
RUN CGO_ENABLED=0 go build -o /minio

FROM golang:1.23 AS mc-builder
WORKDIR /src
RUN git clone --depth 1 --branch RELEASE.2023-11-06T04-19-23Z https://github.com/minio/mc.git .
RUN CGO_ENABLED=0 go build -o /mc

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /minio /usr/bin/minio
COPY --from=mc-builder /mc /usr/bin/mc
EXPOSE 9000 9001
CMD ["minio", "server", "/data", "--console-address", ":9001"]
