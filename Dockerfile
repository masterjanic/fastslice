# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production

# Final image: system + SuperSlicer first (cached on app edits), app files last.
FROM base AS release

ARG SUPER_SLICER_VERSION=2.5.59.13
ARG SUPER_SLICER_ARCHIVE=SuperSlicer_${SUPER_SLICER_VERSION}_linux64_240701

# SuperSlicer runtime deps + binary (only redo when this block or ARGs change)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl unzip \
        libgl1 \
        libgl1-mesa-dri \
        libglib2.0-0 \
        libgtk-3-0 \
        libfontconfig1 \
        libfreetype6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcb-render0 \
        libxcb-shape0 \
        libxcb-xfixes0 \
        libxcb-xinerama0 \
        libxcb-cursor0 \
        libxkbcommon0 \
        libxkbcommon-x11-0 \
        libdbus-1-3 \
        libsm6 \
        libice6 \
        libxext6 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /tmp/superslicer.zip \
        "https://github.com/supermerill/SuperSlicer/releases/download/${SUPER_SLICER_VERSION}/${SUPER_SLICER_ARCHIVE}.tar.zip" \
    && unzip -q /tmp/superslicer.zip -d /tmp \
    && mkdir -p /opt/superslicer \
    && tar -xf "/tmp/${SUPER_SLICER_ARCHIVE}.tar" -C /opt/superslicer \
    && chmod a+rx /opt/superslicer/superslicer /opt/superslicer/bin/superslicer \
    && chmod -R a+rX /opt/superslicer \
    && ln -sf /opt/superslicer/superslicer /usr/local/bin/superslicer \
    && rm -f /tmp/superslicer.zip "/tmp/${SUPER_SLICER_ARCHIVE}.tar"

# Dependencies — redo when package.json / bun.lock change (install stage)
COPY --from=install /temp/prod/node_modules node_modules
COPY package.json .

# Source — changing only this layer should not rerun apt or SuperSlicer
COPY src ./src

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--bun", "run", "src/index.ts" ]