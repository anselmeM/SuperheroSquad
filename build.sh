#!/bin/bash

# Simple wrapper script for the new build process
# This script can be used without modifying package.json

# Print banner
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                 Superhero API Build Script                 ║"
echo "║                                                           ║"
echo "║  This script replaces the traditional esbuild approach    ║"
echo "║  with a unified Vite-based build process for both client  ║"
echo "║  and server code.                                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Execute the build script
node build.mjs

# Exit with the same code as the build script
exit $?