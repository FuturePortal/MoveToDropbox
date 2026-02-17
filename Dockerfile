FROM denoland/deno:2.1.4

# Set working directory
WORKDIR /app

# Copy dependency files
COPY deno.json deno.lock* ./

# Copy source code
COPY src/ ./src/

# Cache dependencies
RUN deno install --entrypoint src/cli.ts

# Run the CLI
CMD ["task", "upload"]
