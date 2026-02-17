FROM denoland/deno:2.1.4

# Set working directory
WORKDIR /app

# Copy dependency files
COPY deno.json deno.lock* ./

# Copy source code
COPY src/ ./src/

# Cache dependencies
RUN deno install --entrypoint src/cli.ts

# Set entrypoint and default command
# Usage: docker run ... dropbox-backup [upload|clean]
ENTRYPOINT ["deno", "run", "--allow-read", "--allow-write", "--allow-env", "--allow-net", "src/cli.ts"]
CMD ["upload"]
