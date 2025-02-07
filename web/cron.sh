#!/bin/ash

# API endpoint URL
API_URL="http://localhost:5173/api/v1"

# delete all users that have not been active for 2 hours
cleanUpUsers() {
    response=$(curl -s -X DELETE $API_URL/user/clean)

    if [ "$response" == "true" ]; then
        echo "Users cleaned up successfully"
    else
        echo "Failed to clean up users"
    fi
}