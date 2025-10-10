FROM caddy AS app
COPY ./dist/ /usr/share/caddy/


RUN cat > /etc/caddy/Caddyfile <<EOF

:8080 {
  root * /usr/share/caddy
  file_server
  try_files {path} /
}

EOF

ARG BUILD_TIME
ARG GIT_COMMIT_SHA
ARG GIT_CURRENT_BRANCH
ARG GIT_LAST_LOG_MESSAGE
ARG GIT_LAST_COMMITTER
ARG GIT_LAST_COMMIT_DATE

LABEL org.opencontainers.image.created="$BUILD_TIME"
LABEL org.opencontainers.image.url="https://hive.io/"
LABEL org.opencontainers.image.documentation="https://gitlab.syncad.com/hive/wallet-dapp"
LABEL org.opencontainers.image.source="https://gitlab.syncad.com/hive/wallet-dapp"
#LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="$GIT_COMMIT_SHA"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.ref.name="Metamask dApp providing a bridge to Hive blockchain"
LABEL org.opencontainers.image.title="Hive Bridge Application Image"
LABEL org.opencontainers.image.description="Runs Hive Bridge applicaton)"
LABEL io.hive.image.branch="$GIT_CURRENT_BRANCH"
LABEL io.hive.image.commit.log_message="$GIT_LAST_LOG_MESSAGE"
LABEL io.hive.image.commit.author="$GIT_LAST_COMMITTER"
LABEL io.hive.image.commit.date="$GIT_LAST_COMMIT_DATE"

ENV VITE_CTOKENS_API_URL=
ENV VITE_HIVE_NODE_ENDPOINT=
ENV VITE_HIVE_CHAIN_ID=
