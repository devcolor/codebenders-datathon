#!/bin/bash

# Script to create GitHub issues from hackathon_github_issues.md
# Usage: ./create_issues.sh

set -e

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Check if we're in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
    echo "Error: Not in a git repository."
    exit 1
fi

echo "🚀 Creating GitHub issues from hackathon_github_issues.md..."
echo ""

# Parse the markdown file and create issues
awk '
BEGIN {
    RS = "---\n"
    FS = "\n"
    count = 0
}

# Skip header and quick start section
NR <= 1 { next }

{
    title = ""
    labels = ""
    estimate = ""
    body = ""
    in_body = 0
    
    for (i = 1; i <= NF; i++) {
        line = $i
        
        # Extract title
        if (line ~ /^Title: /) {
            title = substr(line, 8)
            continue
        }
        
        # Extract labels
        if (line ~ /^Labels: /) {
            labels = substr(line, 9)
            # Remove brackets and quotes, convert to comma-separated
            gsub(/[\[\]"]/, "", labels)
            continue
        }
        
        # Extract estimate
        if (line ~ /^Estimate: /) {
            estimate = substr(line, 11)
            continue
        }
        
        # Extract body
        if (line ~ /^Body:/) {
            in_body = 1
            continue
        }
        
        if (in_body && line != "") {
            # Remove leading spaces (2 spaces indentation)
            sub(/^  /, "", line)
            if (body == "") {
                body = line
            } else {
                body = body "\n" line
            }
        }
    }
    
    # Create issue if we have required fields
    if (title != "" && body != "") {
        count++
        
        # Add estimate to body
        if (estimate != "") {
            body = "**⏱️ Estimate:** " estimate "\n\n" body
        }
        
        # Create temp file for body
        body_file = "/tmp/gh_issue_body_" count ".md"
        print body > body_file
        close(body_file)
        
        # Build gh command
        cmd = "gh issue create --title \"" title "\" --body-file " body_file
        
        # Add labels
        if (labels != "") {
            split(labels, label_array, ",")
            for (j in label_array) {
                cmd = cmd " --label \"" label_array[j] "\""
            }
        }
        
        print "Creating issue #" count ": " title
        system(cmd)
        system("rm " body_file)
        print ""
    }
}

END {
    print "✅ Created " count " issues!"
}
' hackathon_github_issues.md

