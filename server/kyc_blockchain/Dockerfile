# Use the official Rust image with a recent toolchain
FROM rust:1.85-slim

# Install any additional packages Anchor might need (e.g., pkg-config, libssl-dev)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Update Rust to ensure it's using the stable toolchain (should already be 1.85)
RUN rustup update stable && rustup default stable

# (Optional) Install Anchor CLI if you want the image to be self-contained.
# However, Anchor CLI on your host will invoke Docker with this image.
# RUN cargo install anchor-cli --locked

# Set the working directory (this can be adjusted as needed)
WORKDIR /workspace

# The image is now ready to build your Anchor programs.
CMD ["anchor", "build"]
