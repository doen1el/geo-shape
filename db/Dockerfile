FROM alpine:3.16

WORKDIR /

# COPY migrations ./migrations

ARG TARGETARCH
RUN echo ${TARGETARCH}
COPY ./pocketbase_${TARGETARCH} /pocketbase
RUN chmod +x /pocketbase

EXPOSE 8090

ENTRYPOINT ["/pocketbase", "serve", "--http=195.20.225.54:8090", "--dir=/pb_data"]