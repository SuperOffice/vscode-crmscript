# Navigate to the client folder
cd client

# Install dependencies
echo "Installing dependencies..."
npm install

# Run unit and integration tests
echo "Running tests..."
npm test

# Clean up any test artifacts (if necessary)
echo "Cleaning up..."
# Add any cleanup commands here

# Return to the root folder
cd ..

echo "All tests completed."
