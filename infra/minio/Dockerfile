FROM golang:1.24-alpine AS build

RUN apk add --no-cache ca-certificates git
ENV CGO_ENABLED=0

RUN mkdir -p /out \
    && GOBIN=/out go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z \
    && GOBIN=/out go install github.com/minio/mc@RELEASE.2025-08-13T08-35-41Z

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /out/mc /usr/local/bin/mc

VOLUME ["/data"]
EXPOSE 9000 9001

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
