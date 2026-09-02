FROM golang:1.24-alpine AS build
WORKDIR /workspace
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go test ./... && \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /calendar ./cmd/calendar

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S calendar && adduser -S calendar -G calendar
COPY --from=build /calendar /usr/local/bin/calendar
USER calendar
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1
ENTRYPOINT ["calendar"]
CMD ["serve"]
